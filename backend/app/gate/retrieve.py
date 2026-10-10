"""G1: Retrieval from CLIP and DINOv2 indices."""
import asyncio
import logging
from dataclasses import dataclass
from typing import List, Tuple

import numpy as np
import open_clip
import torch
from PIL import Image, ImageOps
from transformers import AutoImageProcessor, AutoModel

from app.gate.settings import settings

logger = logging.getLogger(__name__)


# -----------------------------------------------------------------------------
# Model Loaders (cached globally)
# -----------------------------------------------------------------------------
_clip_model = None
_clip_preprocess = None
_dino_model = None
_dino_processor = None
_inference_semaphore = asyncio.Semaphore(2)


def get_clip_model():
    global _clip_model, _clip_preprocess
    if _clip_model is None:
        _clip_model, _, _clip_preprocess = open_clip.create_model_and_transforms('ViT-B-32', pretrained='laion2b_s34b_b79k')
        _clip_model.eval()
    return _clip_model, _clip_preprocess


def get_dino_model():
    global _dino_model, _dino_processor
    if _dino_model is None:
        _dino_processor = AutoImageProcessor.from_pretrained("facebook/dinov2-small")
        # Ensure it does short-side 224 bicubic and center crop, which is default for DINOv2 processor
        _dino_model = AutoModel.from_pretrained("facebook/dinov2-small")
        _dino_model.eval()
    return _dino_model, _dino_processor


# -----------------------------------------------------------------------------
# Embedding Extraction
# -----------------------------------------------------------------------------
def embed_clip(image: Image.Image) -> np.ndarray:
    model, preprocess = get_clip_model()
    image_input = preprocess(image).unsqueeze(0)
    with torch.no_grad():
        features = model.encode_image(image_input)
        features /= features.norm(dim=-1, keepdim=True)
    return features[0].float().cpu().numpy()


def embed_dino(image: Image.Image) -> np.ndarray:
    model, processor = get_dino_model()
    inputs = processor(images=image, return_tensors="pt")
    with torch.no_grad():
        outputs = model(**inputs)
        # Use CLS token (index 0 of last_hidden_state)
        cls_token = outputs.last_hidden_state[:, 0, :]
        cls_token /= cls_token.norm(dim=-1, keepdim=True)
    return cls_token[0].float().cpu().numpy()


async def compute_embeddings_async(image: Image.Image) -> dict:
    """Compute embeddings for the image and its horizontal flip."""
    async with _inference_semaphore:
        flipped = ImageOps.mirror(image)
        return await asyncio.to_thread(_compute_all_sync, image, flipped)


def _compute_all_sync(img: Image.Image, flipped: Image.Image) -> dict:
    return {
        "clip": embed_clip(img),
        "clip_flip": embed_clip(flipped),
        "dino": embed_dino(img),
        "dino_flip": embed_dino(flipped),
    }


# -----------------------------------------------------------------------------
# Indexing and Search
# -----------------------------------------------------------------------------
@dataclass
class Candidate:
    work_id: str
    clip_sim: float
    dino_sim: float
    clip_rank: int
    dino_rank: int
    # Tier 3 "lead" inputs apply only to the single best DINO match; 0 for everything else.
    lead_score: float = 0.0
    lead_margin: float = 0.0


