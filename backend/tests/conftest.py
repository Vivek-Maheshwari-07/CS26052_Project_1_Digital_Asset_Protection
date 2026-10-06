import os
import pathlib
import urllib.parse

import psycopg
import pytest
from alembic.config import Config

from alembic import command

ALLOWED_TEST_HOSTS = {"localhost", "127.0.0.1", "db"}


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
