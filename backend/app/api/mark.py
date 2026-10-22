"""Mark ALM (Action Large Language Model) Copilot Router.

Provides an agentic AI assistant powered by local Ollama (qwen2.5:1.5b).
Answers provenance and technical questions and emits structured action payloads
for client-side UI navigation, interactive spotlights, 3D twin modes, and modals.
"""
import json
import logging
import re
from collections import OrderedDict
from typing import Optional, Dict, Any
import httpx
from fastapi import APIRouter
from pydantic import BaseModel

from app.config import settings

logger = logging.getLogger("uvicorn.error")

router = APIRouter()

# Kept deliberately short: the prompt is re-read on every call, so every token here is latency.
SYSTEM_PROMPT = """You are Mark, the copilot of a digital-asset provenance app (register originals, check suspected copies, 3D pipeline twin).
Pipeline: pHash + OpenCLIP/DINOv2 retrieval, SIFT+MAGSAC geometric verification, pixel comparison, SHA-256 hash chain, Bitcoin OpenTimestamps, PDF certificate.
Reply with ONE JSON object only: {"reply": "<1-2 short sentences>", "action": "<ACTION>", "target": "<route or null>", "tech": "<tech or null>"}
ACTION is one of: NAVIGATE (target one of /, /how-it-works, /check, /works/new, /works, /discover), START_TUTORIAL (target register_flow|check_flow|twin_tour), OPEN_SIMULATOR, EXPLODE_PIXELS, EXPLAIN_TECH (tech one of phash|openclip|dinov2|sift|c2pa|anchor), FOCUS_REGISTER, NONE.
Use NONE for plain questions."""


class MarkChatRequest(BaseModel):
    message: str
    current_path: Optional[str] = "/"
    context: Optional[Dict[str, Any]] = None


class MarkChatResponse(BaseModel):
    reply: str
    action: str = "NONE"
    target: Optional[str] = None
    tech: Optional[str] = None


def _fallback_intent_matcher(message: str, current_path: str = "/") -> MarkChatResponse:
    """Deterministic fallback matcher if Ollama is warming up, downloading, or unreachable."""
    msg = message.lower().strip()

    # Explode pixels / 3D twin simulator
    if any(k in msg for k in ["explode", "pixels", "pixel explode", "3d explode"]):
        return MarkChatResponse(
            reply="Triggering the 3D pixel explosion visualizer! Watch how DCT frequencies deconstruct into spatial coordinates.",
            action="EXPLODE_PIXELS",
            target="/how-it-works",
        )

    # Tech explanations
    if "phash" in msg or "perceptual hash" in msg:
        return MarkChatResponse(
            reply="pHash computes a 64-bit DCT fingerprint of your image that survives compression, resizing, and watermarks.",
            action="EXPLAIN_TECH",
            tech="phash",
            target="/how-it-works",
        )
    if "openclip" in msg or "clip" in msg or "semantic" in msg:
        return MarkChatResponse(
            reply="OpenCLIP maps images into a 512-dimensional semantic vector space to detect stylistic derivatives and deep alterations.",
            action="EXPLAIN_TECH",
            tech="openclip",
            target="/how-it-works",
        )
    if "dino" in msg or "dinov2" in msg:
        return MarkChatResponse(
            reply="DINOv2 uses self-supervised vision transformer patch tokens to capture micro-textures and dense visual structures.",
            action="EXPLAIN_TECH",
            tech="dinov2",
            target="/how-it-works",
        )
    if "sift" in msg or "magsac" in msg or "homography" in msg:
        return MarkChatResponse(
            reply="SIFT extracts scale-invariant keypoints while MAGSAC++ fits a 3x3 homography matrix to detect crops, rotations, and AI inpainting.",
            action="EXPLAIN_TECH",
            tech="sift",
            target="/how-it-works",
        )
    if "c2pa" in msg or "credential" in msg:
        return MarkChatResponse(
            reply="C2PA binds cryptographic author claims directly into the image file headers so authorship is tamper-evident.",
            action="EXPLAIN_TECH",
            tech="c2pa",
            target="/how-it-works",
        )
    if "bitcoin" in msg or "anchor" in msg or "opentimestamp" in msg or "ots" in msg or "blockchain" in msg:
        return MarkChatResponse(
            reply="OpenTimestamps merges your asset's SHA-256 hash into a Merkle tree anchored directly into the Bitcoin blockchain.",
            action="EXPLAIN_TECH",
            tech="anchor",
            target="/how-it-works",
        )

    # Register original work
    if any(k in msg for k in ["register", "upload", "protect my work", "original", "new work"]):
        return MarkChatResponse(
            reply="Taking you to the registration portal! Drop your high-res original image to mint your cryptographic provenance certificate.",
            action="FOCUS_REGISTER",
            target="/works/new",
        )

    # Infringement check
    if any(k in msg for k in ["check", "infring", "scan", "stolen", "copied", "verify", "inspect"]):
        return MarkChatResponse(
            reply="Opening the forensic scanner! Upload any suspect image to run our two-tier pHash and SIFT-MAGSAC++ verification pipeline.",
            action="NAVIGATE",
            target="/check",
        )

    # How it works / 3D twin
    if any(k in msg for k in ["how it works", "twin", "simulator", "pipeline", "3d", "digital twin"]):
        return MarkChatResponse(
            reply="Welcome to our 3D Digital Twin pipeline visualizer. You can orbit in 3D, explode pixels, and inspect every mathematical step.",
            action="OPEN_SIMULATOR",
            target="/how-it-works",
        )

    # Tutorial / Onboarding
    if any(k in msg for k in ["tutorial", "guide", "tour", "walk me through", "help me"]):
        return MarkChatResponse(
            reply="Starting an interactive onboarding tour right now! Follow the highlighted spotlight to explore our key features.",
            action="START_TUTORIAL",
            target="register_flow",
        )

    # Dashboard / My Works
    if any(k in msg for k in ["my work", "dashboard", "certificates", "portfolio"]):
        return MarkChatResponse(
            reply="Navigating to your registered works dashboard where all your certificates and OpenTimestamps proofs are cataloged.",
            action="NAVIGATE",
            target="/works",
        )

    # Discover / Gallery
    if any(k in msg for k in ["discover", "gallery", "showcase", "explore"]):
        return MarkChatResponse(
            reply="Opening the public provenance showcase! Here you can see verified protected works registered across the network.",
            action="NAVIGATE",
            target="/discover",
        )

    # Default general reply
    return MarkChatResponse(
        reply="I'm Mark, your provenance AI copilot! You can ask me how our computer vision pipeline works, tell me to register a work, or explore the 3D twin.",
        action="NONE",
    )


