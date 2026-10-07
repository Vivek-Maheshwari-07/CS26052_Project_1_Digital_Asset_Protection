import io
import uuid

from PIL import Image

from app.api.assets import REGISTRATION_DISCLAIMER
from app.schemas import ImageDetail, RegistrationRecord
from tests.images import photo_like, to_bytes


def _register(client, owner: str | None = "Riya Shah") -> dict:
    data = {"owner_name": owner} if owner else {}
    res = client.post(
        "/api/register",
        files={
            "file": ("orig.jpg", to_bytes(photo_like(40, size=(800, 600)), "JPEG", quality=95), "image/jpeg")
        },
        data=data,
    )
    assert res.status_code == 201, res.text
    return res.json()


def test_image_detail(api_client):
    reg = _register(api_client)
    res = api_client.get(f"/api/images/{reg['image_id']}")
    assert res.status_code == 200, res.text
    detail = ImageDetail.model_validate(res.json())

    assert str(detail.image_id) == reg["image_id"]
    assert detail.owner_name == "Riya Shah"
    assert detail.source_format == "JPEG"
    assert detail.fingerprints.model_dump() == reg["fingerprints"]
    assert detail.sha256 == reg["sha256"]
    assert detail.file_url == f"/api/images/{reg['image_id']}/file"
    assert detail.record_url == reg["record_url"]
    assert res.json()["registered_at"].endswith("Z")
    assert "clip_emb" not in res.text and "dino_emb" not in res.text


def test_image_detail_404_and_422(api_client):
    assert api_client.get(f"/api/images/{uuid.uuid4()}").status_code == 404
    assert api_client.get("/api/images/not-a-uuid").status_code == 422


def test_file_full_and_thumb(api_client):
    reg = _register(api_client)
    image_id = reg["image_id"]

    full = api_client.get(f"/api/images/{image_id}/file")
    assert full.status_code == 200
    assert full.headers["content-type"] == "image/png"
    assert "immutable" in full.headers["cache-control"]
    assert full.headers["content-disposition"].startswith("inline")
    assert full.content == (api_client.storage_dir / f"{image_id}.png").read_bytes()
    with Image.open(io.BytesIO(full.content)) as im:
        assert im.size == (800, 600)

    thumb = api_client.get(f"/api/images/{image_id}/file?size=thumb")
    assert thumb.status_code == 200
    with Image.open(io.BytesIO(thumb.content)) as im:
        assert max(im.size) == 320


def test_file_bad_size_and_unknown_id(api_client):
    reg = _register(api_client)
    assert api_client.get(f"/api/images/{reg['image_id']}/file?size=huge").status_code == 422
    missing = api_client.get(f"/api/images/{uuid.uuid4()}/file")
    assert missing.status_code == 404
    assert missing.json()["error"] == "not_found"


def test_file_unregistered_orphan_is_not_served(api_client):
    orphan = uuid.uuid4()
    (api_client.storage_dir / f"{orphan}.png").write_bytes(to_bytes(photo_like(1), "PNG"))
    assert api_client.get(f"/api/images/{orphan}/file").status_code == 404


def test_missing_thumb_is_regenerated(api_client):
    reg = _register(api_client)
    thumb_path = api_client.storage_dir / "thumbs" / f"{reg['image_id']}.png"
    thumb_path.unlink()

    res = api_client.get(f"/api/images/{reg['image_id']}/file?size=thumb")
    assert res.status_code == 200
    assert thumb_path.exists()


def test_missing_full_file_is_404(api_client):
    reg = _register(api_client)
    (api_client.storage_dir / f"{reg['image_id']}.png").unlink()
    res = api_client.get(f"/api/images/{reg['image_id']}/file")
    assert res.status_code == 404


def test_registration_record(api_client):
    reg = _register(api_client)
    res = api_client.get(f"/api/images/{reg['image_id']}/record")
    assert res.status_code == 200, res.text
    record = RegistrationRecord.model_validate(res.json())

    assert record.record_type == "provnet.registration_record"
    assert record.disclaimer == REGISTRATION_DISCLAIMER
    assert "not proof of" in record.disclaimer
    assert record.owner_name == "Riya Shah"
    assert record.owner_name_verified is False
    assert record.sha256 == reg["sha256"]
    assert record.sha256_scope == "original_upload_bytes"
    assert record.fingerprints.model_dump() == reg["fingerprints"]
    assert record.models.config_version == reg["models"]["config_version"]
    assert res.json()["registered_at"] == reg["registered_at"]
    assert res.headers["cache-control"] == "no-store"
    assert "content-disposition" not in res.headers


def test_registration_record_download(api_client):
    reg = _register(api_client, owner=None)
    res = api_client.get(f"/api/images/{reg['image_id']}/record?download=true")
    assert res.status_code == 200
    assert res.headers["content-disposition"] == (
        f'attachment; filename="provnet-record-{reg["image_id"]}.json"'
    )
    assert res.json()["owner_name"] is None


def test_registration_record_404(api_client):
    assert api_client.get(f"/api/images/{uuid.uuid4()}/record").status_code == 404
