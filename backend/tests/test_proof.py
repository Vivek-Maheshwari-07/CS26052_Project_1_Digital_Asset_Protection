"""Phase 0 proof integrity: exact-file hash in the chain, metadata-free storage, Bitcoin upgrade, verify kit."""
import asyncio
import hashlib
import io
import json
import subprocess
import sys
import zipfile
from datetime import datetime

import numpy as np
from opentimestamps.calendar import RemoteCalendar
from opentimestamps.core.notary import BitcoinBlockHeaderAttestation, PendingAttestation
from opentimestamps.core.op import OpAppend, OpSHA256
from opentimestamps.core.serialize import BytesSerializationContext
from opentimestamps.core.timestamp import Timestamp
from PIL import Image

from app import storage
from app.config import settings
from app.registry import anchor
from app.registry.chain import compute_entry_hash
from tests.test_api import generate_sample_image, register

CALENDAR = "https://alice.btc.calendar.opentimestamps.org"


def gps_jpeg() -> bytes:
    img = Image.open(io.BytesIO(generate_sample_image()))
    exif = Image.Exif()
    exif[0x010F] = "SecretCam"
    exif.get_ifd(0x8825)[2] = (22.0, 18.0, 0.0)
    buf = io.BytesIO()
    img.save(buf, "JPEG", exif=exif, quality=95)
    return buf.getvalue()


def pending_proof(digest: bytes, calendar: str = CALENDAR) -> bytes:
    """A fresh calendar response: digest -> append -> pending attestation."""
    stamp = Timestamp(digest)
    stamp.ops.add(OpAppend(b"\x01" * 16)).attestations.add(PendingAttestation(calendar))
    ctx = BytesSerializationContext()
    stamp.serialize(ctx)
    return anchor.build_ots_file(digest, ctx.getbytes())


def calendar_upgrade(height: int):
    """What a calendar returns once it committed to Bitcoin: commitment -> sha256 -> block attestation."""
    def get_timestamp(self, commitment, timeout=None):
        stamp = Timestamp(commitment)
        stamp.ops.add(OpSHA256()).attestations.add(BitcoinBlockHeaderAttestation(height))
        return stamp
    return get_timestamp


def block_for(merkle_root: str):
    async def fetch_block(height):
        return {"hash": "00" * 32, "merkle_root": merkle_root, "time": datetime(2026, 10, 19, 16, 22)}
    return fetch_block


# ---------- 0.1 exact file hash in the chained record ----------

def test_record_chains_the_sha256_of_the_uploaded_file(client, signup):
    headers = signup()
    upload = gps_jpeg()
    work = register(client, headers, image=upload).json()
    assert work["file_sha256"] == hashlib.sha256(upload).hexdigest()

    record = client.get(f"/api/public/works/{work['id']}/record.json").content
    assert json.loads(record)["file_sha256"] == work["file_sha256"]
    assert hashlib.sha256(record).hexdigest() == work["entry_hash"]
    assert client.get(f"/api/public/works/{work['id']}").json()["file_sha256"] == work["file_sha256"]


def test_heic_records_the_hash_of_the_heic_the_creator_keeps(client, signup):
    buf = io.BytesIO()
    Image.open(io.BytesIO(generate_sample_image())).save(buf, format="HEIF")
    work = register(client, signup(), image=buf.getvalue()).json()
    assert work["file_sha256"] == hashlib.sha256(buf.getvalue()).hexdigest()


def test_records_without_a_file_hash_keep_their_entry_hash():
    old = {"id": "w1", "owner_name": "A", "title": "T", "phash": "00", "embedding": [0.1],
           "created_at": "2026-10-01T00:00:00+00:00", "prev_hash": "GENESIS"}
    assert compute_entry_hash(old) == compute_entry_hash({**old, "file_sha256": None})
    assert compute_entry_hash(old) != compute_entry_hash({**old, "file_sha256": "ab" * 32})


# ---------- 0.3 metadata-free storage ----------

def test_stored_works_and_checks_have_no_gps_but_the_same_pixels(client, signup, override_db):
    headers = signup()
    upload = gps_jpeg()
    work = register(client, headers, image=upload).json()
    check = client.post("/api/works/check", files={"image": ("s.jpg", upload, "image/jpeg")}, headers=headers).json()

    for url in (work["image_url"], check["query_image_url"]):
        stored = storage.read_image(url.removeprefix("/uploads/"))
        img = Image.open(io.BytesIO(stored))
        assert not img.getexif().get_ifd(0x8825) and 0x010F not in img.getexif()
        assert np.array_equal(np.asarray(img), np.asarray(Image.open(io.BytesIO(upload))))


# ---------- 0.2 OpenTimestamps upgrade ----------

