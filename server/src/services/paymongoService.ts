import crypto from 'crypto';
import axios from 'axios';
import { z } from 'zod';
import { prisma } from '../config/db';
import { env } from '../config/env';
import { creditWallet } from './walletService';
import { createAuditLog } from '../utils/audit';
import { log } from '../utils/logger';

const PAYMONGO_BASE = 'https://api.paymongo.com/v1';

const paymongoClient = axios.create({
  baseURL: PAYMONGO_BASE,
  headers: {
    Authorization: `Basic ${Buffer.from(env.PAYMONGO_SECRET_KEY + ':').toString('base64')}`,
    'Content-Type': 'application/json',
  },
});

// Unwrap PayMongo's nested error array into a readable message and re-throw
// so the Express error handler forwards the real reason to the client.
paymongoClient.interceptors.response.use(
  (r) => r,
  (err) => {
    if (axios.isAxiosError(err) && err.response) {
      const errors = err.response.data?.errors as Array<{ detail: string; code: string }> | undefined;
      const detail = errors?.[0]?.detail ?? err.response.data?.message ?? err.message;
      const status = err.response.status;
      log.sys.error(`PayMongo API error ${status}`, detail);
      throw Object.assign(new Error(`PayMongo: ${detail}`), { status });
    }
    throw err;
  },
);

// ─── Checkout Session (GCash / Card / Maya) ────────────────────────────────────

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
      paymentMethod: 'checkout',
    },
  });

  return {
    checkoutSessionId: session.id,
    checkoutUrl: session.attributes.checkout_url,
    amount: amountInPesos,
  };
}

// ─── QR Ph (InstaPay / PESONet) ────────────────────────────────────────────────

export const qrPhSchema = z.object({
  amount: z.number().int().min(10000, 'Minimum ₱100').max(1000000, 'Max ₱10,000'),
});

export async function createQrPhSource(userId: string, amountInCentavos: number) {
  const amountInPesos = amountInCentavos / 100;

  const response = await paymongoClient.post('/sources', {
    data: {
      attributes: {
        amount: amountInCentavos,
        currency: 'PHP',
        type: 'qrph',
        redirect: {
          success: `${env.CLIENT_URL.split(',')[0].trim()}/app/wallet?topup=success`,
          failed: `${env.CLIENT_URL.split(',')[0].trim()}/app/wallet?topup=failed`,
        },
      },
    },
  });

  const source = response.data.data;
  const attrs = source.attributes;

  // Store with source ID in checkoutSessionId column
  await prisma.paymongoPayment.create({
    data: {
      userId,
      checkoutSessionId: source.id,
      amount: amountInPesos,
      status: 'pending',
      paymentMethod: 'qrph',
    },
  });

  return {
    sourceId: source.id,
    qrCode: attrs.qr_code as string | null,
    checkoutUrl: attrs.redirect?.checkout_url as string | null,
    amount: amountInPesos,
    expiresAt: attrs.expires_at ? new Date(attrs.expires_at * 1000).toISOString() : null,
  };
}

export async function getQrPhSourceStatus(sourceId: string) {
  const response = await paymongoClient.get(`/sources/${sourceId}`);
  const source = response.data.data;
  return {
    status: source.attributes.status as string,
    amount: (source.attributes.amount as number) / 100,
  };
}

// ─── Webhook ───────────────────────────────────────────────────────────────────

/**
 * PayMongo signature format: "t=<unix_ts>,te=<test_hash>,li=<live_hash>"
 * Message to sign: "<timestamp>.<rawBody>"
 */
function verifyPaymongoSignature(rawBody: Buffer, signatureHeader: string): void {
  const parts = Object.fromEntries(
    signatureHeader.split(',').map((p) => p.split('=') as [string, string]),
  );

  const timestamp = parts['t'];
  // PayMongo always sends both te (test) and li (live) hashes.
  // Validate against live hash in production, test hash everywhere else.
  const hash = env.NODE_ENV === 'production' ? parts['li'] : parts['te'];

  if (!timestamp || !hash) {
    throw Object.assign(new Error('Malformed PayMongo signature header'), { status: 400 });
  }

  const message = `${timestamp}.${rawBody.toString()}`;
  const computed = crypto
    .createHmac('sha256', env.PAYMONGO_WEBHOOK_SECRET)
    .update(message)
    .digest('hex');

  if (computed !== hash) {
    throw Object.assign(new Error('Invalid webhook signature'), { status: 400 });
  }
}

