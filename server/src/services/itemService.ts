import { z } from 'zod';
import { prisma } from '../config/db';
import { debitWallet } from './walletService';
import { createAuditLog } from '../utils/audit';
import { broadcastToAdmins } from '../ws/broadcaster';
import { generatePersonalCode } from '../utils/codeGenerator';
import { getPlatformFeeRate } from './configService';

export function withDisplayPrice<T extends { price: { toNumber(): number } }>(
  item: T,
  feeRate: number,
) {
  const base = item.price.toNumber();
  return {
    ...item,
    displayPrice: Math.ceil(base * (1 + feeRate) * 100) / 100,
    serviceFee: Math.ceil(base * feeRate * 100) / 100,
  };
}

export const createItemSchema = z.object({
  title: z.string().min(3).max(200),
  category: z.string().min(1).max(100),
  condition: z.enum(['NEW', 'LIKE_NEW', 'GOOD', 'FAIR']),
  price: z.number().positive().max(100000),
  description: z.string().min(10).max(2000),
  subscriptionPlanId: z.string().cuid(),
});

export const updateItemSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  category: z.string().min(1).max(100).optional(),
  condition: z.enum(['NEW', 'LIKE_NEW', 'GOOD', 'FAIR']).optional(),
  price: z.number().positive().max(100000).optional(),
  description: z.string().min(10).max(2000).optional(),
});

export const browseSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  category: z.string().optional(),
  condition: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['price_asc', 'price_desc', 'newest']).default('newest'),
});

export async function browseItems(query: z.infer<typeof browseSchema>, userId?: string) {
  const { page, limit, category, condition, minPrice, maxPrice, search, sortBy } = query;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { status: 'ACTIVE' };
  if (category) where['category'] = category;
  if (condition) where['condition'] = condition;
  if (minPrice !== undefined || maxPrice !== undefined) {
    where['price'] = {};
    if (minPrice !== undefined) (where['price'] as Record<string, unknown>)['gte'] = minPrice;
    if (maxPrice !== undefined) (where['price'] as Record<string, unknown>)['lte'] = maxPrice;
  }
  if (search) {
    where['OR'] = [{ title: { contains: search } }, { description: { contains: search } }];
  }

  const orderBy =
    sortBy === 'price_asc'
      ? { price: 'asc' as const }
      : sortBy === 'price_desc'
        ? { price: 'desc' as const }
        : { createdAt: 'desc' as const };

  const [total, raw, feeRate] = await Promise.all([
    prisma.item.count({ where: where as never }),
    prisma.item.findMany({
      where: where as never,
      orderBy,
      skip,
      take: limit,
      include: {
        seller: { select: { id: true, fullName: true, avatarUrl: true } },
        slot: { select: { slotId: true, status: true } },
        _count: { select: { wishlist: true } },
      },
    }),
    getPlatformFeeRate(),
  ]);

  let savedSet = new Set<string>();
  if (userId) {
    const saved = await prisma.wishlist.findMany({
      where: { userId, itemId: { in: raw.map((i) => i.id) } },
      select: { itemId: true },
    });
    savedSet = new Set(saved.map((s) => s.itemId));
  }

  return {
    total,
    page,
    limit,
    items: raw.map((item) => ({
      ...withDisplayPrice(item, feeRate),
      savedCount: item._count.wishlist,
      isSaved: savedSet.has(item.id),
    })),
  };
}

export async function getItemById(itemId: string, userId?: string) {
  const [item, feeRate] = await Promise.all([
    prisma.item.findUnique({
      where: { id: itemId },
      include: {
        seller: { select: { id: true, fullName: true, avatarUrl: true } },
        slot: { select: { slotId: true, status: true } },
        subscriptionPlan: true,
        _count: { select: { wishlist: true } },
      },
    }),
    getPlatformFeeRate(),
  ]);
  if (!item) throw Object.assign(new Error('Item not found'), { status: 404 });

  let isSaved = false;
  if (userId) {
    const entry = await prisma.wishlist.findUnique({
      where: { userId_itemId: { userId, itemId } },
    });
    isSaved = !!entry;
  }

  return {
    ...withDisplayPrice(item, feeRate),
    savedCount: item._count.wishlist,
    isSaved,
  };
}

export async function createItem(
  sellerId: string,
  data: z.infer<typeof createItemSchema>,
  imageUrl?: string,
) {
  const plan = await prisma.lockerSubscriptionPlan.findUnique({
    where: { id: data.subscriptionPlanId },
  });
  if (!plan) throw Object.assign(new Error('Subscription plan not found'), { status: 404 });

  const slot = await prisma.lockerSlot.findFirst({ where: { status: 'EMPTY', currentItem: null } });
  if (!slot) throw Object.assign(new Error('No locker slots available'), { status: 503 });

  const planPrice = plan.price.toNumber();
  await debitWallet(
    sellerId,
    planPrice,
    'SLOT_RENTAL',
    undefined,
    `Slot rental: ${plan.name} (${plan.durationDays}d @ ₱${(planPrice / plan.durationDays).toFixed(2)}/day)`,
  );

  // Generate unique seller kiosk code — shown in the app, entered at the kiosk to unlock the slot
  let sellerCode: string;
  let attempts = 0;
  do {
    sellerCode = generatePersonalCode();
    const exists = await prisma.item.findUnique({ where: { sellerCode } });
    if (!exists) break;
    attempts++;
  } while (attempts < 10);

  const subscriptionEndsAt = new Date(Date.now() + plan.durationDays * 24 * 60 * 60 * 1000);

  const item = await prisma.item.create({
    data: {
      title: data.title,
      category: data.category,
      condition: data.condition,
      price: data.price,
      description: data.description,
      imageUrl,
      sellerCode: sellerCode!,
      sellerId,
      status: 'DRAFT',
      slotId: slot.slotId,
      subscriptionPlanId: data.subscriptionPlanId,
      subscriptionEndsAt,
    },
    include: {
      seller: { select: { id: true, fullName: true } },
      slot: { select: { slotId: true } },
      subscriptionPlan: true,
    },
  });

  await createAuditLog('ORDER', sellerId, item.id, 'ITEM_CREATED', {
    slotId: slot.slotId,
    plan: plan.planKey,
    sellerCode: sellerCode!,
  });
  broadcastToAdmins({ type: 'ITEM_UPDATE', itemId: item.id, status: 'DRAFT' });

  const feeRate = await getPlatformFeeRate();
  return withDisplayPrice(item, feeRate);
}

