import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { adminOnly } from '../middleware/adminOnly';
import * as configService from '../services/configService';

const router = Router();

// Public — frontends read fee rate to display prices correctly
router.get('/', async (_req, res: Response) => {
  const config = await configService.getAllConfig();
  res.json({ config });
});

// Public — convenience endpoint for fee percentage only
router.get('/platform-fee', async (_req, res: Response) => {
  const feePct = await configService.getPlatformFeePct();
  res.json({ feePct });
});

// Admin — update platform fee percentage (0–50)
router.patch('/platform-fee', authenticate, adminOnly, async (req: AuthRequest, res: Response) => {
  const raw = req.body.fee_rate ?? req.body.feePct;
  const parsed = parseFloat(raw);
  if (isNaN(parsed) || parsed < 0 || parsed > 50) {
    res.status(400).json({ message: 'fee_rate must be a number between 0 and 50' });
    return;
  }
  await configService.setPlatformFeePct(parsed);
  res.json({ feePct: parsed, fee_rate: parsed, message: `Platform fee updated to ${parsed}%` });
});

export default router;
