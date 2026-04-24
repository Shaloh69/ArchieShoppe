import { Router, Request, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import * as authService from '../services/authService';

const router = Router();

router.post('/register', async (req: Request, res: Response) => {
  const parsed = authService.registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ message: 'Validation error', errors: parsed.error.flatten().fieldErrors });
    return;
  }
  const user = await authService.register(parsed.data);
  res.status(201).json({ user });
});

router.post('/login', async (req: Request, res: Response) => {
  const parsed = authService.loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ message: 'Validation error', errors: parsed.error.flatten().fieldErrors });
    return;
  }
  const result = await authService.login(parsed.data);
  res.cookie('refreshToken', result.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/auth/refresh',
  });
  res.json({ accessToken: result.accessToken, user: result.user });
});

router.post('/refresh', async (req: Request, res: Response) => {
  const token: string | undefined = req.cookies?.refreshToken;
  if (!token) {
    res.status(401).json({ message: 'No refresh token' });
    return;
  }
  const result = await authService.refresh(token);
  res.cookie('refreshToken', result.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/auth/refresh',
  });
  res.json({ accessToken: result.accessToken });
});

router.post('/logout', async (req: Request, res: Response) => {
  const token: string | undefined = req.cookies?.refreshToken;
  if (token) await authService.logout(token);
  res.clearCookie('refreshToken', {
    path: '/api/auth/refresh',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
  res.json({ message: 'Logged out' });
});

router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  const user = await authService.getMe(req.user!.userId);
  res.json({ user });
});

export default router;
