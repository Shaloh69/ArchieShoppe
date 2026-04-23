import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { adminOnly } from '../middleware/adminOnly';
import * as refundService from '../services/refundService';

const router = Router();

router.get('/admin/all', authenticate, adminOnly, async (req: AuthRequest, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const status = req.query.status as string | undefined;
  const result = await refundService.getAllRefunds(page, limit, status);
  res.json(result);
});

router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const isAdmin = req.user!.role === 'ADMIN';
  const refund = await refundService.getRefundById(req.params.id, req.user!.userId, isAdmin);
  res.json({ refund });
});

router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  const parsed = refundService.requestRefundSchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ message: 'Validation error', errors: parsed.error.flatten().fieldErrors });
    return;
  }
  const refund = await refundService.requestRefund(req.user!.userId, parsed.data);
  res.status(201).json({ refund });
});

router.post('/:id/process', authenticate, adminOnly, async (req: AuthRequest, res: Response) => {
  const { approved, adminNotes, classificationResult } = req.body;
  if (typeof approved !== 'boolean') {
    res.status(400).json({ message: 'approved (boolean) is required' });
    return;
  }
  const refund = await refundService.processRefund(
    req.params.id,
    req.user!.userId,
    approved,
    adminNotes,
    classificationResult,
  );
  res.json({ refund });
});

export default router;
