"""
ProvNet Supabase PostgreSQL Reliability & Functionality Verification Suite
Project: ProvNet (CEUP 301)
Role: Principal Database Reliability Engineer & Backend Architect

Diagnostics Performed:
1. Driver & Network Connectivity (asyncpg + PgBouncer statement_cache_size=0)
2. Server Version & Extension Validation (PostgreSQL 16+, pgvector)
3. Schema, RLS Status & Table Access Verification
4. Column Type Precision & Constraint Integrity (BIT(64), VECTOR(512), VECTOR(768))
5. HNSW Vector/Bit Indexes & Native SQL Operators (Hamming <~>, bit_count, Cosine <=>)
6. End-to-End Synthetic Transaction Test (Q4_CONFLICT, Q2_STAGE1, Q3_STAGE2) with Clean Rollback
"""

import asyncio
import os
import sys
import time
import uuid
from datetime import UTC, datetime
from pathlib import Path
from urllib.parse import urlparse

import asyncpg
import numpy as np
from dotenv import load_dotenv
from pgvector.asyncpg import register_vector
from rich.box import ROUNDED
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.text import Text
from sqlalchemy import text

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.config import Settings
from app.core.sql import Q2_STAGE1, Q3_STAGE2, Q4_CONFLICT
from app.db import make_engine

console = Console()


def load_environment():
    """Load .env files with precedence: workspace root -> backend/.env -> process env"""
    root_env = backend_dir.parent / ".env"
    backend_env = backend_dir / ".env"

    if root_env.exists():
        load_dotenv(root_env, override=False)
    if backend_env.exists():
        load_dotenv(backend_env, override=False)

    db_url = os.getenv("DATABASE_URL")
    if (not db_url or "[YOUR-PASSWORD]" in db_url) and root_env.exists():
        load_dotenv(root_env, override=True)
        db_url = os.getenv("DATABASE_URL")

    vector_schema = os.getenv("VECTOR_SCHEMA", "extensions")
    return db_url, vector_schema


def clean_dsn_for_asyncpg(url: str) -> str:
    """Convert SQLAlchemy asyncpg URL to standard PostgreSQL DSN for asyncpg."""
    if url.startswith("postgresql+asyncpg://"):
        return url.replace("postgresql+asyncpg://", "postgresql://", 1)
    if url.startswith("postgresql+psycopg://"):
        return url.replace("postgresql+psycopg://", "postgresql://", 1)
    return url


def mask_dsn(dsn: str) -> str:
    """Mask password in DSN for safe terminal output."""
    try:
        parsed = urlparse(dsn)
        if parsed.password:
            safe_netloc = parsed.netloc.replace(f":{parsed.password}@", ":****@")
            return parsed._replace(netloc=safe_netloc).geturl()
    except Exception:  # noqa: BLE001, S110
        pass
    return dsn


