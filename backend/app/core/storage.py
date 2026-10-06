import os
import tempfile
from pathlib import Path
from typing import Literal
from uuid import UUID

from PIL import Image

from app.core.ingest import to_png_bytes


class LocalStorage:
    """Atomic local disk storage for full PNG images and thumbnails."""

    def __init__(self, root: str | Path):
        root_path = Path(root)
        if not root_path.is_absolute():
            backend_dir = Path(__file__).resolve().parent.parent.parent
            root_path = backend_dir / root_path

        self.root = root_path
        self.thumbs_dir = self.root / "thumbs"

        self.root.mkdir(parents=True, exist_ok=True)
        self.thumbs_dir.mkdir(parents=True, exist_ok=True)

    def write_png(self, image_id: UUID, img: Image.Image) -> str:
        """Atomically write full metadata-stripped PNG. Returns relative path '<image_id>.png'."""
        png_bytes = to_png_bytes(img)
        target = self.root / f"{image_id}.png"

        with tempfile.NamedTemporaryFile(dir=self.root, delete=False) as tmp:
            tmp.write(png_bytes)
            tmp_path = Path(tmp.name)

        os.replace(tmp_path, target)
        return f"{image_id}.png"

    def write_thumb(self, image_id: UUID, img: Image.Image) -> None:
        """Atomically write metadata-stripped thumbnail with longest side <= 320 px."""
        thumb = img.copy()
        thumb.thumbnail((320, 320), Image.Resampling.LANCZOS)
        png_bytes = to_png_bytes(thumb)
        target = self.thumbs_dir / f"{image_id}.png"

        with tempfile.NamedTemporaryFile(dir=self.thumbs_dir, delete=False) as tmp:
            tmp.write(png_bytes)
            tmp_path = Path(tmp.name)

        os.replace(tmp_path, target)

    def delete(self, image_id: UUID) -> None:
        """Remove full and thumbnail files if present; never raises for missing files."""
        for p in (self.root / f"{image_id}.png", self.thumbs_dir / f"{image_id}.png"):
            try:
                p.unlink(missing_ok=True)
            except OSError:
                pass

    def path(self, image_id: UUID, size: Literal["full", "thumb"] = "full") -> Path:
        """Return the filesystem Path for an image or thumbnail."""
        if size == "thumb":
            return self.thumbs_dir / f"{image_id}.png"
        return self.root / f"{image_id}.png"
