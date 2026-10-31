"""Cases: what a creator does after a match. One case per (check, matched work).

A case records where the copy was found, on which platform and by whom, a status with a timeline
(open -> notice sent -> removed / licensed / ignored / closed), notes and a follow-up date, and
generates a takedown notice or licence offer with a PDF evidence pack (app/cases/notice.py).

Only the creator who ran the check can see its cases; booth guests cannot open any.
"""
import re
import uuid
from datetime import date, datetime
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, field_validator

from app.api.auth import get_current_user, normalize_email, utcnow
from app.api.register import iso_utc
from app.cases.notice import NOTICE_TYPES, PLATFORMS, Complainant, build_evidence_pack, build_notice
from app.db import get_db
from app import storage

router = APIRouter()

STATUSES = ("open", "notice_sent", "removed", "licensed", "ignored", "closed")
STATUS_TEXT = {
    "open": "Case reopened", "notice_sent": "Notice sent", "removed": "Copy removed",
    "licensed": "Use licensed", "ignored": "No response", "closed": "Case closed",
}
URL_RE = re.compile(r"^https?://\S+$", re.IGNORECASE)
_EVIDENCE_GRADE = {"TIER1": "evidence", "TIER2": "evidence"}


class CaseCreate(BaseModel):
    check_id: str
    work_id: str


class CaseUpdate(BaseModel):
    status: Optional[Literal[STATUSES]] = None
    found_url: Optional[str] = None
    platform: Optional[str] = None
    infringer: Optional[str] = None
    notes: Optional[str] = None
    follow_up_on: Optional[date] = None
    clear_follow_up: bool = False
    status_note: Optional[str] = None  # added to the timeline entry for a status change, e.g. "via Instagram form"

    @field_validator("found_url")
    @classmethod
    def _url(cls, v):
        if v is None or v.strip() == "":
            return v
        v = v.strip()
        if len(v) > 2000 or not URL_RE.match(v):
            raise ValueError("Enter the full link to the copy, starting with http:// or https://")
        return v

    @field_validator("platform")
    @classmethod
    def _platform(cls, v):
        if v is not None and v not in PLATFORMS:
            raise ValueError("Unknown platform")
        return v

    @field_validator("infringer", "status_note")
    @classmethod
    def _short(cls, v):
        return None if v is None else v.strip()[:200]

    @field_validator("notes")
    @classmethod
    def _notes(cls, v):
        return None if v is None else v[:5000]


class NoteCreate(BaseModel):
    text: str

    @field_validator("text")
    @classmethod
    def _text(cls, v):
        v = v.strip()
        if not v:
            raise ValueError("Write a note first")
        return v[:2000]


class NoticeRequest(BaseModel):
    type: Literal[NOTICE_TYPES]
    name: str
    email: str
    address: str = ""
    phone: str = ""
    license_fee: str = ""
    payment_link: str = ""
    confirmed_review: bool = False

    @field_validator("name")
    @classmethod
    def _name(cls, v):
        v = " ".join(v.split())
        if not 2 <= len(v) <= 120:
            raise ValueError("Enter your full name")
        return v

    @field_validator("email")
    @classmethod
    def _email(cls, v):
        return normalize_email(v)

    @field_validator("address", "phone", "license_fee")
    @classmethod
    def _plain(cls, v):
        return v.strip()[:300]

    @field_validator("payment_link")
    @classmethod
    def _link(cls, v):
        v = v.strip()
        if v and (len(v) > 2000 or not URL_RE.match(v)):
            raise ValueError("The payment link must start with http:// or https://")
        return v


def _members_only(user: dict) -> None:
    if user.get("is_guest"):
        raise HTTPException(403, "Booth visitors can't open cases.")


def _event(kind: str, text: str) -> dict:
    return {"at": utcnow(), "kind": kind, "text": text}


def _claim_for(check: dict, work_id: str) -> Optional[dict]:
    return next((c for c in ((check.get("gate") or {}).get("claims") or []) if c["candidate_work_id"] == work_id), None)


