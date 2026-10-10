"""G0: Image decoding and uniform border trimming.

Every image the gate sees (suspects, registered works at feature time, targets at dense time)
goes through `normalize_image`, so both sides of a comparison are decoded, oriented and trimmed
identically.
"""
import io
import logging
from typing import Tuple

import numpy as np
from PIL import Image, ImageOps, UnidentifiedImageError

from app.gate.settings import settings

logger = logging.getLogger(__name__)


class InvalidImageError(ValueError):
    """Raised when an image cannot be parsed or safely loaded."""


def _is_uniform_band(line_pixels: np.ndarray) -> bool:
    """A row or column that is (nearly) one flat light or dark colour."""
    if line_pixels.std() >= settings.uniform_std_max:
        return False
    mean_val = line_pixels.mean()
    return bool(mean_val > settings.uniform_light_min or mean_val < settings.uniform_dark_max)


def decode_rgb(image_bytes: bytes) -> Image.Image:
    """Decode, bomb-guard, apply EXIF orientation, convert to RGB. No trimming."""
    try:
        with Image.open(io.BytesIO(image_bytes)) as probe:
            probe.verify()
    except Image.DecompressionBombError as e:
        raise InvalidImageError("Image is too large to process.") from e
    except (UnidentifiedImageError, OSError, SyntaxError) as e:
        raise InvalidImageError("That file isn't a supported image.") from e

    try:
        img = ImageOps.exif_transpose(Image.open(io.BytesIO(image_bytes)))
        return img.convert("RGB")
    except Image.DecompressionBombError as e:
        raise InvalidImageError("Image is too large to process.") from e
    except Exception as e:
        raise InvalidImageError("Failed to decode image.") from e


def normalize_image(image_bytes: bytes, trim: bool = True) -> Tuple[Image.Image, Tuple[int, int, int, int], bool]:
    """Decode (see `decode_rgb`) and trim uniform letterbox/pillarbox borders.

    Returns (image, crop_box as (left, top, right, bottom) in the decoded image, uniform_flag).
    `uniform_flag` is True only when the whole image is one flat colour (nothing to trim to);
    the image is then returned unchanged.

    Raises InvalidImageError for anything undecodable or oversized.
    """
    img = decode_rgb(image_bytes)
    w, h = img.size
    if not trim:
        return img, (0, 0, w, h), False

    arr = np.asarray(img.convert("L"))
    top, bottom, left, right = 0, h - 1, 0, w - 1

    while top < h and _is_uniform_band(arr[top, :]):
        top += 1
    while bottom > top and _is_uniform_band(arr[bottom, :]):
        bottom -= 1
    while left < w and _is_uniform_band(arr[:, left]):
        left += 1
    while right > left and _is_uniform_band(arr[:, right]):
        right -= 1

    if top >= bottom or left >= right:
        return img, (0, 0, w, h), True

    crop_box = (left, top, right + 1, bottom + 1)
    return img.crop(crop_box), crop_box, False
