import numpy as np
from PIL import Image

from app.config import get_config


class FakeEmbedder:
    """Deterministic fast embedder mock for testing without downloading real models."""

    def __init__(self):
        cfg = get_config()
        self.clip_id = cfg.models.clip
        self.dino_id = cfg.models.dino
        self.calls = 0

        rng = np.random.default_rng(0)
        self._w_clip = rng.standard_normal((256, 512)).astype(np.float64)
        self._w_dino = rng.standard_normal((256, 768)).astype(np.float64)

    def embed(self, img: Image.Image) -> tuple[np.ndarray, np.ndarray]:
        self.calls += 1
        grey = img.convert("L").resize((16, 16), Image.Resampling.BOX)
        vec = np.asarray(grey, dtype=np.float64).flatten()  # (256,)
        mean = np.mean(vec)
        centred = vec - mean
        norm = np.linalg.norm(centred)
        if norm < 1e-6:
            v = vec
            v_norm = np.linalg.norm(v)
            if v_norm > 1e-6:
                v = v / v_norm
        else:
            v = centred / norm

        clip_proj = v @ self._w_clip
        dino_proj = v @ self._w_dino

        clip_norm = np.linalg.norm(clip_proj)
        dino_norm = np.linalg.norm(dino_proj)

        clip_out = (
            (clip_proj / clip_norm).astype(np.float32) if clip_norm > 1e-6 else clip_proj.astype(np.float32)
        )
        dino_out = (
            (dino_proj / dino_norm).astype(np.float32) if dino_norm > 1e-6 else dino_proj.astype(np.float32)
        )

        return clip_out, dino_out

    def warm_up(self) -> None:
        self.embed(Image.new("RGB", (224, 224), (128, 128, 128)))
