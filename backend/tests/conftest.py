import os
import pathlib
import urllib.parse

import psycopg
import pytest
from alembic.config import Config
from fastapi.testclient import TestClient

from alembic import command
from app.config import Settings
from app.db import make_engine
from app.main import create_app

ALLOWED_TEST_HOSTS = {"localhost", "127.0.0.1", "db"}


def pytest_collection_modifyitems(config, items):
    if os.environ.get("RUN_MODEL_TESTS") != "1":
        skip_models = pytest.mark.skip(reason="set RUN_MODEL_TESTS=1")
        for item in items:
            if "models" in item.keywords:
                item.add_marker(skip_models)


@pytest.fixture(scope="session")
def embedder():
    from app.config import get_config, get_settings

    settings = get_settings()
    cfg = get_config()
    hf_path = pathlib.Path(settings.hf_home)
    if not hf_path.is_absolute():
        backend_dir = pathlib.Path(__file__).resolve().parent.parent
        hf_path = backend_dir / hf_path
    hf_path.mkdir(parents=True, exist_ok=True)
    os.environ["HF_HOME"] = str(hf_path)

    from app.core.embedder import Embedder, resolve_device

    device = resolve_device(cfg.models.device)
    emb = Embedder(cfg.models, device)
    emb.warm_up()
    return emb


def guard_test_database(url_str: str) -> None:
    """Ensure tests with destructive downgrade/truncate run only on safe local test databases."""
    parsed = urllib.parse.urlparse(url_str)
    host = parsed.hostname
    if host not in ALLOWED_TEST_HOSTS and os.getenv("PROVNET_ALLOW_REMOTE_TEST_DB") != "1":
        pytest.exit("Refusing to run destructive tests on a remote database")


@pytest.fixture(scope="session")
def db_url():
    url = os.getenv("TEST_DATABASE_URL")
    if not url:
        url = "postgresql://provnet:provnet@localhost:5432/provnet"
    return url


@pytest.fixture(scope="session")
def async_db_url(db_url):
    guard_test_database(db_url)
    url = db_url
    if url.startswith("postgresql+psycopg://"):
        url = url.replace("postgresql+psycopg://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    return url


@pytest.fixture(scope="session")
def migrated_db(db_url):
    guard_test_database(db_url)

    backend_dir = pathlib.Path(__file__).resolve().parent.parent
    alembic_cfg = Config(str(backend_dir / "alembic.ini"))
    alembic_cfg.set_main_option("script_location", str(backend_dir / "alembic"))

    sync_url = db_url
    if sync_url.startswith("postgresql://"):
        sync_url = sync_url.replace("postgresql://", "postgresql+psycopg://", 1)
    os.environ["MIGRATIONS_DATABASE_URL"] = sync_url

    command.downgrade(alembic_cfg, "base")
    command.upgrade(alembic_cfg, "head")
    yield db_url


@pytest.fixture
def db_conn(migrated_db):
    conn_url = migrated_db
    if conn_url.startswith("postgresql+psycopg://"):
        conn_url = conn_url.replace("postgresql+psycopg://", "postgresql://", 1)
    conn = psycopg.connect(conn_url, autocommit=True)
    yield conn
    conn.close()


@pytest.fixture
def clean_db(db_conn):
    with db_conn.cursor() as cur:
        cur.execute("TRUNCATE TABLE benchmark_metrics, benchmark_runs, verifications, images RESTART IDENTITY CASCADE;")
    yield
    with db_conn.cursor() as cur:
        cur.execute("TRUNCATE TABLE benchmark_metrics, benchmark_runs, verifications, images RESTART IDENTITY CASCADE;")


@pytest.fixture
async def async_engine(async_db_url, migrated_db):
    settings = Settings(database_url=async_db_url)
    engine = make_engine(settings)
    yield engine
    await engine.dispose()


@pytest.fixture
def app_client(async_db_url, migrated_db, clean_db, tmp_path):
    settings = Settings(
        database_url=async_db_url,
        provnet_skip_models=True,
        storage_dir=str(tmp_path),
    )
    app = create_app(settings)
    with TestClient(app) as client:
        yield client
