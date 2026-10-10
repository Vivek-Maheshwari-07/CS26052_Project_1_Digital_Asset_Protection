"""The gate wired into /works/check and /works/register (run_gate stubbed; no model weights)."""
import pytest

from app.config import settings
from app.gate.verdict import CLAIM_GRADE, Claim, Timings, Verdict, build_statement
from tests.test_api import generate_sample_image, register


def fake_verdict(classification=None, work_id="", evidence=None):
    claims = []
    if classification:
        claims.append(Claim(classification=classification, grade=CLAIM_GRADE[classification],
                            candidate_work_id=work_id, statement=build_statement(classification),
                            human_review_required=CLAIM_GRADE[classification] != "evidence"))
    return Verdict(check_id="c", claims=claims, candidates=[], metrics={}, shadow={}, origin={"provenance_found": False},
                   evidence_paths=evidence or {}, timings=Timings(), pipeline_version="t", config_hash="h",
                   config_snapshot="{}")


@pytest.fixture
def gate_on(monkeypatch):
    monkeypatch.setattr(settings, "GATE_ENABLED", True)
    recorded = []

    async def fake_features(db, work_id, image_bytes):
        recorded.append(work_id)

    monkeypatch.setattr("app.api.register.compute_for_registration", fake_features)
    return recorded


def _check(client, headers, image=None):
    return client.post("/api/works/check", files={"image": ("s.jpg", image or generate_sample_image(), "image/jpeg")},
                       headers=headers)


def test_check_returns_gate_verdict_with_evidence_urls(client, signup, gate_on, monkeypatch):
    headers = signup()
    work_id = register(client, headers).json()["id"]
    monkeypatch.setattr("app.api.check.run_gate", lambda *a, **k: _async(
        fake_verdict("TIER1", work_id, {"overlay": "evidence/c/overlay.jpg"})))
    body = _check(client, headers).json()
    assert body["gate"]["claims"][0]["classification"] == "TIER1"
    assert body["gate"]["evidence_urls"] == {"overlay": "/uploads/evidence/c/overlay.jpg"}
    assert body["gate_claim"]["classification"] == "TIER1"
    # persisted: the history copy carries the same verdict
    again = client.get(f"/api/checks/{body['id']}", headers=headers).json()
    assert again["gate"]["claims"][0]["candidate_work_id"] == work_id


def test_gate_failure_does_not_break_the_check(client, signup, gate_on, monkeypatch):
    headers = signup()
    register(client, headers)

    def boom(*a, **k):
        raise RuntimeError("model unavailable")

    monkeypatch.setattr("app.api.check.run_gate", boom)
    r = _check(client, headers)
    assert r.status_code == 200
    assert "model unavailable" in r.json()["gate"]["error"]
    assert r.json()["results"][0]["verdict"] == "likely_match"  # classic scores still there


def test_gate_disabled_leaves_response_unchanged(client, signup):
    headers = signup()
    register(client, headers)
    body = _check(client, headers).json()
    assert body["gate"] is None and body["gate_claim"] is None


def test_register_blocks_tier1_copy_of_another_creators_work(client, signup, gate_on, monkeypatch):
    alice, bob = signup(), signup(username="bob", email="bob@example.com")
    alice_work = register(client, alice).json()["id"]
    monkeypatch.setattr("app.api.register.run_gate", lambda *a, **k: _async(fake_verdict("TIER1", alice_work)))
    r = register(client, bob, title="Mine", image=generate_sample_image(variant=1))
    assert r.status_code == 409
    detail = r.json()["detail"]
    assert detail["is_own"] is False and detail["can_override"] is False and detail["match"]["title"] is None


def test_register_tier1_of_own_work_can_be_confirmed(client, signup, gate_on, monkeypatch):
    alice = signup()
    own = register(client, alice).json()["id"]
    monkeypatch.setattr("app.api.register.run_gate", lambda *a, **k: _async(fake_verdict("TIER1", own)))
    other = generate_sample_image(variant=1)
    assert register(client, alice, title="again", image=other).status_code == 409
    assert register(client, alice, title="again", image=other, allow_similar_own="true").status_code == 200


def test_register_lead_only_warns_and_still_registers(client, signup, gate_on, monkeypatch):
    alice, bob = signup(), signup(username="bob", email="bob@example.com")
    alice_work = register(client, alice).json()["id"]
    monkeypatch.setattr("app.api.register.run_gate",
                        lambda *a, **k: _async(fake_verdict("RELATED_DIFFERENT_CAPTURE", alice_work)))
    r = register(client, bob, title="Mine", image=generate_sample_image(variant=1))
    assert r.status_code == 200
    assert len(r.json()["gate_notices"]) == 1 and "Mine" not in r.json()["gate_notices"][0]
    assert "alice" not in r.json()["gate_notices"][0].lower()  # nothing about the other creator leaks


def test_registration_computes_gate_features_for_the_new_work(client, signup, gate_on, monkeypatch):
    monkeypatch.setattr("app.api.register.run_gate", lambda *a, **k: _async(fake_verdict()))
    work_id = register(client, signup()).json()["id"]
    assert gate_on == [work_id]


def test_gate_failure_does_not_block_registration(client, signup, gate_on, monkeypatch):
    def boom(*a, **k):
        raise RuntimeError("down")

    monkeypatch.setattr("app.api.register.run_gate", boom)
    assert register(client, signup()).status_code == 200


def test_oversize_upload_is_rejected_while_reading(client, signup, monkeypatch):
    monkeypatch.setattr("app.api.register.MAX_UPLOAD_BYTES", 1000)
    assert register(client, signup(), image=generate_sample_image()).status_code == 413


async def _async(value):
    return value
