"""Discover feed: a library of sample works shown on the dashboard.

Temporary showcase content: it serves the distractor images (the background corpus used to test the
registry at scale) as a Pinterest-style feed. Titles and creator labels are generated placeholders, not
real attributions, and the UI says so. Duplicate files are served once.
"""
import hashlib
import os
import random
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from PIL import Image

from app.api.auth import get_current_user
from app.config import settings

router = APIRouter()

_ITEMS: Optional[List[dict]] = None


def showcase_dir() -> str:
    if settings.SHOWCASE_DIR:
        return settings.SHOWCASE_DIR
    repo_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    return os.path.join(repo_root, "dataset", "distractors")


def _load_items() -> List[dict]:
    global _ITEMS
    if _ITEMS is not None:
        return _ITEMS
    folder = showcase_dir()
    items, seen = [], set()
    if os.path.isdir(folder):
        for name in sorted(os.listdir(folder)):
            if os.path.splitext(name)[1].lower() not in (".jpg", ".jpeg", ".png", ".webp"):
                continue
            path = os.path.join(folder, name)
            digest = hashlib.sha1(open(path, "rb").read()).hexdigest()
            if digest in seen:
                continue
            seen.add(digest)
            try:
                with Image.open(path) as im:
                    w, h = im.size
            except Exception:
                continue
            stem = os.path.splitext(name)[0]
            num = int("".join(c for c in stem if c.isdigit()) or "0")
            items.append({"id": stem, "title": f"Sample work {num:04d}", "creator": f"Creator {1 + (num * 7) % 48:02d}",
                          "image_url": f"/showcase/{name}", "width": w, "height": h})
        random.Random(11).shuffle(items)  # one stable order, mixed so neighbouring works differ
    _ITEMS = items
    return items


def reset_cache() -> None:
    global _ITEMS
    _ITEMS = None


@router.get("/discover")
async def discover(offset: int = Query(0, ge=0), limit: int = Query(40, ge=1, le=100), _user=Depends(get_current_user)):
    items = _load_items()
    page = items[offset:offset + limit]
    nxt = offset + limit if offset + limit < len(items) else None
    return {"items": page, "total": len(items), "offset": offset, "next_offset": nxt, "sample": True}
