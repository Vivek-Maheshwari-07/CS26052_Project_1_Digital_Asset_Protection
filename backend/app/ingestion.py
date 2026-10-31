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

try:  # iPhones save photos as HEIC by default; Pillow only opens them with this plugin
    from pillow_heif import register_heif_opener
    register_heif_opener()
except ImportError:  # optional: without it, HEIC uploads get the usual "not a supported image" 400
    pass


class InvalidImageError(ValueError):
    """Raised for anything that isn't a safe, decodable image."""


FLATTEN_BACKGROUND = (255, 255, 255)

# Formats we can decode but browsers can't display (Chrome has no HEIC support), so the stored
# copy, the evidence views and the gate would all disagree about what the image looks like.
BROWSER_UNSAFE_FORMATS = {"HEIF"}


def to_rgb(img: Image.Image) -> Image.Image:
    """RGB with any transparency composited onto white.

    A plain convert("RGB") drops alpha and exposes whatever colour the transparent pixels happen to
    store (usually black), so a transparent sprite would be registered as "sprite on black" while
    every repost (WhatsApp, Instagram, screenshots) shows it on white. White is what platforms
    produce; the gate's dense stage additionally ignores pixels that are transparent in the original.
    """
    if img.mode == "P" and "transparency" in img.info:
        img = img.convert("RGBA")
    if img.mode in ("RGBA", "LA", "PA"):
        rgba = img.convert("RGBA")
        canvas = Image.new("RGB", rgba.size, FLATTEN_BACKGROUND)
        canvas.paste(rgba, mask=rgba.getchannel("A"))
        return canvas
    return img.convert("RGB")


def normalize(image_bytes: bytes) -> Image.Image:
    """Decode, bomb-guard, auto-rotate, and force RGB (transparency on white). Raises InvalidImageError."""
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
        return to_rgb(img)
    except Image.DecompressionBombError:
        raise InvalidImageError("Image is too large to process.")
    except (UnidentifiedImageError, OSError, SyntaxError):
        raise InvalidImageError("That file isn't a supported image.")


def browser_safe(image_bytes: bytes) -> bytes:
    """HEIC/HEIF uploads re-encoded as a high-quality JPEG; anything else returned unchanged.

    Done once on arrival, so every later stage (fingerprints, gate, storage, the file SHA-256 on a
    certificate) sees the same JPEG. Raises InvalidImageError if the HEIC itself can't be decoded."""
    try:
        with Image.open(io.BytesIO(image_bytes)) as probe:
            fmt = probe.format
    except Exception:
        return image_bytes  # not our job to reject it here: normalize() reports the real error
    if fmt not in BROWSER_UNSAFE_FORMATS:
        return image_bytes
    return to_bytes(normalize(image_bytes), "JPEG", quality=95)


ORIENTATION_TAG = 0x0112
# JPEG segments kept when stripping: JFIF header, ICC colour profile, Adobe colour transform. Every other
# APPn (EXIF with GPS and camera serials, XMP, IPTC, maker notes) and comments are dropped.
_JPEG_KEEP_APPN = {0xE0, 0xE2, 0xEE}
# PNG chunks that carry metadata rather than pixels or colour
_PNG_DROP_CHUNKS = {b"eXIf", b"tEXt", b"zTXt", b"iTXt", b"tIME"}
_PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"


def _orientation_app1(orientation: int) -> bytes:
    exif = Image.Exif()
    exif[ORIENTATION_TAG] = orientation
    payload = exif.tobytes()
    if not payload.startswith(b"Exif\x00\x00"):
        payload = b"Exif\x00\x00" + payload
    return b"\xff\xe1" + (len(payload) + 2).to_bytes(2, "big") + payload


def _strip_jpeg(data: bytes, orientation) -> bytes | None:
    """Drop metadata segments without touching the entropy-coded image data. None if malformed."""
    out = bytearray(data[:2])
    if orientation not in (None, 1):
        out += _orientation_app1(orientation)  # the only EXIF kept: how the photo is meant to be shown
    i = 2
    while i + 4 <= len(data):
        if data[i] != 0xFF:
            return None
        marker = data[i + 1]
        if marker == 0xFF:  # fill byte
            i += 1
            continue
        if marker == 0xDA:  # start of scan: the rest is image data
            out += data[i:]
            return bytes(out)
        if 0xD0 <= marker <= 0xD7 or marker == 0x01:  # markers without a length
            out += data[i:i + 2]
            i += 2
            continue
        end = i + 2 + int.from_bytes(data[i + 2:i + 4], "big")
        if not ((0xE0 <= marker <= 0xEF and marker not in _JPEG_KEEP_APPN) or marker == 0xFE):
            out += data[i:end]
        i = end
    return None


def _strip_png(data: bytes) -> bytes | None:
    if not data.startswith(_PNG_SIGNATURE):
        return None
    out, i = bytearray(_PNG_SIGNATURE), len(_PNG_SIGNATURE)
    while i + 8 <= len(data):
        end = i + 12 + int.from_bytes(data[i:i + 4], "big")
        if data[i + 4:i + 8] not in _PNG_DROP_CHUNKS:
            out += data[i:end]
        i = end
    return bytes(out) if i == len(data) else None


def strip_metadata(image_bytes: bytes, fmt: str | None) -> tuple:
    """(bytes safe to store, their format): EXIF/GPS, XMP, IPTC and comments removed.

    JPEG and PNG are edited at the container level, so the pixels stay bit-identical to the upload.
    Other formats are re-encoded as PNG (lossless) only when they actually carry metadata.
    The registry keeps the SHA-256 of the upload itself, so stripping never weakens the proof."""
    fmt = (fmt or "").upper()
    try:
        with Image.open(io.BytesIO(image_bytes)) as probe:
            exif = probe.getexif()
            has_meta = bool(exif) or any(k in probe.info for k in ("exif", "xmp", "XML:com.adobe.xmp", "comment"))
    except Exception:
        return image_bytes, fmt  # undecodable input never gets this far; nothing to strip
    if fmt == "JPEG":
        stripped = _strip_jpeg(image_bytes, exif.get(ORIENTATION_TAG))
        if stripped:
            return stripped, fmt
    elif fmt == "PNG":
        stripped = _strip_png(image_bytes)
        if stripped:
            return stripped, fmt
    elif not has_meta:
        return image_bytes, fmt
    # Malformed container or a format we don't edit in place: re-encode the displayed pixels.
    if fmt == "JPEG":
        return to_bytes(normalize(image_bytes), "JPEG", quality=95), "JPEG"
    return to_bytes(normalize(image_bytes), "PNG"), "PNG"


def to_bytes(img: Image.Image, fmt: str = "JPEG", quality: int = 92) -> bytes:
    """Re-encode a normalized image. No EXIF block is passed through, so this
    also strips GPS/device metadata before the file reaches storage — the
    registry and certificates are visible to anyone with a work's link."""
    buf = io.BytesIO()
    save_fmt = "JPEG" if fmt.upper() in ("JPEG", "JPG") else fmt.upper()
    kwargs = {"quality": quality, "optimize": True} if save_fmt == "JPEG" else {}
    img.save(buf, format=save_fmt, **kwargs)
    return buf.getvalue()
