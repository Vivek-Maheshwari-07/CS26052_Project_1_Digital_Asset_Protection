import hashlib
import io
from PIL import Image, ImageDraw


# Helper to generate a dummy image bytes
def generate_sample_image(variant=0, fmt='JPEG') -> bytes:
    img = Image.new('RGB', (320, 240), color='white')
    draw = ImageDraw.Draw(img)
    if variant == 0:
        draw.rectangle([50, 50, 150, 150], fill='red', outline='black')
    else:
        # A structurally different picture
        for i in range(0, 320, 20):
            draw.line([(i, 0), (320 - i, 240)], fill=(i % 255, 80, 200), width=4)
        draw.ellipse([180, 20, 300, 140], fill='green')
    byte_arr = io.BytesIO()
    img.save(byte_arr, format=fmt)
    return byte_arr.getvalue()


def register(client, headers, title="Test Title", image=None, **extra):
    return client.post(
        "/api/works/register",
        data={"owner_name": "Test Owner", "title": title, **extra},
        files={"image": ("test.jpg", image or generate_sample_image(), "image/jpeg")},
        headers=headers,
    )


def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_works_require_auth(client, override_db):
    assert client.get("/api/works").status_code == 401


def test_register_and_check(client, signup):
    headers = signup()
    image_bytes = generate_sample_image()

    # 1. Test Register
    response = register(client, headers)
    assert response.status_code == 200
    data = response.json()
    assert data["owner_name"] == "Test Owner"
    assert data["title"] == "Test Title"
    assert (data["width"], data["height"]) == (320, 240)
    assert data["created_at"].endswith("+00:00")
    assert data["image_url"].endswith(".jpg")
    work_id = data["id"]

    # 2. Test Get All Works
    response = client.get("/api/works", headers=headers)
    assert response.status_code == 200
    assert len(response.json()) == 1

    # 3. Test Check Match (and that it lands in history)
    response = client.post(
        "/api/works/check",
        files={"image": ("test_check.jpg", image_bytes, "image/jpeg")},
        headers=headers,
    )
    assert response.status_code == 200
    check = response.json()
    assert check["results"][0]["work_id"] == work_id
    assert check["results"][0]["verdict"] == "likely_match"
    assert check["results"][0]["is_own"] is True
    assert check["query_image_url"].startswith("/uploads/checks/")

    history = client.get("/api/checks", headers=headers).json()
    assert [c["id"] for c in history] == [check["id"]]
    assert history[0]["top_verdict"] == "likely_match"
    assert client.get(f"/api/checks/{check['id']}", headers=headers).json()["results"][0]["work_id"] == work_id

    # 4. Test Certificate Generation
    response = client.get(f"/api/works/{work_id}/certificate")
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.content.startswith(b"%PDF")


def test_png_keeps_its_extension(client, signup):
    r = register(client, signup(), image=generate_sample_image(fmt='PNG'))
    assert r.status_code == 200
    assert r.json()["image_url"].endswith(".png")


def test_portfolios_are_isolated_per_user(client, signup):
    alice = signup()
    bob = signup(username="bob", email="bob@example.com")

    assert register(client, alice, title="Alice's piece").status_code == 200
    assert [w["title"] for w in client.get("/api/works", headers=alice).json()] == ["Alice's piece"]
    assert client.get("/api/works", headers=bob).json() == []

    # Bob's checks don't appear in Alice's history, and matches are not "his own"
    check = client.post("/api/works/check", files={"image": ("x.jpg", generate_sample_image(), "image/jpeg")},
                        headers=bob).json()
    assert check["results"][0]["is_own"] is False
    assert client.get("/api/checks", headers=alice).json() == []
    assert client.get(f"/api/checks/{check['id']}", headers=alice).status_code == 404


def test_duplicate_of_someone_elses_work_is_refused(client, signup):
    alice = signup()
    bob = signup(username="bob", email="bob@example.com")
    assert register(client, alice).status_code == 200

    r = register(client, bob, title="Totally mine")
    assert r.status_code == 409
    detail = r.json()["detail"]
    assert detail["is_own"] is False and detail["can_override"] is False
    assert detail["match"]["image_url"] is None  # don't leak another creator's image
    # Override flag doesn't help for someone else's work
    assert register(client, bob, title="Totally mine", allow_similar_own="true").status_code == 409


def test_own_near_duplicate_can_be_confirmed(client, signup):
    alice = signup()
    assert register(client, alice).status_code == 200
    r = register(client, alice, title="Again")
    assert r.status_code == 409 and r.json()["detail"]["can_override"] is True
    assert register(client, alice, title="Again", allow_similar_own="true").status_code == 200


def test_different_images_are_not_duplicates(client, signup):
    alice = signup()
    assert register(client, alice).status_code == 200
    assert register(client, alice, title="Other", image=generate_sample_image(variant=1)).status_code == 200


def test_public_verification_and_record_hash(client, signup):
    headers = signup()
    first = register(client, headers).json()
    second = register(client, headers, title="Second", image=generate_sample_image(variant=1)).json()

    pub = client.get(f"/api/public/works/{second['id']}").json()  # no auth needed
    assert pub["record_intact"] and pub["chain_linked"]
    assert pub["registry_position"] == 2
    assert pub["prev_hash"] == first["entry_hash"]

    record = client.get(f"/api/public/works/{second['id']}/record.json").content
    assert hashlib.sha256(record).hexdigest() == second["entry_hash"]

    # Not anchored in tests (OTS disabled)
    assert client.get(f"/api/public/works/{second['id']}/proof.ots").status_code == 404
    assert client.get("/api/public/works/does-not-exist").status_code == 404

    status = client.get("/api/registry/status").json()
    assert status == {**status, "valid": True, "length": 2, "head_hash": second["entry_hash"]}


def test_register_rejects_non_image(client, signup):
    headers = signup()
    r = client.post(
        "/api/works/register",
        data={"owner_name": "X", "title": "Y"},
        files={"image": ("notes.txt", b"hello world", "text/plain")},
        headers=headers,
    )
    assert r.status_code == 400
