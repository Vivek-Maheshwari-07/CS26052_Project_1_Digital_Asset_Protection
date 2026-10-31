"""Proof ladder endpoints: source evidence, the web prior-art check and verified profile links.

Owner-only, except the public summary that public.py adds to a work's public record.
"""
import asyncio
import uuid
from typing import Optional

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel

from app import ingestion, storage
from app.api.auth import get_current_user, utcnow
from app.api.register import iso_utc
from app.db import get_db
from app.proof import priorart, profile
from app.proof.ladder import build_ladder, owner_file, owner_prior_art
from app.proof.sources import analyse_source
from app.registry.anchor import anchor_work

router = APIRouter()

MAX_SOURCE_BYTES = 80 * 1024 * 1024  # layered source files and RAW files are large
MAX_FILES_PER_WORK = 10
MAX_PROFILE_LINKS = 5


async def _own_work(db, user: dict, work_id: str) -> dict:
    if user.get("is_guest"):
        raise HTTPException(403, "Booth visitors don't have registered works.")
    work = await db.works.find_one({"id": work_id, "user_id": str(user["_id"])}, {"embedding": 0, "ots_proof": 0})
    if not work:
        raise HTTPException(404, "Work not found")
    return work


async def proof_files(db, work_id: str) -> list:
    return [f async for f in db.work_proofs.find({"work_id": work_id}, {"ots_proof": 0}).sort("created_at", 1)]


async def owner_links(db, user_id) -> list:
    """An account's profile links. `user_id` is the ObjectId, or its string form as stored on works."""
    try:
        oid = ObjectId(user_id) if isinstance(user_id, str) else user_id
    except InvalidId:
        return []
    user = await db.users.find_one({"_id": oid}, {"profile_links": 1})
    return (user or {}).get("profile_links") or []


async def _proof_out(db, user: dict, work: dict) -> dict:
    files = await proof_files(db, work["id"])
    links = await owner_links(db, user["_id"])
    return {
        "ladder": build_ladder(work, files, links, web_available=priorart.available()),
        "files": [owner_file(f) for f in files],
        "prior_art": owner_prior_art(work),
        "web_check_available": priorart.available(),
        "links": [_link_out(link) for link in links],
    }


@router.get("/works/{work_id}/proof")
async def get_proof(work_id: str, db=Depends(get_db), user=Depends(get_current_user)):
    return await _proof_out(db, user, await _own_work(db, user, work_id))


@router.post("/works/{work_id}/proof/files")
async def add_source_file(work_id: str, background: BackgroundTasks, file: UploadFile = File(...),
                          db=Depends(get_db), user=Depends(get_current_user)):
    """Check a supporting file against the work and keep its fingerprint (never the file)."""
    work = await _own_work(db, user, work_id)
    if await db.work_proofs.count_documents({"work_id": work_id}) >= MAX_FILES_PER_WORK:
        raise HTTPException(400, f"A work can have up to {MAX_FILES_PER_WORK} source files.")
    data = await file.read(MAX_SOURCE_BYTES + 1)
    if len(data) > MAX_SOURCE_BYTES:
        raise HTTPException(413, "Source files must be 80 MB or smaller.")
    if not data:
        raise HTTPException(400, "That file is empty.")
    try:
        work_img = ingestion.normalize(storage.read_image(work["image_path"]) or b"")
    except ingestion.InvalidImageError:
        raise HTTPException(409, "The registered image could not be read, so nothing can be matched against it.")
    result = await asyncio.to_thread(analyse_source, data, file.filename or "", work_img)
    if await db.work_proofs.find_one({"work_id": work_id, "sha256": result["sha256"]}, {"_id": 1}):
        raise HTTPException(409, "This file has already been added to this work.")
    doc = {"id": str(uuid.uuid4()), "work_id": work_id, "user_id": str(user["_id"]),
           "filename": (file.filename or "")[:200], "created_at": utcnow(), **result}
    await db.work_proofs.insert_one(doc)
    background.add_task(anchor_work, db, doc["id"], doc["sha256"], "work_proofs")
    return await _proof_out(db, user, work)


@router.delete("/works/{work_id}/proof/files/{file_id}")
async def remove_source_file(work_id: str, file_id: str, db=Depends(get_db), user=Depends(get_current_user)):
    work = await _own_work(db, user, work_id)
    if not (await db.work_proofs.delete_one({"id": file_id, "work_id": work_id})).deleted_count:
        raise HTTPException(404, "File not found")
    return await _proof_out(db, user, work)


