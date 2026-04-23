import { IncomingMessage, Server } from 'http';
import { WebSocketServer } from 'ws';
import { TaggedWebSocket, espConnections } from './wsState';
import { handleEspMessage } from './espHandler';
import { handleAdminMessage, registerAdmin, unregisterAdmin } from './adminHandler';
import { verifyAccessToken } from '../utils/jwt';

export { TaggedWebSocket } from './wsState';

export function initWebSocketServer(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ server, path: undefined });

  wss.on('connection', (ws: TaggedWebSocket, req: IncomingMessage) => {
    const url = req.url ?? '';

    if (url.startsWith('/ws/esp')) {
      handleEspConnection(ws, req);
    } else if (url.startsWith('/ws/admin')) {
      handleAdminConnection(ws, req);
    } else {
      ws.close(4001, 'Unknown WebSocket path');
    }
  });

  const interval = setInterval(() => {
    wss.clients.forEach((rawWs) => {
      const ws = rawWs as TaggedWebSocket;
      if (!ws.isAlive) {
        ws.terminate();
        return;
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => clearInterval(interval));

  console.log('[ws] WebSocket server initialised on /ws/esp and /ws/admin');
  return wss;
}

function handleEspConnection(ws: TaggedWebSocket, req: IncomingMessage) {
  const urlParams = new URLSearchParams(req.url?.split('?')[1] ?? '');
  const deviceId = urlParams.get('deviceId') ?? 'Kiosk-1';

  ws.deviceId = deviceId;
  ws.role = 'ESP';
  ws.isAlive = true;
  espConnections.set(deviceId, ws);

  console.log(`[ws/esp] ${deviceId} connected`);

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', (raw) => {
    try {
      const data = JSON.parse(raw.toString());
      handleEspMessage(ws, data).catch((err: unknown) =>
        console.error('[ws/esp] handler error:', err),
      );
    } catch {
      console.warn('[ws/esp] non-JSON message from', deviceId);
    }
  });

  ws.on('close', () => {
    espConnections.delete(deviceId);
    console.log(`[ws/esp] ${deviceId} disconnected`);
  });
}

function handleAdminConnection(ws: TaggedWebSocket, req: IncomingMessage) {
  const urlParams = new URLSearchParams(req.url?.split('?')[1] ?? '');
  const token = urlParams.get('token');

  if (!token) {
    ws.close(4001, 'Missing token');
    return;
  }

  try {
    verifyAccessToken(token);
  } catch {
    ws.close(4001, 'Invalid token');
    return;
  }

  ws.role = 'ADMIN';
  ws.isAlive = true;
  registerAdmin(ws);

  console.log('[ws/admin] Admin connected');

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', (raw) => {
    try {
      const data = JSON.parse(raw.toString());
      handleAdminMessage(ws, data).catch((err: unknown) =>
        console.error('[ws/admin] handler error:', err),
      );
    } catch {
      console.warn('[ws/admin] non-JSON message');
    }
  });

  ws.on('close', () => {
    unregisterAdmin(ws);
    console.log('[ws/admin] Admin disconnected');
  });
}
