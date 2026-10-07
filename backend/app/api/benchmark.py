"""Benchmark API router: query runs, retrieve summaries, and stream master results CSV."""

import csv
import io
import logging
from datetime import UTC
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.sql import (
    Q8_BENCHMARK_METRICS,
    Q11_BENCHMARK_RUNS_LIST,
    Q12_BENCHMARK_RUN_EXISTS,
    Q13_BENCHMARK_LATEST_RUN_ID,
    Q14_BENCHMARK_SUMMARY_COUNTS,
    Q15_BENCHMARK_CASCADE_STATS,
    Q16_BENCHMARK_STREAM_RUNS,
)
from app.db import get_session
from app.errors import NotFound
from app.schemas import BenchmarkRunInfo, BenchmarkSummary, BenchmarkTransformMetric, CascadeMetrics

logger = logging.getLogger("provnet")

router = APIRouter(prefix="/benchmark", tags=["benchmark"])

METHOD_ORDER = ["phash", "dhash", "ahash", "whash", "clip", "dino", "cascade"]


async def _resolve_run_id(session: AsyncSession, run_id: str | None) -> str:
    """Resolve explicit run_id or fetch latest run_id from benchmark_runs. Raise 404 if not found."""
    if run_id is not None:
        res = await session.execute(Q12_BENCHMARK_RUN_EXISTS, {"run_id": run_id})
        found = res.scalar_one_or_none()
        if not found:
            raise NotFound("Benchmark run not found.")
        return run_id

    res = await session.execute(Q13_BENCHMARK_LATEST_RUN_ID)
    latest_id = res.scalar_one_or_none()
    if not latest_id:
        raise NotFound("No benchmark runs found.")
    return latest_id


@router.get("/runs", response_model=list[BenchmarkRunInfo])
async def list_benchmark_runs(
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[BenchmarkRunInfo]:
    """List all recorded benchmark runs, newest first."""
    res = await session.execute(Q11_BENCHMARK_RUNS_LIST)
    rows = res.fetchall()
    return [
        BenchmarkRunInfo(
            run_id=row.run_id,
            created_at=row.created_at,
            n_rows=row.n_rows,
            splits=list(row.splits or []),
        )
        for row in rows
    ]


@router.get("/summary", response_model=BenchmarkSummary)
async def get_benchmark_summary(
    session: Annotated[AsyncSession, Depends(get_session)],
    run_id: Annotated[str | None, Query(description="Run ID to fetch. If omitted, latest run is used.")] = None,
) -> BenchmarkSummary:
    """Fetch structured BenchmarkSummary for a run (or the latest run)."""
    target_run_id = await _resolve_run_id(session, run_id)

    # 1. Fetch metrics rows
    metrics_res = await session.execute(Q8_BENCHMARK_METRICS, {"run_id": target_run_id})
    metrics_rows = metrics_res.fetchall()

    if not metrics_rows:
        raise NotFound("Benchmark metrics not found for run.")

    by_transform: list[BenchmarkTransformMetric] = []
    distinct_methods: set[str] = set()
    cascade_accuracy = 1.0

    for m in metrics_rows:
        distinct_methods.add(m.method)
        if m.transform != "all":
            by_transform.append(
                BenchmarkTransformMetric(
                    transform=m.transform,
                    strength=m.strength,
                    method=m.method,
                    threshold=float(m.threshold) if m.threshold is not None else 1.0,
                    precision=float(m.precision) if m.precision is not None else 0.0,
                    recall=float(m.recall) if m.recall is not None else 0.0,
                    f1=float(m.f1) if m.f1 is not None else 0.0,
                    accuracy=float(m.accuracy) if m.accuracy is not None else 0.0,
                    roc_auc=float(m.roc_auc) if m.roc_auc is not None else 1.0,
                    median_latency_ms=float(m.median_latency_ms) if m.median_latency_ms is not None else 0.0,
                    n_pairs=int(m.n_pairs),
                )
            )
        elif m.method == "cascade":
            cascade_accuracy = float(m.accuracy) if m.accuracy is not None else 1.0

    # Order methods consistently
    methods = [m for m in METHOD_ORDER if m in distinct_methods]
    # Append any remaining methods not in base list
    for m in distinct_methods:
        if m not in methods:
            methods.append(m)

    # 2. Fetch original and hard negative source counts
    counts_res = await session.execute(Q14_BENCHMARK_SUMMARY_COUNTS, {"run_id": target_run_id})
    counts_row = counts_res.fetchone()
    n_orig = int(counts_row.n_originals) if counts_row and counts_row.n_originals is not None else 0
    n_neg = int(counts_row.n_hard_negatives) if counts_row and counts_row.n_hard_negatives is not None else 0

    # 3. Fetch cascade mean latency & escalation rate
    cascade_res = await session.execute(Q15_BENCHMARK_CASCADE_STATS, {"run_id": target_run_id})
    cascade_row = cascade_res.fetchone()
    mean_lat = float(cascade_row.mean_latency_ms) if cascade_row and cascade_row.mean_latency_ms is not None else 0.0
    esc_rate = float(cascade_row.escalation_rate) if cascade_row and cascade_row.escalation_rate is not None else 0.0

    return BenchmarkSummary(
        run_id=target_run_id,
        split="test",
        n_originals=n_orig,
        n_hard_negatives=n_neg,
        methods=methods,
        by_transform=by_transform,
        scenarios=[],
        cascade=CascadeMetrics(
            accuracy=cascade_accuracy,
            mean_latency_ms=mean_lat,
            escalation_rate=esc_rate,
        ),
    )


@router.get("/results.csv")
async def download_benchmark_results(
    session: Annotated[AsyncSession, Depends(get_session)],
    run_id: Annotated[str | None, Query(description="Run ID to export. If omitted, latest run is used.")] = None,
) -> StreamingResponse:
    """Stream all benchmark_runs records for a run as CSV with chunked yield_per."""
    target_run_id = await _resolve_run_id(session, run_id)

    async def csv_generator():
        buf = io.StringIO()
        writer = csv.writer(buf, lineterminator="\n")
        # CSV header
        writer.writerow([
            "run_id", "split", "category", "original_id", "query_file",
            "transform", "strength", "is_true_copy", "method", "score",
            "score_kind", "latency_ms", "created_at",
        ])
        yield buf.getvalue()
        buf.seek(0)
        buf.truncate(0)

        # Server-side cursor / chunked stream
        result = await session.stream(
            Q16_BENCHMARK_STREAM_RUNS,
            {"run_id": target_run_id},
            execution_options={"yield_per": 1000},
        )
        count = 0
        async for row in result:
            created_str = (
                row.created_at.astimezone(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")
                if row.created_at
                else ""
            )
            writer.writerow([
                row.run_id,
                row.split,
                row.category,
                row.original_id,
                row.query_file,
                row.transform if row.transform is not None else "none",
                row.strength if row.strength is not None else "none",
                row.is_true_copy,
                row.method,
                row.score,
                row.score_kind,
                row.latency_ms,
                created_str,
            ])
            count += 1
            if count >= 1000:
                yield buf.getvalue()
                buf.seek(0)
                buf.truncate(0)
                count = 0

        if count > 0:
            yield buf.getvalue()

    filename = f"provnet-{target_run_id}-master_results.csv"
    headers = {"Content-Disposition": f'attachment; filename="{filename}"'}
    return StreamingResponse(csv_generator(), media_type="text/csv", headers=headers)
