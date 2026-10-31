"""1D cases: open a case from a match, track it, and generate notices and an evidence pack."""
import asyncio

import pytest

from tests.test_api import generate_sample_image, register

ME = {"name": "Alice Artist", "email": "alice@example.com", "address": "12 Studio Lane, Pune"}
CHANGES = {"work_id": None, "headline": "Cropped to 80% and something added (top left).",
           "items": [{"kind": "crop", "label": "cropped to 80%", "detail": "Only 80% of the original is shown; cut from the top (20%).", "value": 0.8}],
           "regions": [], "unchanged_share": 0.97, "grade": "evidence",
           "footer": "Everything else matches the original pixel for pixel after alignment and colour correction (97% of the compared detail)."}


@pytest.fixture
def match(client, signup, override_db):
    """Alice registers a work and checks a copy of it; returns (headers, check_id, work_id)."""
    headers = signup()
    work = register(client, headers, title="Sunset").json()
    check = client.post("/api/works/check", files={"image": ("c.jpg", generate_sample_image(), "image/jpeg")},
                        headers=headers).json()
    return headers, check["id"], work["id"]


def make_evidence(db, check_id, work_id):
    """What the gate stores for a pixel-evidence match (the gate itself needs model weights)."""
    gate = {"claims": [{"classification": "TIER1", "grade": "evidence", "candidate_work_id": work_id,
                        "statement": "...", "human_review_required": False}],
            "evidence_work_id": work_id, "evidence_urls": {}, "changes": {**CHANGES, "work_id": work_id}}
    asyncio.run(db.checks.update_one({"id": check_id}, {"$set": {"gate": gate}}))


def open_case(client, headers, check_id, work_id):
    r = client.post("/api/cases", json={"check_id": check_id, "work_id": work_id}, headers=headers)
    assert r.status_code == 200, r.text
    return r.json()


def test_a_case_is_opened_once_per_match_and_only_by_its_owner(client, signup, match):
    headers, check_id, work_id = match
    case = open_case(client, headers, check_id, work_id)
    assert case["status"] == "open" and case["events"][0]["kind"] == "opened"
    assert open_case(client, headers, check_id, work_id)["id"] == case["id"]

    bob = signup(username="bob", email="bob@example.com")
    assert client.get(f"/api/cases/{case['id']}", headers=bob).status_code == 404
    assert client.post("/api/cases", json={"check_id": check_id, "work_id": work_id}, headers=bob).status_code == 404
    assert client.get("/api/cases", headers=bob).json() == []
    assert [c["work"]["title"] for c in client.get("/api/cases", headers=headers).json()] == ["Sunset"]


def test_booth_guests_cannot_open_cases(client, match, override_db, monkeypatch):
    from app.config import settings
    headers, check_id, work_id = match
    monkeypatch.setattr(settings, "BOOTH_MODE", True)
    asyncio.run(override_db.users.update_many({}, {"$set": {"is_guest": True}}))
    r = client.post("/api/cases", json={"check_id": check_id, "work_id": work_id}, headers=headers)
    assert r.status_code == 403


def test_details_status_and_notes_build_a_timeline(client, match):
    headers, check_id, work_id = match
    case = open_case(client, headers, check_id, work_id)
    url = f"/api/cases/{case['id']}"

    assert client.patch(url, json={"found_url": "instagram.com/p/x"}, headers=headers).status_code == 422
    assert client.patch(url, json={"platform": "myspace"}, headers=headers).status_code == 422
    r = client.patch(url, json={"found_url": "https://instagram.com/p/abc", "platform": "instagram",
                                "infringer": "@copycat", "follow_up_on": "2026-11-15"}, headers=headers).json()
    assert (r["found_url"], r["platform"], r["infringer"], r["follow_up_on"]) == (
        "https://instagram.com/p/abc", "instagram", "@copycat", "2026-11-15")

    r = client.patch(url, json={"status": "notice_sent", "status_note": "DMCA via Instagram form"}, headers=headers).json()
    r = client.post(f"{url}/notes", json={"text": "They replied, asking for proof."}, headers=headers).json()
    r = client.patch(url, json={"status": "removed", "clear_follow_up": True}, headers=headers).json()
    assert [e["text"] for e in r["events"]] == [
        "Case opened from a check", "Notice sent (DMCA via Instagram form)", "They replied, asking for proof.", "Copy removed"]
    assert r["status"] == "removed" and r["follow_up_on"] is None

    assert client.delete(url, headers=headers).json() == {"ok": True}
    assert client.get(url, headers=headers).status_code == 404


