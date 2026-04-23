import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { adminOnly } from '../middleware/adminOnly';
import * as orderService from '../services/orderService';

const router = Router();

router.get('/my/purchases', authenticate, async (req: AuthRequest, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const result = await orderService.getOrdersByBuyer(req.user!.userId, page, limit);
  res.json(result);
});

router.get('/my/sales', authenticate, async (req: AuthRequest, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const result = await orderService.getOrdersBySeller(req.user!.userId, page, limit);
  res.json(result);
});

router.get('/admin/all', authenticate, adminOnly, async (req: AuthRequest, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const status = req.query.status as string | undefined;
  const result = await orderService.getAllOrders(page, limit, status);
  res.json(result);
});

router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const order = await orderService.getOrderById(req.params.id, req.user!.userId);
  res.json({ order });
});

router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  const parsed = orderService.createOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ message: 'Validation error', errors: parsed.error.flatten().fieldErrors });
    return;
  }
  const order = await orderService.createOrder(req.user!.userId, parsed.data);
  res.status(201).json({ order });
});

router.post('/:id/complete', authenticate, adminOnly, async (req: AuthRequest, res: Response) => {
  const order = await orderService.completeOrder(req.params.id, req.user!.userId);
  res.json({ order });
});

export default router;
