import { WebSocket } from 'ws';

// TaggedWebSocket defined here to avoid circular imports
export interface TaggedWebSocket extends WebSocket {
  deviceId?: string;
  isAlive?: boolean;
  role?: 'ESP' | 'ADMIN';
}

export const espConnections = new Map<string, TaggedWebSocket>();
export const adminConnections = new Set<TaggedWebSocket>();
