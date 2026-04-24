import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

export async function seedDatabase(prisma: PrismaClient): Promise<void> {
  console.log('[seed] Seeding locker slots...');
  const slots = ['S-01', 'S-02', 'S-03', 'S-04', 'S-05', 'S-06'];
  for (const slotId of slots) {
    await prisma.lockerSlot.upsert({
      where: { slotId },
      update: {},
      create: { slotId, status: 'EMPTY' },
    });
  }

  console.log('[seed] Seeding subscription plans...');
  const plans = [
    { planKey: 'WEEKLY_1', name: '1 Week', durationDays: 7, price: 149, highlight: false },
    { planKey: 'MONTHLY_1', name: '1 Month', durationDays: 30, price: 399, highlight: true },
  ];
  for (const p of plans) {
    await prisma.lockerSubscriptionPlan.upsert({
      where: { planKey: p.planKey },
      update: {},
      create: p,
    });
  }

  console.log('[seed] Seeding platform config...');
  // platform_fee_rate: percentage added to item price paid by buyer (e.g. 8 = 8%)
  await prisma.platformConfig.upsert({
    where: { key: 'platform_fee_rate' },
    update: {},
    create: { key: 'platform_fee_rate', value: '8' },
  });

  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@unithrift.edu.ph';
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'AdminPassword123!';

  console.log('[seed] Seeding admin user...');
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash: await bcrypt.hash(adminPassword, 12),
      fullName: 'System Admin',
      role: 'ADMIN',
      isVerified: true,
    },
  });

  if (process.env.NODE_ENV !== 'production') {
    console.log('[seed] Seeding demo users (dev only)...');
    await prisma.user.upsert({
      where: { email: 'seller@demo.com' },
      update: {},
      create: {
        email: 'seller@demo.com',
        passwordHash: await bcrypt.hash('Demo1234!', 12),
        fullName: 'Demo Seller',
        role: 'SELLER',
        isVerified: true,
        walletBalance: 500,
      },
    });
    await prisma.user.upsert({
      where: { email: 'buyer@demo.com' },
      update: {},
      create: {
        email: 'buyer@demo.com',
        passwordHash: await bcrypt.hash('Demo1234!', 12),
        fullName: 'Demo Buyer',
        role: 'BUYER',
        isVerified: true,
        walletBalance: 1000,
      },
    });
  }

  console.log('[seed] Seed complete.');
}