class DualIndex:
    def __init__(self):
        self._db = None
        self._key: tuple[int, int] | None = None  # (works, dino vectors) the matrices were built from
        self._lock = asyncio.Lock()
        self.ids: list[str] = []
        self.clip_emb = np.zeros((0, 0), dtype=np.float32)
        self.dino_emb = np.zeros((0, 0), dtype=np.float32)

    async def sync(self, db) -> None:
        """Rebuild in-memory matrices from MongoDB when the stored counts change.

        Works without a DINOv2 vector are not indexed, so the indexed count can legitimately be
        smaller than the work count; staleness is judged on the stored counts, not on len(ids).
        """
        key = (await db.works.count_documents({}),
               await db.gate_features.count_documents({"model": "dinov2-small"}))

        if self._db is db and self._key == key:
            return

        async with self._lock:
            if self._db is db and self._key == key:
                return

            ids = []
            clip_list = []
            dino_list = []

            # Load works
            works_cursor = db.works.find({}, {"id": 1, "embedding": 1}).sort("id", 1)
            works_map = {}
            async for doc in works_cursor:
                works_map[doc["id"]] = doc["embedding"]

            # Load DINOv2 features
            dino_cursor = db.gate_features.find({"model": "dinov2-small"}).sort("work_id", 1)
            dino_map = {}
            async for doc in dino_cursor:
                dino_map[doc["work_id"]] = doc["vector"]

            for wid, c_emb in works_map.items():
                d_emb = dino_map.get(wid)
                if not d_emb:
                    continue  # Only index works that have both
                ids.append(wid)
                clip_list.append(c_emb)
                dino_list.append(d_emb)

            self.ids = ids
            self.clip_emb = np.asarray(clip_list, dtype=np.float32) if clip_list else np.zeros((0, 512), dtype=np.float32)
            self.dino_emb = np.asarray(dino_list, dtype=np.float32) if dino_list else np.zeros((0, 384), dtype=np.float32)
            self._db = db
            self._key = key
            logger.info("Rebuilt DualIndex with %d of %d works.", len(ids), key[0])


dual_index = DualIndex()


def _top_k(scores: np.ndarray, k: int) -> np.ndarray:
    if len(scores) == 0:
        return np.array([], dtype=int)
    k = min(k, len(scores))
    idx = np.argpartition(-scores, k - 1)[:k]
    return idx[np.argsort(-scores[idx])]


async def retrieve(image: Image.Image, db) -> Tuple[List[Candidate], float]:
    """
    Search both indices with original and flipped embeddings.
    Returns:
        Candidates list, lead_score
    """
    embs = await compute_embeddings_async(image)
    await dual_index.sync(db)

    if not dual_index.ids:
        return [], 0.0

    # Max similarity over normal and flipped for CLIP
    c_scores_normal = dual_index.clip_emb @ embs["clip"]
    c_scores_flip = dual_index.clip_emb @ embs["clip_flip"]
    c_scores = np.maximum(c_scores_normal, c_scores_flip)

    # Max similarity over normal and flipped for DINOv2
    d_scores_normal = dual_index.dino_emb @ embs["dino"]
    d_scores_flip = dual_index.dino_emb @ embs["dino_flip"]
    d_scores = np.maximum(d_scores_normal, d_scores_flip)

    # Get top-K independently
    k = settings.k_candidates
    c_top = _top_k(c_scores, k)
    d_top = _top_k(d_scores, k)

    # Ranks
    c_ranks = {dual_index.ids[idx]: rank for rank, idx in enumerate(c_top, 1)}
    d_ranks = {dual_index.ids[idx]: rank for rank, idx in enumerate(d_top, 1)}

    # Union
    union_idx = set(c_top).union(set(d_top))
    
    candidates = []
    for idx in union_idx:
        wid = dual_index.ids[idx]
        candidates.append(
            Candidate(
                work_id=wid,
                clip_sim=float(c_scores[idx]),
                dino_sim=float(d_scores[idx]),
                clip_rank=c_ranks.get(wid, 999),
                dino_rank=d_ranks.get(wid, 999),
            )
        )
    
    # Sort candidates by DINO similarity as primary
    candidates.sort(key=lambda c: c.dino_sim, reverse=True)

    # Lead score: the best DINO similarity, with its margin over the runner-up (a lone strong
    # match is more telling than one of several equally close ones). Only that candidate gets it.
    lead_score = 0.0
    if len(d_top) > 0:
        top_idx = d_top[0]
        lead_score = float(d_scores[top_idx])
        margin = float(d_scores[top_idx] - d_scores[d_top[1]]) if len(d_top) > 1 else lead_score
        for c in candidates:
            if c.work_id == dual_index.ids[top_idx]:
                c.lead_score, c.lead_margin = lead_score, margin

    return candidates, lead_score