def test_upgrade_turns_a_pending_proof_into_a_bitcoin_attestation():
    digest = hashlib.sha256(b"record").digest()
    proof = pending_proof(digest)
    upgraded, changed = anchor.upgrade_proof(proof, lambda uri, c: calendar_upgrade(800123)(None, c))
    assert changed
    [(height, merkle)] = anchor.bitcoin_attestations(upgraded)
    assert height == 800123 and len(merkle) == 64
    assert upgraded.startswith(proof[:65])  # same header and file digest


def test_upgrade_never_contacts_an_untrusted_calendar():
    calls = []
    proof = pending_proof(b"\x00" * 32, calendar="https://evil.example.com")
    _, changed = anchor.upgrade_proof(proof, lambda uri, c: calls.append(uri))
    assert not changed and calls == []


def _registered_with_proof(client, signup, override_db):
    work = register(client, signup()).json()
    proof = pending_proof(bytes.fromhex(work["entry_hash"]))
    from bson import Binary
    asyncio.run(override_db.works.update_one({"id": work["id"]}, {"$set": {
        "ots_proof": Binary(proof), "anchor_status": "pending"}}))
    return work


def test_upgrade_pending_confirms_a_work_checked_against_the_block(client, signup, override_db, monkeypatch):
    monkeypatch.setattr(settings, "OTS_ENABLED", True)
    work = _registered_with_proof(client, signup, override_db)
    monkeypatch.setattr(RemoteCalendar, "get_timestamp", calendar_upgrade(972177))
    upgraded, _ = anchor.upgrade_proof(pending_proof(bytes.fromhex(work["entry_hash"])),
                                       lambda uri, c: calendar_upgrade(972177)(None, c))
    monkeypatch.setattr(anchor, "fetch_block", block_for(anchor.bitcoin_attestations(upgraded)[0][1]))

    assert asyncio.run(anchor.upgrade_pending(override_db)) == {"checked": 1, "upgraded": 1, "confirmed": 1}
    status = client.get(f"/api/public/works/{work['id']}").json()["anchor"]
    assert status["status"] == "confirmed" and status["block_height"] == 972177 and status["block_checked"]
    assert status["block_time"].startswith("2026-10-19T16:22")


def test_a_block_whose_merkle_root_disagrees_marks_the_proof_invalid(client, signup, override_db, monkeypatch):
    monkeypatch.setattr(settings, "OTS_ENABLED", True)
    work = _registered_with_proof(client, signup, override_db)
    monkeypatch.setattr(RemoteCalendar, "get_timestamp", calendar_upgrade(972177))
    monkeypatch.setattr(anchor, "fetch_block", block_for("ff" * 32))
    asyncio.run(anchor.upgrade_pending(override_db))
    assert client.get(f"/api/public/works/{work['id']}").json()["anchor"]["status"] == "invalid"


def test_without_the_explorer_a_confirmation_is_kept_but_marked_unchecked(client, signup, override_db, monkeypatch):
    monkeypatch.setattr(settings, "OTS_ENABLED", True)
    work = _registered_with_proof(client, signup, override_db)
    monkeypatch.setattr(RemoteCalendar, "get_timestamp", calendar_upgrade(972177))

    async def offline(height):
        return None
    monkeypatch.setattr(anchor, "fetch_block", offline)
    asyncio.run(anchor.upgrade_pending(override_db))
    status = client.get(f"/api/public/works/{work['id']}").json()["anchor"]
    assert status["status"] == "confirmed" and not status["block_checked"]


# ---------- 0.5 verification kit ----------

def test_verify_kit_checks_record_file_and_proof_with_the_standard_library(client, signup, override_db, tmp_path,
                                                                            monkeypatch):
    monkeypatch.setattr(settings, "OTS_ENABLED", True)
    upload = gps_jpeg()
    work = register(client, signup(), image=upload).json()
    upgraded, _ = anchor.upgrade_proof(pending_proof(bytes.fromhex(work["entry_hash"])),
                                       lambda uri, c: calendar_upgrade(972177)(None, c))
    from bson import Binary
    asyncio.run(override_db.works.update_one({"id": work["id"]}, {"$set": {"ots_proof": Binary(upgraded)}}))

    r = client.get(f"/api/public/works/{work['id']}/verify-kit.zip")
    assert r.status_code == 200
    with zipfile.ZipFile(io.BytesIO(r.content)) as z:
        assert set(z.namelist()) == {"record.json", "record.json.ots", "chain.json", "verify.py", "README.txt"}
        z.extractall(tmp_path)
    original = tmp_path / "mine.jpg"
    original.write_bytes(upload)

    run = lambda *args: subprocess.run([sys.executable, "-I", str(tmp_path / "verify.py"), *args],
                                       capture_output=True, text=True, timeout=60)
    ok = run(str(original), "--offline")
    assert ok.returncode == 0, ok.stdout + ok.stderr
    assert ok.stdout.count("PASS") == 4 and "Bitcoin block 972177" in ok.stdout

    original.write_bytes(upload + b"\x00")  # a different file
    assert run(str(original), "--offline").returncode == 1
