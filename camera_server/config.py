"""
camera_server/config.py
-----------------------
All configuration is read from environment variables (or .env via python-dotenv).
Set these in camera_server/.env before running start.bat.
"""
import os
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

# WebSocket URL of the Render API server
# Production:  wss://unithrift-api.onrender.com/ws/camera?key=<CAMERA_WS_SECRET>
# Local dev:   ws://localhost:3001/ws/camera?key=camera-dev-secret
WS_URL: str = os.getenv("WS_URL", "ws://localhost:3001")
CAMERA_WS_SECRET: str = os.getenv("CAMERA_WS_SECRET", "camera-dev-secret")

# Full WebSocket connection URL (key injected as query param)
def get_ws_url() -> str:
    base = WS_URL.rstrip("/")
    return f"{base}/ws/camera?key={CAMERA_WS_SECRET}"

# How long (seconds) to wait before reconnecting after a disconnect
RECONNECT_DELAY: int = int(os.getenv("RECONNECT_DELAY", "5"))

# Heartbeat interval (seconds) — keep the connection alive through Render's idle timeout
HEARTBEAT_INTERVAL: int = int(os.getenv("HEARTBEAT_INTERVAL", "20"))

# JPEG capture quality (0-100)
JPEG_QUALITY: int = int(os.getenv("JPEG_QUALITY", "85"))

# Resolution for captures — lower = faster upload, higher = better detail
CAPTURE_WIDTH: int = int(os.getenv("CAPTURE_WIDTH", "1280"))
CAPTURE_HEIGHT: int = int(os.getenv("CAPTURE_HEIGHT", "720"))
