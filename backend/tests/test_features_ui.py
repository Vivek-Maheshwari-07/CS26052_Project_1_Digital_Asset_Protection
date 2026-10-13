"""Owner-only checks, live job progress, the discover feed and the two-page certificate."""
import asyncio
import re

from bson import ObjectId
from mongomock_motor import AsyncMongoMockClient
from PIL import Image

from app.api import discover as discover_mod
from app.api import jobs as jobs_mod
from app.api.check import check_core
from app.api.register import register_core
from app.config import settings
from tests.test_api import generate_sample_image, register


def _check(client, headers, image=None):
    return client.post("/api/works/check", files={"image": ("s.jpg", image or generate_sample_image(), "image/jpeg")},
                       headers=headers)


# ---------------------------------------------------------------- a check only searches the caller's own works

def test_check_searches_only_the_callers_own_works(client, signup):
    alice, bob = signup(), signup(username="bob", email="bob@example.com")
    work_id = register(client, alice).json()["id"]

    other = _check(client, bob).json()          # bob has registered nothing: alice's work must not appear
    assert other["results"] == [] and other["top_verdict"] == "no_match"

    own = _check(client, alice).json()
    assert own["results"][0]["work_id"] == work_id and own["results"][0]["is_own"] is True


def test_check_with_only_someone_elses_matching_work_finds_nothing_even_with_own_works(client, signup):
    alice, bob = signup(), signup(username="bob", email="bob@example.com")
    register(client, alice)
    register(client, bob, title="Bob's different piece", image=generate_sample_image(variant=1))
    body = _check(client, bob, generate_sample_image(variant=0)).json()  # alice's image, checked by bob
    assert all(r["title"] != "Test Title" for r in body["results"])


# ---------------------------------------------------------------- live progress as a job

def _user():
    return {"_id": ObjectId()}


def test_register_and_check_report_progress_stages():
    async def go():
        db = AsyncMongoMockClient().jobs_test
        user = _user()
        scheduled = []
        events = []
        record = await register_core(db, user, generate_sample_image(), "Owner", "Piece", False,
                                     lambda fn, *a: scheduled.append(fn.__name__), lambda s, **d: events.append((s, d)))
        stages = [s for s, _ in events]
        assert stages[:3] == ["read", "fingerprint", "duplicate"] and "chain" in stages and stages[-1] == "anchor"
        fp = dict(events)["fingerprint"]
        assert len(fp["phash"]) == 16 and len(fp["clip_preview"]) == 64
        assert "anchor_work" in scheduled

        events.clear()
        result = await check_core(db, user, generate_sample_image(), "s.jpg", lambda s, **d: events.append((s, d)))
        stages = [s for s, _ in events]
        assert stages[:4] == ["read", "fingerprint", "search", "scores"]
        assert dict(events)["search"]["scope"] == 1
        assert result["results"][0]["work_id"] == record["id"]

    asyncio.run(go())


def test_job_runner_records_events_result_and_errors():
    async def go():
        job = jobs_mod._new_job("u1", "check")

        async def ok(emit):
            emit("read", width=3)
            return {"answer": 1}

        await jobs_mod._run(job, ok)
        assert job["status"] == "done" and job["result"] == {"answer": 1}
        assert [e["stage"] for e in job["events"]] == ["read", "finished"]

        bad = jobs_mod._new_job("u1", "register")

        async def boom(emit):
            from fastapi import HTTPException
            raise HTTPException(409, {"message": "duplicate"})

        await jobs_mod._run(bad, boom)
        assert bad["status"] == "error" and bad["error"] == {"status": 409, "detail": {"message": "duplicate"}}

    asyncio.run(go())


def test_job_endpoints_are_private_to_their_owner(client, signup):
    alice, bob = signup(), signup(username="bob", email="bob@example.com")
    job = jobs_mod._new_job(str(ObjectId()), "check")
    assert client.get(f"/api/jobs/{job['id']}", headers=alice).status_code == 404
    assert client.get("/api/jobs/does-not-exist", headers=bob).status_code == 404
    assert client.get(f"/api/jobs/{job['id']}").status_code == 401


# ---------------------------------------------------------------- discover feed

def test_discover_serves_sample_works_once_each_and_paginates(client, signup, tmp_path, monkeypatch):
    for i, color in enumerate(["red", "blue", "red"]):  # the third is a duplicate of the first
        Image.new("RGB", (40 + i * 0, 60), color).save(tmp_path / f"dist_{i + 1:04d}.jpg")
    monkeypatch.setattr(settings, "SHOWCASE_DIR", str(tmp_path))
    discover_mod.reset_cache()
    headers = signup()
    page = client.get("/api/discover?limit=1", headers=headers).json()
    assert page["total"] == 2 and len(page["items"]) == 1 and page["next_offset"] == 1 and page["sample"] is True
    rest = client.get(f"/api/discover?offset={page['next_offset']}&limit=5", headers=headers).json()
    assert len(rest["items"]) == 1 and rest["next_offset"] is None
    assert {page["items"][0]["id"], rest["items"][0]["id"]}.isdisjoint({"dist_0003"})
    assert page["items"][0]["image_url"].startswith("/showcase/") and page["items"][0]["width"] == 40
    assert client.get("/api/discover").status_code == 401
    discover_mod.reset_cache()


# ---------------------------------------------------------------- certificate: fingerprint stack page

def test_certificate_has_a_fingerprint_stack_page(client, signup):
    headers = signup()
    work_id = register(client, headers).json()["id"]
    pdf = client.get(f"/api/works/{work_id}/certificate")
    assert pdf.status_code == 200
    assert len(re.findall(rb"/Type\s*/Page(?!s)", pdf.content)) == 2


def test_fingerprint_stack_layers_and_composite():
    from app.certificate.stack import build_stack

    async def go():
        db = AsyncMongoMockClient().stack_test
        rec = await register_core(db, _user(), generate_sample_image(), "Owner", "Piece", False, lambda *a: None)
        doc = await db.works.find_one({"id": rec["id"]})
        stack = await build_stack(db, doc)
        names = [layer["name"] for layer in stack["layers"]]
        assert names == ["File content", "Perceptual hash", "Semantic embedding", "Structural embedding", "Local features", "Registry entry"]
        by = {layer["name"]: layer["digest"] for layer in stack["layers"]}
        assert len(by["File content"]) == 64 and len(by["Semantic embedding"]) == 64 and by["Registry entry"] == doc["entry_hash"]
        assert by["Structural embedding"] is None and stack["composite"] is None  # gate features not computed yet
        # once the background features exist the composite is available and deterministic
        await db.gate_features.insert_one({"work_id": doc["id"], "model": "dinov2-small", "vector": [0.1] * 384})
        from app.gate.verify import get_cached_features, FEATURE_VERSION
        get_cached_features(doc["id"], FEATURE_VERSION, Image.open(__import__("io").BytesIO(generate_sample_image())).convert("RGB"))
        full = await build_stack(db, doc)
        assert full["composite"] and len(full["composite"]) == 64
        assert (await build_stack(db, doc))["composite"] == full["composite"]

    asyncio.run(go())
