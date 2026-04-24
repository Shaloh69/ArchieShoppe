import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '../config/db';

export async function getBalance(userId: string): Promise<Decimal> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { walletBalance: true },
  });
  if (!user) throw Object.assign(new Error('User not found'), { status: 404 });
  return user.walletBalance;
}

export async function getTransactions(userId: string, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const [total, transactions] = await Promise.all([
    prisma.walletTransaction.count({ where: { userId } }),
    prisma.walletTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
  ]);
  return { total, page, limit, transactions };
}

export async function creditWallet(
  userId: string,
  amount: number,
  type: 'TOP_UP' | 'REFUND' | 'PARTIAL_REFUND' | 'RELEASE' | 'SELLER_PAYOUT',
  referenceId?: string,
  description?: string,
) {
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { walletBalance: { increment: amount } },
    }),
    prisma.walletTransaction.create({
      data: { userId, type, amount, referenceId, description },
    }),
  ]);
}

export async function debitWallet(
  userId: string,
  amount: number,
  type: 'PURCHASE' | 'HOLD' | 'COMMISSION' | 'SLOT_RENTAL',
  referenceId?: string,
  description?: string,
) {
  // Single atomic UPDATE with a balance guard in the WHERE clause eliminates
  // the race condition that exists when check and debit are separate queries.
  await prisma.$transaction(async (tx) => {
    const result = await tx.user.updateMany({
      where: { id: userId, walletBalance: { gte: amount } },
      data: { walletBalance: { decrement: amount } },
    });
    if (result.count === 0) {
      const exists = await tx.user.findUnique({ where: { id: userId }, select: { id: true } });
      throw Object.assign(
        new Error(exists ? 'Insufficient wallet balance' : 'User not found'),
        { status: exists ? 400 : 404 },
      );
    }
    await tx.walletTransaction.create({
      data: { userId, type, amount, referenceId, description },
    });
  });
}
