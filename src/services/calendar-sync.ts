import { google, calendar_v3 } from "googleapis";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { getAuthenticatedClient } from "./google-auth";

interface SyncResult {
  created: number;
  updated: number;
  deleted: number;
}

export async function syncCalendar(calendarId: string): Promise<SyncResult> {
  const calendar = await prisma.calendar.findUniqueOrThrow({
    where: { id: calendarId },
    include: { user: { include: { kids: true } } },
  });

  if (calendar.provider !== "GOOGLE") {
    throw new Error(`Sync not implemented for provider: ${calendar.provider}`);
  }

  if (!calendar.accessToken) {
    throw new Error("Calendar has no access token");
  }

  const auth = getAuthenticatedClient(
    calendar.accessToken,
    calendar.refreshToken
  );

  // Persist refreshed tokens when Google rotates them
  auth.on("tokens", async (tokens) => {
    const data: Record<string, string> = {};
    if (tokens.access_token) data.accessToken = tokens.access_token;
    if (tokens.refresh_token) data.refreshToken = tokens.refresh_token;
    if (Object.keys(data).length > 0) {
      await prisma.calendar.update({ where: { id: calendarId }, data });
    }
  });

  const cal = google.calendar({ version: "v3", auth });

  let allEvents: calendar_v3.Schema$Event[] = [];
  let nextSyncToken: string | undefined;

  try {
    const result = await fetchEvents(cal, calendar.externalId || "primary", calendar.syncToken);
    allEvents = result.events;
    nextSyncToken = result.syncToken;
  } catch (err: unknown) {
    // 410 Gone means syncToken is invalid — do a full sync
    if (isGoneError(err)) {
      await prisma.calendar.update({
        where: { id: calendarId },
        data: { syncToken: null },
      });
      const result = await fetchEvents(cal, calendar.externalId || "primary", null);
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
      const result = await prisma.calendarEvent.deleteMany({
        where: { calendarId, externalId: event.id },
      });
      deleted += result.count;
      continue;
    }

    const startTime = parseEventTime(event.start);
    const endTime = parseEventTime(event.end);
    if (!startTime || !endTime) continue;

    const allDay = !!event.start?.date;
    const title = event.summary || "(No title)";

    // Auto-tag kids by matching keywords against event title
    let kidId: string | null = null;
    const titleLower = title.toLowerCase();
    for (const kid of kids) {
      const match = kid.keywords.some((kw) =>
        titleLower.includes(kw.toLowerCase())
      );
      if (match) {
        kidId = kid.id;
        break;
      }
    }

    const eventData = {
      title,
      description: event.description || null,
      location: event.location || null,
      startTime,
      endTime,
      allDay,
      kidId,
      raw: event as unknown as Prisma.InputJsonValue,
    };

    const existing = await prisma.calendarEvent.findUnique({
      where: { calendarId_externalId: { calendarId, externalId: event.id } },
    });

    if (existing) {
      await prisma.calendarEvent.update({
        where: { id: existing.id },
        data: eventData,
      });
      updated++;
    } else {
      await prisma.calendarEvent.create({
        data: {
          calendarId,
          externalId: event.id,
          ...eventData,
        },
      });
      created++;
    }
  }

  // Save sync state
  await prisma.calendar.update({
    where: { id: calendarId },
    data: {
      syncToken: nextSyncToken || calendar.syncToken,
      lastSyncAt: new Date(),
    },
  });

  return { created, updated, deleted };
}

async function fetchEvents(
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
      // First sync: -30 days to +90 days
      const now = new Date();
      params.timeMin = new Date(
        now.getTime() - 30 * 24 * 60 * 60 * 1000
      ).toISOString();
      params.timeMax = new Date(
        now.getTime() + 90 * 24 * 60 * 60 * 1000
      ).toISOString();
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

function parseEventTime(
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
