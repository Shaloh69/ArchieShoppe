import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import * as cashoutService from '../services/cashoutService';

const router = Router();

function adminOnly(req: AuthRequest, res: Response, next: () => void) {
  if (req.user?.role !== 'ADMIN') {
    res.status(403).json({ message: 'Admin access required' });
    return;
  }
  next();
}

// GET /api/cashouts/admin/all
router.get('/admin/all', authenticate, adminOnly, async (req: AuthRequest, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const status = req.query.status as string | undefined;
  const result = await cashoutService.listCashoutsAdmin({ status, page, limit });
  res.json(result);
});

// POST /api/cashouts/:id/approve
router.post('/:id/approve', authenticate, adminOnly, async (req: AuthRequest, res: Response) => {
  const { adminNotes } = req.body;
  const request = await cashoutService.approveCashout(req.params.id, req.user!.userId, adminNotes);
  res.json({ request });
});

// POST /api/cashouts/:id/deny
router.post('/:id/deny', authenticate, adminOnly, async (req: AuthRequest, res: Response) => {
  const { adminNotes } = req.body;
  const request = await cashoutService.denyCashout(req.params.id, req.user!.userId, adminNotes);
  res.json({ request });
});

export default router;
