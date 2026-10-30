import os
import sys
from contextlib import asynccontextmanager
import asyncio
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.db import db
from app import storage

from app.api.register import router as register_router
from app.api.check import router as check_router
from app.api.public import router as public_router
from app.api.jobs import router as jobs_router
from app.api.discover import router as discover_router, showcase_dir
from app.api.auth import router as auth_router, ensure_auth_indexes
from app.api.mark import router as mark_router
from app.certificate.generate import router as certificate_router
from app.gate.features import ensure_gate_indexes
from app.registry.index import index
from app.registry.anchor import anchor_missing

logger = logging.getLogger("uvicorn.error")


def _warm_models():
    """Load CLIP and DINOv2 once at startup so the first live pipeline run is not a 30 s cold start."""
    from app.fingerprint.embedding import get_model
    from app.gate.retrieve import get_clip_model, get_dino_model
    try:
        get_model()
        get_clip_model()
        get_dino_model()
        logger.info("Embedding models warmed up.")
    except Exception as exc:  # warm-up is best effort
        logger.warning("Model warm-up skipped: %s", exc)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await ensure_auth_indexes(db)
    await db.works.create_index("user_id")
    await db.works.create_index("id", unique=True)
    await db.checks.create_index([("user_id", 1), ("created_at", -1)])
    await ensure_gate_indexes(db)
    await index.sync(db)
    logger.info("Similarity index loaded with %d works.", len(index))
    anchor_task = asyncio.create_task(anchor_missing(db))
    if "pytest" not in sys.modules and os.environ.get("WARMUP_MODELS", "1") != "0":
        asyncio.get_running_loop().run_in_executor(None, _warm_models)
        from app.api.mark import warm_up as _mark_warm
        asyncio.create_task(_mark_warm())
    if not settings.email_enabled:
        logger.warning("SMTP is not configured: OTP codes will be printed to this console.")
    if settings.JWT_SECRET.startswith("change-me"):
        logger.warning("JWT_SECRET is the default value. Set it in backend/.env.")
    yield
    anchor_task.cancel()


app = FastAPI(title="Digital Asset Provenance", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN],
    # Vite moves to 5174, 5175, ... when 5173 is busy; accept any local dev port.
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for uploads
app.mount("/uploads", StaticFiles(directory=storage.upload_dir()), name="uploads")

# Sample works shown in the Discover feed (only mounted when the folder exists)
if os.path.isdir(showcase_dir()):
    app.mount("/showcase", StaticFiles(directory=showcase_dir()), name="showcase")

# Include Routers
app.include_router(auth_router, prefix="/api/auth")
app.include_router(register_router, prefix="/api/works")
app.include_router(check_router, prefix="/api")
app.include_router(certificate_router, prefix="/api/works")
app.include_router(public_router, prefix="/api")
app.include_router(jobs_router, prefix="/api")
app.include_router(discover_router, prefix="/api")
app.include_router(mark_router, prefix="/api/mark")

@app.get("/health")
async def health_check():
    return {"status": "ok"}
