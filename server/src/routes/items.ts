import { Router, Response, Request } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { adminOnly } from '../middleware/adminOnly';
import { upload, uploadToSupabase } from '../utils/upload';
import * as itemService from '../services/itemService';
import { sendCommandToEsp } from '../ws/espHandler';
import { verifyAccessToken } from '../utils/jwt';

const router = Router();

// Subscription plans with computed dailyRate — used by seller app listing form
router.get('/plans', async (_req, res: Response) => {
  const plans = await itemService.getSubscriptionPlansWithDailyRate();
  res.json({ plans });
});

// Kiosk sell flow: seller enters their 6-char code to access their assigned slot.
// No authentication required — the code IS the credential at the kiosk.
router.post('/verify-seller-code', async (req, res: Response) => {
  const { code } = req.body as { code?: string };
  if (!code || typeof code !== 'string' || code.trim().length === 0) {
    res.status(400).json({ message: 'code is required' });
    return;
  }
  const item = await itemService.verifySellerCode(code.trim().toUpperCase());
  // Unlock the physical slot so the seller can deposit their item
  sendCommandToEsp('Kiosk-1', { type: 'UNLOCK_SLOT', slotId: item.slotId });
  res.json({ item });
});

router.get('/', async (req: Request, res: Response) => {
  const parsed = itemService.browseSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid query', errors: parsed.error.flatten().fieldErrors });
    return;
  }
  // Optionally decode token to pass userId for isSaved — not required
  let userId: string | undefined;
  try {
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      const payload = verifyAccessToken(header.slice(7));
      userId = payload.userId;
    }
  } catch { /* ignore */ }
  const result = await itemService.browseItems(parsed.data, userId);
  res.json(result);
});

router.get('/admin/all', authenticate, adminOnly, async (req: AuthRequest, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const status = req.query.status as string | undefined;
  const result = await itemService.getAllItems(page, limit, status);
  res.json(result);
});

router.get('/my/listings', authenticate, async (req: AuthRequest, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const result = await itemService.getMyListings(req.user!.userId, page, limit);
  res.json(result);
});

router.get('/:id', async (req: Request, res: Response) => {
  let userId: string | undefined;
  try {
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      const payload = verifyAccessToken(header.slice(7));
      userId = payload.userId;
    }
  } catch { /* ignore */ }
  const item = await itemService.getItemById(req.params.id, userId);
  res.json({ item });
});

router.post('/', authenticate, upload.single('image'), async (req: AuthRequest, res: Response) => {
  if (req.user!.role !== 'SELLER' && req.user!.role !== 'ADMIN') {
    res.status(403).json({ message: 'Only sellers can list items' });
    return;
  }
  const parsed = itemService.createItemSchema.safeParse(
    typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body,
  );
  if (!parsed.success) {
    res
      .status(400)
      .json({ message: 'Validation error', errors: parsed.error.flatten().fieldErrors });
    return;
  }

  let imageUrl: string | undefined;
  if (req.file) {
    imageUrl = await uploadToSupabase(req.file);
  }

  const item = await itemService.createItem(req.user!.userId, parsed.data, imageUrl);
  res.status(201).json({ item });
});

router.patch('/:id/activate', authenticate, async (req: AuthRequest, res: Response) => {
  const item = await itemService.activateItem(req.params.id, req.user!.userId);
  res.json({ item });
});

router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const isAdmin = req.user!.role === 'ADMIN';
  const item = await itemService.removeItem(req.params.id, req.user!.userId, isAdmin);
  res.json({ item });
});

export default router;
