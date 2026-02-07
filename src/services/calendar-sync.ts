import { google, calendar_v3 } from "googleapis";
import { Prisma } from "@prisma/client";
import ical, { VEvent, ParameterValue } from "node-ical";
import { prisma } from "../lib/prisma";
import { getAuthenticatedClient } from "./google-auth";
import { refreshMicrosoftToken } from "./microsoft-auth";

interface SyncResult {
  created: number;
  updated: number;
  deleted: number;
}

interface KidRecord {
  id: string;
  keywords: string[];
}

export async function syncCalendar(calendarId: string): Promise<SyncResult> {
  const calendar = await prisma.calendar.findUniqueOrThrow({
    where: { id: calendarId },
    include: { user: { include: { kids: true } } },
  });

  if (calendar.provider === "GOOGLE") {
    return syncGoogleCalendar(calendar);
  }

  if (calendar.provider === "MICROSOFT" || calendar.provider === "EXCHANGE") {
    return syncMicrosoftCalendar(calendar);
  }

  if (calendar.provider === "PROTON_ICS") {
    return syncProtonIcsCalendar(calendar);
  }

  throw new Error(`Sync not implemented for provider: ${calendar.provider}`);
}

// --- Shared helpers ---

function autoTagKid(title: string, kids: KidRecord[]): string | null {
  const titleLower = title.toLowerCase();
  for (const kid of kids) {
    if (kid.keywords.some((kw) => titleLower.includes(kw.toLowerCase()))) {
      return kid.id;
    }
  }
  return null;
}

async function upsertEvent(
  calendarId: string,
  externalId: string,
  eventData: {
    title: string;
    description: string | null;
    location: string | null;
    startTime: Date;
    endTime: Date;
    allDay: boolean;
    kidId: string | null;
    raw: Prisma.InputJsonValue;
  }
): Promise<"created" | "updated"> {
  const existing = await prisma.calendarEvent.findUnique({
    where: { calendarId_externalId: { calendarId, externalId } },
  });

  if (existing) {
    await prisma.calendarEvent.update({
      where: { id: existing.id },
      data: eventData,
    });
    return "updated";
  } else {
    await prisma.calendarEvent.create({
      data: { calendarId, externalId, ...eventData },
    });
    return "created";
  }
}

async function deleteEvent(calendarId: string, externalId: string): Promise<number> {
  const result = await prisma.calendarEvent.deleteMany({
    where: { calendarId, externalId },
  });
  return result.count;
}

async function saveSyncState(calendarId: string, syncToken: string | null | undefined, currentSyncToken: string | null) {
  await prisma.calendar.update({
    where: { id: calendarId },
    data: {
      syncToken: syncToken || currentSyncToken,
      lastSyncAt: new Date(),
    },
  });
}

// --- Google Calendar Sync ---

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function syncGoogleCalendar(calendar: any): Promise<SyncResult> {
  if (!calendar.accessToken) {
    throw new Error("Calendar has no access token");
  }

  const auth = getAuthenticatedClient(calendar.accessToken, calendar.refreshToken);

  auth.on("tokens", async (tokens) => {
    const data: Record<string, string> = {};
    if (tokens.access_token) data.accessToken = tokens.access_token;
    if (tokens.refresh_token) data.refreshToken = tokens.refresh_token;
    if (Object.keys(data).length > 0) {
      await prisma.calendar.update({ where: { id: calendar.id }, data });
    }
  });

  const cal = google.calendar({ version: "v3", auth });

  let allEvents: calendar_v3.Schema$Event[] = [];
  let nextSyncToken: string | undefined;

  try {
    const result = await fetchGoogleEvents(cal, calendar.externalId || "primary", calendar.syncToken);
    allEvents = result.events;
    nextSyncToken = result.syncToken;
  } catch (err: unknown) {
    if (isGoneError(err)) {
      await prisma.calendar.update({
        where: { id: calendar.id },
        data: { syncToken: null },
      });
      const result = await fetchGoogleEvents(cal, calendar.externalId || "primary", null);
      allEvents = result.events;
      nextSyncToken = result.syncToken;
    } else {
      throw err;
    }
  }

  const kids = calendar.user.kids;
  let created = 0;
  let updated = 0;
  let deleted = 0;

  for (const event of allEvents) {
    if (!event.id) continue;

    if (event.status === "cancelled") {
      deleted += await deleteEvent(calendar.id, event.id);
      continue;
    }

    const startTime = parseGoogleEventTime(event.start);
    const endTime = parseGoogleEventTime(event.end);
    if (!startTime || !endTime) continue;

    const title = event.summary || "(No title)";
    const result = await upsertEvent(calendar.id, event.id, {
      title,
      description: event.description || null,
      location: event.location || null,
      startTime,
      endTime,
      allDay: !!event.start?.date,
      kidId: autoTagKid(title, kids),
      raw: event as unknown as Prisma.InputJsonValue,
    });

    if (result === "created") created++;
    else updated++;
  }

  await saveSyncState(calendar.id, nextSyncToken, calendar.syncToken);
  return { created, updated, deleted };
}

