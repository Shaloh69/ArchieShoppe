import { Router, Response } from 'express';
import { WalletTxnType, AuditType } from '@prisma/client';
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

  const where = type ? { type: type as WalletTxnType } : {};
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

  const where = type ? { type: type as AuditType } : {};
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

router.get('/daily', authenticate, adminOnly, async (req: AuthRequest, res: Response) => {
  const days = Math.min(Number(req.query.days) || 30, 90);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const txns = await prisma.walletTransaction.findMany({
    where: { createdAt: { gte: since } },
    select: { type: true, amount: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  type DayBucket = {
    sales_count: number;
    sales_total: number;
    commission_count: number;
    commission_total: number;
    refund_count: number;
    refund_total: number;
    payout_count: number;
    payout_total: number;
    topup_count: number;
    topup_total: number;
  };

  const empty = (): DayBucket => ({
    sales_count: 0,
    sales_total: 0,
    commission_count: 0,
    commission_total: 0,
    refund_count: 0,
    refund_total: 0,
    payout_count: 0,
    payout_total: 0,
    topup_count: 0,
    topup_total: 0,
  });

  const byDay: Record<string, DayBucket> = {};

  for (const t of txns) {
    const day = t.createdAt.toISOString().slice(0, 10);
    if (!byDay[day]) byDay[day] = empty();
    const amt = t.amount.toNumber();
    switch (t.type) {
      case 'PURCHASE':
        byDay[day].sales_count++;
        byDay[day].sales_total += amt;
        break;
      case 'COMMISSION':
        byDay[day].commission_count++;
        byDay[day].commission_total += amt;
        break;
      case 'REFUND':
      case 'PARTIAL_REFUND':
        byDay[day].refund_count++;
        byDay[day].refund_total += amt;
        break;
      case 'SELLER_PAYOUT':
        byDay[day].payout_count++;
        byDay[day].payout_total += amt;
        break;
      case 'TOP_UP':
        byDay[day].topup_count++;
        byDay[day].topup_total += amt;
        break;
    }
  }

  const rows = Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({ date, ...data }));

  res.json({ rows, days });
});

export default router;
