import { z } from 'zod';
import { RefundStatus, OrderStatus } from '@prisma/client';
import { prisma } from '../config/db';
import { createAuditLog } from '../utils/audit';
import { creditWallet } from './walletService';
import { broadcastToAdmins } from '../ws/broadcaster';

export const requestRefundSchema = z.object({
  orderId: z.string().cuid(),
  reason: z.string().min(10).max(500),
});

function determineRefundPolicy(order: { holdEndsAt: Date; createdAt: Date }) {
  const now = Date.now();
  const created = order.createdAt.getTime();
  const hoursElapsed = (now - created) / (1000 * 60 * 60);

  if (hoursElapsed < 12) return { policy: 'FULL' as const, buyerRefundPct: 1.0, sellerFeePct: 0.0 };
  if (hoursElapsed < 24)
    return { policy: 'PARTIAL' as const, buyerRefundPct: 0.75, sellerFeePct: 0.25 };
  return { policy: 'DENY' as const, buyerRefundPct: 0.0, sellerFeePct: 1.0 };
}

export async function requestRefund(buyerId: string, data: z.infer<typeof requestRefundSchema>) {
  const order = await prisma.order.findUnique({ where: { id: data.orderId } });
  if (!order) throw Object.assign(new Error('Order not found'), { status: 404 });
  if (order.buyerId !== buyerId) throw Object.assign(new Error('Access denied'), { status: 403 });
  if (order.status !== 'HELD')
    throw Object.assign(new Error('Only HELD orders can be refunded'), { status: 400 });

  const existing = await prisma.refund.findUnique({ where: { orderId: data.orderId } });
  if (existing) throw Object.assign(new Error('Refund already requested'), { status: 409 });

  const { policy, buyerRefundPct, sellerFeePct } = determineRefundPolicy(order);
  const orderAmount = order.amount.toNumber();
  const buyerRefundAmount = orderAmount * buyerRefundPct;
  const sellerFeeAmount = orderAmount * sellerFeePct;

  const refund = await prisma.refund.create({
    data: {
      orderId: data.orderId,
      buyerId,
      sellerId: order.sellerId,
      amount: orderAmount,
      policy,
      buyerRefundAmount,
      sellerFeeAmount,
      status: policy === 'DENY' ? 'DENIED' : 'REQUESTED',
    },
  });

  await prisma.order.update({
    where: { id: data.orderId },
    data: { status: 'REFUND_REQUESTED' },
  });

  await createAuditLog('ORDER', buyerId, data.orderId, 'REFUND_REQUESTED', {
    policy,
    reason: data.reason,
  });
  broadcastToAdmins({ type: 'REFUND_UPDATE', refundId: refund.id, status: refund.status });

  return refund;
}

export async function processRefund(
  refundId: string,
  adminId: string,
  approved: boolean,
  adminNotes?: string,
  classificationResult?: Record<string, unknown>,
) {
  const refund = await prisma.refund.findUnique({
    where: { id: refundId },
    include: { order: { include: { item: true } } },
  });
  if (!refund) throw Object.assign(new Error('Refund not found'), { status: 404 });
  if (refund.status !== 'REQUESTED' && refund.status !== 'PROCESSING') {
    throw Object.assign(new Error('Refund already processed'), { status: 400 });
  }

  const newStatus = approved
    ? refund.policy === 'FULL'
      ? 'APPROVED'
      : 'PARTIAL_APPROVED'
    : 'DENIED';

  await prisma.refund.update({
    where: { id: refundId },
    data: {
      status: newStatus as RefundStatus,
      adminNotes,
      classificationResult: (classificationResult as object) ?? undefined,
      processedAt: new Date(),
    },
  });

  if (approved && refund.buyerRefundAmount.toNumber() > 0) {
    await creditWallet(
      refund.buyerId,
      refund.buyerRefundAmount.toNumber(),
      newStatus === 'APPROVED' ? 'REFUND' : 'PARTIAL_REFUND',
      refundId,
      `Refund for order ${refund.orderId}`,
    );
  }

  if (approved && refund.sellerFeeAmount.toNumber() > 0) {
    await creditWallet(
      refund.sellerId,
      refund.sellerFeeAmount.toNumber(),
      'SELLER_PAYOUT',
      refundId,
      `Partial seller share: order ${refund.orderId}`,
    );
  }

  const orderStatus = approved
    ? refund.policy === 'FULL'
      ? 'REFUNDED'
      : 'PARTIAL_REFUND'
    : 'COMPLETED';

  await prisma.order.update({
    where: { id: refund.orderId },
    data: { status: orderStatus as OrderStatus },
  });

  if (approved) {
    await prisma.item.update({ where: { id: refund.order.itemId }, data: { status: 'ACTIVE' } });
  }

  await createAuditLog('ORDER', adminId, refundId, `REFUND_${newStatus}`, { approved, adminNotes });
  broadcastToAdmins({ type: 'REFUND_UPDATE', refundId, status: newStatus });

  return prisma.refund.findUnique({ where: { id: refundId } });
}

export async function getAllRefunds(page = 1, limit = 20, status?: string) {
  const where = status ? { status: status as RefundStatus } : {};
  const skip = (page - 1) * limit;
  const [total, refunds] = await Promise.all([
    prisma.refund.count({ where }),
    prisma.refund.findMany({
      where,
      orderBy: { requestedAt: 'desc' },
      skip,
      take: limit,
      include: {
        order: { include: { item: { select: { id: true, title: true, imageUrl: true } } } },
        buyer: { select: { id: true, fullName: true, email: true } },
        seller: { select: { id: true, fullName: true, email: true } },
      },
    }),
  ]);
  return { total, page, limit, refunds };
}

export async function getRefundById(refundId: string, userId: string, isAdmin: boolean) {
  const refund = await prisma.refund.findUnique({
    where: { id: refundId },
    include: {
      order: { include: { item: true, events: { orderBy: { createdAt: 'asc' } } } },
      buyer: { select: { id: true, fullName: true, email: true } },
      seller: { select: { id: true, fullName: true, email: true } },
    },
  });
  if (!refund) throw Object.assign(new Error('Refund not found'), { status: 404 });
  if (!isAdmin && refund.buyerId !== userId && refund.sellerId !== userId) {
    throw Object.assign(new Error('Access denied'), { status: 403 });
  }
  return refund;
}
