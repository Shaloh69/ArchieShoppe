import { z } from 'zod';
import { CashoutMethod, CashoutStatus } from '@prisma/client';
import { prisma } from '../config/db';
import { createAuditLog } from '../utils/audit';

export const cashoutRequestSchema = z.object({
  amount: z.number().min(100, 'Minimum cashout is ₱100').max(50000, 'Max cashout is ₱50,000'),
  method: z.nativeEnum(CashoutMethod),
  accountNumber: z.string().min(5, 'Account number required').max(50),
  accountName: z.string().min(2, 'Account name required').max(100),
});

export async function requestCashout(
  userId: string,
  data: z.infer<typeof cashoutRequestSchema>,
) {
  // Debit wallet atomically — the WHERE balance guard prevents overdrafts under concurrency
  const request = await prisma.$transaction(async (tx) => {
    const result = await tx.user.updateMany({
      where: { id: userId, walletBalance: { gte: data.amount } },
      data: { walletBalance: { decrement: data.amount } },
    });
    if (result.count === 0) {
      const exists = await tx.user.findUnique({ where: { id: userId }, select: { id: true } });
      throw Object.assign(
        new Error(exists ? 'Insufficient wallet balance' : 'User not found'),
        { status: exists ? 400 : 404 },
      );
    }
    const [cashout] = await Promise.all([
      tx.cashoutRequest.create({
        data: {
          userId,
          amount: data.amount,
          method: data.method,
          accountNumber: data.accountNumber,
          accountName: data.accountName,
          status: CashoutStatus.PENDING,
        },
      }),
      tx.walletTransaction.create({
        data: {
          userId,
          type: 'CASHOUT',
          amount: data.amount,
          description: `Cashout request via ${data.method} to ${data.accountNumber}`,
        },
      }),
    ]);
    return cashout;
  });

  await createAuditLog('ORDER', userId, request.id, 'CASHOUT_REQUESTED', {
    amount: data.amount,
    method: data.method,
    accountNumber: data.accountNumber,
  });

  return request;
}

export async function approveCashout(requestId: string, adminId: string, adminNotes?: string) {
  const request = await prisma.cashoutRequest.findUnique({ where: { id: requestId } });
  if (!request) throw Object.assign(new Error('Cashout request not found'), { status: 404 });
  if (request.status !== CashoutStatus.PENDING) {
    throw Object.assign(new Error('Request is not in PENDING status'), { status: 400 });
  }

  const updated = await prisma.cashoutRequest.update({
    where: { id: requestId },
    data: {
      status: CashoutStatus.PAID,
      adminNotes: adminNotes ?? null,
      processedAt: new Date(),
    },
    include: { user: { select: { fullName: true, email: true } } },
  });

  await createAuditLog('ADMIN', adminId, requestId, 'CASHOUT_APPROVED', {
    amount: request.amount.toNumber(),
    method: request.method,
    userId: request.userId,
  });

  return updated;
}

export async function denyCashout(requestId: string, adminId: string, adminNotes?: string) {
  const request = await prisma.cashoutRequest.findUnique({ where: { id: requestId } });
  if (!request) throw Object.assign(new Error('Cashout request not found'), { status: 404 });
  if (request.status !== CashoutStatus.PENDING) {
    throw Object.assign(new Error('Request is not in PENDING status'), { status: 400 });
  }

  // Return the funds to wallet
  await prisma.$transaction([
    prisma.cashoutRequest.update({
      where: { id: requestId },
      data: {
        status: CashoutStatus.DENIED,
        adminNotes: adminNotes ?? null,
        processedAt: new Date(),
      },
    }),
    prisma.user.update({
      where: { id: request.userId },
      data: { walletBalance: { increment: request.amount.toNumber() } },
    }),
    prisma.walletTransaction.create({
      data: {
        userId: request.userId,
        type: 'CASHOUT_RETURN',
        amount: request.amount.toNumber(),
        referenceId: requestId,
        description: `Cashout denied — funds returned to wallet`,
      },
    }),
  ]);

  await createAuditLog('ADMIN', adminId, requestId, 'CASHOUT_DENIED', {
    amount: request.amount.toNumber(),
    userId: request.userId,
    adminNotes,
  });

  const updated = await prisma.cashoutRequest.findUnique({
    where: { id: requestId },
    include: { user: { select: { fullName: true, email: true } } },
  });
  return updated!;
}

export async function listCashoutsAdmin(params: {
  status?: string;
  page?: number;
  limit?: number;
}) {
  const page = params.page ?? 1;
  const limit = params.limit ?? 20;
  const skip = (page - 1) * limit;
  const where = params.status ? { status: params.status as CashoutStatus } : {};

  const [total, requests] = await Promise.all([
    prisma.cashoutRequest.count({ where }),
    prisma.cashoutRequest.findMany({
      where,
      orderBy: { requestedAt: 'desc' },
      skip,
      take: limit,
      include: { user: { select: { id: true, fullName: true, email: true } } },
    }),
  ]);

  return { total, page, limit, requests };
}

export async function listMyCashouts(
  userId: string,
  params: { page?: number; limit?: number },
) {
  const page = params.page ?? 1;
  const limit = params.limit ?? 10;
  const skip = (page - 1) * limit;

  const [total, requests] = await Promise.all([
    prisma.cashoutRequest.count({ where: { userId } }),
    prisma.cashoutRequest.findMany({
      where: { userId },
      orderBy: { requestedAt: 'desc' },
      skip,
      take: limit,
    }),
  ]);

  return { total, page, limit, requests };
}
