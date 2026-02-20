import { Router } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { authenticate, requireAdmin, type AuthRequest } from "../middleware/auth";

const router = Router();

router.use(authenticate, requireAdmin);

const createUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8),
});

// List all users
router.get(
  "/users",
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    res.json(users);
  })
);

// Create user
router.post(
  "/users",
  asyncHandler(async (req, res) => {
    const { name, email, password } = createUserSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new AppError(409, "Email already registered");
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name, email, passwordHash },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    res.status(201).json(user);
  })
);

// Delete user
router.delete(
  "/users/:id",
  asyncHandler(async (req: AuthRequest, res) => {
    const id = req.params.id as string;

    if (id === req.userId) {
      throw new AppError(400, "Cannot delete your own account");
    }

    await prisma.user.delete({ where: { id } });
    res.status(204).end();
  })
);

export default router;