def test_a_lead_needs_the_creators_own_review_before_any_notice(client, match):
    headers, check_id, work_id = match  # the gate is off in tests, so this match is not evidence
    case = open_case(client, headers, check_id, work_id)
    assert case["grade"] == "lead"
    url = f"/api/cases/{case['id']}/notice"
    assert client.post(url, json={"type": "dmca", **ME}, headers=headers).status_code == 409
    notice = client.post(url, json={"type": "dmca", **ME, "confirmed_review": True}, headers=headers).json()
    assert "I have compared the two images myself" in notice["body"]
    assert "pixel evidence" not in notice["body"]


def test_dmca_notice_has_every_required_element(client, match, override_db):
    headers, check_id, work_id = match
    make_evidence(override_db, check_id, work_id)
    case = open_case(client, headers, check_id, work_id)
    client.patch(f"/api/cases/{case['id']}", json={"found_url": "https://instagram.com/p/abc", "platform": "instagram",
                                                   "infringer": "@copycat"}, headers=headers)
    notice = client.post(f"/api/cases/{case['id']}/notice", json={"type": "dmca", **ME}, headers=headers).json()
    body = notice["body"]
    work = client.get("/api/works", headers=headers).json()[0]
    for required in ('"Sunset"', work["entry_hash"], f"/verify/{work_id}",          # the copyrighted work
                     "https://instagram.com/p/abc", "@copycat",                     # the infringing material
                     "alice@example.com", "12 Studio Lane",                          # contact information
                     "good faith belief", "under penalty of perjury", "/Alice Artist/",
                     "pixel evidence", "Cropped to 80%", "cut from the top (20%)"):  # evidence and what changed
        assert required in body, required
    assert "Instagram" in notice["send_to"]


def test_india_and_licence_notices(client, match, override_db):
    headers, check_id, work_id = match
    make_evidence(override_db, check_id, work_id)
    case = open_case(client, headers, check_id, work_id)
    url = f"/api/cases/{case['id']}/notice"

    india = client.post(url, json={"type": "india", **ME}, headers=headers).json()
    assert "Grievance Officer" in india["body"] and "Rule 3(1)(b)" in india["body"]
    assert "Copyright Act, 1957" in india["body"] and "[add the link to the copy]" in india["body"]

    offer = client.post(url, json={"type": "license", **ME, "license_fee": "INR 5,000",
                                   "payment_link": "https://pay.example.com/alice"}, headers=headers).json()
    assert "INR 5,000" in offer["body"] and "https://pay.example.com/alice" in offer["body"]
    assert client.post(url, json={"type": "license", **ME, "payment_link": "pay.example.com"}, headers=headers).status_code == 422


def test_evidence_pack_is_a_three_page_pdf(client, match, override_db):
    headers, check_id, work_id = match
    make_evidence(override_db, check_id, work_id)
    case = open_case(client, headers, check_id, work_id)
    r = client.post(f"/api/cases/{case['id']}/notice.pdf", json={"type": "dmca", **ME}, headers=headers)
    assert r.status_code == 200 and r.headers["content-type"] == "application/pdf"
    assert r.content.startswith(b"%PDF")
    assert r.content.count(b"/Type /Page") - r.content.count(b"/Type /Pages") == 3  # notice, evidence, proof
