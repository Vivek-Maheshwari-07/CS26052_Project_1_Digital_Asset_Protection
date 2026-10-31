"""Delete every booth guest and everything they uploaded. Run it at the end of each booth day:

    python -m app.booth_reset

Removes guest accounts, their checks, the suspect images they uploaded and the evidence images
generated for those checks. Registered works (the booth gallery included) are never touched.
"""
import asyncio
import shutil
from pathlib import Path

from app import storage
from app.gate.evidence import evidence_root


async def reset(db) -> dict:
    guests = [str(u["_id"]) async for u in db.users.find({"is_guest": True}, {"_id": 1})]
    files = 0
    async for check in db.checks.find({"user_id": {"$in": guests}}, {"id": 1, "image_path": 1}):
        if check.get("image_path"):
            path = Path(storage.upload_dir()) / check["image_path"]
            if path.is_file():
                path.unlink()
                files += 1
        shutil.rmtree(evidence_root() / check["id"], ignore_errors=True)
    checks = (await db.checks.delete_many({"user_id": {"$in": guests}})).deleted_count
    users = (await db.users.delete_many({"is_guest": True})).deleted_count
    return {"guests": users, "checks": checks, "images": files}


if __name__ == "__main__":
    from app.db import db as _db
    print("Booth reset:", asyncio.run(reset(_db)))
