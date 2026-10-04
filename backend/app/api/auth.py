import hashlib
import hmac
import re
import secrets
from datetime import datetime, timedelta, timezone
from typing import Literal, Optional

import bcrypt
import jwt
from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jwt import PyJWTError
from pydantic import BaseModel, field_validator
from pymongo.errors import DuplicateKeyError

from app.config import settings
from app.db import get_db
from app.mailer import send_otp_email

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$")
USERNAME_RE = re.compile(r"^[a-zA-Z0-9_.]{3,30}$")


def utcnow() -> datetime:
    # Mongo hands datetimes back naive (in UTC), so keep everything naive-UTC here.
    return datetime.now(timezone.utc).replace(tzinfo=None)


# ---------- validation ----------

def normalize_email(value: str) -> str:
    value = value.strip().lower()
    if not EMAIL_RE.match(value) or len(value) > 254:
        raise ValueError("Enter a valid email address")
    return value


def normalize_username(value: str) -> str:
    value = value.strip().lower()
    if not USERNAME_RE.match(value):
        raise ValueError("Username must be 3–30 characters: letters, numbers, _ or .")
    return value


def check_password_strength(value: str) -> str:
    if len(value) < 8:
        raise ValueError("Password must be at least 8 characters")
    if len(value.encode("utf-8")) > 72:
        raise ValueError("Password is too long (max 72 bytes)")
    if not re.search(r"[A-Za-z]", value) or not re.search(r"\d", value):
        raise ValueError("Password must contain at least one letter and one number")
    return value


class SignupStart(BaseModel):
    full_name: str
    username: str
    email: str
    password: str

    @field_validator("full_name")
    @classmethod
    def _check_name(cls, v: str) -> str:
        v = " ".join(v.split())
        if not 2 <= len(v) <= 80:
            raise ValueError("Full name must be 2–80 characters")
        return v

    @field_validator("username")
    @classmethod
    def _check_username(cls, v: str) -> str:
        return normalize_username(v)

    @field_validator("email")
    @classmethod
    def _check_email(cls, v: str) -> str:
        return normalize_email(v)

    @field_validator("password")
    @classmethod
    def _check_password(cls, v: str) -> str:
        return check_password_strength(v)


class EmailOnly(BaseModel):
    email: str

    @field_validator("email")
    @classmethod
    def _check_email(cls, v: str) -> str:
        return normalize_email(v)


class ResendRequest(EmailOnly):
    purpose: Literal["signup", "reset"]


class VerifyRequest(EmailOnly):
    code: str

    @field_validator("code")
    @classmethod
    def _check_code(cls, v: str) -> str:
        v = v.strip()
        if not v.isdigit() or len(v) != settings.OTP_LENGTH:
            raise ValueError(f"Enter the {settings.OTP_LENGTH}-digit code")
        return v


class ResetRequest(VerifyRequest):
    new_password: str

    @field_validator("new_password")
    @classmethod
    def _check_password(cls, v: str) -> str:
        return check_password_strength(v)


# ---------- crypto helpers ----------

def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except ValueError:
        return False


def _otp_hash(email: str, purpose: str, code: str) -> str:
    msg = f"{purpose}:{email}:{code}".encode()
    return hmac.new(settings.JWT_SECRET.encode(), msg, hashlib.sha256).hexdigest()


def _generate_otp() -> str:
    return "".join(secrets.choice("0123456789") for _ in range(settings.OTP_LENGTH))