async function fetchGoogleEvents(
  cal: calendar_v3.Calendar,
  calendarId: string,
  syncToken: string | null | undefined
) {
  const events: calendar_v3.Schema$Event[] = [];
  let pageToken: string | undefined;
  let nextSyncToken: string | undefined;

  do {
    const params: calendar_v3.Params$Resource$Events$List = {
      calendarId,
      maxResults: 250,
      singleEvents: true,
      pageToken,
    };

    if (syncToken) {
      params.syncToken = syncToken;
    } else {
      const now = new Date();
      params.timeMin = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      params.timeMax = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();
    }

    const res = await cal.events.list(params);
    if (res.data.items) {
      events.push(...res.data.items);
    }
    pageToken = res.data.nextPageToken || undefined;
    nextSyncToken = res.data.nextSyncToken || undefined;
  } while (pageToken);

  return { events, syncToken: nextSyncToken };
}

export async function fetchGoogleCalendars(
  accessToken: string,
  refreshToken: string | null
) {
  const auth = getAuthenticatedClient(accessToken, refreshToken);
  const cal = google.calendar({ version: "v3", auth });
  const res = await cal.calendarList.list();
  return (res.data.items || []).map((c) => ({
    id: c.id,
    name: c.summary,
    primary: c.primary || false,
    color: c.backgroundColor,
  }));
}

function parseGoogleEventTime(
  time: calendar_v3.Schema$EventDateTime | undefined
): Date | null {
  if (!time) return null;
  if (time.dateTime) return new Date(time.dateTime);
  if (time.date) return new Date(time.date);
  return null;
}

function isGoneError(err: unknown): boolean {
  if (err && typeof err === "object" && "code" in err) {
    return (err as { code: number }).code === 410;
  }
  return false;
}

// --- Microsoft / Exchange Calendar Sync ---

interface MsGraphEvent {
  id: string;
  subject?: string;
  bodyPreview?: string;
  location?: { displayName?: string };
  start?: { dateTime: string; timeZone: string };
  end?: { dateTime: string; timeZone: string };
  isAllDay?: boolean;
  "@removed"?: { reason: string };
}

