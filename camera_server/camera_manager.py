"""
camera_server/camera_manager.py
--------------------------------
Detects all connected USB cameras and captures JPEG frames on demand.

Detection strategy:
  - Tries cv2.VideoCapture(index) for indices 0..MAX_CAMERAS-1
  - A camera is considered present if the VideoCapture opens AND at least
    one frame can be read from it
  - Uses DirectShow backend on Windows (cv2.CAP_DSHOW) for faster open time
    and better USB device name resolution

Each CameraManager instance keeps captures open so they are ready instantly
when a capture command arrives. Call release() on shutdown.
"""

import base64
import logging
from dataclasses import dataclass, field
from typing import Optional

import cv2

from config import CAPTURE_WIDTH, CAPTURE_HEIGHT, JPEG_QUALITY

logger = logging.getLogger("camera_manager")

MAX_CAMERAS = 10  # scan indices 0..9


@dataclass
class CameraDevice:
    index: int
    name: str
    cap: cv2.VideoCapture = field(repr=False)


class CameraManager:
    def __init__(self) -> None:
        self.cameras: list[CameraDevice] = []
        self._detect()

    # ── Detection ──────────────────────────────────────────────────────────────

    def _detect(self) -> None:
        """Scan USB indices and open any camera that responds."""
        self.cameras = []
        logger.info("Scanning for USB cameras (indices 0..%d)…", MAX_CAMERAS - 1)

        for idx in range(MAX_CAMERAS):
            cap = cv2.VideoCapture(idx, cv2.CAP_DSHOW)
            if not cap.isOpened():
                cap.release()
                continue

            # Try reading one frame to confirm the device is actually a camera
            ok, _ = cap.read()
            if not ok:
                cap.release()
                continue

            # Set preferred resolution
            cap.set(cv2.CAP_PROP_FRAME_WIDTH, CAPTURE_WIDTH)
            cap.set(cv2.CAP_PROP_FRAME_HEIGHT, CAPTURE_HEIGHT)

            name = self._get_camera_name(idx, cap)
            device = CameraDevice(index=idx, name=name, cap=cap)
            self.cameras.append(device)
            logger.info("  Found camera %d: %s", idx, name)

        logger.info("Detected %d camera(s)", len(self.cameras))

    def _get_camera_name(self, index: int, cap: cv2.VideoCapture) -> str:
        """Try to get a human-readable device name; fall back to index label."""
        # cv2 doesn't expose device names natively on Windows — use a best-effort approach
        # Backend name sometimes contains useful info (e.g. "DirectShow")
        backend = cap.getBackendName()
        return f"USB Camera {index} ({backend})"

    # ── Public API ─────────────────────────────────────────────────────────────

    def get_camera_list(self) -> list[dict]:
        """Return serialisable list for CAMERA_CONNECTED message."""
        return [{"index": cam.index, "name": cam.name} for cam in self.cameras]

    def capture(self, camera_index: int) -> Optional[str]:
        """
        Capture one frame from the camera at `camera_index`.

        Returns base64-encoded JPEG string, or None on failure.
        Does NOT raise — caller should handle None gracefully.
        """
        device = next((c for c in self.cameras if c.index == camera_index), None)
        if device is None:
            logger.warning("Capture requested for unknown camera index %d", camera_index)
            return None

        ok, frame = device.cap.read()
        if not ok or frame is None:
            logger.warning("Failed to read frame from camera %d", camera_index)
            # Attempt to reopen
            device.cap.release()
            device.cap = cv2.VideoCapture(camera_index, cv2.CAP_DSHOW)
            device.cap.set(cv2.CAP_PROP_FRAME_WIDTH, CAPTURE_WIDTH)
            device.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, CAPTURE_HEIGHT)
            ok, frame = device.cap.read()
            if not ok or frame is None:
                return None

        encode_params = [cv2.IMWRITE_JPEG_QUALITY, JPEG_QUALITY]
        ok, buffer = cv2.imencode(".jpg", frame, encode_params)
        if not ok:
            logger.warning("JPEG encode failed for camera %d", camera_index)
            return None

        return base64.b64encode(buffer.tobytes()).decode("utf-8")

    def release(self) -> None:
        """Release all open VideoCapture handles."""
        for device in self.cameras:
            device.cap.release()
        self.cameras = []
        logger.info("All cameras released")
