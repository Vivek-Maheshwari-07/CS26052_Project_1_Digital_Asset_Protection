"""G1: Retrieval from CLIP and DINOv2 indices.

Each query is embedded in three orientations (as-is, mirrored, flipped) in one batched pass, and a
work's score is the best over orientations. When crop indexing is on, every registered work also
carries five DINOv2 crop vectors (four quadrants + centre) so a small crop of a large work can still
be retrieved.
"""
import asyncio
import logging
import threading
from dataclasses import dataclass
from typing import List, Optional, Tuple

import numpy as np
import torch
from PIL import Image

from app.fingerprint import embedding as clip_embedding
from app.gate.settings import settings
from app.gate.verify import apply_flip

logger = logging.getLogger(__name__)

# Orientations the query is embedded in. Embeddings are not rotation invariant, so (unlike the SIFT
# stage) a top-bottom flip needs its own view here.
QUERY_VIEWS = ("", "h", "v")

N_CROPS = 5
DINO_DIM = 384
CLIP_DIM = 512

_dino_model = None
_dino_processor = None
_dino_lock = threading.Lock()
_inference_semaphore = asyncio.Semaphore(2)


def get_clip_model():
    """The CLIP model shared with the classic fingerprint (loaded once, on first use)."""
    return clip_embedding.get_model()


def get_dino_model():
    global _dino_model, _dino_processor
    if _dino_model is None:
        with _dino_lock:
            if _dino_model is None:
                from transformers import AutoImageProcessor, AutoModel
                _dino_processor = AutoImageProcessor.from_pretrained("facebook/dinov2-small")
                model = AutoModel.from_pretrained("facebook/dinov2-small")
                model.eval()
                _dino_model = model
    return _dino_model, _dino_processor


# -----------------------------------------------------------------------------
# Embedding extraction (batched)
# -----------------------------------------------------------------------------
def embed_clip_batch(images: List[Image.Image]) -> np.ndarray:
    return clip_embedding.compute_embeddings(images)


def embed_dino_batch(images: List[Image.Image]) -> np.ndarray:
    """L2-normalised DINOv2-small CLS embeddings, shape (n, 384)."""
    model, processor = get_dino_model()
    inputs = processor(images=images, return_tensors="pt")
    with torch.no_grad():
        cls = model(**inputs).last_hidden_state[:, 0, :]
        cls = cls / cls.norm(dim=-1, keepdim=True)
    return cls.float().cpu().numpy()


def embed_clip(image: Image.Image) -> np.ndarray:
    return embed_clip_batch([image])[0]


def embed_dino(image: Image.Image) -> np.ndarray:
    return embed_dino_batch([image])[0]


