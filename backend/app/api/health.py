import time

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.core.sql import Q7_IMAGE_COUNT, Q7_PGVECTOR_VERSION
from app.schemas import HealthModelsLoaded, HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_check(request: Request):
    app = request.app
    settings = app.state.settings
    config = app.state.config

    uptime_s = int(time.monotonic() - getattr(app.state, "started_at", time.monotonic()))
    models_loaded_dict = getattr(app.state, "models_loaded", {"clip": False, "dino": False})
    models_loaded = HealthModelsLoaded(**models_loaded_dict)
    device = getattr(app.state, "device", "cpu")

    db_ok = False
    pgvector_version = None
    image_count = None

    try:
        sessionmaker = app.state.sessionmaker
        async with sessionmaker() as session:
            await session.execute(text("SELECT 1"))
            vec_res = await session.execute(Q7_PGVECTOR_VERSION)
            pgvector_version = vec_res.scalar()
            cnt_res = await session.execute(Q7_IMAGE_COUNT)
            image_count = cnt_res.scalar()
            db_ok = True
    except Exception:  # noqa: BLE001
        db_ok = False
        pgvector_version = None
        image_count = None

    models_ok = settings.provnet_skip_models or (models_loaded.clip and models_loaded.dino)
    is_healthy = db_ok and models_ok

    status_str = "ok" if is_healthy else "degraded"
    db_status_str = "ok" if db_ok else "unavailable"

    response_data = HealthResponse(
        status=status_str,
        database=db_status_str,
        pgvector=pgvector_version,
        models_loaded=models_loaded,
        device=device,
        config_version=config.config_version,
        registered_images=image_count,
        uptime_s=uptime_s,
    )

    status_code = 200 if is_healthy else 503
    return JSONResponse(status_code=status_code, content=response_data.model_dump())
