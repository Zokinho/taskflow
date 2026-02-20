import { Router } from "express";
import bcrypt from "bcrypt";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../middleware/errorHandler";
import { AppError } from "../middleware/errorHandler";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../middleware/auth";

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
});

const refreshSchema = z.object({
  refreshToken: z.string(),
});

// --- Routes ---

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new AppError(401, "Invalid credentials");
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new AppError(401, "Invalid credentials");
    }

    const accessToken = generateAccessToken(user.id);
    const refreshToken = await generateRefreshToken(user.id);

    res.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
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
      select: { id: true, email: true, name: true, role: true },
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

export default router;
