/**
 * Color-coded console logger.
 * Uses ANSI escape codes — works on Render logs, local terminals, and VSCode.
 * Each subsystem has its own color so you can spot events at a glance.
 */

const RESET  = '\x1b[0m';
const BOLD   = '\x1b[1m';
const DIM    = '\x1b[2m';

// Foreground colors
const FG = {
  red:     '\x1b[31m',
  green:   '\x1b[32m',
  yellow:  '\x1b[33m',
  blue:    '\x1b[34m',
  magenta: '\x1b[35m',
  cyan:    '\x1b[36m',
  white:   '\x1b[37m',
  gray:    '\x1b[90m',
  orange:  '\x1b[38;5;214m',
  lime:    '\x1b[38;5;118m',
  teal:    '\x1b[38;5;45m',
  pink:    '\x1b[38;5;205m',
};

function ts(): string {
  return `${DIM}${new Date().toISOString().replace('T', ' ').slice(0, 23)}${RESET}`;
}

function tag(color: string, label: string): string {
  return `${BOLD}${color}[${label}]${RESET}`;
}

// ─── Level helpers ────────────────────────────────────────────────────────────

function info(subsystem: string, color: string, msg: string, ...args: unknown[]) {
  console.log(`${ts()} ${tag(color, subsystem)} ${msg}`, ...args);
}

function warn(subsystem: string, color: string, msg: string, ...args: unknown[]) {
  console.warn(`${ts()} ${tag(FG.yellow, subsystem)} ${FG.yellow}${msg}${RESET}`, ...args);
}

function error(subsystem: string, _color: string, msg: string, ...args: unknown[]) {
  console.error(`${ts()} ${tag(FG.red, subsystem)} ${FG.red}${msg}${RESET}`, ...args);
}

function ok(subsystem: string, color: string, msg: string, ...args: unknown[]) {
  console.log(`${ts()} ${tag(color, subsystem)} ${FG.green}${msg}${RESET}`, ...args);
}

// ─── Subsystem loggers ────────────────────────────────────────────────────────

