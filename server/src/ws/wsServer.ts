import { IncomingMessage, Server } from 'http';
import { WebSocketServer } from 'ws';
import { TaggedWebSocket, espConnections } from './wsState';
import { handleEspMessage } from './espHandler';
import { handleAdminMessage, registerAdmin, unregisterAdmin } from './adminHandler';
import { handleCameraConnection } from './cameraHandler';
import { verifyAccessToken } from '../utils/jwt';
import { log } from '../utils/logger';

export { TaggedWebSocket } from './wsState';

export function initWebSocketServer(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws: TaggedWebSocket, req: IncomingMessage) => {
    const url = req.url ?? '';

    if (url.startsWith('/ws/esp')) {
      handleEspConnection(ws, req);
    } else if (url.startsWith('/ws/admin')) {
      handleAdminConnection(ws, req);
    } else if (url.startsWith('/ws/camera')) {
      handleCameraConnection(ws, req);
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

  log.sys.ok('WebSocket server ready  /ws/esp  /ws/admin  /ws/camera');
  return wss;
}

function handleEspConnection(ws: TaggedWebSocket, req: IncomingMessage) {
  const urlParams = new URLSearchParams(req.url?.split('?')[1] ?? '');
  const deviceId = urlParams.get('deviceId') ?? 'Kiosk-1';

  ws.deviceId = deviceId;
  ws.role = 'ESP';
  ws.isAlive = true;
  espConnections.set(deviceId, ws);

  log.esp.connect(deviceId);

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', (raw) => {
    try {
      const data = JSON.parse(raw.toString());
      handleEspMessage(ws, data).catch((err: unknown) =>
        log.esp.error(deviceId, 'handler error', err),
      );
    } catch {
      log.esp.warn(deviceId, 'non-JSON message received');
    }
  });

  ws.on('close', () => {
    espConnections.delete(deviceId);
    log.esp.disconnect(deviceId);
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

  log.ws.adminConnect();

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', (raw) => {
    try {
      const data = JSON.parse(raw.toString());
      handleAdminMessage(ws, data).catch((err: unknown) =>
        log.ws.error('admin handler error', err),
      );
    } catch {
      log.ws.error('non-JSON message from admin');
    }
  });

  ws.on('close', () => {
    unregisterAdmin(ws);
    log.ws.adminDisconnect();
  });
}
