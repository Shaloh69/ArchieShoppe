import cron from 'node-cron';
import { releaseExpiredHolds } from '../services/orderService';

export function startHoldReleaseCron(): void {
  // Run every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      const released = await releaseExpiredHolds();
      if (released > 0) {
        console.log(`[cron] Auto-released ${released} expired hold(s)`);
      }
    } catch (err) {
      console.error('[cron] holdRelease error:', err);
    }
  });
  console.log('[cron] Hold-release cron started (every 5 minutes)');
}
