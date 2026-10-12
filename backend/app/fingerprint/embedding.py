import asyncio
import threading

import numpy as np
import torch
from PIL import Image

# CLIP's own preprocessing (resize-short-side then center-crop) is kept as-is:
# tested against pad-to-square on real extreme-aspect-ratio photos (a 558x1280
# portrait) and padding collapsed true-positive similarity by 0.17-0.43 because
# the subject shrinks to a sliver of the 224x224 frame. Center-crop loses the
# edges instead, which pHash (run on the uncropped original) partially covers.
#
# The model loads on first use (not at import) so tests and tools that never embed don't pay
# for it or need the weights, and is shared with the gate (app.gate.retrieve).
_model = None
_preprocess = None
_load_lock = threading.Lock()

# Inference isn't thread-safe to hammer concurrently on CPU, so API handlers
# share this semaphore rather than letting FastAPI run requests in parallel
# straight into the same model.
_inference_semaphore = asyncio.Semaphore(2)


def get_model():
    """(model, preprocess), loading OpenCLIP ViT-B/32 (laion2b_s34b_b79k) on first call."""
    global _model, _preprocess
    if _model is None:
        with _load_lock:
            if _model is None:
                import open_clip
                model, _, preprocess = open_clip.create_model_and_transforms("ViT-B-32", pretrained="laion2b_s34b_b79k")
                model.eval()
                _model, _preprocess = model, preprocess
    return _model, _preprocess


def compute_embeddings(images: list[Image.Image]) -> np.ndarray:
    """L2-normalised CLIP embeddings for a batch of images, shape (n, 512)."""
    model, preprocess = get_model()
    batch = torch.stack([preprocess(im) for im in images])
    with torch.no_grad():
        feats = model.encode_image(batch)
        feats /= feats.norm(dim=-1, keepdim=True)
    return feats.float().cpu().numpy()


def compute_embedding(image: Image.Image) -> list[float]:
    return compute_embeddings([image])[0].tolist()


async def compute_embedding_async(image: Image.Image) -> list[float]:
    async with _inference_semaphore:
        return await asyncio.to_thread(compute_embedding, image)


def embedding_similarity(vec_a: list[float], vec_b: list[float]) -> float:
    v1 = np.array(vec_a)
    v2 = np.array(vec_b)
    # Both vectors are already L2 normalized, so cosine sim is just dot product
    sim = np.dot(v1, v2)
    return float(sim)
