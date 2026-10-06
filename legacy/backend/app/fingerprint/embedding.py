import asyncio
import numpy as np
import open_clip
import torch
from PIL import Image

# Load model globally on module import
model, _, preprocess = open_clip.create_model_and_transforms('ViT-B-32', pretrained='laion2b_s34b_b79k')
model.eval()
tokenizer = open_clip.get_tokenizer('ViT-B-32')

# CLIP's own preprocessing (resize-short-side then center-crop) is kept as-is:
# tested against pad-to-square on real extreme-aspect-ratio photos (a 558x1280
# portrait) and padding collapsed true-positive similarity by 0.17-0.43 because
# the subject shrinks to a sliver of the 224x224 frame. Center-crop loses the
# edges instead, which pHash (run on the uncropped original) partially covers.
#
# Inference isn't thread-safe to hammer concurrently on CPU, so API handlers
# share this semaphore rather than letting FastAPI run requests in parallel
# straight into the same model.
_inference_semaphore = asyncio.Semaphore(2)


def compute_embedding(image: Image.Image) -> list[float]:
    image_input = preprocess(image).unsqueeze(0)
    with torch.no_grad():
        image_features = model.encode_image(image_input)
        image_features /= image_features.norm(dim=-1, keepdim=True)
    return image_features[0].float().cpu().numpy().tolist()


async def compute_embedding_async(image: Image.Image) -> list[float]:
    async with _inference_semaphore:
        return await asyncio.to_thread(compute_embedding, image)


def embedding_similarity(vec_a: list[float], vec_b: list[float]) -> float:
    v1 = np.array(vec_a)
    v2 = np.array(vec_b)
    # Both vectors are already L2 normalized, so cosine sim is just dot product
    sim = np.dot(v1, v2)
    return float(sim)