async def _get_case(db, user: dict, case_id: str) -> dict:
    case = await db.cases.find_one({"id": case_id, "user_id": str(user["_id"])})
    if not case:
        raise HTTPException(404, "Case not found")
    return case


async def _context(db, case: dict) -> dict:
    """The case with what it is about: the work, the check, the gate's grade, changes and evidence."""
    check = await db.checks.find_one({"id": case["check_id"], "user_id": case["user_id"]})
    work = await db.works.find_one({"id": case["work_id"]}, {"embedding": 0, "ots_proof": 0})
    if not check or not work:
        raise HTTPException(410, "The check or the registered work behind this case no longer exists.")
    gate = check.get("gate") or {}
    claim = _claim_for(check, case["work_id"])
    same = gate.get("evidence_work_id") == case["work_id"]
    changes = gate.get("changes") if (gate.get("changes") or {}).get("work_id") == case["work_id"] else None
    return {
        "case": case, "work": work, "check": check, "claim": claim,
        "grade": _EVIDENCE_GRADE.get((claim or {}).get("classification"), "lead"),
        "changes": changes,
        "evidence_paths": {k: v.removeprefix("/uploads/") for k, v in (gate.get("evidence_urls") or {}).items()} if same else {},
    }


def _case_out(case: dict, work: Optional[dict] = None, ctx: Optional[dict] = None) -> dict:
    out = {
        "id": case["id"],
        "check_id": case["check_id"],
        "work_id": case["work_id"],
        "status": case["status"],
        "grade": case["grade"],
        "found_url": case.get("found_url"),
        "platform": case.get("platform"),
        "infringer": case.get("infringer"),
        "notes": case.get("notes") or "",
        "follow_up_on": case["follow_up_on"].isoformat()[:10] if case.get("follow_up_on") else None,
        "created_at": iso_utc(case["created_at"]),
        "updated_at": iso_utc(case["updated_at"]),
        "events": [{"at": iso_utc(e["at"]), "kind": e["kind"], "text": e["text"]} for e in case.get("events", [])],
    }
    if work:
        out["work"] = {"id": work["id"], "title": work["title"], "owner_name": work["owner_name"],
                       "registered_at": iso_utc(work["created_at"]), "image_url": storage.image_url(work.get("image_path"))}
    if ctx:
        check = ctx["check"]
        out["check"] = {"id": check["id"], "created_at": iso_utc(check["created_at"]),
                        "image_url": storage.image_url(check.get("image_path"))}
        out["claim"] = ctx["claim"]
        out["changes"] = ctx["changes"]
        out["evidence_urls"] = {k: storage.image_url(v) for k, v in ctx["evidence_paths"].items()}
    return out


@router.get("/cases/platforms")
async def list_platforms():
    return [{"id": k, "name": name, "send_to": send_to} for k, (name, send_to) in PLATFORMS.items()]


@router.post("/cases")
async def open_case(body: CaseCreate, db=Depends(get_db), user=Depends(get_current_user)):
    """Open a case for a match, or return the one already open for it."""
    _members_only(user)
    uid = str(user["_id"])
    existing = await db.cases.find_one({"user_id": uid, "check_id": body.check_id, "work_id": body.work_id})
    if existing:
        return _case_out(existing)
    check = await db.checks.find_one({"id": body.check_id, "user_id": uid})
    if not check or not any(r["work_id"] == body.work_id for r in check.get("results", [])):
        raise HTTPException(404, "That match isn't part of one of your checks.")
    claim = _claim_for(check, body.work_id)
    now = utcnow()
    case = {
        "id": str(uuid.uuid4()), "user_id": uid, "check_id": body.check_id, "work_id": body.work_id,
        "status": "open", "grade": _EVIDENCE_GRADE.get((claim or {}).get("classification"), "lead"),
        "found_url": None, "platform": None, "infringer": None, "notes": "", "follow_up_on": None,
        "created_at": now, "updated_at": now,
        "events": [_event("opened", "Case opened from a check")],
    }
    await db.cases.insert_one(case)
    return _case_out(case)


