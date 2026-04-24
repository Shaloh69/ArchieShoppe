import { TaggedWebSocket, adminConnections, espHealth, cameraServerHealth } from './wsState';
import { sendCommandToEsp } from './espHandler';
import { sendToCameraServer } from './broadcaster';
import crypto from 'crypto';

export function registerAdmin(ws: TaggedWebSocket): void {
  adminConnections.add(ws);

  // Immediately send current ESP + camera health so the monitor page
  // doesn't have to wait for the next heartbeat cycle
  ws.send(
    JSON.stringify({
      type: 'ESP_HEALTH',
      connected: espHealth.connected,
      deviceId: espHealth.deviceId,
      lastSeen: espHealth.lastSeen,
      heartbeatCount: espHealth.heartbeatCount,
      rssi: espHealth.rssi,
      uptime: espHealth.uptime,
      freeHeap: espHealth.freeHeap,
      slots: espHealth.slots,
    }),
  );

  ws.send(
    JSON.stringify({
      type: 'CAMERA_SERVER_STATUS',
      online: cameraServerHealth.connected,
      lastSeen: cameraServerHealth.lastSeen,
      cameras: cameraServerHealth.cameras,
    }),
  );
}

export function unregisterAdmin(ws: TaggedWebSocket): void {
  adminConnections.delete(ws);
}

interface AdminMessage {
  type: string;
  deviceId?: string;
  slotId?: string;
  cameraIndex?: number;
  requestId?: string;
  payload?: Record<string, unknown>;
}

export async function handleAdminMessage(ws: TaggedWebSocket, msg: AdminMessage): Promise<void> {
  switch (msg.type) {
    // ── Locker control ──────────────────────────────────────────────────────────
    case 'UNLOCK_SLOT': {
      const deviceId = msg.deviceId ?? 'Kiosk-1';
      const sent = sendCommandToEsp(deviceId, { type: 'UNLOCK_SLOT', slotId: msg.slotId });
      ws.send(JSON.stringify({ type: 'ACK', original: msg.type, success: sent }));
      break;
    }

    case 'LOCK_SLOT': {
      const deviceId = msg.deviceId ?? 'Kiosk-1';
      const sent = sendCommandToEsp(deviceId, { type: 'LOCK_SLOT', slotId: msg.slotId });
      ws.send(JSON.stringify({ type: 'ACK', original: msg.type, success: sent }));
      break;
    }

    case 'REBOOT_ESP': {
      const deviceId = msg.deviceId ?? 'Kiosk-1';
      const sent = sendCommandToEsp(deviceId, { type: 'REBOOT' });
      ws.send(JSON.stringify({ type: 'ACK', original: msg.type, success: sent }));
      break;
    }

    // ── Solenoid raw test — sends directly to ESP, no DB record ─────────────────
    case 'TEST_SOLENOID_UNLOCK': {
      const deviceId = msg.deviceId ?? 'Kiosk-1';
      const sent = sendCommandToEsp(deviceId, { type: 'UNLOCK_SLOT', slotId: msg.slotId });
      ws.send(JSON.stringify({ type: 'ACK', original: msg.type, success: sent, test: true }));
      break;
    }

    case 'TEST_SOLENOID_LOCK': {
      const deviceId = msg.deviceId ?? 'Kiosk-1';
      const sent = sendCommandToEsp(deviceId, { type: 'LOCK_SLOT', slotId: msg.slotId });
      ws.send(JSON.stringify({ type: 'ACK', original: msg.type, success: sent, test: true }));
      break;
    }

    // ── Camera capture ───────────────────────────────────────────────────────────
    case 'CAPTURE_SLOT': {
      if (!msg.slotId || msg.cameraIndex === undefined) {
        ws.send(
          JSON.stringify({
            type: 'ACK',
            original: msg.type,
            success: false,
            error: 'slotId and cameraIndex required',
          }),
        );
        break;
      }
      const requestId = msg.requestId ?? crypto.randomUUID();
      const sent = sendToCameraServer({
        type: 'CAPTURE_SLOT',
        requestId,
        slotId: msg.slotId,
        cameraIndex: msg.cameraIndex,
      });
      ws.send(JSON.stringify({ type: 'ACK', original: msg.type, success: sent, requestId }));
      break;
    }

    case 'PING':
      ws.send(JSON.stringify({ type: 'PONG', ts: Date.now() }));
      break;

    default:
      ws.send(JSON.stringify({ type: 'ERROR', message: `Unknown command: ${msg.type}` }));
  }
}
