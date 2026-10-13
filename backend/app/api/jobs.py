"""Register and check as background jobs with live progress.

The check pipeline takes a few seconds; instead of one blocking request the UI starts a job, polls
`GET /api/jobs/{id}?since=N` and shows what each stage is doing to the user photo as it happens.
The synchronous endpoints in register.py / check.py are unchanged; both run the same *_core functions.

Jobs live in memory (single-process dev/demo setup) and expire after 30 minutes.
"""
import asyncio
import json
import time
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app.api.auth import get_current_user
from app.api.check import check_core
from app.api.register import read_limited, register_core
from app.db import get_db

router = APIRouter()

JOB_TTL_SECONDS = 30 * 60
_JOBS: dict = {}


def _gc() -> None:
    now = time.monotonic()
    for jid in [j for j, v in _JOBS.items() if now - v["t0"] > JOB_TTL_SECONDS]:
        _JOBS.pop(jid, None)


def _jsonable(data: dict) -> dict:
    """Plain JSON types only (numpy scalars from the pipeline become floats)."""
    return json.loads(json.dumps(data, default=float))


def _new_job(user_id: str, kind: str) -> dict:
    _gc()
    job = {"id": str(uuid.uuid4()), "user_id": user_id, "kind": kind, "status": "running",
           "events": [], "result": None, "error": None, "t0": time.monotonic()}
    _JOBS[job["id"]] = job
    return job


def _emitter(job: dict):
    def emit(stage: str, **data):
        job["events"].append({"i": len(job["events"]), "t": round(time.monotonic() - job["t0"], 2),
                              "stage": stage, "data": _jsonable(data)})
    return emit


async def _run(job: dict, coro_fn) -> None:
    try:
        job["result"] = _jsonable(await coro_fn(_emitter(job)))
        job["status"] = "done"
    except HTTPException as e:  # same payloads the synchronous endpoints return (409 conflicts, 400s)
        job["error"] = {"status": e.status_code, "detail": e.detail}
        job["status"] = "error"
    except Exception as e:  # noqa: BLE001 - surfaced to the UI instead of dying silently in a task
        job["error"] = {"status": 500, "detail": f"{type(e).__name__}: {e}"}
        job["status"] = "error"
    job["events"].append({"i": len(job["events"]), "t": round(time.monotonic() - job["t0"], 2),
                          "stage": "finished", "data": {"status": job["status"]}})


def _schedule(fn, *args):
    asyncio.create_task(fn(*args))


@router.post("/works/register/start")
async def register_start(
    image: UploadFile = File(...),
    owner_name: str = Form(...),
    title: str = Form(...),
    allow_similar_own: bool = Form(False),
    db=Depends(get_db),
    current_user=Depends(get_current_user),
):
    image_bytes = await read_limited(image)
    job = _new_job(str(current_user["_id"]), "register")
    asyncio.create_task(_run(job, lambda emit: register_core(
        db, current_user, image_bytes, owner_name, title, allow_similar_own, _schedule, emit)))
    return {"job_id": job["id"]}


@router.post("/works/check/start")
async def check_start(
    image: UploadFile = File(...),
    db=Depends(get_db),
    current_user=Depends(get_current_user),
):
    image_bytes = await read_limited(image)
    job = _new_job(str(current_user["_id"]), "check")
    asyncio.create_task(_run(job, lambda emit: check_core(db, current_user, image_bytes, image.filename, emit)))
    return {"job_id": job["id"]}


@router.get("/jobs/{job_id}")
async def job_status(job_id: str, since: int = 0, current_user=Depends(get_current_user)):
    job = _JOBS.get(job_id)
    if not job or job["user_id"] != str(current_user["_id"]):
        raise HTTPException(404, "Job not found or expired.")
    return {"id": job["id"], "kind": job["kind"], "status": job["status"], "events": job["events"][max(0, since):],
            "elapsed": round(time.monotonic() - job["t0"], 2), "result": job["result"], "error": job["error"]}
