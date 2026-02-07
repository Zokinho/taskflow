import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = Router();

router.use(authenticate);

// --- Schemas ---

const createTaskSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  dueDate: z.coerce.date().optional(),
  scheduledStart: z.coerce.date().optional(),
  scheduledEnd: z.coerce.date().optional(),
  estimatedMins: z.number().int().positive().optional(),
  notes: z.string().max(10000).optional(),
  tags: z.array(z.string().max(100)).max(20).optional(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).nullable().optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE", "CANCELLED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  dueDate: z.coerce.date().nullable().optional(),
  scheduledStart: z.coerce.date().nullable().optional(),
  scheduledEnd: z.coerce.date().nullable().optional(),
  estimatedMins: z.number().int().positive().nullable().optional(),
  notes: z.string().max(10000).nullable().optional(),
  tags: z.array(z.string().max(100)).max(20).optional(),
});

const listQuerySchema = z.object({
  status: z.enum(["TODO", "IN_PROGRESS", "DONE", "CANCELLED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  tag: z.string().optional(),
  dueBefore: z.coerce.date().optional(),
  dueAfter: z.coerce.date().optional(),
  all: z.enum(["true"]).optional(),
});

// --- Helpers ---

function paramId(req: AuthRequest): string {
  const id = req.params.id;
  if (Array.isArray(id)) return id[0];
  return id;
}

// --- Routes ---

// POST /tasks — Create a task
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const authReq = req as AuthRequest;
    const data = createTaskSchema.parse(req.body);

    const task = await prisma.task.create({
      data: { ...data, userId: authReq.userId! },
    });

    res.status(201).json(task);
  })
);

// GET /tasks — List user's tasks
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const authReq = req as AuthRequest;
    const query = listQuerySchema.parse(req.query);

    const where: Record<string, unknown> = { userId: authReq.userId! };

    if (query.status) {
      where.status = query.status;
    } else if (!query.all) {
      where.status = { notIn: ["DONE", "CANCELLED"] };
    }

    if (query.priority) {
      where.priority = query.priority;
    }

    if (query.tag) {
      where.tags = { has: query.tag };
    }

    if (query.dueBefore || query.dueAfter) {
      const dueDate: Record<string, Date> = {};
      if (query.dueBefore) dueDate.lte = query.dueBefore;
      if (query.dueAfter) dueDate.gte = query.dueAfter;
      where.dueDate = dueDate;
    }

    const tasks = await prisma.task.findMany({
      where,
      orderBy: [{ dueDate: "asc" }, { priority: "desc" }],
    });

    res.json(tasks);
  })
);

// GET /tasks/:id — Get single task
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const authReq = req as AuthRequest;
    const id = paramId(authReq);

    const task = await prisma.task.findFirst({
      where: { id, userId: authReq.userId! },
    });

    if (!task) throw new AppError(404, "Task not found");

    res.json(task);
  })
);

// PATCH /tasks/:id — Update task
router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const authReq = req as AuthRequest;
    const id = paramId(authReq);
    const data = updateTaskSchema.parse(req.body);

    // Verify task belongs to user
    const existing = await prisma.task.findFirst({
      where: { id, userId: authReq.userId! },
    });
    if (!existing) throw new AppError(404, "Task not found");

    // Auto-manage completedAt
    if (data.status === "DONE" && existing.status !== "DONE") {
      (data as Record<string, unknown>).completedAt = new Date();
    } else if (data.status && data.status !== "DONE" && existing.status === "DONE") {
      (data as Record<string, unknown>).completedAt = null;
    }

    const task = await prisma.task.update({
      where: { id },
      data,
    });

    res.json(task);
  })
);

// DELETE /tasks/:id — Delete task
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const authReq = req as AuthRequest;
    const id = paramId(authReq);

    const existing = await prisma.task.findFirst({
      where: { id, userId: authReq.userId! },
    });
    if (!existing) throw new AppError(404, "Task not found");

    await prisma.task.delete({ where: { id } });

    res.status(204).send();
  })
);

export default router;