/**
 * Validate a seller's kiosk code and return the item + slot info.
 * The caller (route handler) is responsible for triggering the slot unlock via WebSocket.
 * Only works for ACTIVE items — admin must have approved the listing first.
 */
export async function verifySellerCode(code: string) {
  const item = await prisma.item.findFirst({
    where: { sellerCode: code, status: 'ACTIVE' },
    include: {
      seller: { select: { id: true, fullName: true } },
      slot: { select: { slotId: true, status: true } },
      subscriptionPlan: { select: { name: true, durationDays: true, price: true } },
    },
  });

  if (!item) {
    throw Object.assign(new Error('Invalid seller code or item not yet approved by admin'), {
      status: 404,
    });
  }
  if (!item.slotId) {
    throw Object.assign(new Error('No locker slot assigned to this item'), { status: 400 });
  }

  await createAuditLog('LOCKER', item.sellerId, item.slotId, 'SELLER_KIOSK_ACCESS', {
    itemId: item.id,
    sellerCode: code,
  });

  return item;
}

export async function activateItem(itemId: string, sellerId: string) {
  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (!item) throw Object.assign(new Error('Item not found'), { status: 404 });
  if (item.sellerId !== sellerId) throw Object.assign(new Error('Access denied'), { status: 403 });
  if (item.status !== 'DRAFT')
    throw Object.assign(new Error('Only DRAFT items can be activated'), { status: 400 });

  const updated = await prisma.item.update({ where: { id: itemId }, data: { status: 'ACTIVE' } });
  broadcastToAdmins({ type: 'ITEM_UPDATE', itemId, status: 'ACTIVE' });
  return updated;
}

export async function removeItem(itemId: string, actorId: string, isAdmin: boolean) {
  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (!item) throw Object.assign(new Error('Item not found'), { status: 404 });
  if (!isAdmin && item.sellerId !== actorId)
    throw Object.assign(new Error('Access denied'), { status: 403 });
  if (item.status === 'PENDING')
    throw Object.assign(new Error('Cannot remove item with pending order'), { status: 400 });

  const updated = await prisma.item.update({
    where: { id: itemId },
    data: { status: 'REMOVED', slotId: null },
  });
  await createAuditLog('ORDER', actorId, itemId, 'ITEM_REMOVED', null);
  broadcastToAdmins({ type: 'ITEM_UPDATE', itemId, status: 'REMOVED' });
  return updated;
}

export async function getMyListings(sellerId: string, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const [total, items] = await Promise.all([
    prisma.item.count({ where: { sellerId } }),
    prisma.item.findMany({
      where: { sellerId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        slot: { select: { slotId: true, status: true } },
        subscriptionPlan: { select: { name: true, durationDays: true, price: true } },
        orders: { select: { id: true, status: true }, orderBy: { createdAt: 'desc' }, take: 1 },
      },
    }),
  ]);
  const feeRate = await getPlatformFeeRate();
  return {
    total,
    page,
    limit,
    items: items.map((item) => ({
      ...withDisplayPrice(item, feeRate),
      sellerCode: item.sellerCode,
      subscriptionPlan: item.subscriptionPlan
        ? {
            ...item.subscriptionPlan,
            dailyRate:
              Math.ceil(
                (item.subscriptionPlan.price.toNumber() / item.subscriptionPlan.durationDays) * 100,
              ) / 100,
          }
        : null,
    })),
  };
}

export async function getAllItems(page = 1, limit = 20, status?: string) {
  const where = status ? { status: status as never } : {};
  const skip = (page - 1) * limit;
  const [total, items] = await Promise.all([
    prisma.item.count({ where }),
    prisma.item.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        seller: { select: { id: true, fullName: true, email: true } },
        slot: { select: { slotId: true, status: true } },
      },
    }),
  ]);
  const feeRate = await getPlatformFeeRate();
  return { total, page, limit, items: items.map((item) => withDisplayPrice(item, feeRate)) };
}

export async function getSubscriptionPlansWithDailyRate() {
  const plans = await prisma.lockerSubscriptionPlan.findMany({ orderBy: { durationDays: 'asc' } });
  return plans.map((p) => ({
    ...p,
    dailyRate: Math.ceil((p.price.toNumber() / p.durationDays) * 100) / 100,
  }));
}
