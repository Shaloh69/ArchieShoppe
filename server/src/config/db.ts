import { PrismaClient } from '@prisma/client';

declare global {
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  global.__prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

// Release the connection pool cleanly on process exit so Render redeploys
// don't leave stale connections that exhaust MySQL's max_connections limit.
async function shutdown() {
  await prisma.$disconnect();
  process.exit(0);
}
process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);
