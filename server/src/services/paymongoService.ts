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
        payment_method_types: ['card'],  // gcash/paymaya require PayMongo wallet upgrade
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
// PayMongo QRPh uses Payment Intents + Payment Methods — NOT the Sources API.
// Flow: create PaymentIntent → create PaymentMethod (type=qrph) → attach → read QR.

export const qrPhSchema = z.object({
  amount: z.number().int().min(10000, 'Minimum ₱100').max(1000000, 'Max ₱10,000'),
});

export async function createQrPhSource(userId: string, amountInCentavos: number) {
  const amountInPesos = amountInCentavos / 100;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { fullName: true, email: true },
  });
  if (!user) throw Object.assign(new Error('User not found'), { status: 404 });

  // Step 1 — create a PaymentIntent for the amount
  const intentRes = await paymongoClient.post('/payment_intents', {
    data: {
      attributes: {
        amount: amountInCentavos,
        currency: 'PHP',
        payment_method_allowed: ['qrph'],
        capture_type: 'automatic',
        description: `UniThrift Wallet Top-up ₱${amountInPesos}`,
      },
    },
  });
  const intent = intentRes.data.data;
  const clientKey: string = intent.attributes.client_key;

  // Step 2 — create a PaymentMethod of type qrph
  const methodRes = await paymongoClient.post('/payment_methods', {
    data: {
      attributes: {
        type: 'qrph',
        billing: {
          name: user.fullName,
          email: user.email,
        },
      },
    },
  });
  const method = methodRes.data.data;

  // Step 3 — attach the PaymentMethod to the PaymentIntent
  const attachRes = await paymongoClient.post(`/payment_intents/${intent.id}/attach`, {
    data: {
      attributes: {
        payment_method: method.id,
        client_key: clientKey,
      },
    },
  });
  const attached = attachRes.data.data;
  const attrs = attached.attributes;
  const nextAction = attrs.next_action;

  // Log full next_action so we can see the real PayMongo field names
  log.sys.info('QRPh attach next_action: ' + JSON.stringify(nextAction));

  // PayMongo QRPh next_action field names vary — try every known location.
  const na = nextAction ?? {};
  const qrImageData: string | null =
    na?.qr_code?.image_data ??          // documented
    na?.qrph_scan?.qr_image ??          // older API variant
    na?.display_details?.qr_image ??    // display_details wrapper
    na?.qr_image ??                     // flat
    null;
  const qrString: string | null =
    na?.qr_code?.qr_code_string ??
    na?.qrph_scan?.qr_string ??
    na?.display_details?.qr_string ??
    na?.qr_string ??
    null;

  // Store the PaymentIntent ID in checkoutSessionId for webhook matching
  await prisma.paymongoPayment.create({
    data: {
      userId,
      checkoutSessionId: intent.id,
      amount: amountInPesos,
      status: 'pending',
      paymentMethod: 'qrph',
    },
  });

  return {
    sourceId: intent.id,
    qrCode: qrImageData ?? qrString,
    checkoutUrl: null,
    amount: amountInPesos,
    expiresAt: null,
  };
}

export async function getQrPhSourceStatus(intentId: string) {
  const response = await paymongoClient.get(`/payment_intents/${intentId}`);
  const intent = response.data.data;
  // PaymentIntent statuses: awaiting_payment_method | awaiting_next_action | processing | succeeded | cancelled
  const status: string = intent.attributes.status;
  return {
    status: status === 'succeeded' ? 'chargeable' : status,
    amount: (intent.attributes.amount as number) / 100,
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

  if (eventType === 'payment.paid') {
    return handlePaymentPaid(event);
  }

  if (eventType === 'payment_intent.payment_failed') {
    return handlePaymentFailed(event);
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

// Fires for both QRPh PaymentIntent success and checkout session payments
async function handlePaymentPaid(event: Record<string, unknown>) {
  type PaymentPaidEvent = { data: { attributes: { data: { id: string; attributes: { payment_intent_id?: string } } } } };
  const paymentData = (event as PaymentPaidEvent).data?.attributes?.data;
  if (!paymentData) return { received: true };

  // For QRPh (Payment Intents flow), match by payment_intent_id; otherwise by payment id
  const intentId: string | undefined = paymentData.attributes?.payment_intent_id;
  const matchId = intentId ?? paymentData.id;

  const result = await prisma.paymongoPayment.updateMany({
    where: { checkoutSessionId: matchId, status: { not: 'paid' } },
    data: { status: 'paid', completedAt: new Date() },
  });
  if (result.count === 0) return { received: true };

  const payment = await prisma.paymongoPayment.findFirst({
    where: { checkoutSessionId: matchId },
  });
  if (!payment) return { received: true };

  await creditWallet(
    payment.userId,
    payment.amount.toNumber(),
    'TOP_UP',
    matchId,
    `Wallet top-up ₱${payment.amount.toNumber()} via QR Ph (InstaPay/PESONet)`,
  );

  await createAuditLog('ORDER', payment.userId, matchId, 'WALLET_TOP_UP', {
    amount: payment.amount.toNumber(),
    method: 'qrph',
  });

  return { received: true };
}

async function handlePaymentFailed(event: Record<string, unknown>) {
  type FailedEvent = { data: { attributes: { data: { id: string } } } };
  const intentId = (event as FailedEvent).data?.attributes?.data?.id;
  if (!intentId) return { received: true };

  await prisma.paymongoPayment.updateMany({
    where: { checkoutSessionId: intentId, status: 'pending' },
    data: { status: 'failed' },
  });

  log.sys.warn(`QR Ph payment failed for intent: ${intentId}`);
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
