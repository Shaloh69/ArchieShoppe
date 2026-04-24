import { execSync } from 'child_process';
import path from 'path';
import { prisma } from './config/db';
import { seedDatabase } from './db/seed';
import { log } from './utils/logger';

export async function runMigrations(): Promise<void> {
  log.sys.info('Syncing database schema…');
  try {
    execSync('npx prisma db push --accept-data-loss', {
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '../'),
    });
    log.sys.ok('Schema synced.');
  } catch (err) {
    log.sys.error('Schema sync failed — server cannot start safely', err);
    throw err;
  }
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
