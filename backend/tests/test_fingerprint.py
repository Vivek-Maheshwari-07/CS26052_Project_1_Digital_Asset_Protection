import io
from PIL import Image, ImageDraw
from app import ingestion
from app.fingerprint.combine import fingerprint_sync
from app.fingerprint.phash import phash_similarity, is_low_detail
from app.fingerprint.embedding import embedding_similarity

def generate_sample_image() -> bytes:
    # Create a simple image with shapes and colors
    img = Image.new('RGB', (256, 256), color='white')
    draw = ImageDraw.Draw(img)
    draw.rectangle([50, 50, 150, 150], fill='red', outline='black')
    draw.ellipse([100, 100, 200, 200], fill='blue', outline='black')

    byte_arr = io.BytesIO()
    img.save(byte_arr, format='JPEG')
    return byte_arr.getvalue()

def horizontally_flip(image_bytes: bytes) -> bytes:
    img = Image.open(io.BytesIO(image_bytes))
    flipped = img.transpose(Image.FLIP_LEFT_RIGHT)
    byte_arr = io.BytesIO()
    flipped.save(byte_arr, format='JPEG')
    return byte_arr.getvalue()

def heavily_compress(image_bytes: bytes) -> bytes:
    img = Image.open(io.BytesIO(image_bytes))
    byte_arr = io.BytesIO()
    img.save(byte_arr, format='JPEG', quality=10) # Heavy compression
    return byte_arr.getvalue()

def test_fingerprint_pipeline():
    sample_bytes = generate_sample_image()
    flipped_bytes = horizontally_flip(sample_bytes)
    compressed_bytes = heavily_compress(sample_bytes)

    # 1. Fingerprint all variants (through the same normalization every upload goes through)
    sample_fp = fingerprint_sync(ingestion.normalize(sample_bytes))
    flipped_fp = fingerprint_sync(ingestion.normalize(flipped_bytes))
    compressed_fp = fingerprint_sync(ingestion.normalize(compressed_bytes))

    # 2. Compare sample vs flipped
    flip_phash_sim = phash_similarity(sample_fp["phash"], flipped_fp["phash"])
    flip_embed_sim = embedding_similarity(sample_fp["embedding"], flipped_fp["embedding"])

    # Assert embedding survives flip well, phash might be lower
    assert flip_embed_sim > 0.8
    assert flip_embed_sim > flip_phash_sim # The flip usually destroys phash structural similarity

    # 3. Compare sample vs compressed
    comp_phash_sim = phash_similarity(sample_fp["phash"], compressed_fp["phash"])
    comp_embed_sim = embedding_similarity(sample_fp["embedding"], compressed_fp["embedding"])

    # Assert embedding survives compression well
    assert comp_embed_sim > 0.8
    # Phash also usually survives compression quite well, but we'll assert embedding is robust
    assert comp_embed_sim > 0.8


def test_low_detail_flag_separates_blank_from_real_content():
    blank = Image.new('RGB', (256, 256), color='white')
    detailed = ingestion.normalize(generate_sample_image())
    assert is_low_detail(blank) is True
    assert is_low_detail(detailed) is False
    assert fingerprint_sync(blank)["low_detail"] is True
    assert fingerprint_sync(detailed)["low_detail"] is False


def test_ingestion_corrects_exif_orientation():
    # Orientation 6 = rotate 270 (viewers should display it rotated 90 CW)
    img = Image.new('RGB', (200, 100), color='white')
    ImageDraw.Draw(img).rectangle([0, 0, 50, 50], fill='red')  # red square top-left as shot
    buf = io.BytesIO()
    exif = img.getexif()
    exif[274] = 6
    img.save(buf, format='JPEG', exif=exif)

    normalized = ingestion.normalize(buf.getvalue())
    # A 200x100 image rotated per orientation 6 displays as 100x200
    assert normalized.size == (100, 200)


def test_ingestion_rejects_non_image():
    try:
        ingestion.normalize(b"not an image at all")
        assert False, "expected InvalidImageError"
    except ingestion.InvalidImageError:
        pass
