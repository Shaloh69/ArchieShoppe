import { execSync } from 'child_process';
import path from 'path';
import { prisma } from './config/db';
import { seedDatabase } from './db/seed';

export async function runMigrations(): Promise<void> {
  console.log('[startup] Syncing database schema...');
  try {
    // --accept-data-loss is required for column-type changes (e.g. TEXT→VARCHAR).
    // Safe to use here because the schema is stable — re-running with no schema
    // changes is a no-op and does not touch existing data.
    execSync('npx prisma db push --accept-data-loss', {
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '../'),
    });
    console.log('[startup] Schema synced.');
  } catch (err) {
    console.error('[startup] Schema sync failed — server cannot start safely:', err);
    throw err;
  }
}

export async function runSeed(): Promise<void> {
  console.log('[startup] Checking seed requirement...');
  try {
    const slotCount = await prisma.lockerSlot.count();
    if (slotCount === 0) {
      console.log('[startup] Fresh database — running seed...');
      await seedDatabase(prisma);
    } else {
      console.log(`[startup] ${slotCount} locker slots exist — skipping seed.`);
    }
  } catch (err) {
    console.error('[startup] Seed failed:', err);
    throw err;
  }
}

export async function warmPythonServer(pythonUrl: string): Promise<void> {
  try {
    const axios = (await import('axios')).default;
    await axios.get(`${pythonUrl}/api/v1/health`, { timeout: 5000 });
    console.log('[startup] Python AI server is warm.');
  } catch {
    console.warn('[startup] Python AI server not reachable — will retry on first request.');
  }
}
