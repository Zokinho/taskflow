import { Router } from "express";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "../../lib/prisma";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = Router();

router.use(authenticate);

// --- Helpers ---

function paramId(req: AuthRequest): string {
  const id = req.params.id;
  if (Array.isArray(id)) return id[0];
  return id;
}

const listQuerySchema = z.object({
  type: z
    .enum(["BIRTHDAY", "FOLLOW_UP", "MORNING_BRIEFING", "EVENING_REVIEW", "CUSTOM"])
    .optional(),
  unsent: z.enum(["true"]).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

// --- Telegram linking (before /:id routes) ---

// GET /reminders/telegram/link-code — Generate a 6-char code
router.get(
  "/telegram/link-code",
  asyncHandler(async (req, res) => {
    const authReq = req as AuthRequest;
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: authReq.userId! },
    });

    if (user.telegramChatId) {
      res.json({ linked: true, chatId: user.telegramChatId });
      return;
    }

    const code = crypto.randomBytes(3).toString("hex").toUpperCase();

    await prisma.user.update({
      where: { id: user.id },
      data: {
        preferences: {
          ...(user.preferences as Record<string, unknown>),
          telegramLinkCode: code,
        },
      },
    });

    res.json({ linked: false, code });
  })
);

// DELETE /reminders/telegram/unlink — Clear telegramChatId
router.delete(
  "/telegram/unlink",
  asyncHandler(async (req, res) => {
    const authReq = req as AuthRequest;

    await prisma.user.update({
      where: { id: authReq.userId! },
      data: { telegramChatId: null },
    });

    res.json({ unlinked: true });
  })
);

// POST /reminders/dismiss-all — Dismiss all due reminders
router.post(
  "/dismiss-all",
  asyncHandler(async (req, res) => {
    const authReq = req as AuthRequest;
    const now = new Date();

    const allPending = await prisma.reminder.findMany({
      where: {
        userId: authReq.userId!,
        scheduledAt: { lte: now },
      },
    });

    const toDismiss = allPending.filter((r) => {
      const meta = r.metadata as Record<string, unknown> | null;
      return !meta?.dismissedAt;
    });

    let count = 0;
    for (const r of toDismiss) {
      await prisma.reminder.update({
        where: { id: r.id },
        data: {
          metadata: {
            ...((r.metadata as Record<string, unknown>) || {}),
            dismissedAt: now.toISOString(),
          },
        },
      });
      count++;
    }

    res.json({ dismissed: count });
  })
);

// --- Standard CRUD ---

// GET /reminders — List reminders
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const authReq = req as AuthRequest;
    const query = listQuerySchema.parse(req.query);

    const where: Record<string, unknown> = { userId: authReq.userId! };

    if (query.type) where.type = query.type;

    if (query.from || query.to) {
      const scheduledAt: Record<string, Date> = {};
      if (query.from) scheduledAt.gte = query.from;
      if (query.to) scheduledAt.lte = query.to;
      where.scheduledAt = scheduledAt;
    }

    const reminders = await prisma.reminder.findMany({
      where,
      orderBy: { scheduledAt: "desc" },
      take: query.limit || 50,
    });

    // Filter unsent in JS (sentAt is simpler to check here)
    const result =
      query.unsent === "true"
        ? reminders.filter((r) => !r.sentAt)
        : reminders;

    res.json(result);
  })
);

// GET /reminders/:id — Get single reminder
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const authReq = req as AuthRequest;
    const id = paramId(authReq);

    const reminder = await prisma.reminder.findFirst({
      where: { id, userId: authReq.userId! },
    });

    if (!reminder) throw new AppError(404, "Reminder not found");

    res.json(reminder);
  })
);

// POST /reminders/:id/dismiss — Dismiss a reminder
router.post(
  "/:id/dismiss",
  asyncHandler(async (req, res) => {
    const authReq = req as AuthRequest;
    const id = paramId(authReq);

    const reminder = await prisma.reminder.findFirst({
      where: { id, userId: authReq.userId! },
    });

    if (!reminder) throw new AppError(404, "Reminder not found");

    const updated = await prisma.reminder.update({
      where: { id },
      data: {
        metadata: {
          ...((reminder.metadata as Record<string, unknown>) || {}),
          dismissedAt: new Date().toISOString(),
        },
      },
    });

    res.json(updated);
  })
);

export default router;
