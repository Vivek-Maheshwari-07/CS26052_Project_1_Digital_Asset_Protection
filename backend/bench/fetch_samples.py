"""
Download or generate sample benchmark images for originals and hard negatives.
"""

import io
import sys
import urllib.request
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw


def generate_synthetic_photo(seed: int, size: tuple[int, int] = (512, 512)) -> Image.Image:
    """Generate a rich photographic-like test image deterministically with PIL & NumPy."""
    rng = np.random.default_rng(seed)
    w, h = size

    # Multi-frequency gradient background
    x = np.linspace(0, 4 * np.pi, w)
    y = np.linspace(0, 4 * np.pi, h)
    xx, yy = np.meshgrid(x, y)
    r = np.sin(xx + rng.uniform(0, 2 * np.pi)) * 64 + 128
    g = np.cos(yy + rng.uniform(0, 2 * np.pi)) * 64 + 128
    b = np.sin(xx + yy + rng.uniform(0, 2 * np.pi)) * 64 + 128
    arr = np.stack([r, g, b], axis=-1).astype(np.uint8)

    img = Image.fromarray(arr, mode="RGB")
    draw = ImageDraw.Draw(img)

    # Draw deterministic geometric features
    for i in range(12):
        shape_type = rng.choice(["ellipse", "rectangle", "line"])
        x0 = int(rng.integers(0, w - 50))
        y0 = int(rng.integers(0, h - 50))
        x1 = int(rng.integers(x0 + 20, w))
        y1 = int(rng.integers(y0 + 20, h))
        color = tuple(int(c) for c in rng.integers(0, 256, size=3))

        if shape_type == "ellipse":
            draw.ellipse([x0, y0, x1, y1], fill=color, outline=(255, 255, 255))
        elif shape_type == "rectangle":
            draw.rectangle([x0, y0, x1, y1], fill=color, outline=(0, 0, 0))
        else:
            draw.line([x0, y0, x1, y1], fill=color, width=int(rng.integers(2, 6)))

    return img


def fetch_or_create_image(idx: int, is_hard_negative: bool, out_path: Path) -> None:
    seed = idx + (1000 if is_hard_negative else 0)
    url = f"https://picsum.photos/seed/{seed}/512/512"
    headers = {"User-Agent": "ProvNet-Benchmark-Fetcher/1.0"}

    downloaded = False
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=5) as response:
            if response.status == 200:
                data = response.read()
                img = Image.open(io.BytesIO(data)).convert("RGB")
                img.save(out_path, format="JPEG", quality=95)
                downloaded = True
    except Exception as e:
        print(f"Network fetch failed for {url} ({e}); generating deterministic synthetic sample.", file=sys.stderr)

    if not downloaded:
        img = generate_synthetic_photo(seed=seed, size=(512, 512))
        img.save(out_path, format="JPEG", quality=95)


def populate_benchmark_dataset(count: int = 10) -> None:
    repo_root = Path(__file__).resolve().parent.parent.parent
    bench_dir = repo_root / "data" / "benchmark"
    orig_dir = bench_dir / "originals"
    neg_dir = bench_dir / "hard_negatives"

    orig_dir.mkdir(parents=True, exist_ok=True)
    neg_dir.mkdir(parents=True, exist_ok=True)

    print(f"Populating {count} originals and {count} hard negatives into {bench_dir}...")

    for i in range(1, count + 1):
        orig_id = f"img_{i:03d}"
        neg_id = f"neg_{i:03d}"

        orig_path = orig_dir / f"{orig_id}.jpg"
        neg_path = neg_dir / f"{neg_id}.jpg"

        fetch_or_create_image(i, is_hard_negative=False, out_path=orig_path)
        fetch_or_create_image(i, is_hard_negative=True, out_path=neg_path)
        print(f"  [+] Created pair #{i}: {orig_path.name} <-> {neg_path.name}")

    print("Dataset bootstrapping complete!")


if __name__ == "__main__":
    count = int(sys.argv[1]) if len(sys.argv) > 1 else 10
    populate_benchmark_dataset(count)