def create_access_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode({"sub": user_id, "exp": expire}, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def public_user(user: dict) -> dict:
    created = user.get("created_at")
    return {
        "id": str(user["_id"]),
        "username": user["username"],
        "email": user.get("email"),
        "full_name": user.get("full_name") or user["username"],
        "created_at": created.replace(tzinfo=timezone.utc).isoformat() if created else None,
    }


def _session(user: dict) -> dict:
    return {
        "access_token": create_access_token(str(user["_id"])),
        "token_type": "bearer",
        "user": public_user(user),
    }


async def get_current_user(token: str = Depends(oauth2_scheme), db=Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Your session has expired. Please log in again.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        user_id = ObjectId(payload.get("sub"))
    except (PyJWTError, InvalidId, TypeError):
        raise credentials_exception

    user = await db.users.find_one({"_id": user_id})
    if user is None:
        raise credentials_exception
    return user


# ---------- OTP lifecycle ----------

async def _issue_otp(db, email: str, purpose: str, name: str, payload: Optional[dict] = None) -> dict:
    """Create or refresh an OTP for (email, purpose) and email it. Enforces resend cooldown."""
    now = utcnow()
    existing = await db.otp_requests.find_one({"email": email, "purpose": purpose})

    if existing and existing["expires_at"] > now:
        wait = settings.OTP_RESEND_COOLDOWN_SECONDS - (now - existing["last_sent_at"]).total_seconds()
        if wait > 0:
            # Recent code is still valid: keep it, but let the caller update the signup details.
            if payload is not None:
                await db.otp_requests.update_one({"_id": existing["_id"]}, {"$set": {"payload": payload}})
            return {"email": email, "resend_in": int(wait) + 1, "sent": False}
        if existing.get("sends", 0) >= settings.OTP_MAX_SENDS:
            raise HTTPException(429, "Too many codes requested. Please try again later.")

    code = _generate_otp()
    try:
        await send_otp_email(email, name, code, purpose)
    except Exception:
        raise HTTPException(502, "We couldn't send the verification email. Check the address and try again.")

    sends = (existing.get("sends", 0) + 1) if existing and existing["expires_at"] > now else 1
    update = {
        "name": name,
        "otp_hash": _otp_hash(email, purpose, code),
        "attempts": 0,
        "sends": sends,
        "last_sent_at": now,
        "expires_at": now + timedelta(minutes=settings.OTP_EXPIRE_MINUTES),
    }
    if payload is not None:
        update["payload"] = payload
    await db.otp_requests.update_one({"email": email, "purpose": purpose}, {"$set": update}, upsert=True)
    return {"email": email, "resend_in": settings.OTP_RESEND_COOLDOWN_SECONDS, "sent": True}


async def _consume_otp(db, email: str, purpose: str, code: str) -> dict:
    """Validate a code; on success delete the request and return it. Counts failed attempts."""
    req = await db.otp_requests.find_one({"email": email, "purpose": purpose})
    if not req or req["expires_at"] <= utcnow():
        raise HTTPException(400, "This code has expired. Request a new one.")
    if req.get("attempts", 0) >= settings.OTP_MAX_ATTEMPTS:
        raise HTTPException(429, "Too many incorrect attempts. Request a new code.")

    if not hmac.compare_digest(req["otp_hash"], _otp_hash(email, purpose, code)):
        await db.otp_requests.update_one({"_id": req["_id"]}, {"$inc": {"attempts": 1}})
        left = settings.OTP_MAX_ATTEMPTS - req.get("attempts", 0) - 1
        raise HTTPException(400, f"Incorrect code. {left} attempt{'s' if left != 1 else ''} left." if left > 0
                            else "Too many incorrect attempts. Request a new code.")

    await db.otp_requests.delete_one({"_id": req["_id"]})
    return req


# ---------- routes ----------

@router.get("/availability")
async def availability(username: Optional[str] = Query(None), email: Optional[str] = Query(None), db=Depends(get_db)):
    result = {}
    if username is not None:
        try:
            u = normalize_username(username)
            result["username"] = {"available": not await db.users.find_one({"username": u}, {"_id": 1})}
        except ValueError as e:
            result["username"] = {"available": False, "reason": str(e)}
    if email is not None:
        try:
            e_ = normalize_email(email)
            result["email"] = {"available": not await db.users.find_one({"email": e_}, {"_id": 1})}
        except ValueError as e:
            result["email"] = {"available": False, "reason": str(e)}
    return result


@router.post("/signup/start")
async def signup_start(body: SignupStart, db=Depends(get_db)):
    if await db.users.find_one({"email": body.email}, {"_id": 1}):
        raise HTTPException(409, "An account with this email already exists. Try logging in.")
    if await db.users.find_one({"username": body.username}, {"_id": 1}):
        raise HTTPException(409, "That username is taken.")

    payload = {
        "full_name": body.full_name,
        "username": body.username,
        "hashed_password": get_password_hash(body.password),
    }
    return await _issue_otp(db, body.email, "signup", body.full_name.split()[0], payload)


@router.post("/otp/resend")
async def resend_otp(body: ResendRequest, db=Depends(get_db)):
    req = await db.otp_requests.find_one({"email": body.email, "purpose": body.purpose})
    if not req:
        if body.purpose == "signup":
            raise HTTPException(400, "Your sign-up session expired. Please start again.")
        return {"email": body.email, "resend_in": settings.OTP_RESEND_COOLDOWN_SECONDS, "sent": True}
    return await _issue_otp(db, body.email, body.purpose, req.get("name") or "there")


@router.post("/signup/verify")
async def signup_verify(body: VerifyRequest, db=Depends(get_db)):
    req = await _consume_otp(db, body.email, "signup", body.code)
    p = req["payload"]
    user = {
        "email": body.email,
        "username": p["username"],
        "full_name": p["full_name"],
        "hashed_password": p["hashed_password"],
        "email_verified": True,
        "created_at": utcnow(),
        "last_login_at": utcnow(),
        "failed_logins": 0,
    }
    try:
        res = await db.users.insert_one(user)
    except DuplicateKeyError:
        raise HTTPException(409, "That username or email was just taken. Please sign up again.")
    user["_id"] = res.inserted_id
    return _session(user)


@router.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db=Depends(get_db)):
    identifier = form_data.username.strip().lower()
    query = {"email": identifier} if "@" in identifier else {"username": identifier}
    user = await db.users.find_one(query)

    now = utcnow()
    if user and user.get("locked_until") and user["locked_until"] > now:
        mins = int((user["locked_until"] - now).total_seconds() // 60) + 1
        raise HTTPException(429, f"Too many failed attempts. Try again in {mins} minute{'s' if mins != 1 else ''}.")

    if not user or not verify_password(form_data.password, user["hashed_password"]):
        if user:
            failures = user.get("failed_logins", 0) + 1
            update = {"failed_logins": failures}
            if failures >= settings.LOGIN_MAX_FAILURES:
                update = {"failed_logins": 0, "locked_until": now + timedelta(minutes=settings.LOGIN_LOCKOUT_MINUTES)}
            await db.users.update_one({"_id": user["_id"]}, {"$set": update})
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email/username or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"failed_logins": 0, "last_login_at": now}, "$unset": {"locked_until": ""}},
    )
    return _session(user)


