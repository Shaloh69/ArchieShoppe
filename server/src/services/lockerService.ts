import { prisma } from '../config/db';
import { createAuditLog } from '../utils/audit';
import { broadcastToAdmins } from '../ws/broadcaster';

export async function getAllSlots() {
  return prisma.lockerSlot.findMany({
    orderBy: { slotId: 'asc' },
    include: {
      currentItem: {
        include: { seller: { select: { id: true, fullName: true, email: true } } },
      },
    },
  });
}

export async function getSlot(slotId: string) {
  const slot = await prisma.lockerSlot.findUnique({
    where: { slotId },
    include: {
      currentItem: { include: { seller: { select: { id: true, fullName: true } } } },
      events: { orderBy: { createdAt: 'desc' }, take: 20 },
    },
  });
  if (!slot) throw Object.assign(new Error('Locker slot not found'), { status: 404 });
  return slot;
}

export async function updateSlotStatus(
  slotId: string,
  status: string,
  source: 'ESP32' | 'ADMIN' | 'SYSTEM',
  actorId: string,
  metadata?: Record<string, unknown>,
) {
  const slot = await prisma.lockerSlot.update({
    where: { slotId },
    data: { status: status as never, lastEvent: new Date().toISOString() },
  });

  await prisma.lockerEvent.create({
    data: { slotId, eventType: status, source, metadata: (metadata as object) ?? undefined },
  });

  await createAuditLog('LOCKER', actorId, slotId, `STATUS_${status}`, metadata ?? null);

  broadcastToAdmins({ type: 'LOCKER_UPDATE', slotId, status, source, metadata });

  return slot;
}

export async function getSubscriptionPlans() {
  return prisma.lockerSubscriptionPlan.findMany({ orderBy: { durationDays: 'asc' } });
}

export async function getLockerEvents(slotId: string, limit = 50) {
  return prisma.lockerEvent.findMany({
    where: { slotId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}
