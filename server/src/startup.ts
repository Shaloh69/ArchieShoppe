import { execSync } from 'child_process';
import path from 'path';
import { prisma } from './config/db';
import { seedDatabase } from './db/seed';
import { log } from './utils/logger';
import cron from 'node-cron';

export async function runMigrations(): Promise<void> {
  log.sys.info('Syncing database schema…');

  // Aiven free-tier wakes from power-off slowly — retry up to 5× with 15 s gaps
  const MAX_ATTEMPTS = 5;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      execSync('npx prisma db push --accept-data-loss', {
        stdio: 'inherit',
        cwd: path.resolve(__dirname, '../'),
      });
      break; // success
    } catch (err) {
      if (attempt === MAX_ATTEMPTS) {
        log.sys.error('Schema sync failed after all retries — server cannot start safely', err);
        throw err;
      }
      log.sys.warn(`DB not ready (attempt ${attempt}/${MAX_ATTEMPTS}) — retrying in 15 s…`);
      await new Promise((r) => setTimeout(r, 15000));
    }
  }

  log.sys.ok('Schema synced.');
  await prisma.$connect();
  log.sys.ok('Database connection established.');
}

export async function runSeed(): Promise<void> {
  log.sys.info('Checking seed requirement…');
  try {
    const slotCount = await prisma.lockerSlot.count();
    if (slotCount === 0) {
      log.sys.info('Fresh database — running seed…');
      await seedDatabase(prisma);
      log.sys.ok('Seed complete.');
    } else {
      log.sys.info(`${slotCount} locker slots exist — skipping seed.`);
    }
  } catch (err) {
    log.sys.error('Seed failed', err);
    throw err;
  }
}

export async function warmPythonServer(pythonUrl: string): Promise<void> {
  try {
    const axios = (await import('axios')).default;
    await axios.get(`${pythonUrl}/api/v1/health`, { timeout: 5000 });
    log.sys.ok('Python AI server is warm.');
  } catch {
    log.sys.warn('Python AI server not reachable — will retry on first request.');
  }
}

// Render free-tier services spin down after 15 min of no inbound HTTP traffic.
// Cron jobs don't count — self-ping every 10 min to keep the server warm so
// the ESP32 WebSocket can always reconnect without hitting a cold-start delay.
export function startKeepAlivePing(selfUrl: string): void {
  cron.schedule('*/10 * * * *', async () => {
    try {
      const axios = (await import('axios')).default;
      await axios.get(`${selfUrl}/api/health`, { timeout: 5000 });
    } catch {
      // Silently ignore — if we can't ping ourselves we're already awake
    }
  });
  log.sys.info('Keep-alive ping started (every 10 min)');
}
