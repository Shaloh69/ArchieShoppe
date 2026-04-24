import './config/env'; // validate env first
import 'express-async-errors'; // patches Express 4 to forward async rejections to errorHandler
import http from 'http';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { log } from './utils/logger';
import { runMigrations, runSeed, warmPythonServer, startKeepAlivePing } from './startup';
import { initWebSocketServer } from './ws/wsServer';
import { startHoldReleaseCron } from './cron/holdRelease';
import { startSubscriptionExpiryCron } from './cron/subscriptionExpiry';

import authRoutes from './routes/auth';
import itemRoutes from './routes/items';
import walletRoutes from './routes/wallet';
import orderRoutes from './routes/orders';
import lockerRoutes from './routes/lockers';
import refundRoutes from './routes/refunds';
import userRoutes from './routes/users';
import reportRoutes from './routes/reports';
import webhookRoutes from './routes/webhooks';
import configRoutes from './routes/config';
import wishlistRoutes from './routes/wishlist';
import reviewRoutes from './routes/reviews';
import cashoutRoutes from './routes/cashouts';

const app = express();

// Trust Render's reverse proxy so rate-limit and IP-based logic work correctly
app.set('trust proxy', 1);

// Security
app.use(helmet());

// CLIENT_URL is comma-separated — split into array for multi-app CORS support
const allowedOrigins = env.CLIENT_URL.split(',')
  .map((o) => o.trim())
  .filter(Boolean);
app.use(
  cors({
    origin: (origin, cb) => {
      // Allow server-to-server requests (no origin) and listed origins
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  }),
);

// Webhook route needs raw body BEFORE express.json
app.use('/api/webhooks', express.raw({ type: 'application/json' }), webhookRoutes);

// Color-coded HTTP request logger
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  // Skip noisy heartbeat polling and health checks from the log
  const skip = req.path === '/api/health' || req.path === '/api/lockers';
  if (!skip) log.api.req(req.method, req.path, req.ip ?? '');
  res.on('finish', () => {
    if (!skip) log.api.res(req.method, req.path, res.statusCode, Date.now() - start);
  });
  next();
});
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

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/lockers', lockerRoutes);
app.use('/api/refunds', refundRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/config', configRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/cashouts', cashoutRoutes);

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
    startSubscriptionExpiryCron();
    startKeepAlivePing(`https://unithrift-api.onrender.com`);

    server.listen(env.PORT, () => {
      log.sys.ok(`UniThrift API listening on port ${env.PORT}  env=${env.NODE_ENV}`);
    });
  } catch (err) {
    log.sys.error('Fatal startup error', err);
    process.exit(1);
  }
}

bootstrap();
