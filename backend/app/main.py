import asyncio
import logging
import time
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.health import router as health_router
from app.config import Settings, get_config, get_settings
from app.core.sql import Q7_PGVECTOR_VERSION
from app.db import make_engine, make_sessionmaker
from app.errors import register_error_handlers
from app.limiter import install_limiter

logger = logging.getLogger("provnet")


def create_app(settings: Settings | None = None) -> FastAPI:
    if settings is None:
        settings = get_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        app.state.settings = settings
        app.state.config = get_config()
        app.state.started_at = time.monotonic()

        engine = make_engine(settings)
        sessionmaker = make_sessionmaker(engine)
        app.state.engine = engine
        app.state.sessionmaker = sessionmaker

        # Test pgvector version if reachable
        try:
            async with sessionmaker() as session:
                res = await session.execute(Q7_PGVECTOR_VERSION)
                version_str = res.scalar()
                if version_str:
                    parts = [int(p) for p in version_str.split(".")[:3]]
                    if parts < [0, 7, 0]:
                        raise RuntimeError(f"pgvector extension version {version_str} is older than 0.7.0")
        except RuntimeError:
            raise
        except Exception as e:  # noqa: BLE001
            logger.warning("Database unreachable during startup: %s", e)

        app.state.models_loaded = {"clip": False, "dino": False}

        if settings.provnet_skip_models:
            app.state.device = "cpu"
        else:
            try:
                import torch

                device_cfg = app.state.config.models.device
                if device_cfg == "auto":
                    app.state.device = "cuda" if torch.cuda.is_available() else "cpu"
                else:
                    app.state.device = device_cfg
            except Exception:  # noqa: BLE001
                app.state.device = "cpu"

        app.state.inference_gate = asyncio.Semaphore(app.state.config.limits.inference_concurrency)

        storage_path = Path(settings.storage_dir)
        storage_path.mkdir(parents=True, exist_ok=True)
        (storage_path / "thumbs").mkdir(parents=True, exist_ok=True)

        yield

        await engine.dispose()

    app = FastAPI(title="ProvNet API", lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.frontend_origin],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    register_error_handlers(app)
    install_limiter(app)
    app.include_router(health_router, prefix="/api")

    return app


app = create_app()
