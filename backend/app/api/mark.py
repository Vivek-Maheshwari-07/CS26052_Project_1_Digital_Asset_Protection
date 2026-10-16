"""Mark ALM (Action Large Language Model) Copilot Router.

Provides an agentic AI assistant powered by local Ollama (qwen2.5:1.5b).
Answers provenance and technical questions and emits structured action payloads
for client-side UI navigation, interactive spotlights, 3D twin modes, and modals.
"""
import json
import logging
import re
from typing import Optional, Dict, Any, List
import httpx
from fastapi import APIRouter
from pydantic import BaseModel

from app.config import settings

logger = logging.getLogger("uvicorn.error")

router = APIRouter()

SYSTEM_PROMPT = """You are Mark, an intelligent AI Action Copilot embedded in the Digital Asset Provenance & Forensic Protection platform.
Your objective is to help creators, photographers, and forensic researchers understand the system, navigate the app, and run platform actions.

SYSTEM ARCHITECTURE & CAPABILITIES:
- Digital Asset Protection platform for artists, photographers, and creators.
- Multi-tier forensic computer vision pipeline:
  * Tier 1 (Fast Screening Gate): 64-bit DCT perceptual hash (pHash) hamming distance + OpenCLIP ViT-B/32 dense semantic embeddings.
  * Tier 2 (Geometric Verification): SIFT keypoint detection + MAGSAC++ robust homography estimation (4000 iterations, 3.0px reprojection threshold) to pinpoint crops, rotations, flips, perspective warps, and AI inpainting/inpainting masks.
- Provenance Proofs:
  * Cryptographic SHA-256 asset certificates (PDF format with embedded verification QR code).
  * Bitcoin-anchored calendar proofs via OpenTimestamps (immutable timestamp proof without gas fees).
  * C2PA Content Credentials metadata manifest injection.
- Application Navigation:
  * "/" : Landing page with product overview and architecture.
  * "/how-it-works" : Interactive 3D Digital Twin visualizer of the pipeline with camera orbit, pixel explosion, and forensic comparison.
  * "/check" : Forensic scanner where users upload an image to check for infringement or unauthorized edits.
  * "/works/new" : Register a new original digital asset with copyright provenance.
  * "/works" : User's registered works dashboard with certificates.
  * "/discover" : Public gallery of registered artworks.
  * "/login" : Sign in / registration.

ACTION WHITELIST (You MUST pick one):
- "NAVIGATE": change page. Target MUST be one of: ["/", "/how-it-works", "/check", "/works/new", "/works", "/discover", "/login"]
- "START_TUTORIAL": guided spotlight tour. Target MUST be one of: ["register_flow", "check_flow", "twin_tour"]
- "OPEN_SIMULATOR": open 3D pipeline simulator on /how-it-works.
- "EXPLODE_PIXELS": trigger the 3D pixel explosion visualizer on /how-it-works.
- "EXPLAIN_TECH": open deep-dive modal for a specific tech. Tech MUST be one of: ["phash", "openclip", "dinov2", "sift", "c2pa", "anchor"]
- "FOCUS_REGISTER": navigate to /works/new and highlight the upload dropzone.
- "NONE": pure conversational reply when no UI action is required.

STRICT JSON OUTPUT REQUIREMENT:
You MUST respond with a single valid JSON object and nothing else. No markdown wrapping (do not use ```json), no preamble, no trailing commentary.
Schema:
{
  "reply": "Spoken answer, friendly and concise (1-3 sentences maximum).",
  "action": "NAVIGATE" | "START_TUTORIAL" | "OPEN_SIMULATOR" | "EXPLODE_PIXELS" | "EXPLAIN_TECH" | "FOCUS_REGISTER" | "NONE",
  "target": "/route or identifier or null",
  "tech": "phash/openclip/dinov2/sift/c2pa/anchor or null"
}
"""


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


async def query_ollama(message: str, current_path: str = "/") -> Optional[MarkChatResponse]:
    """Send structured prompt to local Ollama instance with JSON grammar enforcement."""
    prompt = f"User is on page: {current_path}.\nUser message: {message}"
    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.post(
                f"{settings.OLLAMA_HOST.rstrip('/')}/api/chat",
                json={
                    "model": settings.OLLAMA_MODEL,
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": prompt},
                    ],
                    "format": "json",
                    "stream": False,
                    "options": {
                        "temperature": 0.2,
                        "num_predict": 180,
                    },
                },
            )

            if resp.status_code == 200:
                data = resp.json()
                content = data.get("message", {}).get("content", "").strip()

                # Clean any stray markdown fences if model outputs them despite prompt
                content = re.sub(r"^```(?:json)?\s*", "", content)
                content = re.sub(r"\s*```$", "", content)

                parsed = json.loads(content)
                reply = str(parsed.get("reply", "")).strip()
                action = str(parsed.get("action", "NONE")).upper()
                target = parsed.get("target")
                tech = parsed.get("tech")

                valid_actions = {
                    "NAVIGATE",
                    "START_TUTORIAL",
                    "OPEN_SIMULATOR",
                    "EXPLODE_PIXELS",
                    "EXPLAIN_TECH",
                    "FOCUS_REGISTER",
                    "NONE",
                }
                if action not in valid_actions:
                    action = "NONE"

                return MarkChatResponse(
                    reply=reply or "I've processed your request.",
                    action=action,
                    target=target,
                    tech=tech,
                )

    except Exception as exc:
        logger.warning(
            "Ollama call failed or timed out (%s). Using deterministic fallback matcher.",
            exc,
        )
    return None


@router.post("/chat", response_model=MarkChatResponse)
async def mark_chat(req: MarkChatRequest):
    """Process user message using local Ollama model (qwen2.5:1.5b), falling back gracefully if offline."""
    llm_res = await query_ollama(req.message, req.current_path or "/")
    if llm_res:
        return llm_res

    # Fallback to local rule matcher
    return _fallback_intent_matcher(req.message, req.current_path or "/")
