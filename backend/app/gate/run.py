"""CLI: run the gate on one (original, suspect) pair without MongoDB.

    python -m app.gate.run --original ORIG.jpg --suspect SUSPECT.jpg [--out DIR]

Caches and evidence go to --out (default: a temporary directory), never into backend/uploads.
"""
import argparse
import asyncio
import tempfile
from pathlib import Path


class _Cursor:
    def __init__(self, items):
        self.items, self.idx = items, 0

    def __aiter__(self):
        return self

    async def __anext__(self):
        if self.idx < len(self.items):
            self.idx += 1
            return self.items[self.idx - 1]
        raise StopAsyncIteration

    def sort(self, *args, **kwargs):
        return self


class _Collection:
    def __init__(self, data):
        self.data = data

    async def count_documents(self, query):
        return len(self.data)

    async def find_one(self, query, projection=None, **kwargs):
        for d in self.data:
            if all(d.get(k) == v for k, v in query.items()):
                return d
        return None

    def find(self, query, *args, **kwargs):
        return _Cursor(self.data)


class _Db:
    def __init__(self, work_id, width, height, clip_vec, dino_vec, image_path):
        self.works = _Collection([{"id": work_id, "width": width, "height": height,
                                   "embedding": clip_vec, "image_path": image_path}])
        self.gate_features = _Collection([{"work_id": work_id, "model": "dinov2-small", "vector": dino_vec}])


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--original", required=True)
    parser.add_argument("--suspect", required=True)
    parser.add_argument("--out", help="directory for caches and evidence (default: temp dir)")
    args = parser.parse_args()

    from app.config import settings as app_settings
    out = Path(args.out) if args.out else Path(tempfile.mkdtemp(prefix="gate_run_"))
    out.mkdir(parents=True, exist_ok=True)
    app_settings.UPLOAD_DIR = str(out)

    from app import storage
    from app.gate.normalize import normalize_image
    from app.gate.pipeline import run_gate
    from app.gate.retrieve import embed_clip, embed_dino
    from app.gate.verify import FEATURE_VERSION, get_cached_features

    work_id = "cli-original"
    orig_bytes = Path(args.original).read_bytes()
    storage.save_image(orig_bytes, "JPEG", name=work_id)
    img, _, _ = normalize_image(orig_bytes)
    get_cached_features(work_id, FEATURE_VERSION, img)
    db = _Db(work_id, *img.size, embed_clip(img).tolist(), embed_dino(img).tolist(), f"{work_id}.jpg")

    verdict = await run_gate(Path(args.suspect).read_bytes(), db)
    print(verdict.model_dump_json(indent=2))
    print(f"\nCaches and evidence in: {out}")


if __name__ == "__main__":
    asyncio.run(main())
