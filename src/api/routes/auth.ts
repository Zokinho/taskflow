import { Router } from "express";
import crypto from "crypto";
import bcrypt from "bcrypt";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../middleware/errorHandler";
import { AppError } from "../middleware/errorHandler";
import {
  authenticate,
  type AuthRequest,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../middleware/auth";
import { sendTelegramMessage } from "../../services/telegram";

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { error: "Too many requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(authLimiter);

// --- Schemas ---

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  timezone: z.string().optional(),
});

const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  telegramChatId: true,
  timezone: true,
  preferences: true,
  createdAt: true,
  updatedAt: true,
} as const;

const updateMeSchema = z.object({
  name: z.string().min(1).optional(),
  timezone: z.string().optional(),
  preferences: z.record(z.unknown()).optional(),
});

const refreshSchema = z.object({
  refreshToken: z.string(),
});

// --- Routes ---

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password, timezone } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new AppError(401, "Invalid credentials");
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new AppError(401, "Invalid credentials");
    }

    // Update timezone if provided
    const updatedUser = timezone
      ? await prisma.user.update({
          where: { id: user.id },
          data: { timezone },
          select: userSelect,
        })
      : await prisma.user.findUniqueOrThrow({
          where: { id: user.id },
          select: userSelect,
        });

    const accessToken = generateAccessToken(user.id);
    const refreshToken = await generateRefreshToken(user.id);

    res.json({
      user: updatedUser,
      accessToken,
      refreshToken,
    });
  })
);

router.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const { refreshToken } = refreshSchema.parse(req.body);

    const { userId, tokenId } = await verifyRefreshToken(refreshToken);

    // Single-use rotation: delete the old token
    await prisma.refreshToken.delete({ where: { id: tokenId } });

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: userSelect,
    });

    const newAccessToken = generateAccessToken(userId);
    const newRefreshToken = await generateRefreshToken(userId);

    res.json({
      user,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  })
);

// --- Password Reset ---

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  email: z.string().email(),
  code: z.string(),
  newPassword: z.string().min(8),
});

router.post(
  "/forgot-password",
  asyncHandler(async (req, res) => {
    const { email } = forgotPasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });

    if (user?.telegramChatId) {
      const code = crypto.randomBytes(3).toString("hex").toUpperCase();
      const prefs = (user.preferences as Record<string, unknown>) ?? {};

      await prisma.user.update({
        where: { id: user.id },
        data: {
          preferences: {
            ...prefs,
            passwordResetCode: code,
            passwordResetExpires: Date.now() + 15 * 60 * 1000,
          },
        },
      });

      await sendTelegramMessage(
        user.telegramChatId,
        `Your TaskFlow password reset code is: <b>${code}</b>\n\nThis code expires in 15 minutes. If you didn't request this, you can ignore it.`
      );
    }

    res.json({ success: true });
  })
);

router.post(
  "/reset-password",
  asyncHandler(async (req, res) => {
    const { email, code, newPassword } = resetPasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    const prefs = (user?.preferences as Record<string, unknown>) ?? {};

    const storedCode = prefs.passwordResetCode as string | undefined;
    const expires = prefs.passwordResetExpires as number | undefined;

    if (!user || !storedCode || !expires || storedCode !== code || Date.now() > expires) {
      throw new AppError(400, "Invalid or expired reset code");
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    const { passwordResetCode: _, passwordResetExpires: __, ...cleanPrefs } = prefs;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        preferences: cleanPrefs as Record<string, string | number | boolean>,
      },
    });

    // Invalidate all sessions
    await prisma.refreshToken.deleteMany({ where: { userId: user.id } });

    res.json({ success: true });
  })
);

// --- Protected endpoints ---

router.get(
  "/me",
  authenticate,
  asyncHandler(async (req: AuthRequest, res) => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: req.userId },
      select: userSelect,
    });
    res.json(user);
  })
);

router.patch(
  "/me",
  authenticate,
  asyncHandler(async (req: AuthRequest, res) => {
    const data = updateMeSchema.parse(req.body);

    // Merge preferences if provided
    let updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.timezone !== undefined) updateData.timezone = data.timezone;
    if (data.preferences !== undefined) {
      const existing = await prisma.user.findUniqueOrThrow({
        where: { id: req.userId },
        select: { preferences: true },
      });
      updateData.preferences = {
        ...(existing.preferences as Record<string, unknown> ?? {}),
        ...data.preferences,
      };
    }

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: updateData,
      select: userSelect,
    });
    res.json(user);
  })
);

const changePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(8),
});

router.post(
  "/change-password",
  authenticate,
  asyncHandler(async (req: AuthRequest, res) => {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: req.userId },
      select: { passwordHash: true },
    });

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      throw new AppError(401, "Current password is incorrect");
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: req.userId },
      data: { passwordHash },
    });

    res.json({ success: true });
  })
);

export default router;
