import { TaggedWebSocket, espConnections, espHealth } from './wsState';
import { prisma } from '../config/db';
import { createAuditLog } from '../utils/audit';
import { broadcastToAdmins } from './broadcaster';
import { log } from '../utils/logger';

interface EspSlot {
  slotId: string;
  doorOpen: boolean;
}

interface EspMessage {
  type: string;
  slotId?: string;
  status?: string;
  doorState?: 'OPEN' | 'CLOSED';
  sensorIndex?: number;
  metadata?: Record<string, unknown>;
  // heartbeat fields
  deviceId?: string;
  rssi?: number;
  uptime?: number;
  freeHeap?: number;
  slots?: EspSlot[];
}

const SLOT_MAP: Record<number, string> = {
  0: 'S-01',
  1: 'S-02',
  2: 'S-03',
  3: 'S-04',
  4: 'S-05',
  5: 'S-06',
};

export async function handleEspMessage(ws: TaggedWebSocket, msg: EspMessage): Promise<void> {
  const deviceId = ws.deviceId ?? 'Kiosk-1';

  switch (msg.type) {
    case 'DOOR_STATE': {
      const slotId =
        msg.slotId ?? (msg.sensorIndex !== undefined ? SLOT_MAP[msg.sensorIndex] : undefined);
      if (!slotId) break;

      const newStatus = msg.doorState === 'OPEN' ? 'UNLOCKED' : 'LOCKED';
      await prisma.lockerSlot.update({
        where: { slotId },
        data: { status: newStatus, lastEvent: new Date().toISOString() },
      });
      await prisma.lockerEvent.create({
        data: {
          slotId,
          eventType: `DOOR_${msg.doorState}`,
          source: 'ESP32',
          metadata: { deviceId },
        },
      });
      await createAuditLog('IOT', deviceId, slotId, `DOOR_${msg.doorState}`, { deviceId });
      log.esp.door(deviceId, slotId, msg.doorState ?? '?');
      broadcastToAdmins({ type: 'LOCKER_UPDATE', slotId, status: newStatus, source: 'ESP32' });
      break;
    }

    case 'PERSONAL_CODE_ENTERED': {
      const { slotId, code } = msg as unknown as { slotId: string; code: string };
      if (!slotId || !code) break;

      const order = await prisma.order.findFirst({
        where: { personalCode: code, slotId, status: 'HELD' },
      });

      if (order) {
        ws.send(JSON.stringify({ type: 'UNLOCK_SLOT', slotId }));
        await prisma.lockerEvent.create({
          data: {
            slotId,
            eventType: 'CODE_ACCEPTED',
            source: 'ESP32',
            metadata: { orderId: order.id },
          },
        });
        log.esp.code(deviceId, slotId, true);
        broadcastToAdmins({ type: 'CODE_ACCEPTED', slotId, orderId: order.id });
      } else {
        ws.send(JSON.stringify({ type: 'CODE_REJECTED', slotId }));
        log.esp.code(deviceId, slotId, false);
      }
      break;
    }

    case 'HEARTBEAT': {
      // Update in-memory health state
      espHealth.connected = true;
      espHealth.deviceId = msg.deviceId ?? deviceId;
      espHealth.lastSeen = Date.now();
      espHealth.heartbeatCount += 1;
      espHealth.rssi = msg.rssi ?? null;
      espHealth.uptime = msg.uptime ?? null;
      espHealth.freeHeap = msg.freeHeap ?? null;
      espHealth.slots = msg.slots ?? [];

      ws.send(JSON.stringify({ type: 'HEARTBEAT_ACK', ts: Date.now() }));
      log.esp.heartbeat(espHealth.deviceId, espHealth.rssi, espHealth.uptime, espHealth.freeHeap);

      // Broadcast live health to all connected admins
      broadcastToAdmins({
        type: 'ESP_HEALTH',
        connected: true,
        deviceId: espHealth.deviceId,
        lastSeen: espHealth.lastSeen,
        heartbeatCount: espHealth.heartbeatCount,
        rssi: espHealth.rssi,
        uptime: espHealth.uptime,
        freeHeap: espHealth.freeHeap,
        slots: espHealth.slots,
      });
      break;
    }

    case 'STATUS_REPORT': {
      // Update slot states from full report
      if (msg.slots) {
        espHealth.slots = msg.slots;
      }
      broadcastToAdmins({ type: 'ESP_STATUS', deviceId, data: msg });
      break;
    }

    default:
      log.esp.warn(deviceId, `unknown message type: ${msg.type}`);
  }
}

export function sendCommandToEsp(deviceId: string, command: Record<string, unknown>): boolean {
  const ws = espConnections.get(deviceId);
  if (!ws || ws.readyState !== 1) {
    log.esp.warn(deviceId, `sendCommand failed — not connected  type=${command.type}`);
    return false;
  }
  ws.send(JSON.stringify(command));
  log.esp.cmd(deviceId, String(command.type), command.slotId as string | undefined);
  return true;
}
