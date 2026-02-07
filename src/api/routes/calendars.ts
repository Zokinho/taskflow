import { Router } from "express";
import { z } from "zod";
import jwt from "jsonwebtoken";
import { prisma } from "../../lib/prisma";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { authenticate, AuthRequest } from "../middleware/auth";
import { getAuthUrl, exchangeCode } from "../../services/google-auth";
import { syncCalendar } from "../../services/calendar-sync";

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// --- Schemas ---

const createCalendarSchema = z.object({
  provider: z.enum(["GOOGLE", "MICROSOFT", "EXCHANGE", "PROTON_ICS"]),
  name: z.string().min(1).max(200),
  externalId: z.string().max(500).optional(),
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
  icsUrl: z.string().url().optional(),
  color: z.string().max(20).optional(),
});

const updateCalendarSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  color: z.string().max(20).nullable().optional(),
  isActive: z.boolean().optional(),
  accessToken: z.string().nullable().optional(),
  refreshToken: z.string().nullable().optional(),
  icsUrl: z.string().url().nullable().optional(),
});

const eventsQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

// --- Helpers ---

function paramId(req: AuthRequest): string {
  const id = req.params.id;
  if (Array.isArray(id)) return id[0];
  return id;
}

// Strip sensitive tokens from calendar responses
function sanitize<T extends Record<string, unknown>>(calendar: T): Omit<T, "accessToken" | "refreshToken"> {
  const { accessToken: _, refreshToken: __, ...safe } = calendar;
  return safe;
}

// --- Google OAuth Routes (callback is public) ---

// GET /calendars/google/auth-url — Generate Google consent URL
router.get(
  "/google/auth-url",
  authenticate,
  asyncHandler(async (req, res) => {
    const authReq = req as AuthRequest;

    const state = jwt.sign(
      { sub: authReq.userId!, purpose: "google-oauth" },
      JWT_SECRET,
      { expiresIn: "10m" }
    );

    const url = getAuthUrl(state);
    res.json({ url });
  })
);

// GET /calendars/google/callback — Google redirects here (public, no JWT auth)
router.get(
  "/google/callback",
  asyncHandler(async (req, res) => {
    const { code, state, error } = req.query;

    if (error) {
      res.redirect(`${FRONTEND_URL}/calendars?google-error=${encodeURIComponent(String(error))}`);
      return;
    }

    if (!code || !state) {
      throw new AppError(400, "Missing code or state parameter");
    }

    // Verify state JWT
    let payload: { sub: string; purpose: string };
    try {
      payload = jwt.verify(String(state), JWT_SECRET) as { sub: string; purpose: string };
    } catch {
      throw new AppError(400, "Invalid or expired state parameter");
    }

    if (payload.purpose !== "google-oauth") {
      throw new AppError(400, "Invalid state purpose");
    }

    const userId = payload.sub;

    // Exchange code for tokens
    const tokens = await exchangeCode(String(code));

    if (!tokens.access_token) {
      throw new AppError(500, "Google did not return an access token");
    }

    // Create calendar record
    const calendar = await prisma.calendar.create({
      data: {
        userId,
        provider: "GOOGLE",
        name: "Google Calendar",
        externalId: "primary",
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || null,
      },
    });

    // Trigger initial sync in background (don't block redirect)
    syncCalendar(calendar.id).catch((err) => {
      console.error("Initial Google Calendar sync failed:", err);
    });

    res.redirect(`${FRONTEND_URL}/calendars?google-connected=true`);
  })
);

// --- Authenticated CRUD Routes ---

// POST /calendars — Add a calendar
router.post(
  "/",
  authenticate,
  asyncHandler(async (req, res) => {
    const authReq = req as AuthRequest;
    const data = createCalendarSchema.parse(req.body);

    const calendar = await prisma.calendar.create({
      data: { ...data, userId: authReq.userId! },
    });

    res.status(201).json(sanitize(calendar));
  })
);

// GET /calendars — List user's calendars
router.get(
  "/",
  authenticate,
  asyncHandler(async (req, res) => {
    const authReq = req as AuthRequest;

    const calendars = await prisma.calendar.findMany({
      where: { userId: authReq.userId! },
      orderBy: { name: "asc" },
    });

    res.json(calendars.map(sanitize));
  })
);

// GET /calendars/:id — Get single calendar
router.get(
  "/:id",
  authenticate,
  asyncHandler(async (req, res) => {
    const authReq = req as AuthRequest;
    const id = paramId(authReq);

    const calendar = await prisma.calendar.findFirst({
      where: { id, userId: authReq.userId! },
    });

    if (!calendar) throw new AppError(404, "Calendar not found");

    res.json(sanitize(calendar));
  })
);

// PATCH /calendars/:id — Update calendar
router.patch(
  "/:id",
  authenticate,
  asyncHandler(async (req, res) => {
    const authReq = req as AuthRequest;
    const id = paramId(authReq);
    const data = updateCalendarSchema.parse(req.body);

    const existing = await prisma.calendar.findFirst({
      where: { id, userId: authReq.userId! },
    });
    if (!existing) throw new AppError(404, "Calendar not found");

    const calendar = await prisma.calendar.update({
      where: { id },
      data,
    });

    res.json(sanitize(calendar));
  })
);

// DELETE /calendars/:id — Delete calendar (cascades to events)
router.delete(
  "/:id",
  authenticate,
  asyncHandler(async (req, res) => {
    const authReq = req as AuthRequest;
    const id = paramId(authReq);

    const existing = await prisma.calendar.findFirst({
      where: { id, userId: authReq.userId! },
    });
    if (!existing) throw new AppError(404, "Calendar not found");

    await prisma.calendar.delete({ where: { id } });

    res.status(204).send();
  })
);

// POST /calendars/:id/sync — Manual sync trigger
router.post(
  "/:id/sync",
  authenticate,
  asyncHandler(async (req, res) => {
    const authReq = req as AuthRequest;
    const id = paramId(authReq);

    const calendar = await prisma.calendar.findFirst({
      where: { id, userId: authReq.userId! },
    });
    if (!calendar) throw new AppError(404, "Calendar not found");

    if (calendar.provider !== "GOOGLE") {
      throw new AppError(400, "Sync is only supported for Google calendars");
    }

    const result = await syncCalendar(id);
    res.json(result);
  })
);

// GET /calendars/:id/events — List events for a calendar
router.get(
  "/:id/events",
  authenticate,
  asyncHandler(async (req, res) => {
    const authReq = req as AuthRequest;
    const id = paramId(authReq);
    const query = eventsQuerySchema.parse(req.query);

    // Verify calendar belongs to user
    const calendar = await prisma.calendar.findFirst({
      where: { id, userId: authReq.userId! },
    });
    if (!calendar) throw new AppError(404, "Calendar not found");

    const where: Record<string, unknown> = { calendarId: id };

    if (query.from || query.to) {
      const startTime: Record<string, Date> = {};
      if (query.from) startTime.gte = query.from;
      if (query.to) startTime.lte = query.to;
      where.startTime = startTime;
    }

    const events = await prisma.calendarEvent.findMany({
      where,
      orderBy: { startTime: "asc" },
    });

    res.json(events);
  })
);

export default router;