export async function handleWebhook(rawBody: Buffer, signatureHeader: string) {
  verifyPaymongoSignature(rawBody, signatureHeader);

  const event = JSON.parse(rawBody.toString());
  const eventType: string = event.data?.attributes?.type;

  if (eventType === 'checkout_session.payment.paid') {
    return handleCheckoutPaid(event);
  }

  if (eventType === 'source.chargeable') {
    return handleSourceChargeable(event);
  }

  if (eventType === 'qrph.expired') {
    return handleQrPhExpired(event);
  }

  return { received: true };
}

async function handleCheckoutPaid(event: Record<string, unknown>) {
  const sessionId: string = (event.data as { attributes: { data: { id: string } } })?.attributes
    ?.data?.id;
  if (!sessionId) return { received: true };

  // Atomic mark-as-paid guard against double-credits on webhook retries
  const result = await prisma.paymongoPayment.updateMany({
    where: { checkoutSessionId: sessionId, status: { not: 'paid' } },
    data: { status: 'paid', completedAt: new Date() },
  });
  if (result.count === 0) return { received: true };

  const payment = await prisma.paymongoPayment.findUnique({
    where: { checkoutSessionId: sessionId },
  });
  if (!payment) return { received: true };

  await creditWallet(
    payment.userId,
    payment.amount.toNumber(),
    'TOP_UP',
    sessionId,
    `Wallet top-up ₱${payment.amount.toNumber()} via PayMongo checkout`,
  );

  await createAuditLog('ORDER', payment.userId, sessionId, 'WALLET_TOP_UP', {
    amount: payment.amount.toNumber(),
    method: 'checkout',
  });

  return { received: true };
}

async function handleSourceChargeable(event: Record<string, unknown>) {
  type SourceEvent = { data: { attributes: { data: { id: string; attributes: { amount: number } } } } };
  const sourceId = (event as SourceEvent).data?.attributes?.data?.id;
  const sourceAmount = (event as SourceEvent).data?.attributes?.data?.attributes?.amount;

  if (!sourceId) return { received: true };

  // Mark paid atomically — updateMany returns count 0 if already processed,
  // preventing double-credits when PayMongo retries the webhook.
  const result = await prisma.paymongoPayment.updateMany({
    where: { checkoutSessionId: sourceId, status: { not: 'paid' } },
    data: { status: 'paid', completedAt: new Date() },
  });
  if (result.count === 0) return { received: true };

  const payment = await prisma.paymongoPayment.findUnique({
    where: { checkoutSessionId: sourceId },
  });
  if (!payment) return { received: true };

  // Create the PayMongo Payment resource from the source (best-effort)
  try {
    await paymongoClient.post('/payments', {
      data: {
        attributes: {
          amount: sourceAmount ?? Math.round(payment.amount.toNumber() * 100),
          currency: 'PHP',
          source: { id: sourceId, type: 'source' },
          description: `UniThrift Wallet Top-up ₱${payment.amount.toNumber()} via QR Ph`,
        },
      },
    });
  } catch (err) {
    // Payment may have already been created on a previous webhook retry — not fatal
    log.sys.warn(`QR Ph payment creation failed for source ${sourceId} — wallet credit will still proceed`);
  }

  await creditWallet(
    payment.userId,
    payment.amount.toNumber(),
    'TOP_UP',
    sourceId,
    `Wallet top-up ₱${payment.amount.toNumber()} via QR Ph (InstaPay/PESONet)`,
  );

  await createAuditLog('ORDER', payment.userId, sourceId, 'WALLET_TOP_UP', {
    amount: payment.amount.toNumber(),
    method: 'qrph',
  });

  return { received: true };
}

async function handleQrPhExpired(event: Record<string, unknown>) {
  type SourceEvent = { data: { attributes: { data: { id: string } } } };
  const sourceId = (event as SourceEvent).data?.attributes?.data?.id;
  if (!sourceId) return { received: true };

  await prisma.paymongoPayment.updateMany({
    where: { checkoutSessionId: sourceId, status: 'pending' },
    data: { status: 'expired' },
  });

  log.sys.warn(`QR Ph source expired: ${sourceId}`);
  return { received: true };
}

// ─── Payment history ───────────────────────────────────────────────────────────

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
