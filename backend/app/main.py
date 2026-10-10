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
from app.api.auth import router as auth_router, ensure_auth_indexes
from app.certificate.generate import router as certificate_router
from app.gate.features import ensure_gate_indexes
from app.registry.index import index
from app.registry.anchor import anchor_missing

logger = logging.getLogger("uvicorn.error")


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

# Include Routers
app.include_router(auth_router, prefix="/api/auth")
app.include_router(register_router, prefix="/api/works")
app.include_router(check_router, prefix="/api")
app.include_router(certificate_router, prefix="/api/works")
app.include_router(public_router, prefix="/api")

@app.get("/health")
async def health_check():
    return {"status": "ok"}
