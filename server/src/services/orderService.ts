import { z } from 'zod';
import { OrderStatus } from '@prisma/client';
import { prisma } from '../config/db';
import { generatePersonalCode } from '../utils/codeGenerator';
import { createAuditLog } from '../utils/audit';
import { debitWallet, creditWallet } from './walletService';
import { broadcastToAdmins } from '../ws/broadcaster';
import { getPlatformFeeRate } from './configService';

export const createOrderSchema = z.object({
  itemId: z.string().cuid(),
});

const HOLD_HOURS = 24;

export async function createOrder(buyerId: string, data: z.infer<typeof createOrderSchema>) {
  const item = await prisma.item.findUnique({
    where: { id: data.itemId },
    include: { seller: { select: { id: true } } },
  });
  if (!item) throw Object.assign(new Error('Item not found'), { status: 404 });
  if (item.status !== 'ACTIVE')
    throw Object.assign(new Error('Item is not available'), { status: 400 });
  if (item.sellerId === buyerId)
    throw Object.assign(new Error('Cannot buy your own item'), { status: 400 });
  if (!item.slotId)
    throw Object.assign(new Error('Item has no locker slot assigned'), { status: 400 });

  const feeRate = await getPlatformFeeRate();
  const basePrice = item.price.toNumber();
  const serviceFee = Math.ceil(basePrice * feeRate * 100) / 100;
  const totalAmount = Math.ceil((basePrice + serviceFee) * 100) / 100; // what buyer pays
  const holdEndsAt = new Date(Date.now() + HOLD_HOURS * 60 * 60 * 1000);

  let personalCode: string;
  let attempts = 0;
  do {
    personalCode = generatePersonalCode();
    const exists = await prisma.order.findUnique({ where: { personalCode } });
    if (!exists) break;
    attempts++;
  } while (attempts < 10);

  // Buyer pays base price + 5% service fee
  await debitWallet(
    buyerId,
    totalAmount,
    'PURCHASE',
    undefined,
    `Purchase: ${item.title} (incl. ₱${serviceFee} service fee)`,
  );

  const order = await prisma.$transaction(async (tx) => {
    await tx.item.update({ where: { id: item.id }, data: { status: 'PENDING' } });
    return tx.order.create({
      data: {
        itemId: item.id,
        buyerId,
        sellerId: item.sellerId,
        amount: totalAmount, // total charged to buyer (base + service fee)
        slotId: item.slotId!,
        personalCode: personalCode!,
        holdEndsAt,
        status: 'HELD',
      },
      include: {
        item: { select: { id: true, title: true, slotId: true } },
        buyer: { select: { id: true, fullName: true } },
        seller: { select: { id: true, fullName: true } },
      },
    });
  });

  await prisma.orderEvent.create({
    data: {
      orderId: order.id,
      event: 'ORDER_CREATED',
      actor: buyerId,
      metadata: { basePrice, serviceFee, totalAmount },
    },
  });

  await createAuditLog('ORDER', buyerId, order.id, 'ORDER_CREATED', {
    itemId: item.id,
    basePrice,
    serviceFee,
    totalAmount,
  });
  broadcastToAdmins({ type: 'ORDER_UPDATE', orderId: order.id, status: 'HELD' });

  return { ...order, serviceFee, basePrice };
}

