import { prisma } from '../config/db';

const FEE_KEY = 'platform_fee_rate';

/** Returns the platform fee as a decimal multiplier, e.g. 8 → 0.08. Defaults to 8 % if unset. */
export async function getPlatformFeeRate(): Promise<number> {
  const row = await prisma.platformConfig.findUnique({ where: { key: FEE_KEY } });
  const pct = parseFloat(row?.value ?? '8');
  const safe = isNaN(pct) ? 8 : Math.max(0, Math.min(50, pct)); // clamp 0–50 %
  return safe / 100;
}

/** Returns the raw percentage number (e.g. 8), for display. */
export async function getPlatformFeePct(): Promise<number> {
  const row = await prisma.platformConfig.findUnique({ where: { key: FEE_KEY } });
  const pct = parseFloat(row?.value ?? '8');
  return isNaN(pct) ? 8 : Math.max(0, Math.min(50, pct));
}

export async function setPlatformFeePct(pct: number): Promise<void> {
  const safe = Math.max(0, Math.min(50, pct));
  await prisma.platformConfig.upsert({
    where:  { key: FEE_KEY },
    update: { value: safe.toString() },
    create: { key: FEE_KEY, value: safe.toString() },
  });
}

export async function getAllConfig(): Promise<Record<string, string>> {
  const rows = await prisma.platformConfig.findMany();
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}
