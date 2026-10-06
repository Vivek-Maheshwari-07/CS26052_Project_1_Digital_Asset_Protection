import os
import pathlib
import sys

# Ensure backend root is on sys.path
backend_dir = pathlib.Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.config import get_config, get_settings


def main() -> int:
    try:
        settings = get_settings()
        cfg = get_config()

        hf_path = pathlib.Path(settings.hf_home)
        if not hf_path.is_absolute():
            hf_path = backend_dir / hf_path
        hf_path.mkdir(parents=True, exist_ok=True)
        os.environ["HF_HOME"] = str(hf_path)

        from app.core.embedder import Embedder

        print(f"Resolving HF_HOME: {hf_path}")
        print("Loading Embedder on CPU...")
        embedder = Embedder(cfg.models, device="cpu")
        print("Running warm_up()...")
        embedder.warm_up()

        print("=== Models Warmed Up Successfully ===")
        print(f"HF_HOME: {hf_path}")
        print(f"CLIP ID: {embedder.clip_id} (revision: {embedder.clip_revision}) -> 512 dimensions")
        print(f"DINO ID: {embedder.dino_id} (revision: {embedder.dino_revision}) -> 768 dimensions")
        return 0
    except Exception as e:  # noqa: BLE001
        print(f"Error warming up models: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
