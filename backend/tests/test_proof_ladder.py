"""1A proof ladder: source evidence, the web prior-art check and verified creator profiles."""
import asyncio
import io
import os
import zipfile

import pytest
from PIL import Image

from app.api import proof as proof_api
from app.config import settings
from app.proof import priorart, profile
from tests.gate.conftest import textured_image
from tests.test_api import register


def png(img: Image.Image) -> bytes:
    buf = io.BytesIO()
    img.save(buf, "PNG")
    return buf.getvalue()


@pytest.fixture
def work(client, signup):
    """A registered work at half resolution: the full-size picture is the creator's larger original."""
    headers = signup()
    full = textured_image(5, size=(960, 720))
    w = register(client, headers, title="Harbour", image=png(full.resize((480, 360)))).json()
    return headers, w["id"], full


def add_file(client, headers, work_id, data, name):
    return client.post(f"/api/works/{work_id}/proof/files", files={"file": (name, data, "application/octet-stream")},
                       headers=headers)


def steps(ladder):
    return {s["key"]: s["status"] for s in ladder["steps"]}


def test_a_new_registration_is_level_one(client, work):
    headers, work_id, _ = work
    proof = client.get(f"/api/works/{work_id}/proof", headers=headers).json()
    assert proof["ladder"]["level"] == 1 and proof["ladder"]["label"] == "Registered"
    assert steps(proof["ladder"]) == {"registered": "done", "earliest": "todo", "source": "todo", "identity": "todo"}
    assert proof["web_check_available"] is False
    assert "isn't set up" in proof["ladder"]["steps"][1]["detail"]


def test_a_larger_original_raises_the_level_and_is_never_stored(client, work):
    headers, work_id, full = work
    uploads_before = sum(len(f) for _, _, f in os.walk(settings.UPLOAD_DIR))
    proof = add_file(client, headers, work_id, png(full), "harbour-full.png").json()
    [item] = proof["files"]
    assert item["kind"] == "larger_original" and item["strong"] and item["filename"] == "harbour-full.png"
    assert (item["width"], item["height"]) == (960, 720)
    assert proof["ladder"]["level"] == 2 and steps(proof["ladder"])["source"] == "done"
    assert sum(len(f) for _, _, f in os.walk(settings.UPLOAD_DIR)) == uploads_before  # only the fingerprint is kept

    assert add_file(client, headers, work_id, png(full), "again.png").status_code == 409
    public = client.get(f"/api/public/works/{work_id}").json()["proof"]
    assert public["level"] == 2 and public["source_files"][0]["sha256"] == item["sha256"]
    assert "filename" not in public["source_files"][0]


def test_a_krita_file_counts_as_a_layered_source_file(client, work):
    headers, work_id, full = work
    kra = io.BytesIO()
    with zipfile.ZipFile(kra, "w") as z:
        z.writestr("mimetype", "application/x-krita")
        z.writestr("mergedimage.png", png(full))
    item = add_file(client, headers, work_id, kra.getvalue(), "harbour.kra").json()["files"][0]
    assert item["kind"] == "source_file" and item["strong"]


def test_unrelated_and_same_size_files_do_not_count(client, work):
    headers, work_id, full = work
    other = add_file(client, headers, work_id, png(textured_image(9, size=(960, 720))), "sketch.png").json()
    assert other["files"][0]["kind"] == "unmatched"
    same = add_file(client, headers, work_id, png(full.resize((480, 360))), "export.png").json()
    assert same["files"][1]["kind"] == "same_size"
    junk = add_file(client, headers, work_id, b"not an image at all", "notes.txt").json()
    assert junk["files"][2]["kind"] == "unreadable"
    assert junk["ladder"]["level"] == 1
    removed = client.delete(f"/api/works/{work_id}/proof/files/{junk['files'][2]['id']}", headers=headers).json()
    assert len(removed["files"]) == 2


def test_camera_data_supports_privately_but_proves_nothing(client, signup):
    headers = signup()
    img = textured_image(6)
    exif = Image.Exif()
    exif[0x010F], exif[0x0110] = "Canon", "EOS R6"
    buf = io.BytesIO()
    img.save(buf, "JPEG", exif=exif)
    work_id = register(client, headers, image=buf.getvalue()).json()["id"]
    source = client.get(f"/api/works/{work_id}/proof", headers=headers).json()["ladder"]["steps"][2]
    assert source["status"] == "todo" and "Canon EOS R6" in source["supporting"][0]
    public = client.get(f"/api/public/works/{work_id}").json()["proof"]["steps"][2]
    assert public["supporting"] == []