interface MsGraphResponse {
  value: MsGraphEvent[];
  "@odata.nextLink"?: string;
  "@odata.deltaLink"?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function syncMicrosoftCalendar(calendar: any): Promise<SyncResult> {
  if (!calendar.accessToken || !calendar.refreshToken) {
    throw new Error("Calendar has no access/refresh token");
  }

  // Refresh the access token
  const tokens = await refreshMicrosoftToken(calendar.refreshToken);
  await prisma.calendar.update({
    where: { id: calendar.id },
    data: {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    },
  });

  const accessToken = tokens.accessToken;
  const kids = calendar.user.kids;
  let created = 0;
  let updated = 0;
  let deleted = 0;

  let allEvents: MsGraphEvent[] = [];
  let deltaLink: string | undefined;

  if (calendar.syncToken) {
    // Delta sync using stored deltaLink
    try {
      const result = await fetchMicrosoftEvents(accessToken, calendar.syncToken);
      allEvents = result.events;
      deltaLink = result.deltaLink;
    } catch (err: unknown) {
      // If delta token expired (410 Gone or similar), fall back to full sync
      if (isMicrosoftSyncExpired(err)) {
        await prisma.calendar.update({
          where: { id: calendar.id },
          data: { syncToken: null },
        });
        const result = await fetchMicrosoftEventsFullSync(accessToken);
        allEvents = result.events;
        deltaLink = result.deltaLink;
      } else {
        throw err;
      }
    }
  } else {
    // Full sync
    const result = await fetchMicrosoftEventsFullSync(accessToken);
    allEvents = result.events;
    deltaLink = result.deltaLink;
  }

  for (const event of allEvents) {
    if (!event.id) continue;

    // Handle removed events in delta responses
    if (event["@removed"]) {
      deleted += await deleteEvent(calendar.id, event.id);
      continue;
    }

    const startTime = parseMicrosoftEventTime(event.start);
    const endTime = parseMicrosoftEventTime(event.end);
    if (!startTime || !endTime) continue;

    const title = event.subject || "(No title)";
    const result = await upsertEvent(calendar.id, event.id, {
      title,
      description: event.bodyPreview || null,
      location: event.location?.displayName || null,
      startTime,
      endTime,
      allDay: event.isAllDay || false,
      kidId: autoTagKid(title, kids),
      raw: event as unknown as Prisma.InputJsonValue,
    });

    if (result === "created") created++;
    else updated++;
  }

  await saveSyncState(calendar.id, deltaLink, calendar.syncToken);
  return { created, updated, deleted };
}

async function fetchMicrosoftEventsFullSync(
  accessToken: string
): Promise<{ events: MsGraphEvent[]; deltaLink?: string }> {
  const now = new Date();
  const startDateTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const endDateTime = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();

  // Use calendarView/delta for initial sync to get a deltaLink for future syncs
  const url =
    `https://graph.microsoft.com/v1.0/me/calendarView/delta` +
    `?startDateTime=${startDateTime}&endDateTime=${endDateTime}`;

  return fetchMicrosoftEvents(accessToken, url);
}

async function fetchMicrosoftEvents(
  accessToken: string,
  url: string
): Promise<{ events: MsGraphEvent[]; deltaLink?: string }> {
  const events: MsGraphEvent[] = [];
  let nextUrl: string | undefined = url;
  let deltaLink: string | undefined;

  while (nextUrl) {
    const res = await fetch(nextUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const status = res.status;
      const body = await res.text();
      const err = new Error(`Microsoft Graph API error: ${status} ${body}`);
      (err as unknown as Record<string, number>).statusCode = status;
      throw err;
    }

    const data = (await res.json()) as MsGraphResponse;
    events.push(...data.value);

    nextUrl = data["@odata.nextLink"];
    if (data["@odata.deltaLink"]) {
      deltaLink = data["@odata.deltaLink"];
    }
  }

  return { events, deltaLink };
}

function parseMicrosoftEventTime(
  time: { dateTime: string; timeZone: string } | undefined
): Date | null {
  if (!time?.dateTime) return null;
  // Microsoft returns dateTime without timezone offset for the specified timeZone.
  // For UTC or when timeZone is present, we append 'Z' if no offset is included.
  const dt = time.dateTime;
  if (dt.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(dt)) {
    return new Date(dt);
  }
  // Treat as UTC (Microsoft Graph default for calendarView)
  return new Date(dt + "Z");
}

function isMicrosoftSyncExpired(err: unknown): boolean {
  if (err && typeof err === "object" && "statusCode" in err) {
    const code = (err as { statusCode: number }).statusCode;
    return code === 410 || code === 404;
  }
  return false;
}

// --- Proton ICS Polling ---

export async function syncAllCalendars(): Promise<number> {
  const calendars = await prisma.calendar.findMany({
    where: { isActive: true },
    select: { id: true, provider: true },
  });

  let synced = 0;
  for (const cal of calendars) {
    try {
      await syncCalendar(cal.id);
      synced++;
    } catch (err) {
      console.error(`[calendar-sync] Failed to sync calendar ${cal.id} (${cal.provider}):`, err);
    }
  }
  return synced;
}

function paramVal(v: ParameterValue | undefined): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  return v.val;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function syncProtonIcsCalendar(calendar: any): Promise<SyncResult> {
  if (!calendar.icsUrl) {
    throw new Error("Calendar has no ICS URL configured");
  }

  // Fetch the ICS feed
  const res = await fetch(calendar.icsUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch ICS feed: ${res.status} ${res.statusText}`);
  }
  const icsText = await res.text();

  // Parse the ICS data
  const parsed = ical.parseICS(icsText);

  const kids = calendar.user.kids;
  let created = 0;
  let updated = 0;

  // Collect all UIDs we see in the feed for deletion detection
  const seenExternalIds = new Set<string>();

  for (const [, component] of Object.entries(parsed)) {
    if (!component || component.type !== "VEVENT") continue;
    const event = component as VEvent;
    if (!event.uid) continue;

    seenExternalIds.add(event.uid);

    const startTime = event.start ? new Date(event.start) : null;
    const endTime = event.end ? new Date(event.end) : startTime;
    if (!startTime || !endTime) continue;

    const allDay = event.datetype === "date";
    const title = paramVal(event.summary) || "(No title)";

    const result = await upsertEvent(calendar.id, event.uid, {
      title,
      description: paramVal(event.description) || null,
      location: paramVal(event.location) || null,
      startTime,
      endTime,
      allDay,
      kidId: autoTagKid(title, kids),
      raw: { uid: event.uid, summary: title, start: startTime.toISOString(), end: endTime.toISOString() } as unknown as Prisma.InputJsonValue,
    });

    if (result === "created") created++;
    else updated++;
  }

  // Delete events that are no longer in the feed
  const existingEvents = await prisma.calendarEvent.findMany({
    where: { calendarId: calendar.id },
    select: { externalId: true },
  });

  let deleted = 0;
  for (const existing of existingEvents) {
    if (existing.externalId && !seenExternalIds.has(existing.externalId)) {
      deleted += await deleteEvent(calendar.id, existing.externalId);
    }
  }

  // No sync token for ICS — just update lastSyncAt
  await saveSyncState(calendar.id, null, null);
  return { created, updated, deleted };
}
