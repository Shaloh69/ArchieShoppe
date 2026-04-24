"""
camera_server/main.py
---------------------
UniThrift Camera Server — runs on the Windows 11 laptop that has the USB cameras.

Flow:
  1. Auto-detects all USB cameras via OpenCV.
  2. Opens a persistent WebSocket to the Render API at /ws/camera?key=<secret>.
  3. Sends CAMERA_CONNECTED with the list of detected cameras.
  4. Waits for CAPTURE_SLOT commands from the admin panel.
  5. Captures a JPEG from the requested camera index, base64-encodes it,
     and sends it back as CAPTURE_RESULT.
  6. Reconnects automatically if the WebSocket drops (Render free-tier sleeps).

Run via:  start.bat  (or  python main.py  directly)
"""

import asyncio
import json
import logging
import signal
import sys
import time

import websockets
from websockets.exceptions import ConnectionClosed, WebSocketException

from camera_manager import CameraManager
from config import get_ws_url, RECONNECT_DELAY, HEARTBEAT_INTERVAL

# ── Logging ────────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("camera_server")

# ── Globals ───────────────────────────────────────────────────────────────────
camera_manager: CameraManager | None = None
_shutdown = asyncio.Event()


# ── Message handlers ──────────────────────────────────────────────────────────

async def handle_message(ws, raw: str) -> None:
    """Dispatch incoming server command."""
    try:
        msg = json.loads(raw)
    except json.JSONDecodeError:
        logger.warning("Received non-JSON message")
        return

    msg_type = msg.get("type", "")

    if msg_type == "CAPTURE_SLOT":
        await handle_capture(ws, msg)

    elif msg_type == "HEARTBEAT_ACK":
        pass  # server acknowledged our heartbeat — nothing to do

    elif msg_type == "CAMERA_ASSIGNMENTS":
        # Server sends current slot→camera assignments on connect.
        # We don't need to do anything with it here; it's informational.
        logger.info("Camera assignments received: %s", msg.get("assignments"))

    else:
        logger.warning("Unknown message type: %s", msg_type)


async def handle_capture(ws, msg: dict) -> None:
    """Capture a frame and send CAPTURE_RESULT or CAPTURE_ERROR."""
    request_id = msg.get("requestId", "")
    slot_id = msg.get("slotId", "")
    camera_index = msg.get("cameraIndex")

    if camera_index is None:
        await ws.send(json.dumps({
            "type": "CAPTURE_ERROR",
            "requestId": request_id,
            "slotId": slot_id,
            "error": "cameraIndex not provided",
        }))
        return

    logger.info("Capturing slot %s from camera index %d …", slot_id, camera_index)

    image_data = camera_manager.capture(camera_index) if camera_manager else None

    if image_data is None:
        logger.warning("Capture failed for camera %d", camera_index)
        await ws.send(json.dumps({
            "type": "CAPTURE_ERROR",
            "requestId": request_id,
            "slotId": slot_id,
            "error": f"Camera {camera_index} not available or frame read failed",
        }))
        return

    logger.info("Capture success — sending %d bytes (base64)", len(image_data))
    await ws.send(json.dumps({
        "type": "CAPTURE_RESULT",
        "requestId": request_id,
        "slotId": slot_id,
        "imageData": image_data,
    }))


# ── WebSocket session ─────────────────────────────────────────────────────────

async def run_session() -> None:
    """Single WebSocket session — exits on close; caller reconnects."""
    url = get_ws_url()
    logger.info("Connecting to %s …", url.split("?")[0])  # hide secret in log

    async with websockets.connect(
        url,
        ping_interval=None,   # we manage heartbeats manually
        open_timeout=20,
        close_timeout=10,
    ) as ws:
        logger.info("Connected to server")

        # Announce detected cameras
        await ws.send(json.dumps({
            "type": "CAMERA_CONNECTED",
            "cameras": camera_manager.get_camera_list() if camera_manager else [],
        }))

        # Run message loop + heartbeat concurrently
        async def recv_loop():
            async for raw in ws:
                await handle_message(ws, raw)

        async def heartbeat_loop():
            while True:
                await asyncio.sleep(HEARTBEAT_INTERVAL)
                await ws.send(json.dumps({"type": "HEARTBEAT"}))

        recv_task = asyncio.create_task(recv_loop())
        hb_task = asyncio.create_task(heartbeat_loop())
        shutdown_task = asyncio.create_task(_shutdown.wait())

        done, pending = await asyncio.wait(
            [recv_task, hb_task, shutdown_task],
            return_when=asyncio.FIRST_COMPLETED,
        )

        for task in pending:
            task.cancel()

        if shutdown_task in done:
            await ws.close()
            raise SystemExit(0)

        # If recv_task or hb_task finished, the connection dropped
        for task in done:
            if task.exception():
                raise task.exception()


# ── Main loop with reconnect ──────────────────────────────────────────────────

async def main() -> None:
    global camera_manager

    logger.info("=" * 60)
    logger.info("  UniThrift Camera Server")
    logger.info("=" * 60)

    # Detect cameras once at startup
    camera_manager = CameraManager()

    if not camera_manager.cameras:
        logger.warning("No USB cameras detected! Check connections and try again.")
        logger.warning("The server will still connect and wait — plug in cameras and restart.")

    # Graceful shutdown on Ctrl+C / SIGTERM
    def request_shutdown(*_):
        logger.info("Shutdown requested …")
        _shutdown.set()

    signal.signal(signal.SIGINT, request_shutdown)
    if hasattr(signal, "SIGTERM"):
        signal.signal(signal.SIGTERM, request_shutdown)

    # Reconnect loop
    while not _shutdown.is_set():
        try:
            await run_session()
        except SystemExit:
            break
        except (ConnectionClosed, WebSocketException, OSError) as exc:
            logger.warning("Connection lost: %s", exc)
        except Exception as exc:
            logger.error("Unexpected error: %s", exc, exc_info=True)

        if not _shutdown.is_set():
            logger.info("Reconnecting in %d s …", RECONNECT_DELAY)
            try:
                await asyncio.wait_for(_shutdown.wait(), timeout=RECONNECT_DELAY)
            except asyncio.TimeoutError:
                pass

    if camera_manager:
        camera_manager.release()

    logger.info("Camera server stopped.")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except SystemExit:
        sys.exit(0)
