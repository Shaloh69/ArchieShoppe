import { Router, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { authenticate, AuthRequest } from '../middleware/auth';
import { adminOnly } from '../middleware/adminOnly';
import { prisma } from '../config/db';
import { upload, uploadToSupabase } from '../utils/upload';
import { createAuditLog } from '../utils/audit';

const router = Router();

const updateProfileSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  newPassword: z.string().min(8).optional(),
  avatarUrl: z.string().url().optional(),
});

const adminUpdateUserSchema = z.object({
  role: z.enum(['BUYER', 'SELLER', 'ADMIN']).optional(),
  isVerified: z.boolean().optional(),
});

router.get('/admin/all', authenticate, adminOnly, async (req: AuthRequest, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const [total, users] = await Promise.all([
    prisma.user.count(),
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        walletBalance: true,
        isVerified: true,
        createdAt: true,
        _count: { select: { items: true, buyerOrders: true, sellerOrders: true } },
      },
    }),
  ]);

  res.json({ total, page, limit, users });
});

router.get('/admin/:id', authenticate, adminOnly, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      walletBalance: true,
      isVerified: true,
      createdAt: true,
      items: {
        select: { id: true, title: true, status: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
      buyerOrders: {
        select: { id: true, status: true, amount: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  });
  if (!user) {
    res.status(404).json({ message: 'User not found' });
    return;
  }
  res.json({ user });
});

router.patch('/admin/:id', authenticate, adminOnly, async (req: AuthRequest, res: Response) => {
  const parsed = adminUpdateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ message: 'Validation error', errors: parsed.error.flatten().fieldErrors });
    return;
  }
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: parsed.data,
    select: { id: true, email: true, fullName: true, role: true, isVerified: true },
  });
  await createAuditLog('ADMIN', req.user!.userId, req.params.id, 'USER_UPDATED', parsed.data);
  res.json({ user });
});

// Upload avatar photo — multipart/form-data with field "avatar"
router.post(
  '/me/avatar',
  authenticate,
  upload.single('avatar'),
  async (req: AuthRequest, res: Response) => {
    if (!req.file) {
      res.status(400).json({ message: 'No image file provided' });
      return;
    }
    // Upload to profiles/ folder in Supabase
    const ext = require('path').extname(req.file.originalname).toLowerCase() || '.jpg';
    const name = `profiles/${require('crypto').randomBytes(12).toString('hex')}${ext}`;
    const { supabase } = require('../config/supabase');
    const { env } = require('../config/env');
    const { error } = await supabase.storage.from(env.SUPABASE_BUCKET).upload(name, req.file.buffer, {
      contentType: req.file.mimetype,
      upsert: false,
    });
    if (error) {
      res.status(500).json({ message: `Upload failed: ${error.message}` });
      return;
    }
    const { data } = supabase.storage.from(env.SUPABASE_BUCKET).getPublicUrl(name);
    const avatarUrl: string = data.publicUrl;

    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data: { avatarUrl },
      select: { id: true, email: true, fullName: true, avatarUrl: true, role: true, walletBalance: true, isVerified: true },
    });
    res.json({ user });
  },
);

// Upgrade current user to SELLER
router.patch('/me/role', authenticate, async (req: AuthRequest, res: Response) => {
  const current = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: { role: true },
  });
  if (!current) {
    res.status(404).json({ message: 'User not found' });
    return;
  }
  if (current.role !== 'BUYER') {
    res.status(400).json({ message: 'Role upgrade only available for BUYER accounts' });
    return;
  }
  const user = await prisma.user.update({
    where: { id: req.user!.userId },
    data: { role: 'SELLER' },
    select: { id: true, email: true, fullName: true, avatarUrl: true, role: true, walletBalance: true, isVerified: true },
  });
  await createAuditLog('ADMIN', req.user!.userId, req.user!.userId, 'ROLE_UPGRADED', { newRole: 'SELLER' });
  res.json({ user });
});

router.patch('/me', authenticate, async (req: AuthRequest, res: Response) => {
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ message: 'Validation error', errors: parsed.error.flatten().fieldErrors });
    return;
  }
  const { fullName, newPassword, avatarUrl } = parsed.data;
  const updateData: Record<string, unknown> = {};
  if (fullName) updateData['fullName'] = fullName;
  if (avatarUrl) updateData['avatarUrl'] = avatarUrl;
  if (newPassword) {
    updateData['passwordHash'] = await bcrypt.hash(newPassword, 12);
  }

  const user = await prisma.user.update({
    where: { id: req.user!.userId },
    data: updateData,
    select: {
      id: true,
      email: true,
      fullName: true,
      avatarUrl: true,
      role: true,
      walletBalance: true,
      isVerified: true,
    },
  });
  res.json({ user });
});

export default router;
