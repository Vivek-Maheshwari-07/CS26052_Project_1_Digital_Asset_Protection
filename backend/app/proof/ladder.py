"""The proof ladder: how strongly a registration points to its creator, step by step.

A registration proves that a file existed at a time, not who made it: anyone can register a picture
they found. The ladder says honestly what else backs the claim:

  1. Registered      this exact file existed by this time (hash chain, Bitcoin)          always
  2. Earliest known  a web search found no earlier copy that isn't the creator's own     prior-art check
  3. Source evidence the creator holds a layered source file, a larger original or a     source files, C2PA
                     RAW file that matches, or the upload carries valid Content Credentials
  4. Verified creator the account controls a public profile people already know          profile links

Steps 2-4 are independent; the level counts how many are done. Warnings (copies online that the
creator has not claimed, Content Credentials that declare AI or no longer match) are shown whatever
the level.
"""
from typing import Optional
from urllib.parse import urlparse

from app.api.register import iso_utc

LEVELS = {1: "Registered", 2: "Supported", 3: "Strong", 4: "Very strong"}


def _date(dt) -> str:
    return iso_utc(dt) if dt else None


def _registered(work: dict) -> dict:
    if work.get("anchor_status") == "confirmed" and work.get("ots_block_checked"):
        detail = "This exact file existed by the time it was registered, and Bitcoin proves the record is no newer."
    else:
        detail = "This exact file existed by the time it was registered. The Bitcoin timestamp is still confirming."
    return {"key": "registered", "title": "Registered and timestamped", "status": "done", "detail": detail}


def _earliest(work: dict, web_available: bool, public: bool) -> dict:
    step = {"key": "earliest", "title": "No earlier copy online"}
    pa = work.get("prior_art")
    if not pa:
        if public:
            detail = "The creator hasn't run a web search for earlier copies of this image."
        elif web_available:
            detail = ("Not checked yet. A reverse image search shows whether this picture was already online before it "
                      "was registered.")
        else:
            detail = "Not checked: web search isn't set up on this server."
        return {**step, "status": "todo", "detail": detail}
    others = [m for m in pa["matches"] if not m.get("mine")]
    mine = len(pa["matches"]) - len(others)
    step["checked_at"] = _date(pa["checked_at"])
    if not others:
        detail = "A web search found no other page with this image" + (f" (only {mine} page{'s' if mine != 1 else ''} the creator marked as theirs)." if mine else ".")
        return {**step, "status": "done", "detail": detail}
    return {**step, "status": "warning",
            "detail": f"This image is also on {len(others)} page{'s' if len(others) != 1 else ''} the creator hasn't marked as "
                      "theirs. If one of them published it first, this registration does not show who made it."}


def _source(work: dict, files: list, public: bool) -> dict:
    step = {"key": "source", "title": "Creator's source evidence"}
    evidence = [f["detail"] for f in files if f.get("strong")]
    c2pa = (work.get("origin") or {}).get("c2pa")
    if c2pa and c2pa.get("verdict") == "valid" and not c2pa.get("ai_declared"):
        made_with = f" ({c2pa['claim_generator']})" if c2pa.get("claim_generator") else ""
        evidence.append(f"The registered file carries valid Content Credentials{made_with}")
    camera = (work.get("origin") or {}).get("camera")
    supporting = []
    if camera and not public:
        name = " ".join(x for x in (camera.get("make"), camera.get("model")) if x)
        supporting.append(f"Camera data in the file{': ' + name if name else ''} (easy to edit, so it supports but does not prove)")
    if evidence:
        return {**step, "status": "done", "detail": "; ".join(evidence) + ".", "supporting": supporting}
    if public:
        return {**step, "status": "todo", "supporting": supporting,
                "detail": "No source file, larger original or Content Credentials have been added."}
    return {**step, "status": "todo", "supporting": supporting,
            "detail": "Add something that usually only the creator has: the layered source file (PSD, Krita, Procreate), "
                      "a larger original, or the camera RAW file."}


def _identity(links: list, public: bool) -> dict:
    step = {"key": "identity", "title": "Verified creator profile"}
    verified = [link for link in links if link.get("verified")]
    if verified:
        names = ", ".join(urlparse(link["url"]).netloc + urlparse(link["url"]).path.rstrip("/") for link in verified)
        return {**step, "status": "done", "detail": f"The account that registered this work controls {names}.",
                "links": [link["url"] for link in verified]}
    if public:
        return {**step, "status": "todo", "detail": "The account that registered this work hasn't verified a public profile."}
    return {**step, "status": "todo",
            "detail": "Link a public page people already know you by (portfolio, website) and prove you control it."}


def build_ladder(work: dict, files: list, links: list, web_available: bool = False, public: bool = False) -> dict:
    steps = [_registered(work), _earliest(work, web_available, public), _source(work, files, public), _identity(links, public)]
    level = 1 + sum(s["status"] == "done" for s in steps[1:])
    warnings = []
    if steps[1]["status"] == "warning":
        warnings.append("Copies of this image are online on pages the creator hasn't claimed.")
    c2pa = (work.get("origin") or {}).get("c2pa") or {}
    if c2pa.get("ai_declared"):
        warnings.append("The file's Content Credentials declare it as AI-generated.")
    if c2pa.get("verdict") in ("tampered", "credential_invalid"):
        warnings.append("The file has Content Credentials, but they no longer match it or their certificate is invalid.")
    return {"level": level, "label": LEVELS[level], "steps": steps, "warnings": warnings}


def public_file(f: dict) -> dict:
    """What the public record shows about a source file: never its name."""
    return {"kind": f["kind"], "detail": f["detail"], "strong": f["strong"], "sha256": f["sha256"],
            "added_at": _date(f["created_at"]), "anchor_status": f.get("anchor_status")}


def owner_file(f: dict) -> dict:
    return {**public_file(f), "id": f["id"], "filename": f.get("filename"), "size": f["size"],
            "width": f.get("width"), "height": f.get("height")}


def owner_prior_art(work: dict) -> Optional[dict]:
    pa = work.get("prior_art")
    return None if not pa else {"provider": pa["provider"], "checked_at": _date(pa["checked_at"]), "matches": pa["matches"]}