def test_web_check_flags_copies_until_the_creator_claims_them(client, work, monkeypatch):
    headers, work_id, _ = work
    url = f"/api/works/{work_id}/proof/web-check"
    assert client.post(url, headers=headers).status_code == 503

    monkeypatch.setattr(settings, "PRIOR_ART_PROVIDER", "google_vision")
    monkeypatch.setattr(settings, "PRIOR_ART_API_KEY", "test-key")

    async def found(image_bytes):
        return {"provider": "google_vision", "checked_at": priorart.utcnow(), "matches": [
            {"url": "https://myportfolio.example/harbour", "title": "Harbour", "kind": "full", "mine": False},
            {"url": "https://reposts.example/p/1", "title": None, "kind": "partial", "mine": False}]}
    monkeypatch.setattr(priorart, "search_web", found)

    proof = client.post(url, headers=headers).json()
    assert steps(proof["ladder"])["earliest"] == "warning" and proof["ladder"]["warnings"]
    proof = client.post(f"{url}/mine", json={"url": "https://myportfolio.example/harbour", "mine": True}, headers=headers).json()
    assert steps(proof["ladder"])["earliest"] == "warning"
    proof = client.post(f"{url}/mine", json={"url": "https://reposts.example/p/1", "mine": True}, headers=headers).json()
    assert steps(proof["ladder"])["earliest"] == "done" and proof["ladder"]["level"] == 2
    assert client.post(f"{url}/mine", json={"url": "https://elsewhere.example", "mine": True}, headers=headers).status_code == 404

    # A new search keeps pages already claimed
    proof = client.post(url, headers=headers).json()
    assert all(m["mine"] for m in proof["prior_art"]["matches"])


def test_google_vision_response_is_read_full_matches_first():
    resp = {"responses": [{"webDetection": {"pagesWithMatchingImages": [
        {"url": "https://a.example", "pageTitle": "A", "partialMatchingImages": [{"url": "x"}]},
        {"url": "https://b.example", "fullMatchingImages": [{"url": "y"}]}]}}]}
    assert [(m["url"], m["kind"]) for m in priorart._vision_matches(resp)] == [
        ("https://b.example", "full"), ("https://a.example", "partial")]


def test_a_verified_profile_link_reaches_the_public_record(client, work, monkeypatch):
    headers, work_id, _ = work
    assert client.post("/api/me/profile-links", json={"url": "myportfolio.example"}, headers=headers).status_code == 422
    link = client.post("/api/me/profile-links", json={"url": "https://myportfolio.example/about"}, headers=headers).json()
    assert link["code"].startswith("provnet-verify-") and not link["verified"]

    async def page_without(url):
        return "<html>About me</html>"
    monkeypatch.setattr(proof_api, "fetch_page", page_without)
    r = client.post(f"/api/me/profile-links/{link['id']}/verify", headers=headers).json()
    assert not r["verified"] and link["code"] in r["last_error"]
    assert client.get(f"/api/public/works/{work_id}").json()["proof"]["level"] == 1

    async def page_with(url):
        return f"<html>About me. {link['code']}</html>"
    monkeypatch.setattr(proof_api, "fetch_page", page_with)
    assert client.post(f"/api/me/profile-links/{link['id']}/verify", headers=headers).json()["verified"]
    public = client.get(f"/api/public/works/{work_id}").json()["proof"]
    assert public["level"] == 2 and "myportfolio.example/about" in public["steps"][3]["detail"]

    client.delete(f"/api/me/profile-links/{link['id']}", headers=headers)
    assert client.get("/api/me/profile-links", headers=headers).json() == []


@pytest.mark.parametrize("host", ["127.0.0.1", "10.1.2.3", "192.168.0.10", "169.254.169.254", "::1", "localhost"])
def test_profile_check_refuses_internal_addresses(host):
    with pytest.raises(profile.ProfileCheckError):
        asyncio.run(profile._assert_public(host))


def test_booth_guests_have_no_proof_pages(client, work, override_db, monkeypatch):
    headers, work_id, _ = work
    monkeypatch.setattr(settings, "BOOTH_MODE", True)
    asyncio.run(override_db.users.update_many({}, {"$set": {"is_guest": True}}))
    assert client.get(f"/api/works/{work_id}/proof", headers=headers).status_code == 403
    assert client.get("/api/me/profile-links", headers=headers).status_code == 403
