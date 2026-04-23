import { TaggedWebSocket, adminConnections } from './wsState';
import { sendCommandToEsp } from './espHandler';

export function registerAdmin(ws: TaggedWebSocket): void {
  adminConnections.add(ws);
}

export function unregisterAdmin(ws: TaggedWebSocket): void {
  adminConnections.delete(ws);
}

interface AdminMessage {
  type: string;
  deviceId?: string;
  slotId?: string;
  payload?: Record<string, unknown>;
}

export async function handleAdminMessage(ws: TaggedWebSocket, msg: AdminMessage): Promise<void> {
  switch (msg.type) {
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

    case 'PING':
      ws.send(JSON.stringify({ type: 'PONG', ts: Date.now() }));
      break;

    default:
      ws.send(JSON.stringify({ type: 'ERROR', message: `Unknown command: ${msg.type}` }));
  }
}