def crop_views(image: Image.Image) -> List[Image.Image]:
    """The five crops indexed per work: four quadrants and the centre (each a quarter of the area)."""
    w, h = image.size
    boxes = [(0, 0, w // 2, h // 2), (w // 2, 0, w, h // 2), (0, h // 2, w // 2, h), (w // 2, h // 2, w, h),
             (w // 4, h // 4, 3 * w // 4, 3 * h // 4)]
    return [image.crop(b) for b in boxes]


def embed_dino_crops(image: Image.Image) -> np.ndarray:
    return embed_dino_batch(crop_views(image))


async def compute_embeddings_async(image: Image.Image) -> dict:
    """Embed the query in every orientation (batched): arrays of shape (len(QUERY_VIEWS), dim)."""
    async with _inference_semaphore:
        return await asyncio.to_thread(_compute_all_sync, image)


def _compute_all_sync(img: Image.Image) -> dict:
    views = [apply_flip(img, m) for m in QUERY_VIEWS]
    return {"clip": embed_clip_batch(views), "dino": embed_dino_batch(views)}


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
    via_crop: bool = False  # the DINO score came from a crop vector, not the whole-image vector


class DualIndex:
    def __init__(self):
        self._db = None
        self._key: tuple[int, int, int] | None = None  # (works, dino vectors, crop sets) the matrices were built from
        self._lock = asyncio.Lock()
        self.ids: list[str] = []
        self.owners: list[str | None] = []
        self.clip_emb = np.zeros((0, CLIP_DIM), dtype=np.float32)
        self.dino_emb = np.zeros((0, DINO_DIM), dtype=np.float32)
        self.dino_crops = np.zeros((0, N_CROPS, DINO_DIM), dtype=np.float32)

    async def sync(self, db) -> None:
        """Rebuild in-memory matrices from MongoDB when the stored counts change.

        Works without a DINOv2 vector are not indexed, so the indexed count can legitimately be
        smaller than the work count; staleness is judged on the stored counts, not on len(ids).
        """
        key = (await db.works.count_documents({}),
               await db.gate_features.count_documents({"model": "dinov2-small"}),
               await db.gate_features.count_documents({"model": "dinov2-small", "crop_vectors": {"$exists": True}}))

        if self._db is db and self._key == key:
            return

        async with self._lock:
            if self._db is db and self._key == key:
                return

            works_map, owner_map = {}, {}
            async for doc in db.works.find({}, {"id": 1, "embedding": 1, "user_id": 1}).sort("id", 1):
                works_map[doc["id"]] = doc["embedding"]
                owner_map[doc["id"]] = doc.get("user_id")

            dino_map = {}
            async for doc in db.gate_features.find({"model": "dinov2-small"}).sort("work_id", 1):
                dino_map[doc["work_id"]] = (doc["vector"], doc.get("crop_vectors"))

            ids, owners, clip_list, dino_list, crop_list = [], [], [], [], []
            zero_crops = np.zeros((N_CROPS, DINO_DIM), dtype=np.float32)
            for wid, c_emb in works_map.items():
                entry = dino_map.get(wid)
                if not entry or not entry[0]:
                    continue  # only index works that have both
                ids.append(wid)
                owners.append(owner_map.get(wid))
                clip_list.append(c_emb)
                dino_list.append(entry[0])
                crop_list.append(np.asarray(entry[1], dtype=np.float32) if entry[1] else zero_crops)

            self.ids = ids
            self.owners = owners
            self.clip_emb = np.asarray(clip_list, dtype=np.float32) if clip_list else np.zeros((0, CLIP_DIM), dtype=np.float32)
            self.dino_emb = np.asarray(dino_list, dtype=np.float32) if dino_list else np.zeros((0, DINO_DIM), dtype=np.float32)
            self.dino_crops = (np.asarray(crop_list, dtype=np.float32) if crop_list
                               else np.zeros((0, N_CROPS, DINO_DIM), dtype=np.float32))
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


def score_index(index: DualIndex, embs: dict) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """(clip scores, dino scores, dino-from-crop flags) per indexed work, best over query orientations."""
    c_scores = (index.clip_emb @ embs["clip"].T).max(axis=1)
    d_full = (index.dino_emb @ embs["dino"].T).max(axis=1)
    if settings.index_crops and len(index.ids):
        per_crop = index.dino_crops @ embs["dino"].T  # (works, crops, views)
        per_crop[~(np.abs(index.dino_crops).sum(axis=2) > 0)] = -1.0  # works without crop vectors
        d_crop = per_crop.max(axis=(1, 2))
    else:
        d_crop = np.full(len(index.ids), -1.0, dtype=np.float32)
    return c_scores, np.maximum(d_full, d_crop), d_crop > d_full


async def retrieve(image: Image.Image, db, owner_id: Optional[str] = None) -> Tuple[List[Candidate], float]:
    """Search both indices (all query orientations, whole-image and crop vectors).

    Returns the candidate list (union of the top-k by CLIP and by DINO) and the lead score.
    """
    embs = await compute_embeddings_async(image)
    await dual_index.sync(db)

    if not dual_index.ids:
        return [], 0.0

    c_scores, d_scores, from_crop = score_index(dual_index, embs)
    if owner_id is not None:  # only the caller's own works are searched
        mine = np.array([o == owner_id for o in dual_index.owners])
        if not mine.any():
            return [], 0.0
        c_scores = np.where(mine, c_scores, -2.0)
        d_scores = np.where(mine, d_scores, -2.0)

    k = settings.k_candidates
    c_top = _top_k(c_scores, k)
    d_top = _top_k(d_scores, k)
    c_ranks = {dual_index.ids[idx]: rank for rank, idx in enumerate(c_top, 1)}
    d_ranks = {dual_index.ids[idx]: rank for rank, idx in enumerate(d_top, 1)}

    candidates = []
    for idx in set(c_top).union(set(d_top)):
        if owner_id is not None and d_scores[idx] < -1.5 and c_scores[idx] < -1.5:
            continue
        wid = dual_index.ids[idx]
        candidates.append(Candidate(
            work_id=wid,
            clip_sim=float(c_scores[idx]),
            dino_sim=float(d_scores[idx]),
            clip_rank=c_ranks.get(wid, 999),
            dino_rank=d_ranks.get(wid, 999),
            via_crop=bool(from_crop[idx]),
        ))
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
