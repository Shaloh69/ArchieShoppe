import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import * as walletService from '../services/walletService';
import * as paymongoService from '../services/paymongoService';
import * as cashoutService from '../services/cashoutService';

const router = Router();

router.get('/balance', authenticate, async (req: AuthRequest, res: Response) => {
  const balance = await walletService.getBalance(req.user!.userId);
  res.json({ balance });
});

router.get('/transactions', authenticate, async (req: AuthRequest, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const result = await walletService.getTransactions(req.user!.userId, page, limit);
  res.json(result);
});

// ─── Checkout Session (GCash / Card / Maya) ───────────────────────────────────

router.post('/top-up', authenticate, async (req: AuthRequest, res: Response) => {
  const parsed = paymongoService.topUpSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Validation error', errors: parsed.error.flatten().fieldErrors });
    return;
  }
  const session = await paymongoService.createTopUpSession(req.user!.userId, parsed.data);
  res.status(201).json(session);
});

// ─── QR Ph (InstaPay / PESONet) ───────────────────────────────────────────────

router.post('/qrph', authenticate, async (req: AuthRequest, res: Response) => {
  const parsed = paymongoService.qrPhSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Validation error', errors: parsed.error.flatten().fieldErrors });
    return;
  }
  const source = await paymongoService.createQrPhSource(req.user!.userId, parsed.data.amount);
  res.status(201).json(source);
});

router.get('/qrph/:sourceId/status', authenticate, async (req: AuthRequest, res: Response) => {
  const { sourceId } = req.params;
  const result = await paymongoService.getQrPhSourceStatus(sourceId);
  res.json(result);
});

// ─── Payment history ──────────────────────────────────────────────────────────

router.get('/payments', authenticate, async (req: AuthRequest, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const result = await paymongoService.getPaymentHistory(req.user!.userId, page, limit);
  res.json(result);
});

// ─── Cashout ──────────────────────────────────────────────────────────────────

router.post('/cashout', authenticate, async (req: AuthRequest, res: Response) => {
  const parsed = cashoutService.cashoutRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Validation error', errors: parsed.error.flatten().fieldErrors });
    return;
  }
  const request = await cashoutService.requestCashout(req.user!.userId, parsed.data);
  res.status(201).json({ request });
});

router.get('/cashouts', authenticate, async (req: AuthRequest, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const result = await cashoutService.listMyCashouts(req.user!.userId, { page, limit });
  res.json(result);
});

export default router;
