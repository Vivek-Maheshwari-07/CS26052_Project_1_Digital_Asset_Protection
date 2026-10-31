"""Booth mode: walk-up visitors at an exhibition check images without signing up.

With BOOTH_MODE on, `POST /api/booth/session` creates a throwaway guest account (no email, no
password) and returns an ordinary session. A guest has no works of their own, so their checks search
the booth gallery instead: the works registered by the BOOTH_GALLERY_USERNAME account. Each guest's
match history stays private to them, and guests cannot register works (the hash chain is permanent,
visitor uploads are not). `python -m app.booth_reset` deletes the guests and everything they uploaded.
"""
import secrets
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException

from app.api.auth import _session, utcnow
from app.config import settings
from app.db import get_db
from app import storage

router = APIRouter()

GALLERY_MISSING = "The booth gallery isn't set up yet. Ask the team at the booth."


async def gallery_owner(db) -> Optional[dict]:
    name = settings.BOOTH_GALLERY_USERNAME.strip().lower()
    if not name:
        return None
    return await db.users.find_one({"username": name, "is_guest": {"$ne": True}})


async def search_scope(db, user: dict) -> str:
    """The user id whose works a check searches: your own, or the booth gallery's for a guest."""
    if not user.get("is_guest"):
        return str(user["_id"])
    owner = await gallery_owner(db)
    if owner is None:
        raise HTTPException(503, GALLERY_MISSING)
    return str(owner["_id"])


@router.get("/booth")
async def booth_status(db=Depends(get_db)):
    """Public: whether booth mode is on, and the gallery works visitors are invited to copy."""
    if not settings.BOOTH_MODE:
        return {"enabled": False, "ready": False, "gallery": []}
    owner = await gallery_owner(db)
    gallery = []
    if owner:
        cursor = db.works.find({"user_id": str(owner["_id"])},
                               {"id": 1, "title": 1, "owner_name": 1, "image_path": 1}).sort("_id", 1)
        gallery = [{"id": w["id"], "title": w["title"], "owner_name": w["owner_name"],
                    "image_url": storage.image_url(w.get("image_path"))} async for w in cursor]
    return {"enabled": True, "ready": owner is not None, "gallery": gallery}


@router.post("/booth/session")
async def booth_session(db=Depends(get_db)):
    if not settings.BOOTH_MODE:
        raise HTTPException(404, "Booth mode is off.")
    if await gallery_owner(db) is None:
        raise HTTPException(503, GALLERY_MISSING)
    user = {
        "username": f"guest_{secrets.token_hex(4)}",
        "full_name": "Booth visitor",
        "hashed_password": "",  # never matches, so a guest can't be logged into with a password
        "is_guest": True,
        "created_at": utcnow(),
        "failed_logins": 0,
    }
    res = await db.users.insert_one(user)
    user["_id"] = res.inserted_id
    return _session(user)
