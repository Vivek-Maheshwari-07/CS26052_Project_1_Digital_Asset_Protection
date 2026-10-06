import inspect
from collections.abc import AsyncGenerator
from typing import Any

from fastapi import Request
from pgvector.asyncpg import register_vector
from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine

from app.config import Settings


def make_engine(settings: Settings) -> AsyncEngine:
    sig = inspect.signature(register_vector)
    has_schema = "schema" in sig.parameters

    connect_args: dict[str, Any] = {}
    if not has_schema and settings.vector_schema != "public":
        connect_args["server_settings"] = {"search_path": f"public,{settings.vector_schema}"}

    engine = create_async_engine(
        settings.database_url,
        pool_size=5,
        max_overflow=5,
        pool_pre_ping=True,
        connect_args=connect_args,
    )

    @event.listens_for(engine.sync_engine, "connect")
    def _reg(dbapi_conn, _):
        if has_schema:
            dbapi_conn.run_async(lambda c: register_vector(c, schema=settings.vector_schema))
        else:
            dbapi_conn.run_async(lambda c: register_vector(c))

    return engine


def make_sessionmaker(engine: AsyncEngine) -> async_sessionmaker[AsyncSession]:
    return async_sessionmaker(engine, expire_on_commit=False)


async def get_session(request: Request) -> AsyncGenerator[AsyncSession, None]:
    sessionmaker = request.app.state.sessionmaker
    async with sessionmaker() as session:
        yield session