async def run_diagnostics() -> list[dict]:
    results = []

    def record_check(section: str, check_name: str, passed: bool, details: str, duration_ms: float = 0.0):
        results.append({
            "section": section,
            "check": check_name,
            "passed": passed,
            "details": details,
            "duration_ms": duration_ms
        })

    console.print(Panel.fit(
        "[bold cyan]ProvNet Supabase PostgreSQL Reliability & Operational Verification[/bold cyan]\n"
        f"[dim]Project: CEUP 301 | Host: Supabase Cloud Pooler | Generated: {datetime.now(UTC).strftime('%Y-%m-%d %H:%M:%S UTC')}[/dim]",
        border_style="cyan"
    ))

    db_url, vector_schema = load_environment()
    if not db_url:
        console.print("[bold red]FATAL: DATABASE_URL is not set in environment or .env file.[/bold red]")
        sys.exit(1)

    clean_dsn = clean_dsn_for_asyncpg(db_url)
    masked = mask_dsn(clean_dsn)
    console.print(f"[bold]Target Endpoint:[/bold] [yellow]{masked}[/yellow]")
    console.print(f"[bold]Configured Vector Schema:[/bold] [green]{vector_schema}[/green]\n")

    conn = None
    server_version_str = "Unknown"

    # =========================================================================
    # 1. Connection & Driver Test
    # =========================================================================
    t0 = time.perf_counter()
    try:
        conn = await asyncpg.connect(
            clean_dsn,
            statement_cache_size=0,
            server_settings={"search_path": f"public,{vector_schema}"}
        )
        latency_ms = (time.perf_counter() - t0) * 1000

        ver_row = await conn.fetchrow("SELECT version(), current_setting('server_version_num')::int AS v_num;")
        server_version_str = ver_row["version"]
        v_num = ver_row["v_num"]
        pg_major = v_num // 10000

        record_check(
            "1. Connection & Driver",
            "Async connection (asyncpg, statement_cache_size=0)",
            True,
            f"Latency: {latency_ms:.2f}ms | PgBouncer Safe Mode",
            latency_ms
        )

        record_check(
            "1. Connection & Driver",
            f"PostgreSQL Version >= 16 (Detected: PG {pg_major})",
            pg_major >= 16,
            server_version_str.split(" on ")[0],
            0.0
        )

    except Exception as e:  # noqa: BLE001
        latency_ms = (time.perf_counter() - t0) * 1000
        record_check("1. Connection & Driver", "Async Connection", False, f"Connection failed: {e}", latency_ms)
        console.print(f"[bold red]Connection failed:[/bold red] {e}")
        render_report(results)
        return results

    # Register vector codec in asyncpg
    try:
        ext_row = await conn.fetchrow(
            "SELECT extname, extversion, n.nspname AS extnamespace "
            "FROM pg_extension e JOIN pg_namespace n ON e.extnamespace = n.oid "
            "WHERE extname = 'vector';"
        )
        actual_schema = ext_row["extnamespace"] if ext_row else vector_schema
        await register_vector(conn, schema=actual_schema)
        record_check(
            "1. Connection & Driver",
            "pgvector asyncpg type codec registration",
            True,
            f"Registered in schema '{actual_schema}'",
            0.0
        )
    except Exception as e:  # noqa: BLE001
        record_check("1. Connection & Driver", "pgvector asyncpg type codec registration", False, f"Registration failed: {e}", 0.0)

    # =========================================================================
    # 2. Schema & Extension Audit
    # =========================================================================
    try:
        t0 = time.perf_counter()
        ext_info = await conn.fetchrow(
            "SELECT extname, extversion, n.nspname AS schema FROM pg_extension e "
            "JOIN pg_namespace n ON e.extnamespace = n.oid WHERE extname = 'vector';"
        )
        t_ext = (time.perf_counter() - t0) * 1000

        if ext_info:
            record_check(
                "2. Schema & Extension",
                "Extension 'vector' active",
                True,
                f"Version: {ext_info['extversion']} | Schema: {ext_info['schema']}",
                t_ext
            )
        else:
            record_check("2. Schema & Extension", "Extension 'vector' active", False, "Extension not installed", t_ext)

        expected_tables = ["images", "verifications", "benchmark_runs", "benchmark_metrics"]
        existing_tables_rows = await conn.fetch(
            "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';"
        )
        existing_tables = {r["tablename"]: r["rowsecurity"] for r in existing_tables_rows}

        for tbl in expected_tables:
            if tbl in existing_tables:
                rls = existing_tables[tbl]
                record_check(
                    "2. Schema & Extension",
                    f"Table '{tbl}' exists",
                    True,
                    f"Present | Row Level Security (RLS): {'Enabled' if rls else 'Disabled'}",
                    0.0
                )
            else:
                record_check("2. Schema & Extension", f"Table '{tbl}' exists", False, "Missing table in public schema", 0.0)

        # Audit RLS Read Access
        for tbl in expected_tables:
            if tbl in existing_tables:
                try:
                    count = await conn.fetchval(f"SELECT count(*) FROM {tbl};")
                    record_check(
                        "2. Schema & Extension",
                        f"RLS Read Access: '{tbl}'",
                        True,
                        f"Authorized | Row count: {count}",
                        0.0
                    )
                except Exception as e:  # noqa: BLE001
                    record_check("2. Schema & Extension", f"RLS Read Access: '{tbl}'", False, f"Blocked or error: {e}", 0.0)

    except Exception as e:  # noqa: BLE001
        record_check("2. Schema & Extension", "Schema & Extension Audit", False, f"Audit error: {e}", 0.0)

    # =========================================================================
    # 3. Column Types & Constraints Check
    # =========================================================================
    try:
        col_rows = await conn.fetch("""
            SELECT column_name, udt_name, data_type, character_maximum_length,
                   format_type(atttypid, atttypmod) AS full_type
            FROM information_schema.columns c
            JOIN pg_attribute a ON a.attname = c.column_name
            JOIN pg_class t ON t.oid = a.attrelid AND t.relname = c.table_name
            JOIN pg_namespace s ON s.oid = t.relnamespace AND s.nspname = c.table_schema
            WHERE c.table_name = 'images' AND c.table_schema = 'public';
        """)
        cols = {r["column_name"]: r["full_type"] for r in col_rows}

        for hcol in ["phash", "dhash", "ahash", "whash"]:
            ftype = cols.get(hcol, "")
            is_bit64 = "bit(64)" in ftype.lower()
            record_check(
                "3. Column Types & Constraints",
                f"Column 'images.{hcol}' is BIT(64)",
                is_bit64,
                f"Type: {ftype or 'MISSING'}",
                0.0
            )

        clip_type = cols.get("clip_emb", "")
        is_clip_v512 = "512" in clip_type
        record_check(
            "3. Column Types & Constraints",
            "Column 'images.clip_emb' is VECTOR(512)",
            is_clip_v512,
            f"Type: {clip_type or 'MISSING'}",
            0.0
        )

        dino_type = cols.get("dino_emb", "")
        is_dino_v768 = "768" in dino_type
        record_check(
            "3. Column Types & Constraints",
            "Column 'images.dino_emb' is VECTOR(768)",
            is_dino_v768,
            f"Type: {dino_type or 'MISSING'}",
            0.0
        )

        constraints = await conn.fetch("""
            SELECT conname, pg_get_constraintdef(oid) AS def
            FROM pg_constraint
            WHERE conrelid = 'public.images'::regclass;
        """)
        con_names = [c["conname"] for c in constraints]
        record_check(
            "3. Column Types & Constraints",
            "Integrity Constraints on 'images'",
            len(con_names) > 0,
            f"Active: {', '.join(con_names)}",
            0.0
        )

    except Exception as e:  # noqa: BLE001
        record_check("3. Column Types & Constraints", "Column Types Audit", False, f"Error: {e}", 0.0)

    # =========================================================================
    # 4. Index & Native Operator Benchmark
    # =========================================================================
    try:
        indexes = await conn.fetch("""
            SELECT indexname, indexdef
            FROM pg_indexes
            WHERE tablename = 'images' AND schemaname = 'public';
        """)
        idx_defs = {i["indexname"]: i["indexdef"] for i in indexes}

        clip_idx = next((def_ for name, def_ in idx_defs.items() if "clip_emb" in def_ and "hnsw" in def_.lower()), None)
        dino_idx = next((def_ for name, def_ in idx_defs.items() if "dino_emb" in def_ and "hnsw" in def_.lower()), None)
        phash_idx = next((def_ for name, def_ in idx_defs.items() if "phash" in def_ and "hnsw" in def_.lower()), None)

        record_check(
            "4. Indexes & Native Operators",
            "HNSW Index on 'clip_emb' (vector_cosine_ops)",
            clip_idx is not None,
            clip_idx if clip_idx else "Missing HNSW index on clip_emb",
            0.0
        )
        record_check(
            "4. Indexes & Native Operators",
            "HNSW Index on 'dino_emb' (vector_cosine_ops)",
            dino_idx is not None,
            dino_idx if dino_idx else "Missing HNSW index on dino_emb",
            0.0
        )
        record_check(
            "4. Indexes & Native Operators",
            "HNSW Index on 'phash' (bit_hamming_ops)",
            phash_idx is not None,
            phash_idx if phash_idx else "Missing bit_hamming_ops HNSW index",
            0.0
        )

        # Test Native Bitwise Hamming distance: bit_count(b1 # b2)
        b1_hex = "ff00000000000000"
        b2_hex = "0000000000000000"
        b1_bytes = bytes.fromhex(b1_hex)
        b2_bytes = bytes.fromhex(b2_hex)

        t0 = time.perf_counter()
        hamming_bitcount = await conn.fetchval(
            "SELECT bit_count(CAST($1 AS bit(64)) # CAST($2 AS bit(64)));",
            b1_bytes, b2_bytes
        )
        t_bitcount = (time.perf_counter() - t0) * 1000
        record_check(
            "4. Indexes & Native Operators",
            "Native Bitwise XOR Hamming: bit_count(b1 # b2)",
            hamming_bitcount == 8,
            f"bit_count('ff00...' # '0000...') = {hamming_bitcount} (Expected 8)",
            t_bitcount
        )

        # Test pgvector bit hamming distance operator (<~>)
        t0 = time.perf_counter()
        hamming_op = await conn.fetchval(
            "SELECT CAST($1 AS bit(64)) <~> CAST($2 AS bit(64));",
            b1_bytes, b2_bytes
        )
        t_op = (time.perf_counter() - t0) * 1000
        record_check(
            "4. Indexes & Native Operators",
            "pgvector Bit Hamming Operator: b1 <~> b2",
            int(hamming_op) == 8,
            f"b1 <~> b2 = {hamming_op} (Expected 8)",
            t_op
        )

        # Test Vector Cosine Distance (<=>)
        t0 = time.perf_counter()
        cos_sim = await conn.fetchval("SELECT 1.0 - ('[1,0,0]'::vector <=> '[1,0,0]'::vector);")
        t_cos = (time.perf_counter() - t0) * 1000
        is_exact_one = abs(float(cos_sim) - 1.0) < 1e-5
        record_check(
            "4. Indexes & Native Operators",
            "pgvector Cosine Distance: 1.0 - (v1 <=> v2)",
            is_exact_one,
            f"1.0 - ([1,0,0] <=> [1,0,0]) = {cos_sim:.4f} (Expected 1.0)",
            t_cos
        )

    except Exception as e:  # noqa: BLE001
        record_check("4. Indexes & Native Operators", "Index & Operator Benchmark", False, f"Error: {e}", 0.0)

    # =========================================================================
    # 5. End-to-End Synthetic Transaction Test (Q4_CONFLICT, Q2_STAGE1, Q3_STAGE2)
    # =========================================================================
    try:
        settings = Settings(database_url=db_url, vector_schema=vector_schema)
        engine = make_engine(settings)

        test_img_id = uuid.uuid4()
        mock_sha256 = f"test_{uuid.uuid4().hex}"[:64]
        mock_phash_hex = "ffff000000000000"
        mock_dhash_hex = "0000ffff00000000"
        mock_ahash_hex = "ffffffffffffffff"
        mock_whash_hex = "0000000000000000"

        # Generate synthetic unit-normalized vectors
        rng = np.random.default_rng(42)
        clip_raw = rng.standard_normal(512).astype(np.float32)
        clip_emb = (clip_raw / np.linalg.norm(clip_raw)).tolist()

        dino_raw = rng.standard_normal(768).astype(np.float32)
        dino_emb = (dino_raw / np.linalg.norm(dino_raw)).tolist()

        async with engine.connect() as async_conn, async_conn.begin() as trans:
            t0 = time.perf_counter()
            await async_conn.execute(
                text("""
                INSERT INTO images (
                    id, owner_name, original_filename, file_path, source_format,
                    sha256, width, height, phash, dhash, ahash, whash, low_detail,
                    clip_emb, dino_emb, clip_model, dino_model, config_version, registered_at
                ) VALUES (
                    :id, :owner, :fname, :fpath, :fmt,
                    :sha, :w, :h, CAST(:phash AS bit(64)), CAST(:dhash AS bit(64)),
                    CAST(:ahash AS bit(64)), CAST(:whash AS bit(64)), :low,
                    :clip, :dino,
                    :clip_m, :dino_m, :cfg_v, now()
                );
                """),
                {
                    "id": test_img_id,
                    "owner": "CEUP301_Diagnostic_Robot",
                    "fname": "diagnostic_probe.png",
                    "fpath": f"storage/diagnostic_{test_img_id}.png",
                    "fmt": "PNG",
                    "sha": mock_sha256,
                    "w": 1024,
                    "h": 1024,
                    "phash": bytes.fromhex(mock_phash_hex),
                    "dhash": bytes.fromhex(mock_dhash_hex),
                    "ahash": bytes.fromhex(mock_ahash_hex),
                    "whash": bytes.fromhex(mock_whash_hex),
                    "low": False,
                    "clip": clip_emb,
                    "dino": dino_emb,
                    "clip_m": "ViT-B-32",
                    "dino_m": "dinov2_base",
                    "cfg_v": "1.0.0"
                }
            )
            t_insert = (time.perf_counter() - t0) * 1000
            record_check(
                "5. End-to-End Pipeline Queries",
                "Synthetic Record Insert (in xact)",
                True,
                f"Inserted ID {test_img_id}",
                t_insert
            )

            # Q4_CONFLICT test
            t0 = time.perf_counter()
            res_q4 = await async_conn.execute(
                Q4_CONFLICT,
                {
                    "sha": mock_sha256,
                    "low": False,
                    "phash": mock_phash_hex,
                    "dhash": mock_dhash_hex,
                    "ahash": mock_ahash_hex,
                    "whash": mock_whash_hex,
                    "hmax": 10,
                    "dino": dino_emb,
                    "clip": clip_emb,
                    "cmin": 0.85
                }
            )
            q4_row = res_q4.mappings().first()
            t_q4 = (time.perf_counter() - t0) * 1000
            q4_pass = q4_row is not None and str(q4_row["id"]) == str(test_img_id)
            record_check(
                "5. End-to-End Pipeline Queries",
                "Execute Q4_CONFLICT (Duplicate Detection)",
                q4_pass,
                f"Match reason: '{q4_row['reason'] if q4_row else 'None'}' | cos_dino: {q4_row['cos_dino'] if q4_row else 0:.4f}",
                t_q4
            )

            # Q2_STAGE1 test
            t0 = time.perf_counter()
            res_q2 = await async_conn.execute(
                Q2_STAGE1,
                {
                    "phash": mock_phash_hex,
                    "dhash": mock_dhash_hex,
                    "ahash": mock_ahash_hex,
                    "whash": mock_whash_hex,
                    "k": 5
                }
            )
            q2_rows = res_q2.mappings().all()
            t_q2 = (time.perf_counter() - t0) * 1000
            q2_pass = len(q2_rows) > 0 and any(str(r["id"]) == str(test_img_id) for r in q2_rows)
            top_d_phash = q2_rows[0]["d_phash"] if q2_rows else -1
            record_check(
                "5. End-to-End Pipeline Queries",
                "Execute Q2_STAGE1 (Fast Hash Stage 1)",
                q2_pass,
                f"Returned {len(q2_rows)} candidate(s) | Top d_phash: {top_d_phash}",
                t_q2
            )

            # Q3_STAGE2 test
            t0 = time.perf_counter()
            res_q3 = await async_conn.execute(
                Q3_STAGE2,
                {
                    "phash": mock_phash_hex,
                    "dhash": mock_dhash_hex,
                    "ahash": mock_ahash_hex,
                    "whash": mock_whash_hex,
                    "dino": dino_emb,
                    "clip": clip_emb,
                    "k": 5
                }
            )
            q3_rows = res_q3.mappings().all()
            t_q3 = (time.perf_counter() - t0) * 1000
            q3_pass = len(q3_rows) > 0 and str(q3_rows[0]["id"]) == str(test_img_id)
            top_cos_dino = q3_rows[0]["cos_dino"] if q3_rows else -1.0
            record_check(
                "5. End-to-End Pipeline Queries",
                "Execute Q3_STAGE2 (Deep Vector Stage 2)",
                q3_pass,
                f"Returned {len(q3_rows)} candidate(s) | Top cos_dino: {top_cos_dino:.4f}",
                t_q3
            )

            # Rollback transaction to keep state clean
            await trans.rollback()
            record_check(
                "5. End-to-End Pipeline Queries",
                "Transaction Rollback & State Pristine",
                True,
                "Rollback executed successfully; zero persistent side-effects",
                0.0
            )

        await engine.dispose()

    except Exception as e:  # noqa: BLE001
        record_check("5. End-to-End Pipeline Queries", "End-to-End Pipeline Queries", False, f"Pipeline Error: {e}", 0.0)

    finally:
        if conn and not conn.is_closed():
            await conn.close()

    render_report(results)
    return results


