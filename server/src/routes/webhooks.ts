import { Router, Request, Response } from 'express';
import * as paymongoService from '../services/paymongoService';

const router = Router();

// Raw body required for signature verification — mounted before express.json()
router.post('/paymongo', async (req: Request, res: Response) => {
  const signature = req.headers['paymongo-signature'] as string;
  if (!signature) {
    res.status(400).json({ message: 'Missing PayMongo signature header' });
    return;
  }
  const rawBody = req.body as Buffer;
  try {
    const result = await paymongoService.handleWebhook(rawBody, signature);
    res.json(result);
  } catch (err) {
    const error = err as Error & { status?: number };
    res.status(error.status ?? 400).json({ message: error.message });
  }
});

export default router;
