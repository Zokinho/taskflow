import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = Router();

router.use(authenticate);

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

// --- Routes ---

// POST /calendars — Add a calendar
router.post(
  "/",
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

// GET /calendars/:id/events — List events for a calendar
router.get(
  "/:id/events",
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
