import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = Router();

router.use(authenticate);

// --- Schemas ---

const createPersonSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().optional(),
  phone: z.string().max(50).optional(),
  birthday: z.coerce.date().optional(),
  notes: z.string().max(10000).optional(),
  followUpDays: z.number().int().positive().optional(),
  tags: z.array(z.string().max(100)).max(20).optional(),
});

const updatePersonSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
  birthday: z.coerce.date().nullable().optional(),
  notes: z.string().max(10000).nullable().optional(),
  lastContactAt: z.coerce.date().nullable().optional(),
  followUpDays: z.number().int().positive().nullable().optional(),
  tags: z.array(z.string().max(100)).max(20).optional(),
});

const listQuerySchema = z.object({
  tag: z.string().optional(),
  search: z.string().optional(),
  needsFollowUp: z.enum(["true"]).optional(),
});

// --- Helpers ---

function paramId(req: AuthRequest): string {
  const id = req.params.id;
  if (Array.isArray(id)) return id[0];
  return id;
}

// --- Routes ---

// POST /people — Create a person
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const authReq = req as AuthRequest;
    const data = createPersonSchema.parse(req.body);

    const person = await prisma.person.create({
      data: { ...data, userId: authReq.userId! },
    });

    res.status(201).json(person);
  })
);

// GET /people — List user's people
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const authReq = req as AuthRequest;
    const query = listQuerySchema.parse(req.query);

    const where: Record<string, unknown> = { userId: authReq.userId! };

    if (query.tag) {
      where.tags = { has: query.tag };
    }

    if (query.search) {
      where.name = { contains: query.search, mode: "insensitive" };
    }

    const people = await prisma.person.findMany({
      where,
      orderBy: { name: "asc" },
    });

    // Post-filter for follow-up needed (can't easily express in Prisma)
    if (query.needsFollowUp) {
      const now = Date.now();
      const filtered = people.filter((p) => {
        if (!p.followUpDays) return false;
        if (!p.lastContactAt) return true;
        const daysSince = (now - p.lastContactAt.getTime()) / (1000 * 60 * 60 * 24);
        return daysSince >= p.followUpDays;
      });
      res.json(filtered);
      return;
    }

    res.json(people);
  })
);

// GET /people/:id — Get single person
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const authReq = req as AuthRequest;
    const id = paramId(authReq);

    const person = await prisma.person.findFirst({
      where: { id, userId: authReq.userId! },
    });

    if (!person) throw new AppError(404, "Person not found");

    res.json(person);
  })
);

// PATCH /people/:id — Update person
router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const authReq = req as AuthRequest;
    const id = paramId(authReq);
    const data = updatePersonSchema.parse(req.body);

    const existing = await prisma.person.findFirst({
      where: { id, userId: authReq.userId! },
    });
    if (!existing) throw new AppError(404, "Person not found");

    const person = await prisma.person.update({
      where: { id },
      data,
    });

    res.json(person);
  })
);

// POST /people/:id/contacted — Mark person as contacted now
router.post(
  "/:id/contacted",
  asyncHandler(async (req, res) => {
    const authReq = req as AuthRequest;
    const id = paramId(authReq);

    const existing = await prisma.person.findFirst({
      where: { id, userId: authReq.userId! },
    });
    if (!existing) throw new AppError(404, "Person not found");

    const person = await prisma.person.update({
      where: { id },
      data: { lastContactAt: new Date() },
    });

    res.json(person);
  })
);

// DELETE /people/:id — Delete person
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const authReq = req as AuthRequest;
    const id = paramId(authReq);

    const existing = await prisma.person.findFirst({
      where: { id, userId: authReq.userId! },
    });
    if (!existing) throw new AppError(404, "Person not found");

    await prisma.person.delete({ where: { id } });

    res.status(204).send();
  })
);

export default router;