export async function completeOrder(orderId: string, actorId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { item: true },
  });
  if (!order) throw Object.assign(new Error('Order not found'), { status: 404 });
  if (order.status !== 'HELD')
    throw Object.assign(new Error('Order cannot be completed'), { status: 400 });

  // Use the same dynamic fee rate as createOrder so payouts are always consistent.
  // Seller receives base price = totalAmount / (1 + feeRate); platform keeps the rest.
  const feeRate = await getPlatformFeeRate();
  const totalAmount = order.amount.toNumber();
  const sellerPayout = Math.floor((totalAmount / (1 + feeRate)) * 100) / 100;
  const platformCommission = Math.round((totalAmount - sellerPayout) * 100) / 100;

  await prisma.$transaction(async (tx) => {
    await tx.order.update({ where: { id: orderId }, data: { status: 'COMPLETED' } });
    await tx.item.update({ where: { id: order.itemId }, data: { status: 'SOLD' } });
  });

  await creditWallet(
    order.sellerId,
    sellerPayout,
    'SELLER_PAYOUT',
    orderId,
    `Sale: ${order.item.title}`,
  );
  await prisma.walletTransaction.create({
    data: {
      userId: order.sellerId,
      type: 'COMMISSION',
      amount: platformCommission,
      referenceId: orderId,
      description: 'Platform commission',
    },
  });

  await prisma.orderEvent.create({
    data: { orderId, event: 'ORDER_COMPLETED', actor: actorId },
  });

  await createAuditLog('ORDER', actorId, orderId, 'ORDER_COMPLETED', null);
  broadcastToAdmins({ type: 'ORDER_UPDATE', orderId, status: 'COMPLETED' });

  return prisma.order.findUnique({
    where: { id: orderId },
    include: {
      item: { select: { id: true, title: true, imageUrl: true } },
      buyer: { select: { id: true, fullName: true } },
      seller: { select: { id: true, fullName: true } },
    },
  });
}

export async function getOrdersByBuyer(buyerId: string, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const [total, orders] = await Promise.all([
    prisma.order.count({ where: { buyerId } }),
    prisma.order.findMany({
      where: { buyerId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        item: { select: { id: true, title: true, imageUrl: true, category: true } },
        seller: { select: { id: true, fullName: true, avatarUrl: true } },
        refund: true,
        review: { select: { id: true, rating: true, comment: true, createdAt: true } },
        events: { orderBy: { createdAt: 'asc' } },
      },
    }),
  ]);
  return { total, page, limit, orders };
}

export async function getOrdersBySeller(sellerId: string, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const [total, orders] = await Promise.all([
    prisma.order.count({ where: { sellerId } }),
    prisma.order.findMany({
      where: { sellerId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        item: { select: { id: true, title: true, imageUrl: true } },
        buyer: { select: { id: true, fullName: true, avatarUrl: true } },
        refund: true,
        events: { orderBy: { createdAt: 'asc' } },
      },
    }),
  ]);
  return { total, page, limit, orders };
}

export async function getOrderById(orderId: string, userId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      item: true,
      buyer: { select: { id: true, fullName: true, email: true } },
      seller: { select: { id: true, fullName: true, email: true } },
      refund: true,
      events: { orderBy: { createdAt: 'asc' } },
    },
  });
  if (!order) throw Object.assign(new Error('Order not found'), { status: 404 });
  if (order.buyerId !== userId && order.sellerId !== userId) {
    throw Object.assign(new Error('Access denied'), { status: 403 });
  }
  return order;
}

export async function getAllOrders(page = 1, limit = 20, status?: string) {
  const where = status ? { status: status as OrderStatus } : {};
  const skip = (page - 1) * limit;
  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        item: { select: { id: true, title: true, imageUrl: true } },
        buyer: { select: { id: true, fullName: true, email: true } },
        seller: { select: { id: true, fullName: true, email: true } },
      },
    }),
  ]);
  return { total, page, limit, orders };
}

export async function releaseExpiredHolds() {
  const now = new Date();
  const expired = await prisma.order.findMany({
    where: { status: 'HELD', holdEndsAt: { lt: now } },
    include: { item: true },
  });

  const feeRate = await getPlatformFeeRate();
  for (const order of expired) {
    const totalAmount = order.amount.toNumber();
    const sellerPayout = Math.floor((totalAmount / (1 + feeRate)) * 100) / 100;
    await prisma.$transaction(async (tx) => {
      await tx.order.update({ where: { id: order.id }, data: { status: 'COMPLETED' } });
      await tx.item.update({ where: { id: order.itemId }, data: { status: 'SOLD' } });
    });
    await creditWallet(
      order.sellerId,
      sellerPayout,
      'SELLER_PAYOUT',
      order.id,
      `Auto-release: ${order.item.title}`,
    );
    await prisma.orderEvent.create({
      data: { orderId: order.id, event: 'HOLD_EXPIRED_AUTO_COMPLETE', actor: 'SYSTEM' },
    });
    broadcastToAdmins({
      type: 'ORDER_UPDATE',
      orderId: order.id,
      status: 'COMPLETED',
      source: 'CRON',
    });
  }

  return expired.length;
}