@router.post("/password/forgot")
async def password_forgot(body: EmailOnly, db=Depends(get_db)):
    user = await db.users.find_one({"email": body.email})
    if not user:
        # Don't reveal whether an account exists.
        return {"email": body.email, "resend_in": settings.OTP_RESEND_COOLDOWN_SECONDS, "sent": True}
    name = (user.get("full_name") or user["username"]).split()[0]
    return await _issue_otp(db, body.email, "reset", name)


@router.post("/password/reset")
async def password_reset(body: ResetRequest, db=Depends(get_db)):
    await _consume_otp(db, body.email, "reset", body.code)
    user = await db.users.find_one({"email": body.email})
    if not user:
        raise HTTPException(400, "This code has expired. Request a new one.")
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"hashed_password": get_password_hash(body.new_password), "failed_logins": 0},
         "$unset": {"locked_until": ""}},
    )
    return {"ok": True}


@router.get("/me")
async def get_me(current_user=Depends(get_current_user)):
    return public_user(current_user)


async def ensure_auth_indexes(db) -> None:
    await db.users.create_index("username", unique=True)
    await db.users.create_index(
        "email", unique=True, partialFilterExpression={"email": {"$type": "string"}}
    )
    await db.otp_requests.create_index([("email", 1), ("purpose", 1)], unique=True)
    # Mongo's TTL monitor removes expired OTP requests automatically.
    await db.otp_requests.create_index("expires_at", expireAfterSeconds=0)
