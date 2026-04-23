import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { adminOnly } from '../middleware/adminOnly';
import { upload } from '../utils/upload';
import * as itemService from '../services/itemService';
import { env } from '../config/env';
import path from 'path';

const router = Router();

router.get('/', async (req, res: Response) => {
  const parsed = itemService.browseSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid query', errors: parsed.error.flatten().fieldErrors });
    return;
  }
  const result = await itemService.browseItems(parsed.data);
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

router.get('/:id', async (req, res: Response) => {
  const item = await itemService.getItemById(req.params.id);
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
    imageUrl = `/uploads/${path.basename(req.file.path)}`;
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

// Serve uploaded images
router.use('/uploads', (req, res) => {
  res.sendFile(path.join(env.UPLOAD_DIR, req.path));
});

export default router;
