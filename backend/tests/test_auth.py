import asyncio


def test_signup_requires_otp_before_account_exists(client, override_db, outbox):
    r = client.post("/api/auth/signup/start", json={
        "full_name": "Bob Builder", "username": "Bob_1", "email": "Bob@Example.com", "password": "Passw0rd!",
    })
    assert r.status_code == 200
    assert len(outbox) == 1 and outbox[0]["to"] == "bob@example.com"

    # No account yet: login fails until the code is verified
    assert client.post("/api/auth/login", data={"username": "bob_1", "password": "Passw0rd!"}).status_code == 401

    r = client.post("/api/auth/signup/verify", json={"email": "bob@example.com", "code": outbox[0]["code"]})
    assert r.status_code == 200
    body = r.json()
    assert body["user"]["username"] == "bob_1"
    assert body["user"]["email"] == "bob@example.com"

    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {body['access_token']}"})
    assert me.status_code == 200 and me.json()["full_name"] == "Bob Builder"


def test_password_is_hashed(client, override_db, signup):
    signup()
    doc = asyncio.run(override_db.users.find_one({"username": "alice"}))
    assert doc["hashed_password"] != "Secret123"
    assert doc["hashed_password"].startswith("$2")


def test_wrong_otp_counts_attempts(client, override_db, outbox):
    client.post("/api/auth/signup/start", json={
        "full_name": "Carol", "username": "carol", "email": "carol@example.com", "password": "Secret123",
    })
    real = outbox[0]["code"]
    wrong = "000000" if real != "000000" else "111111"
    r = client.post("/api/auth/signup/verify", json={"email": "carol@example.com", "code": wrong})
    assert r.status_code == 400 and "4 attempts left" in r.json()["detail"]
    r = client.post("/api/auth/signup/verify", json={"email": "carol@example.com", "code": real})
    assert r.status_code == 200


def test_duplicate_email_and_username_rejected(client, signup):
    signup()
    r = client.post("/api/auth/signup/start", json={
        "full_name": "Other", "username": "other", "email": "alice@example.com", "password": "Secret123",
    })
    assert r.status_code == 409
    r = client.post("/api/auth/signup/start", json={
        "full_name": "Other", "username": "ALICE", "email": "other@example.com", "password": "Secret123",
    })
    assert r.status_code == 409


def test_weak_password_and_bad_email_rejected(client, override_db, outbox):
    r = client.post("/api/auth/signup/start", json={
        "full_name": "Dan", "username": "dan", "email": "dan@example.com", "password": "short",
    })
    assert r.status_code == 422
    r = client.post("/api/auth/signup/start", json={
        "full_name": "Dan", "username": "dan", "email": "not-an-email", "password": "Secret123",
    })
    assert r.status_code == 422
    assert outbox == []


def test_resend_cooldown(client, override_db, outbox):
    client.post("/api/auth/signup/start", json={
        "full_name": "Eve", "username": "eve", "email": "eve@example.com", "password": "Secret123",
    })
    r = client.post("/api/auth/otp/resend", json={"email": "eve@example.com", "purpose": "signup"})
    assert r.status_code == 200 and r.json()["sent"] is False and r.json()["resend_in"] > 0
    assert len(outbox) == 1


def test_login_with_email_or_username_and_lockout(client, signup):
    signup()
    assert client.post("/api/auth/login", data={"username": "alice", "password": "Secret123"}).status_code == 200
    assert client.post("/api/auth/login", data={"username": "ALICE@example.com", "password": "Secret123"}).status_code == 200

    for _ in range(5):
        assert client.post("/api/auth/login", data={"username": "alice", "password": "wrong"}).status_code == 401
    # Locked even with the correct password
    assert client.post("/api/auth/login", data={"username": "alice", "password": "Secret123"}).status_code == 429


def test_password_reset_flow(client, signup, outbox):
    signup()
    r = client.post("/api/auth/password/forgot", json={"email": "alice@example.com"})
    assert r.status_code == 200
    code = [m for m in outbox if m["purpose"] == "reset"][-1]["code"]
    r = client.post("/api/auth/password/reset", json={
        "email": "alice@example.com", "code": code, "new_password": "NewSecret456",
    })
    assert r.status_code == 200
    assert client.post("/api/auth/login", data={"username": "alice", "password": "Secret123"}).status_code == 401
    assert client.post("/api/auth/login", data={"username": "alice", "password": "NewSecret456"}).status_code == 200


def test_forgot_password_does_not_leak_accounts(client, override_db, outbox):
    r = client.post("/api/auth/password/forgot", json={"email": "nobody@example.com"})
    assert r.status_code == 200
    assert outbox == []


def test_availability(client, signup):
    signup()
    r = client.get("/api/auth/availability", params={"username": "alice", "email": "new@example.com"})
    assert r.json() == {"username": {"available": False}, "email": {"available": True}}


def test_invalid_token_rejected(client, override_db):
    assert client.get("/api/auth/me", headers={"Authorization": "Bearer garbage"}).status_code == 401
