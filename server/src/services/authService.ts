import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../config/db';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { createAuditLog } from '../utils/audit';

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(2).max(100),
  role: z.enum(['BUYER', 'SELLER']).default('BUYER'),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function register(data: z.infer<typeof registerSchema>) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw Object.assign(new Error('Email already in use'), { status: 409 });

  const passwordHash = await bcrypt.hash(data.password, 12);
  const user = await prisma.user.create({
    data: { email: data.email, passwordHash, fullName: data.fullName, role: data.role },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      walletBalance: true,
      isVerified: true,
      createdAt: true,
    },
  });

  await createAuditLog('AUTH', user.id, 'user', 'REGISTER', { email: user.email });
  return user;
}

export async function login(data: z.infer<typeof loginSchema>) {
  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user) throw Object.assign(new Error('Invalid credentials'), { status: 401 });

  const valid = await bcrypt.compare(data.password, user.passwordHash);
  if (!valid) throw Object.assign(new Error('Invalid credentials'), { status: 401 });

  const payload = { userId: user.id, email: user.email, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({ data: { token: refreshToken, userId: user.id, expiresAt } });

  await createAuditLog('AUTH', user.id, 'user', 'LOGIN', { email: user.email });

  const profile = {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    walletBalance: user.walletBalance,
    isVerified: user.isVerified,
    createdAt: user.createdAt,
  };
  return { accessToken, refreshToken, user: profile };
}

export async function refresh(token: string) {
  let payload: ReturnType<typeof verifyRefreshToken>;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw Object.assign(new Error('Refresh token invalid or expired'), { status: 401 });
  }

  const stored = await prisma.refreshToken.findUnique({ where: { token } });
  if (!stored || stored.expiresAt < new Date()) {
    throw Object.assign(new Error('Refresh token revoked'), { status: 401 });
  }

  await prisma.refreshToken.delete({ where: { token } });

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) throw Object.assign(new Error('User not found'), { status: 404 });

  const newPayload = { userId: user.id, email: user.email, role: user.role };
  const accessToken = signAccessToken(newPayload);
  const newRefreshToken = signRefreshToken(newPayload);

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({
    data: { token: newRefreshToken, userId: user.id, expiresAt },
  });

  return { accessToken, refreshToken: newRefreshToken };
}

export async function logout(token: string) {
  await prisma.refreshToken.deleteMany({ where: { token } });
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      walletBalance: true,
      isVerified: true,
      createdAt: true,
    },
  });
  if (!user) throw Object.assign(new Error('User not found'), { status: 404 });
  return user;
}
