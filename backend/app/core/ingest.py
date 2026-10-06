import hashlib
import io
import warnings
from dataclasses import dataclass

import starlette.datastructures
from PIL import Image, ImageOps, UnidentifiedImageError

from app.config import LimitsCfg
from app.errors import InvalidImage, TooLarge, UnsupportedFormat

ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}


@dataclass(frozen=True)
class Ingested:
    image: Image.Image  # RGB, EXIF-oriented, alpha composited on white
    source_format: str  # "JPEG" | "PNG" | "WEBP", sniffed from bytes
    sha256: str  # hashlib.sha256(raw).hexdigest() of the RAW uploaded bytes
    width: int
    height: int


async def read_limited(upload: starlette.datastructures.UploadFile, max_bytes: int) -> bytes:
    """Read upload stream in 64 KB chunks, raising TooLarge as soon as total exceeds max_bytes."""
    chunks = []
    total = 0
    chunk_size = 64 * 1024
    while True:
        chunk = await upload.read(chunk_size)
        if not chunk:
            break
        total += len(chunk)
        if total > max_bytes:
            max_mb = max_bytes // (1024 * 1024)
            raise TooLarge(f"Image exceeds {max_mb} MB.")
        chunks.append(chunk)
    return b"".join(chunks)


def ingest(raw: bytes, limits: LimitsCfg) -> Ingested:
    """Validate, probe, decode, orient, composit, and normalize image from raw bytes."""
    # 1. Byte length check
    if len(raw) > limits.max_upload_mb * 1024 * 1024:
        raise TooLarge(f"Image exceeds {limits.max_upload_mb} MB.")

    # 2. Decompression-bomb guard without permanent global mutation
    orig_max_pixels = Image.MAX_IMAGE_PIXELS
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            Image.MAX_IMAGE_PIXELS = limits.max_pixels
            try:
                with Image.open(io.BytesIO(raw)) as probe:
                    fmt = probe.format
                    w, h = probe.size
                    if w * h > limits.max_pixels:
                        raise TooLarge("Image exceeds maximum allowed pixel count.")
                    probe.verify()
            except (Image.DecompressionBombError, Image.DecompressionBombWarning) as e:
                raise TooLarge("Image exceeds maximum allowed pixel count.") from e
            except (UnidentifiedImageError, OSError, SyntaxError, ValueError) as e:
                raise InvalidImage("That file isn't a decodable image.") from e
    finally:
        Image.MAX_IMAGE_PIXELS = orig_max_pixels

    # 3. Format whitelist
    if fmt not in ALLOWED_FORMATS:
        raise UnsupportedFormat(f"Format {fmt} is not supported; use JPEG, PNG or WebP.")

    # 4. Fresh decode, EXIF orientation, load
    try:
        img = Image.open(io.BytesIO(raw))
        img = ImageOps.exif_transpose(img)
        img.load()
    except (UnidentifiedImageError, OSError, SyntaxError, ValueError) as e:
        raise InvalidImage("That file isn't a decodable image.") from e

    # 5. Mode normalization and alpha compositing onto white
    if img.mode in ("RGBA", "LA", "PA") or (img.mode == "P" and "transparency" in img.info):
        rgba = img.convert("RGBA")
        background = Image.new("RGB", rgba.size, (255, 255, 255))
        background.paste(rgba, mask=rgba.split()[3])
        img = background
    else:
        img = img.convert("RGB")

    # 6. Minimum dimension check
    width, height = img.size
    if min(width, height) < limits.min_short_side_px:
        raise InvalidImage(f"Image must be at least {limits.min_short_side_px} px on its shorter side.")

    # 7. Compute sha256 and return Ingested
    sha256 = hashlib.sha256(raw).hexdigest()
    return Ingested(
        image=img,
        source_format=fmt,
        sha256=sha256,
        width=width,
        height=height,
    )


def to_png_bytes(img: Image.Image) -> bytes:
    """Re-encode an image as clean PNG without EXIF, ICC, or text metadata."""
    clean = img.copy()
    clean.info = {}
    buf = io.BytesIO()
    clean.save(buf, format="PNG", optimize=False)
    return buf.getvalue()
