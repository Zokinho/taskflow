import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = Router();

router.use(authenticate);

// --- Schemas ---

const createKidSchema = z.object({
  name: z.string().min(1).max(200),
  birthday: z.coerce.date().optional(),
  notes: z.string().max(10000).optional(),
  keywords: z.array(z.string().max(100)).max(20).optional(),
});

const updateKidSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  birthday: z.coerce.date().nullable().optional(),
  notes: z.string().max(10000).nullable().optional(),
  keywords: z.array(z.string().max(100)).max(20).optional(),
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

// --- Routes ---

// POST /kids — Add a kid
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const authReq = req as AuthRequest;
    const data = createKidSchema.parse(req.body);

    const kid = await prisma.kid.create({
      data: { ...data, userId: authReq.userId! },
    });

    res.status(201).json(kid);
  })
);

// GET /kids — List user's kids
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const authReq = req as AuthRequest;

    const kids = await prisma.kid.findMany({
      where: { userId: authReq.userId! },
      orderBy: { name: "asc" },
    });

    res.json(kids);
  })
);

// GET /kids/:id — Get single kid
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const authReq = req as AuthRequest;
    const id = paramId(authReq);

    const kid = await prisma.kid.findFirst({
      where: { id, userId: authReq.userId! },
    });

    if (!kid) throw new AppError(404, "Kid not found");

    res.json(kid);
  })
);

// PATCH /kids/:id — Update kid
router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const authReq = req as AuthRequest;
    const id = paramId(authReq);
    const data = updateKidSchema.parse(req.body);

    const existing = await prisma.kid.findFirst({
      where: { id, userId: authReq.userId! },
    });
    if (!existing) throw new AppError(404, "Kid not found");

    const kid = await prisma.kid.update({
      where: { id },
      data,
    });

    res.json(kid);
  })
);

// DELETE /kids/:id — Delete kid
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const authReq = req as AuthRequest;
    const id = paramId(authReq);

    const existing = await prisma.kid.findFirst({
      where: { id, userId: authReq.userId! },
    });
    if (!existing) throw new AppError(404, "Kid not found");

    await prisma.kid.delete({ where: { id } });

    res.status(204).send();
  })
);

// GET /kids/:id/events — List events tagged with this kid
router.get(
  "/:id/events",
  asyncHandler(async (req, res) => {
    const authReq = req as AuthRequest;
    const id = paramId(authReq);
    const query = eventsQuerySchema.parse(req.query);

    const kid = await prisma.kid.findFirst({
      where: { id, userId: authReq.userId! },
    });
    if (!kid) throw new AppError(404, "Kid not found");

    const where: Record<string, unknown> = { kidId: id };

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
