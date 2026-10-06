import asyncio

import numpy as np
from PIL import Image

from app.config import settings
from app.fingerprint.phash import compute_phash, is_low_detail
from app.fingerprint.embedding import compute_embedding, compute_embedding_async

PIPELINE_VERSION = "phash+clip-vitb32-centercrop-v2"  # bump when hashing/embedding logic changes


def fingerprint_sync(image: Image.Image) -> dict:
    """Fingerprint an already-normalized (ingestion.normalize) image. For offline/batch use."""
    return {
        "phash": compute_phash(image),
        "embedding": compute_embedding(image),
        "low_detail": is_low_detail(image),
    }


async def fingerprint(image: Image.Image) -> dict:
    """Async version for API handlers: the embedding call is semaphore-gated
    so concurrent requests don't all hit the CPU-bound model at once."""
    phash_str, low_detail = await asyncio.gather(
        asyncio.to_thread(compute_phash, image),
        asyncio.to_thread(is_low_detail, image),
    )
    embedding = await compute_embedding_async(image)
    return {"phash": phash_str, "embedding": embedding, "low_detail": low_detail}


def combined_confidence(phash_sim, embedding_sim):
    """Probability that the pair is the same work (copy or edit of it).

    A logistic model over the two similarities. The weights are fitted on
    labelled edited/unrelated pairs by eval/evaluate.py, which prints the
    values to put in settings. Works on floats or numpy arrays.
    """
    z = (settings.FUSION_W_EMBEDDING * np.asarray(embedding_sim)
         + settings.FUSION_W_PHASH * np.asarray(phash_sim)
         + settings.FUSION_BIAS)
    return 1.0 / (1.0 + np.exp(-z))


def verdict_for(confidence: float) -> str:
    if confidence >= settings.MATCH_LIKELY:
        return "likely_match"
    if confidence >= settings.MATCH_POSSIBLE:
        return "possible_match"
    return "no_match"


def combined_verdict(phash_sim: float, embedding_sim: float) -> dict:
    confidence = float(combined_confidence(phash_sim, embedding_sim))
    return {
        "phash_score": round(float(phash_sim), 4),
        "embedding_score": round(float(embedding_sim), 4),
        "confidence": round(confidence, 4),
        "verdict": verdict_for(confidence)
    }
