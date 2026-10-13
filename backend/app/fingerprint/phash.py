import imagehash
import numpy as np
from PIL import Image

# Below this edge-energy score, an image is close to flat/blank (e.g. a blank
# canvas, a plain gradient). Classical hashes have little real structure to
# lock onto there and are more prone to incidental collisions; a simple but
# deliberate illustration (e.g. a logo) scores ~12-15 and stays unflagged.
# Validated against 5 real phone photos (24.7-34.4) and synthetic blanks/
# gradients/logos (0-12.5) during the pipeline review.
LOW_DETAIL_THRESHOLD = 6.0


def compute_phash(image: Image.Image) -> str:
    return str(imagehash.phash(image))


def detail_score(image: Image.Image) -> float:
    """Cheap edge-energy measure (RMS of adjacent-pixel differences)."""
    g = np.asarray(image.convert("L").resize((128, 128)), dtype=np.float32)
    gx, gy = np.diff(g, axis=1), np.diff(g, axis=0)
    return float(np.sqrt((gx ** 2).mean() + (gy ** 2).mean()))


def is_low_detail(image: Image.Image) -> bool:
    return detail_score(image) < LOW_DETAIL_THRESHOLD


def phash_similarity(hash_a: str, hash_b: str) -> float:
    # Convert string back to ImageHash object
    h1 = imagehash.hex_to_hash(hash_a)
    h2 = imagehash.hex_to_hash(hash_b)
    hamming_distance = h1 - h2
    hash_bit_length = len(h1.hash) ** 2
    return max(0.0, 1.0 - (hamming_distance / hash_bit_length))