@router.post("/works/{work_id}/proof/web-check")
async def run_web_check(work_id: str, db=Depends(get_db), user=Depends(get_current_user)):
    """Search the web for this image. Sends the registered image to the configured search provider."""
    work = await _own_work(db, user, work_id)
    if not priorart.available():
        raise HTTPException(503, "Web search isn't set up on this server.")
    image = storage.read_image(work["image_path"])
    if not image:
        raise HTTPException(409, "The registered image could not be read.")
    try:
        result = await priorart.search_web(image)
    except priorart.PriorArtUnavailable as e:
        raise HTTPException(502, str(e))
    # Keep pages the creator already claimed as theirs claimed
    mine = {m["url"] for m in (work.get("prior_art") or {}).get("matches", []) if m.get("mine")}
    for m in result["matches"]:
        m["mine"] = m["url"] in mine
    await db.works.update_one({"id": work_id}, {"$set": {"prior_art": result}})
    return await _proof_out(db, user, await _own_work(db, user, work_id))


class MineUpdate(BaseModel):
    url: str
    mine: bool


@router.post("/works/{work_id}/proof/web-check/mine")
async def mark_mine(work_id: str, body: MineUpdate, db=Depends(get_db), user=Depends(get_current_user)):
    work = await _own_work(db, user, work_id)
    pa = work.get("prior_art")
    if not pa or not any(m["url"] == body.url for m in pa["matches"]):
        raise HTTPException(404, "That page isn't in the last web check.")
    for m in pa["matches"]:
        if m["url"] == body.url:
            m["mine"] = body.mine
    await db.works.update_one({"id": work_id}, {"$set": {"prior_art.matches": pa["matches"]}})
    return await _proof_out(db, user, await _own_work(db, user, work_id))


# ---------- verified profile links (per account) ----------

class LinkCreate(BaseModel):
    url: str


def _link_out(link: dict) -> dict:
    return {"id": link["id"], "url": link["url"], "code": link["code"], "verified": link.get("verified", False),
            "verified_at": iso_utc(link["verified_at"]) if link.get("verified_at") else None,
            "last_error": link.get("last_error")}


def _members_only(user: dict) -> None:
    if user.get("is_guest"):
        raise HTTPException(403, "Booth visitors can't link profiles.")


@router.get("/me/profile-links")
async def list_links(db=Depends(get_db), user=Depends(get_current_user)):
    _members_only(user)
    return [_link_out(link) for link in await owner_links(db, user["_id"])]


@router.post("/me/profile-links")
async def add_link(body: LinkCreate, db=Depends(get_db), user=Depends(get_current_user)):
    _members_only(user)
    try:
        url = profile.normalize_url(body.url)
    except profile.ProfileCheckError as e:
        raise HTTPException(422, str(e))
    links = await owner_links(db, user["_id"])
    if any(link["url"] == url for link in links):
        raise HTTPException(409, "That link is already on your account.")
    if len(links) >= MAX_PROFILE_LINKS:
        raise HTTPException(400, f"You can link up to {MAX_PROFILE_LINKS} pages.")
    link = {"id": uuid.uuid4().hex[:12], "url": url, "code": profile.new_code(), "verified": False}
    await db.users.update_one({"_id": user["_id"]}, {"$push": {"profile_links": link}})
    return _link_out(link)


@router.post("/me/profile-links/{link_id}/verify")
async def verify_link(link_id: str, db=Depends(get_db), user=Depends(get_current_user)):
    _members_only(user)
    links = await owner_links(db, user["_id"])
    link = next((link for link in links if link["id"] == link_id), None)
    if not link:
        raise HTTPException(404, "Link not found")
    error: Optional[str] = None
    try:
        found = await profile.page_has_code(link["url"], link["code"], fetch=fetch_page)
        if not found:
            error = f"The code {link['code']} isn't on that page yet. Add it, save the page, then check again."
    except profile.ProfileCheckError as e:
        found, error = False, str(e)
    update = {"profile_links.$.last_error": error, "profile_links.$.checked_at": utcnow()}
    if found:
        update.update({"profile_links.$.verified": True, "profile_links.$.verified_at": utcnow()})
    await db.users.update_one({"_id": user["_id"], "profile_links.id": link_id}, {"$set": update})
    link = next(link for link in await owner_links(db, user["_id"]) if link["id"] == link_id)
    return _link_out(link)


@router.delete("/me/profile-links/{link_id}")
async def remove_link(link_id: str, db=Depends(get_db), user=Depends(get_current_user)):
    _members_only(user)
    await db.users.update_one({"_id": user["_id"]}, {"$pull": {"profile_links": {"id": link_id}}})
    return {"ok": True}


# The page fetcher, replaceable in tests (it reaches the internet)
fetch_page = profile.fetch_page


async def ensure_proof_indexes(db) -> None:
    await db.work_proofs.create_index([("work_id", 1), ("created_at", 1)])
    await db.work_proofs.create_index([("work_id", 1), ("sha256", 1)], unique=True)
