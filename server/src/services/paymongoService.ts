import axios from 'axios';
import { z } from 'zod';
import { prisma } from '../config/db';
import { env } from '../config/env';
import { creditWallet } from './walletService';
import { createAuditLog } from '../utils/audit';

const PAYMONGO_BASE = 'https://api.paymongo.com/v1';

const paymongoClient = axios.create({
  baseURL: PAYMONGO_BASE,
  headers: {
    Authorization: `Basic ${Buffer.from(env.PAYMONGO_SECRET_KEY + ':').toString('base64')}`,
    'Content-Type': 'application/json',
  },
});

export const topUpSchema = z.object({
  amount: z.number().int().min(10000).max(1000000, 'Max ₱10,000 per top-up'),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

export async function createTopUpSession(userId: string, data: z.infer<typeof topUpSchema>) {
  const amountInCentavos = data.amount;
  const amountInPesos = amountInCentavos / 100;

  const response = await paymongoClient.post('/checkout_sessions', {
    data: {
      attributes: {
        amount: amountInCentavos,
        currency: 'PHP',
        description: `UniThrift Wallet Top-up ₱${amountInPesos}`,
        payment_method_types: ['gcash', 'card', 'paymaya'],
        success_url: data.successUrl,
        cancel_url: data.cancelUrl,
        metadata: { userId },
      },
    },
  });

  const session = response.data.data;
  await prisma.paymongoPayment.create({
    data: {
      userId,
      checkoutSessionId: session.id,
      amount: amountInPesos,
      status: 'pending',
    },
  });

  return {
    checkoutSessionId: session.id,
    checkoutUrl: session.attributes.checkout_url,
    amount: amountInPesos,
  };
}

export async function handleWebhook(rawBody: Buffer, signature: string) {
  // Verify PayMongo webhook signature
  const crypto = await import('crypto');
  const computed = crypto
    .createHmac('sha256', env.PAYMONGO_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');

  if (computed !== signature) {
    throw Object.assign(new Error('Invalid webhook signature'), { status: 400 });
  }

  const event = JSON.parse(rawBody.toString());
  const eventType: string = event.data?.attributes?.type;

  if (eventType !== 'checkout_session.payment.paid') return { received: true };

  const sessionId: string = event.data?.attributes?.data?.id;
  if (!sessionId) return { received: true };

  const payment = await prisma.paymongoPayment.findUnique({
    where: { checkoutSessionId: sessionId },
  });
  if (!payment || payment.status === 'paid') return { received: true };

  await prisma.paymongoPayment.update({
    where: { id: payment.id },
    data: { status: 'paid', completedAt: new Date() },
  });

  await creditWallet(
    payment.userId,
    payment.amount.toNumber(),
    'TOP_UP',
    sessionId,
    `Wallet top-up via PayMongo`,
  );

  await createAuditLog('ORDER', payment.userId, sessionId, 'WALLET_TOP_UP', {
    amount: payment.amount.toNumber(),
  });

  return { received: true };
}

export async function getPaymentHistory(userId: string, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const [total, payments] = await Promise.all([
    prisma.paymongoPayment.count({ where: { userId } }),
    prisma.paymongoPayment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
  ]);
  return { total, page, limit, payments };
}
