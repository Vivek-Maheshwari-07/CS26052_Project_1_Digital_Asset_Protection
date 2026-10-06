import asyncio

import numpy as np
import torch
import torch.nn.functional as F
from PIL import Image

from app.config import ModelsCfg
from app.errors import Busy

GREY = (128, 128, 128)


def pad_to_square(img: Image.Image, fill: tuple[int, int, int] = GREY) -> Image.Image:
    """Pad image to a square canvas of side max(w, h) filled with `fill`, original centered."""
    w, h = img.size
    if w == h:
        return img
    s = max(w, h)
    canvas = Image.new("RGB", (s, s), fill)
    canvas.paste(img, ((s - w) // 2, (s - h) // 2))
    return canvas


def resolve_device(setting: str) -> str:
    """Resolve 'auto' -> 'cuda' if torch.cuda.is_available() else 'cpu'."""
    if setting == "auto":
        return "cuda" if torch.cuda.is_available() else "cpu"
    return setting


class Embedder:
    """Deep embedding generator using CLIP ViT-B/32 and DINOv2-base."""

    def __init__(self, cfg: ModelsCfg, device: str):
        from transformers import (
            AutoImageProcessor,
            AutoModel,
            CLIPImageProcessor,
            CLIPVisionModelWithProjection,
        )

        self.clip_id = cfg.clip
        self.dino_id = cfg.dino
        self.clip_revision = cfg.clip_revision
        self.dino_revision = cfg.dino_revision
        self.device = device

        self.clip = (
            CLIPVisionModelWithProjection.from_pretrained(cfg.clip, revision=cfg.clip_revision)
            .to(device)
            .eval()
        )
        self.clip_proc = CLIPImageProcessor.from_pretrained(cfg.clip, revision=cfg.clip_revision)

        self.dino = AutoModel.from_pretrained(cfg.dino, revision=cfg.dino_revision).to(device).eval()
        self.dino_proc = AutoImageProcessor.from_pretrained(cfg.dino, revision=cfg.dino_revision)

        self.square = cfg.preprocessing == "pad_to_square"
        self.proc_kw = {
            "size": {"shortest_edge": cfg.input_size},
            "do_center_crop": not self.square,
            "crop_size": {"height": cfg.input_size, "width": cfg.input_size},
        }

    @torch.inference_mode()
    def embed_batch(self, images: list[Image.Image]) -> tuple[np.ndarray, np.ndarray]:
        """Extract and L2-normalize CLIP and DINOv2 embeddings for a batch of PIL Images."""
        if self.square:
            prepped = [pad_to_square(i.convert("RGB")) for i in images]
        else:
            prepped = [i.convert("RGB") for i in images]

        clip_inputs = self.clip_proc(images=prepped, return_tensors="pt", **self.proc_kw).to(self.device)
        clip_out = self.clip(**clip_inputs).image_embeds
        clip_norm = F.normalize(clip_out, p=2, dim=-1)

        dino_inputs = self.dino_proc(images=prepped, return_tensors="pt", **self.proc_kw).to(self.device)
        dino_out = self.dino(**dino_inputs).pooler_output
        dino_norm = F.normalize(dino_out, p=2, dim=-1)

        return clip_norm.cpu().to(torch.float32).numpy(), dino_norm.cpu().to(torch.float32).numpy()

    def embed(self, img: Image.Image) -> tuple[np.ndarray, np.ndarray]:
        """Extract and L2-normalize (CLIP, DINOv2) embeddings for a single image."""
        clip_arr, dino_arr = self.embed_batch([img])
        return clip_arr[0], dino_arr[0]

    def warm_up(self) -> None:
        """Execute a dummy inference pass to compile kernels and warm caches."""
        self.embed(Image.new("RGB", (224, 224), GREY))


async def embed_gated(
    embedder: Embedder, img: Image.Image, gate: asyncio.Semaphore, wait_s: float
) -> tuple[np.ndarray, np.ndarray]:
    """Acquire concurrency semaphore with timeout, execute embed in worker thread, and always release."""
    try:
        await asyncio.wait_for(gate.acquire(), timeout=wait_s)
    except TimeoutError as e:
        raise Busy("Inference queue full; retry later.") from e

    try:
        return await asyncio.to_thread(embedder.embed, img)
    finally:
        gate.release()