export const log = {
  // ── HTTP API ─────────────────────────────────────  cyan
  api: {
    req:  (method: string, path: string, ip: string) =>
      info('API', FG.cyan, `${BOLD}${method}${RESET} ${path}  ${DIM}${ip}${RESET}`),
    res:  (method: string, path: string, status: number, ms: number) => {
      const color = status >= 500 ? FG.red : status >= 400 ? FG.yellow : FG.green;
      console.log(
        `${ts()} ${tag(FG.cyan, 'API')} ${BOLD}${method}${RESET} ${path}  ` +
        `${color}${BOLD}${status}${RESET}  ${DIM}${ms}ms${RESET}`,
      );
    },
    error: (method: string, path: string, status: number, msg: string) =>
      error('API', FG.cyan, `${method} ${path} → ${status} ${msg}`),
  },

  // ── ESP32 / Kiosk ────────────────────────────────  orange
  esp: {
    connect:    (deviceId: string) =>
      ok('ESP32', FG.orange, `🔌 ${deviceId} connected`),
    disconnect: (deviceId: string) =>
      warn('ESP32', FG.orange, `🔌 ${deviceId} disconnected`),
    heartbeat:  (deviceId: string, rssi: number | null, uptime: number | null, heap: number | null) =>
      info('ESP32', FG.orange,
        `💓 ${deviceId}  RSSI ${rssi ?? '?'}dBm  up ${_fmt_uptime(uptime)}  heap ${heap ?? '?'}B`,
      ),
    door:       (deviceId: string, slotId: string, state: string) => {
      const icon = state === 'OPEN' ? '🔓' : '🔒';
      info('ESP32', FG.orange, `${icon} ${deviceId}  slot ${slotId}  door ${state}`);
    },
    code:       (deviceId: string, slotId: string, accepted: boolean) => {
      const icon = accepted ? `${FG.green}✔` : `${FG.red}✘`;
      info('ESP32', FG.orange, `${icon}${RESET} ${deviceId}  slot ${slotId}  code ${accepted ? 'ACCEPTED' : 'REJECTED'}`);
    },
    cmd:        (deviceId: string, type: string, slotId?: string) =>
      info('ESP32', FG.orange, `→ ${deviceId}  ${type}${slotId ? `  slot ${slotId}` : ''}`),
    warn:       (deviceId: string, msg: string) =>
      warn('ESP32', FG.orange, `${deviceId}  ${msg}`),
    error:      (deviceId: string, msg: string, err?: unknown) =>
      error('ESP32', FG.orange, `${deviceId}  ${msg}`, err ?? ''),
  },

  // ── WebSocket (admin/camera) ──────────────────────  magenta
  ws: {
    adminConnect:    () => ok('WS', FG.magenta, '👤 Admin connected'),
    adminDisconnect: () => warn('WS', FG.magenta, '👤 Admin disconnected'),
    cameraConnect:   (id: string) => ok('WS', FG.magenta, `📷 Camera connected  id=${id}`),
    cameraDisconnect:(id: string) => warn('WS', FG.magenta, `📷 Camera disconnected  id=${id}`),
    broadcast:       (type: string, count: number) =>
      info('WS', FG.magenta, `↗ broadcast ${type}  to ${count} admin(s)`),
    error:           (msg: string, err?: unknown) =>
      error('WS', FG.magenta, msg, err ?? ''),
  },

  // ── Auth ─────────────────────────────────────────  blue
  auth: {
    login:   (email: string, ip: string) =>
      ok('AUTH', FG.blue, `🔑 login  ${email}  ${DIM}${ip}${RESET}`),
    logout:  (userId: string) =>
      info('AUTH', FG.blue, `👋 logout  ${userId}`),
    refresh: (userId: string) =>
      info('AUTH', FG.blue, `🔄 token refreshed  ${userId}`),
    failed:  (reason: string, ip: string) =>
      warn('AUTH', FG.blue, `⚠ auth failed: ${reason}  ${DIM}${ip}${RESET}`),
  },

  // ── Wallet / Payments ────────────────────────────  green
  wallet: {
    topup:   (userId: string, amount: number, method: string) =>
      ok('WALLET', FG.lime, `💰 top-up  ${userId}  ₱${amount.toFixed(2)}  via ${method}`),
    debit:   (userId: string, amount: number, type: string) =>
      info('WALLET', FG.lime, `💸 debit  ${userId}  ₱${amount.toFixed(2)}  ${type}`),
    credit:  (userId: string, amount: number, type: string) =>
      ok('WALLET', FG.lime, `💵 credit  ${userId}  ₱${amount.toFixed(2)}  ${type}`),
    cashout: (userId: string, amount: number, method: string) =>
      info('WALLET', FG.lime, `🏦 cashout requested  ${userId}  ₱${amount.toFixed(2)}  ${method}`),
  },

  // ── Orders ───────────────────────────────────────  teal
  order: {
    created:   (orderId: string, itemTitle: string, amount: number) =>
      ok('ORDER', FG.teal, `🛒 created  ${orderId.slice(0, 10)}…  "${itemTitle}"  ₱${amount.toFixed(2)}`),
    completed: (orderId: string) =>
      ok('ORDER', FG.teal, `✅ completed  ${orderId.slice(0, 10)}…`),
    refund:    (orderId: string, policy: string) =>
      warn('ORDER', FG.teal, `↩ refund requested  ${orderId.slice(0, 10)}…  policy=${policy}`),
    expired:   (count: number) =>
      warn('ORDER', FG.teal, `⏰ ${count} hold(s) auto-released`),
  },

  // ── Startup / System ─────────────────────────────  pink
  sys: {
    info:  (msg: string) => info('SYS', FG.pink, `ℹ ${msg}`),
    ok:    (msg: string) => ok('SYS', FG.pink, `✔ ${msg}`),
    warn:  (msg: string) => warn('SYS', FG.pink, msg),
    error: (msg: string, err?: unknown) => error('SYS', FG.pink, msg, err ?? ''),
    cron:  (msg: string) => info('CRON', FG.gray, msg),
  },
};

function _fmt_uptime(seconds: number | null): string {
  if (seconds === null) return '?';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h${m}m`;
  if (m > 0) return `${m}m${s}s`;
  return `${s}s`;
}
