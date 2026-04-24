import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { prisma } from '../config/db';

const router = Router();

// Toggle save: POST /api/wishlist/:itemId — returns { saved: boolean }
router.post('/:itemId', authenticate, async (req: AuthRequest, res: Response) => {
  const { itemId } = req.params;
  const userId = req.user!.userId;

  const item = await prisma.item.findUnique({ where: { id: itemId }, select: { id: true } });
  if (!item) {
    res.status(404).json({ message: 'Item not found' });
    return;
  }

  const existing = await prisma.wishlist.findUnique({
    where: { userId_itemId: { userId, itemId } },
  });

  if (existing) {
    await prisma.wishlist.delete({ where: { userId_itemId: { userId, itemId } } });
    res.json({ saved: false });
  } else {
    await prisma.wishlist.create({ data: { userId, itemId } });
    res.json({ saved: true });
  }
});

// Get my saved items: GET /api/wishlist
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const entries = await prisma.wishlist.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      item: {
        include: {
          seller: { select: { id: true, fullName: true } },
          slot: { select: { slotId: true, status: true } },
        },
      },
    },
  });
  const items = entries.filter((e) => e.item.status === 'ACTIVE').map((e) => e.item);
  res.json({ items });
});

// Unsave: DELETE /api/wishlist/:itemId
router.delete('/:itemId', authenticate, async (req: AuthRequest, res: Response) => {
  const { itemId } = req.params;
  const userId = req.user!.userId;
  await prisma.wishlist.deleteMany({ where: { userId, itemId } });
  res.json({ saved: false });
});

export default router;
