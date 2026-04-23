import logging

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .routers import verification

logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)

app = FastAPI(
    title=settings.app_name,
    description=(
        "AI-powered item verification for UniThrift kiosk. "
        "Compares seller listing photos with kiosk camera captures "
        "to verify item condition before releasing buyer payments."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def api_key_auth(request: Request, call_next):
    """Require X-API-Key header for all /api/v1/* endpoints."""
    if request.url.path.startswith("/api/v1/"):
        key = request.headers.get("X-API-Key")
        if not key or key != settings.api_key:
            raise HTTPException(status_code=401, detail="Invalid or missing X-API-Key")
    return await call_next(request)


app.include_router(verification.router, prefix="/api/v1", tags=["verification"])


@app.get("/")
async def root():
    return {
        "service": settings.app_name,
        "version": "1.0.0",
        "docs": "/docs",
        "verify_endpoint": "/api/v1/verify",
        "health_endpoint": "/api/v1/health",
    }
