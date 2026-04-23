import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { adminOnly } from '../middleware/adminOnly';
import { prisma } from '../config/db';

const router = Router();

router.get('/overview', authenticate, adminOnly, async (_req: AuthRequest, res: Response) => {
  const [
    totalUsers,
    totalItems,
    activeItems,
    totalOrders,
    completedOrders,
    pendingRefunds,
    lockerSlots,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.item.count(),
    prisma.item.count({ where: { status: 'ACTIVE' } }),
    prisma.order.count(),
    prisma.order.count({ where: { status: 'COMPLETED' } }),
    prisma.refund.count({ where: { status: { in: ['REQUESTED', 'PROCESSING'] } } }),
    prisma.lockerSlot.findMany({ select: { slotId: true, status: true } }),
  ]);

  const revenue = await prisma.walletTransaction.aggregate({
    _sum: { amount: true },
    where: { type: 'COMMISSION' },
  });

  const occupiedSlots = lockerSlots.filter((s) => s.status !== 'EMPTY').length;

  res.json({
    overview: {
      totalUsers,
      totalItems,
      activeItems,
      totalOrders,
      completedOrders,
      pendingRefunds,
      totalSlots: lockerSlots.length,
      occupiedSlots,
      platformRevenue: revenue._sum.amount ?? 0,
    },
  });
});

router.get('/transactions', authenticate, adminOnly, async (req: AuthRequest, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const skip = (page - 1) * limit;
  const type = req.query.type as string | undefined;

  const where = type ? { type: type as never } : {};
  const [total, transactions] = await Promise.all([
    prisma.walletTransaction.count({ where }),
    prisma.walletTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: { user: { select: { id: true, fullName: true, email: true } } },
    }),
  ]);

  res.json({ total, page, limit, transactions });
});

router.get('/audit-logs', authenticate, adminOnly, async (req: AuthRequest, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 50;
  const skip = (page - 1) * limit;
  const type = req.query.type as string | undefined;

  const where = type ? { type: type as never } : {};
  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
  ]);

  res.json({ total, page, limit, logs });
});

export default router;