@router.get("/cases")
async def list_cases(db=Depends(get_db), user=Depends(get_current_user)):
    cases = [c async for c in db.cases.find({"user_id": str(user["_id"])}).sort("updated_at", -1).limit(200)]
    works = {w["id"]: w async for w in db.works.find({"id": {"$in": list({c["work_id"] for c in cases})}},
                                                      {"embedding": 0, "ots_proof": 0})}
    return [_case_out(c, works.get(c["work_id"])) for c in cases]


@router.get("/cases/{case_id}")
async def get_case(case_id: str, db=Depends(get_db), user=Depends(get_current_user)):
    case = await _get_case(db, user, case_id)
    ctx = await _context(db, case)
    return _case_out(case, ctx["work"], ctx)


@router.patch("/cases/{case_id}")
async def update_case(case_id: str, body: CaseUpdate, db=Depends(get_db), user=Depends(get_current_user)):
    case = await _get_case(db, user, case_id)
    changes = body.model_dump(exclude_unset=True, exclude={"clear_follow_up", "status_note"})
    update: dict = {}
    events = []
    for field in ("found_url", "platform", "infringer", "notes"):
        if field in changes:
            update[field] = changes[field] or (None if field != "notes" else "")
    if body.follow_up_on is not None:
        update["follow_up_on"] = datetime(body.follow_up_on.year, body.follow_up_on.month, body.follow_up_on.day)
    if body.clear_follow_up:
        update["follow_up_on"] = None
    if body.status and body.status != case["status"]:
        update["status"] = body.status
        text = STATUS_TEXT[body.status] + (f" ({body.status_note})" if body.status_note else "")
        events.append(_event("status", text))
    if not update:
        return _case_out(case)
    update["updated_at"] = utcnow()
    ops = {"$set": update}
    if events:
        ops["$push"] = {"events": {"$each": events}}
    await db.cases.update_one({"id": case_id}, ops)
    return _case_out(await _get_case(db, user, case_id))


@router.post("/cases/{case_id}/notes")
async def add_note(case_id: str, body: NoteCreate, db=Depends(get_db), user=Depends(get_current_user)):
    await _get_case(db, user, case_id)
    await db.cases.update_one({"id": case_id}, {"$push": {"events": _event("note", body.text)},
                                                "$set": {"updated_at": utcnow()}})
    return _case_out(await _get_case(db, user, case_id))


@router.delete("/cases/{case_id}")
async def delete_case(case_id: str, db=Depends(get_db), user=Depends(get_current_user)):
    await _get_case(db, user, case_id)
    await db.cases.delete_one({"id": case_id})
    return {"ok": True}


async def _notice(db, user, case_id: str, body: NoticeRequest) -> tuple:
    case = await _get_case(db, user, case_id)
    ctx = await _context(db, case)
    if ctx["grade"] != "evidence" and not body.confirmed_review:
        raise HTTPException(409, "This match is a lead, not proof. Compare the two images yourself and confirm "
                                 "that before sending a notice.")
    notice = build_notice(body.type, ctx, Complainant(body.name, body.email, body.address, body.phone),
                          body.license_fee, body.payment_link)
    return notice, ctx


@router.post("/cases/{case_id}/notice")
async def notice_text(case_id: str, body: NoticeRequest, db=Depends(get_db), user=Depends(get_current_user)):
    notice, _ = await _notice(db, user, case_id, body)
    return notice


@router.post("/cases/{case_id}/notice.pdf")
async def notice_pdf(case_id: str, body: NoticeRequest, db=Depends(get_db), user=Depends(get_current_user)):
    notice, ctx = await _notice(db, user, case_id, body)
    return Response(build_evidence_pack(notice, ctx), media_type="application/pdf",
                    headers={"Content-Disposition": f'attachment; filename="evidence-pack-{case_id[:8]}.pdf"'})


async def ensure_case_indexes(db) -> None:
    await db.cases.create_index([("user_id", 1), ("updated_at", -1)])
    await db.cases.create_index([("user_id", 1), ("check_id", 1), ("work_id", 1)], unique=True)
