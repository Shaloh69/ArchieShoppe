import { WebSocket } from 'ws';
import { espConnections, adminConnections } from './wsState';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function broadcastToAdmins(payload: Record<string, any>): void {
  const message = JSON.stringify(payload);
  adminConnections.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function broadcastToEsp(deviceId: string, payload: Record<string, any>): void {
  const ws = espConnections.get(deviceId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}
