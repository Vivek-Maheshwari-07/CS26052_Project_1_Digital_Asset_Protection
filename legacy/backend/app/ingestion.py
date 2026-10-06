"""Ingestion: the one place every uploaded image passes through before it is
hashed, embedded, or stored. Centralising this matters because the hasher and
embedder must see the *same* pixels the file's own viewer would show, and
nothing malicious or privacy-leaking should reach storage unexamined.

Normalises:
  - Decompression-bomb guard: explicit, friendly error instead of an
    unhandled PIL exception (the ~89MP default limit already exists in PIL;
    we just stop it from becoming a 500).
  - EXIF orientation: auto-rotated via exif_transpose so a phone photo stored
    "sideways" with an orientation tag is hashed/embedded the way it is
    actually displayed, not the way the raw pixel buffer is laid out.
  - Colour mode: forced to RGB (sRGB-ish; PIL doesn't do real ICC colour
    management, but this avoids CMYK/palette/alpha images silently breaking
    downstream tensor ops).

Does NOT pad, crop, or otherwise reshape the image — tested against real
edited copies, padding-to-square measurably destroyed the embedding signal
(see eval/results notes), so geometric preprocessing is left to each
fingerprinting method, which already handles it appropriately.
"""
import io

from PIL import Image, ImageOps, UnidentifiedImageError


class InvalidImageError(ValueError):
    """Raised for anything that isn't a safe, decodable image."""


def normalize(image_bytes: bytes) -> Image.Image:
    """Decode, bomb-guard, auto-rotate, and force RGB. Raises InvalidImageError."""
    try:
        with Image.open(io.BytesIO(image_bytes)) as probe:
            probe.verify()
    except Image.DecompressionBombError:
        raise InvalidImageError("Image is too large to process.")
    except (UnidentifiedImageError, OSError, SyntaxError):
        raise InvalidImageError("That file isn't a supported image.")

    try:
        img = Image.open(io.BytesIO(image_bytes))
        img = ImageOps.exif_transpose(img)  # also loads the image, undoing verify()'s close
        return img.convert("RGB")
    except Image.DecompressionBombError:
        raise InvalidImageError("Image is too large to process.")
    except (UnidentifiedImageError, OSError, SyntaxError):
        raise InvalidImageError("That file isn't a supported image.")


def to_bytes(img: Image.Image, fmt: str = "JPEG", quality: int = 92) -> bytes:
    """Re-encode a normalized image. No EXIF block is passed through, so this
    also strips GPS/device metadata before the file reaches storage — the
    registry and certificates are visible to anyone with a work's link."""
    buf = io.BytesIO()
    save_fmt = "JPEG" if fmt.upper() in ("JPEG", "JPG") else fmt.upper()
    kwargs = {"quality": quality, "optimize": True} if save_fmt == "JPEG" else {}
    img.save(buf, format=save_fmt, **kwargs)
    return buf.getvalue()
