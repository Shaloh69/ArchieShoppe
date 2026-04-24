import { IncomingMessage } from 'http';
import { TaggedWebSocket, setCameraConnection, cameraServerHealth, CameraInfo } from './wsState';
import { broadcastToAdmins } from './broadcaster';
import { supabase } from '../config/supabase';
import { env } from '../config/env';
import crypto from 'crypto';

interface CameraMessage {
  type: string;
  requestId?: string;
  slotId?: string;
  imageData?: string; // base64-encoded JPEG
  error?: string;
  cameras?: CameraInfo[];
}

export function handleCameraConnection(ws: TaggedWebSocket, req: IncomingMessage): void {
  const urlParams = new URLSearchParams(req.url?.split('?')[1] ?? '');
  const key = urlParams.get('key');

  // Simple shared-secret auth — camera server sets CAMERA_WS_SECRET in its .env
  if (!key || key !== env.CAMERA_WS_SECRET) {
    ws.close(4001, 'Unauthorized');
    console.warn('[ws/camera] Rejected connection — invalid key');
    return;
  }

  ws.role = 'CAMERA';
  ws.isAlive = true;
  setCameraConnection(ws);

  cameraServerHealth.connected = true;
  cameraServerHealth.lastSeen = Date.now();

  console.log('[ws/camera] Camera server connected');

  // Tell admins the camera server is online
  broadcastToAdmins({
    type: 'CAMERA_SERVER_STATUS',
    online: true,
    lastSeen: cameraServerHealth.lastSeen,
    cameras: cameraServerHealth.cameras,
  });

  ws.on('pong', () => {
    ws.isAlive = true;
    cameraServerHealth.lastSeen = Date.now();
  });

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString()) as CameraMessage;
      handleCameraMessage(msg).catch((err: unknown) =>
        console.error('[ws/camera] handler error:', err),
      );
    } catch {
      console.warn('[ws/camera] non-JSON message');
    }
  });

  ws.on('close', () => {
    setCameraConnection(null);
    cameraServerHealth.connected = false;
    cameraServerHealth.cameras = [];
    console.log('[ws/camera] Camera server disconnected');

    broadcastToAdmins({
      type: 'CAMERA_SERVER_STATUS',
      online: false,
      lastSeen: cameraServerHealth.lastSeen,
      cameras: [],
    });
  });
}

async function handleCameraMessage(msg: CameraMessage): Promise<void> {
  switch (msg.type) {
    case 'CAMERA_CONNECTED': {
      if (msg.cameras) {
        cameraServerHealth.cameras = msg.cameras;
        cameraServerHealth.lastSeen = Date.now();
      }
      broadcastToAdmins({
        type: 'CAMERA_SERVER_STATUS',
        online: true,
        lastSeen: cameraServerHealth.lastSeen,
        cameras: cameraServerHealth.cameras,
      });
      console.log(`[ws/camera] Detected cameras: ${JSON.stringify(cameraServerHealth.cameras)}`);
      break;
    }

    case 'CAPTURE_RESULT': {
      if (!msg.imageData || !msg.slotId) break;

      // Decode base64 → Buffer → upload to Supabase
      const buffer = Buffer.from(msg.imageData, 'base64');
      const filename = `captures/cam-${msg.slotId}-${crypto.randomBytes(8).toString('hex')}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from(env.SUPABASE_BUCKET)
        .upload(filename, buffer, { contentType: 'image/jpeg', upsert: false });

      if (uploadError) {
        console.error('[ws/camera] Supabase upload failed:', uploadError.message);
        broadcastToAdmins({
          type: 'CAPTURE_ERROR',
          requestId: msg.requestId,
          slotId: msg.slotId,
          error: `Upload failed: ${uploadError.message}`,
        });
        break;
      }

      const { data: publicData } = supabase.storage
        .from(env.SUPABASE_BUCKET)
        .getPublicUrl(filename);

      broadcastToAdmins({
        type: 'CAPTURE_RESULT',
        requestId: msg.requestId,
        slotId: msg.slotId,
        imageUrl: publicData.publicUrl,
        ts: Date.now(),
      });
      break;
    }

    case 'CAPTURE_ERROR': {
      broadcastToAdmins({
        type: 'CAPTURE_ERROR',
        requestId: msg.requestId,
        slotId: msg.slotId,
        error: msg.error ?? 'Capture failed',
      });
      break;
    }

    case 'HEARTBEAT': {
      cameraServerHealth.lastSeen = Date.now();
      break;
    }

    default:
      console.warn(`[ws/camera] Unknown message: ${msg.type}`);
  }
}