VALID_ACTIONS = {"NAVIGATE", "START_TUTORIAL", "OPEN_SIMULATOR", "EXPLODE_PIXELS", "EXPLAIN_TECH", "FOCUS_REGISTER", "NONE"}
KEEP_ALIVE = "60m"          # keep the model resident; the default 5 min unloads it and costs a cold start
LLM_OPTIONS = {"temperature": 0, "num_predict": 90, "num_ctx": 1024}

_client: Optional[httpx.AsyncClient] = None
_cache: "OrderedDict[tuple, MarkChatResponse]" = OrderedDict()


def _http() -> httpx.AsyncClient:
    """One pooled client: opening a new connection per question added measurable delay."""
    global _client
    if _client is None:
        _client = httpx.AsyncClient(base_url=settings.OLLAMA_HOST.rstrip("/"), timeout=httpx.Timeout(5.0, connect=0.5))
    return _client


def _rule_intent(message: str, current_path: str) -> Optional[MarkChatResponse]:
    """Instant answer for the clear commands the app supports; None means 'open-ended, ask the model'."""
    res = _fallback_intent_matcher(message, current_path)
    return None if res.action == "NONE" else res


async def query_ollama(message: str, current_path: str = "/") -> Optional[MarkChatResponse]:
    """Ask the local model for an open-ended question, with JSON-constrained output."""
    try:
        resp = await _http().post("/api/chat", json={
            "model": settings.OLLAMA_MODEL,
            "messages": [{"role": "system", "content": SYSTEM_PROMPT},
                         {"role": "user", "content": f"[page {current_path}] {message}"}],
            "format": "json", "stream": False, "keep_alive": KEEP_ALIVE, "options": LLM_OPTIONS,
        })
        if resp.status_code != 200:
            return None
        content = resp.json().get("message", {}).get("content", "").strip()
        content = re.sub(r"^```(?:json)?\s*", "", content)
        content = re.sub(r"\s*```$", "", content)
        parsed = json.loads(content)
        action = str(parsed.get("action", "NONE")).upper()
        if action not in VALID_ACTIONS:
            action = "NONE"
        return MarkChatResponse(reply=str(parsed.get("reply", "")).strip() or "I've processed your request.",
                                action=action, target=parsed.get("target"), tech=parsed.get("tech"))
    except Exception as exc:
        logger.warning("Ollama call failed or timed out (%s). Using deterministic fallback matcher.", exc)
    return None


async def warm_up() -> None:
    """Load the model into memory and prime the prompt cache so the first real question is fast."""
    try:
        await _http().post("/api/chat", json={
            "model": settings.OLLAMA_MODEL,
            "messages": [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": "[page /] hello"}],
            "format": "json", "stream": False, "keep_alive": KEEP_ALIVE, "options": {**LLM_OPTIONS, "num_predict": 8},
        }, timeout=60.0)
        logger.info("Mark model %s warmed up.", settings.OLLAMA_MODEL)
    except Exception as exc:
        logger.info("Mark warm-up skipped (%s).", exc)


@router.post("/chat", response_model=MarkChatResponse)
async def mark_chat(req: MarkChatRequest):
    """Clear commands answer instantly from rules; open questions go to the local model, with rules as the safety net."""
    path = req.current_path or "/"
    key = (re.sub(r"\s+", " ", req.message.lower().strip()), path)
    if key in _cache:
        _cache.move_to_end(key)
        return _cache[key]
    res = _rule_intent(req.message, path)
    if res is None:
        res = await query_ollama(req.message, path) or _fallback_intent_matcher(req.message, path)
    _cache[key] = res
    if len(_cache) > 128:
        _cache.popitem(last=False)
    return res