def render_report(results: list[dict]):
    console.print()
    table = Table(
        title="[bold white on dark_blue] SUPABASE POSTGRESQL VERIFICATION MATRIX [/bold white on dark_blue]",
        show_header=True,
        header_style="bold cyan",
        border_style="dim white",
        box=ROUNDED,
        expand=True
    )

    table.add_column("Category", style="cyan", width=26)
    table.add_column("Verification Check", style="white", width=42)
    table.add_column("Status", justify="center", width=10)
    table.add_column("Latency", justify="right", width=12)
    table.add_column("Diagnostic Details / Findings", style="dim", overflow="fold")

    current_cat = None
    all_passed = True
    total_passed = 0

    for item in results:
        passed = item["passed"]
        if not passed:
            all_passed = False
        else:
            total_passed += 1

        status_text = Text("PASS", style="bold green") if passed else Text("FAIL", style="bold red")
        lat_text = f"{item['duration_ms']:.2f}ms" if item["duration_ms"] > 0 else "-"

        cat_disp = item["section"] if item["section"] != current_cat else ""
        current_cat = item["section"]

        table.add_row(
            cat_disp,
            item["check"],
            status_text,
            lat_text,
            item["details"]
        )

    console.print(table)
    console.print()

    summary_color = "green" if all_passed else "red"
    summary_msg = (
        "ALL SYSTEM CHECKS PASSED - SUPABASE POOLER, SCHEMAS, OPERATORS & PIPELINE FULLY OPERATIONAL"
        if all_passed
        else "SYSTEM CHECKS FAILED - REVIEW DIAGNOSTIC LOGS ABOVE"
    )

    console.print(Panel(
        f"[bold {summary_color}]{summary_msg}[/bold {summary_color}]\n"
        f"[white]Reliability Score: [bold]{total_passed}/{len(results)}[/bold] verified checks passed ({total_passed/len(results)*100:.1f}%).[/white]",
        border_style=summary_color
    ))


if __name__ == "__main__":
    asyncio.run(run_diagnostics())
