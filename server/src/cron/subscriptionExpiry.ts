import cron from 'node-cron';
import { prisma } from '../config/db';
import { createAuditLog } from '../utils/audit';
import { broadcastToAdmins } from '../ws/broadcaster';

/**
 * Every hour: find items whose locker subscription has expired and the item
 * hasn't sold (status still DRAFT or ACTIVE).  Mark them REMOVED and free the slot.
 * The seller already paid upfront — no refund is issued for the rental fee.
 */
export function startSubscriptionExpiryCron(): void {
  cron.schedule('0 * * * *', async () => {
    try {
      const expired = await prisma.item.findMany({
        where: {
          subscriptionEndsAt: { lt: new Date() },
          status: { in: ['DRAFT', 'ACTIVE'] },
        },
        select: { id: true, slotId: true, sellerId: true, title: true },
      });

      if (expired.length === 0) return;

      for (const item of expired) {
        await prisma.item.update({
          where: { id: item.id },
          data: { status: 'REMOVED', slotId: null },
        });

        if (item.slotId) {
          await prisma.lockerSlot.update({
            where: { slotId: item.slotId },
            data: { status: 'EMPTY' },
          });
        }

        await createAuditLog('ORDER', 'SYSTEM', item.id, 'SUBSCRIPTION_EXPIRED', {
          slotId: item.slotId,
          title: item.title,
        });

        broadcastToAdmins({
          type: 'ITEM_UPDATE',
          itemId: item.id,
          status: 'REMOVED',
          reason: 'SUBSCRIPTION_EXPIRED',
        });
      }

      console.log(`[cron] Expired ${expired.length} locker subscription(s)`);
    } catch (err) {
      console.error('[cron] subscriptionExpiry error:', err);
    }
  });

  console.log('[cron] Subscription expiry cron started (every hour)');
}
