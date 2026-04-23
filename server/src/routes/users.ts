import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { adminOnly } from '../middleware/adminOnly';
import { prisma } from '../config/db';
import { createAuditLog } from '../utils/audit';

const router = Router();

const updateProfileSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
});

const adminUpdateUserSchema = z.object({
  role: z.enum(['BUYER', 'SELLER', 'ADMIN']).optional(),
  isVerified: z.boolean().optional(),
});

router.get('/admin/all', authenticate, adminOnly, async (req: AuthRequest, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const [total, users] = await Promise.all([
    prisma.user.count(),
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        walletBalance: true,
        isVerified: true,
        createdAt: true,
        _count: { select: { items: true, buyerOrders: true, sellerOrders: true } },
      },
    }),
  ]);

  res.json({ total, page, limit, users });
});

router.get('/admin/:id', authenticate, adminOnly, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      walletBalance: true,
      isVerified: true,
      createdAt: true,
      items: {
        select: { id: true, title: true, status: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
      buyerOrders: {
        select: { id: true, status: true, amount: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  });
  if (!user) {
    res.status(404).json({ message: 'User not found' });
    return;
  }
  res.json({ user });
});

router.patch('/admin/:id', authenticate, adminOnly, async (req: AuthRequest, res: Response) => {
  const parsed = adminUpdateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ message: 'Validation error', errors: parsed.error.flatten().fieldErrors });
    return;
  }
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: parsed.data,
    select: { id: true, email: true, fullName: true, role: true, isVerified: true },
  });
  await createAuditLog('ADMIN', req.user!.userId, req.params.id, 'USER_UPDATED', parsed.data);
  res.json({ user });
});

router.patch('/me', authenticate, async (req: AuthRequest, res: Response) => {
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ message: 'Validation error', errors: parsed.error.flatten().fieldErrors });
    return;
  }
  const user = await prisma.user.update({
    where: { id: req.user!.userId },
    data: parsed.data,
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      walletBalance: true,
      isVerified: true,
    },
  });
  res.json({ user });
});

export default router;
