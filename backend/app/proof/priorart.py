"""Prior-art check: is this image already on the web?

A registration only proves the file existed at registration time. If the same picture was already
online, someone else may have published it first, so the creator is shown every page where a search
engine finds it and marks the ones that are theirs (their own portfolio or post). Anything left over
is a warning on the proof ladder.

The check sends the image to an outside search provider, so it only runs when the creator asks.
Providers (PRIOR_ART_PROVIDER):
  google_vision   Google Cloud Vision "web detection" (PRIOR_ART_API_KEY = an API key)
Search engines do not say when a page first showed an image, so this reports where it is found,
not who was first.
"""
import base64
from typing import Optional

import httpx

from app.api.auth import utcnow
from app.config import settings

VISION_URL = "https://vision.googleapis.com/v1/images:annotate"
MAX_RESULTS = 20


class PriorArtUnavailable(RuntimeError):
    pass


def available() -> bool:
    return settings.PRIOR_ART_PROVIDER == "google_vision" and bool(settings.PRIOR_ART_API_KEY)


def _vision_matches(resp: dict) -> list:
    web = ((resp.get("responses") or [{}])[0]).get("webDetection") or {}
    pages = []
    for page in web.get("pagesWithMatchingImages") or []:
        url = page.get("url")
        if not url:
            continue
        kind = "full" if page.get("fullMatchingImages") else "partial"
        pages.append({"url": url, "title": page.get("pageTitle") or None, "kind": kind})
    # Exact copies first: they are what a dispute would hinge on
    return sorted(pages, key=lambda p: p["kind"] != "full")[:MAX_RESULTS]


async def search_web(image_bytes: bytes, client: Optional[httpx.AsyncClient] = None) -> dict:
    """{"provider", "checked_at", "matches": [{"url", "title", "kind": "full"|"partial", "mine": False}]}."""
    if not available():
        raise PriorArtUnavailable("Web search isn't set up on this server (PRIOR_ART_PROVIDER and PRIOR_ART_API_KEY).")
    body = {"requests": [{"image": {"content": base64.b64encode(image_bytes).decode()},
                          "features": [{"type": "WEB_DETECTION", "maxResults": MAX_RESULTS}]}]}
    owns_client = client is None
    client = client or httpx.AsyncClient(timeout=30)
    try:
        r = await client.post(VISION_URL, params={"key": settings.PRIOR_ART_API_KEY}, json=body)
        r.raise_for_status()
        data = r.json()
    except (httpx.HTTPError, ValueError) as e:
        raise PriorArtUnavailable(f"The web search provider did not answer ({type(e).__name__}).") from e
    finally:
        if owns_client:
            await client.aclose()
    if (data.get("responses") or [{}])[0].get("error"):
        raise PriorArtUnavailable("The web search provider rejected the request.")
    return {"provider": "google_vision", "checked_at": utcnow(),
            "matches": [{**m, "mine": False} for m in _vision_matches(data)]}
