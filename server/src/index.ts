import './config/env'; // validate env first
import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'path';

import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { runMigrations, runSeed, warmPythonServer } from './startup';
import { initWebSocketServer } from './ws/wsServer';
import { startHoldReleaseCron } from './cron/holdRelease';

import authRoutes from './routes/auth';
import itemRoutes from './routes/items';
import walletRoutes from './routes/wallet';
import orderRoutes from './routes/orders';
import lockerRoutes from './routes/lockers';
import refundRoutes from './routes/refunds';
import userRoutes from './routes/users';
import reportRoutes from './routes/reports';
import webhookRoutes from './routes/webhooks';

const app = express();

// Security
app.use(helmet());
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  }),
);

// Webhook route needs raw body BEFORE express.json
app.use('/api/webhooks', express.raw({ type: 'application/json' }), webhookRoutes);

// Standard middleware
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Rate limiting — 100 req / 15 min per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Stricter limit on auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth/', authLimiter);

// Static uploads
app.use('/uploads', express.static(path.resolve(env.UPLOAD_DIR)));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/lockers', lockerRoutes);
app.use('/api/refunds', refundRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reports', reportRoutes);

// Health check (for UptimeRobot + Python warm-up)
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', env: env.NODE_ENV, ts: new Date().toISOString() });
});

// 404 catch-all
app.use((_req, res) => res.status(404).json({ message: 'Route not found' }));

// Error handler (must be last)
app.use(errorHandler);

const server = http.createServer(app);
initWebSocketServer(server);

async function bootstrap() {
  try {
    await runMigrations();
    await runSeed();
    await warmPythonServer(env.PYTHON_SERVER_URL);
    startHoldReleaseCron();

    server.listen(env.PORT, () => {
      console.log(`[server] UniThrift API listening on port ${env.PORT}`);
    });
  } catch (err) {
    console.error('[server] Fatal startup error:', err);
    process.exit(1);
  }
}

bootstrap();
