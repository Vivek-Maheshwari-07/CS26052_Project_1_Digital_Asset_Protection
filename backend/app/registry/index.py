"""In-memory similarity index over the registry.

All embeddings live in one float32 matrix and all pHashes in one bit matrix,
so a check is two vectorised operations instead of a Python loop over every
document. 100k works x 512 dims is ~200 MB and searches in tens of
milliseconds; beyond that, swap this class for FAISS or a vector database.
"""
import asyncio

import numpy as np

from app.fingerprint.combine import combined_confidence


def phash_bits(hex_hash: str) -> np.ndarray:
    return np.unpackbits(np.frombuffer(bytes.fromhex(hex_hash), dtype=np.uint8))


class SimilarityIndex:
    def __init__(self):
        self._db = None
        self._lock = asyncio.Lock()
        self.ids: list[str] = []
        self.user_ids: list[str | None] = []
        self.emb = np.zeros((0, 0), dtype=np.float32)
        self.bits = np.zeros((0, 64), dtype=np.uint8)

    def __len__(self):
        return len(self.ids)

    async def sync(self, db) -> None:
        """Rebuild from Mongo if the index belongs to another db or is out of date."""
        count = await db.works.count_documents({})
        if db is self._db and count == len(self.ids):
            return
        async with self._lock:
            ids, users, embs, bits = [], [], [], []
            cursor = db.works.find({}, {"id": 1, "user_id": 1, "embedding": 1, "phash": 1}).sort("_id", 1)
            async for doc in cursor:
                ids.append(doc["id"])
                users.append(doc.get("user_id"))
                embs.append(doc["embedding"])
                bits.append(phash_bits(doc["phash"]))
            self._db = db
            self.ids, self.user_ids = ids, users
            self.emb = np.asarray(embs, dtype=np.float32) if embs else np.zeros((0, 0), dtype=np.float32)
            self.bits = np.asarray(bits, dtype=np.uint8) if bits else np.zeros((0, 64), dtype=np.uint8)

    def add(self, db, work_id: str, user_id: str | None, embedding: list[float], phash: str) -> None:
        if db is not self._db:
            return  # the next sync() rebuilds from scratch
        vec = np.asarray([embedding], dtype=np.float32)
        self.emb = vec if not self.ids else np.vstack([self.emb, vec])
        self.bits = np.vstack([self.bits, phash_bits(phash)[None, :]])
        self.ids.append(work_id)
        self.user_ids.append(user_id)

    def search(self, embedding: list[float], phash: str, k: int = 10, user_id: str | None = None) -> list[dict]:
        """Top-k works by fused confidence. With `user_id`, only that user's own works are searched."""
        if not self.ids:
            return []
        e_sim = self.emb @ np.asarray(embedding, dtype=np.float32)
        hamming = (self.bits != phash_bits(phash)[None, :]).sum(axis=1)
        p_sim = np.maximum(0.0, 1.0 - hamming / self.bits.shape[1])
        conf = combined_confidence(p_sim, e_sim)
        if user_id is not None:
            mine = np.array([u == user_id for u in self.user_ids])
            if not mine.any():
                return []
            conf = np.where(mine, conf, -1.0)

        k = min(k, int((conf > -0.5).sum()) if user_id is not None else len(conf))
        if k == 0:
            return []
        top = np.argpartition(-conf, k - 1)[:k]
        top = top[np.argsort(-conf[top])]
        return [{
            "work_id": self.ids[i],
            "user_id": self.user_ids[i],
            "phash_score": float(p_sim[i]),
            "embedding_score": float(e_sim[i]),
            "confidence": float(conf[i]),
        } for i in top]


index = SimilarityIndex()
