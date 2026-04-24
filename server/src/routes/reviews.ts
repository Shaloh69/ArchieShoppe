import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { prisma } from '../config/db';

const router = Router();

const createReviewSchema = z.object({
  orderId: z.string().cuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

// Create review: POST /api/reviews
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  const parsed = createReviewSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Validation error', errors: parsed.error.flatten().fieldErrors });
    return;
  }
  const { orderId, rating, comment } = parsed.data;
  const reviewerId = req.user!.userId;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, buyerId: true, sellerId: true, status: true, review: { select: { id: true } } },
  });
  if (!order) {
    res.status(404).json({ message: 'Order not found' });
    return;
  }
  if (order.buyerId !== reviewerId) {
    res.status(403).json({ message: 'Only the buyer can review this order' });
    return;
  }
  if (order.status !== 'COMPLETED') {
    res.status(400).json({ message: 'Can only review completed orders' });
    return;
  }
  if (order.review) {
    res.status(409).json({ message: 'Order already reviewed' });
    return;
  }

  const review = await prisma.review.create({
    data: { orderId, reviewerId, sellerId: order.sellerId, rating, comment },
    include: {
      reviewer: { select: { id: true, fullName: true, avatarUrl: true } },
    },
  });
  res.status(201).json({ review });
});

// Get seller reviews: GET /api/reviews?sellerId=
router.get('/', async (req, res: Response) => {
  const { sellerId } = req.query as { sellerId?: string };
  if (!sellerId) {
    res.status(400).json({ message: 'sellerId query param required' });
    return;
  }
  const [reviews, stats] = await Promise.all([
    prisma.review.findMany({
      where: { sellerId },
      orderBy: { createdAt: 'desc' },
      include: {
        reviewer: { select: { id: true, fullName: true, avatarUrl: true } },
      },
    }),
    prisma.review.aggregate({
      where: { sellerId },
      _avg: { rating: true },
      _count: { id: true },
    }),
  ]);
  res.json({
    reviews,
    avgRating: stats._avg.rating ?? 0,
    totalReviews: stats._count.id,
  });
});

export default router;
