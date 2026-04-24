import { WebSocket } from 'ws';

export interface TaggedWebSocket extends WebSocket {
  deviceId?: string;
  isAlive?: boolean;
  role?: 'ESP' | 'ADMIN' | 'CAMERA';
}

export const espConnections = new Map<string, TaggedWebSocket>();
export const adminConnections = new Set<TaggedWebSocket>();

// Single camera-server laptop connection
export let cameraConnection: TaggedWebSocket | null = null;
export function setCameraConnection(ws: TaggedWebSocket | null): void {
  cameraConnection = ws;
}

// ─── Live ESP health state (in-memory, updated on each heartbeat) ─────────────
export interface EspSlotHealth {
  slotId: string;
  doorOpen: boolean;
}

export interface EspHealth {
  connected: boolean;
  deviceId: string;
  lastSeen: number; // Date.now() ms
  heartbeatCount: number;
  rssi: number | null; // dBm
  uptime: number | null; // ms since ESP boot
  freeHeap: number | null; // bytes
  slots: EspSlotHealth[];
}

export const espHealth: EspHealth = {
  connected: false,
  deviceId: 'Kiosk-1',
  lastSeen: 0,
  heartbeatCount: 0,
  rssi: null,
  uptime: null,
  freeHeap: null,
  slots: [],
};

// ─── Camera server state (in-memory) ─────────────────────────────────────────
export interface CameraInfo {
  index: number;
  name: string;
}

export interface CameraServerHealth {
  connected: boolean;
  lastSeen: number;
  cameras: CameraInfo[];
}

export const cameraServerHealth: CameraServerHealth = {
  connected: false,
  lastSeen: 0,
  cameras: [],
};
