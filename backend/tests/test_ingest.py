import hashlib
import io
import tempfile

import pytest
from PIL import Image
from starlette.datastructures import UploadFile

from app.config import LimitsCfg
from app.core.ingest import ingest, read_limited, to_png_bytes
from app.errors import InvalidImage, TooLarge, UnsupportedFormat
from tests.images import flat, jpeg_with_orientation, photo_like, rgba_transparent, to_bytes


@pytest.fixture
def limits():
    return LimitsCfg(
        max_upload_mb=10,
        max_pixels=40000000,
        min_short_side_px=64,
        inference_concurrency=2,
        inference_wait_s=30,
    )


def test_unsupported_formats(limits):
    img = flat()
    gif_bytes = to_bytes(img, "GIF")
    with pytest.raises(UnsupportedFormat):
        ingest(gif_bytes, limits)

    bmp_bytes = to_bytes(img, "BMP")
    with pytest.raises(UnsupportedFormat):
        ingest(bmp_bytes, limits)


def test_allowed_formats_sniffed_from_bytes(limits):
    img = flat(size=(100, 100))
    jpeg_bytes = to_bytes(img, "JPEG")
    res_jpeg = ingest(jpeg_bytes, limits)
    assert res_jpeg.source_format == "JPEG"

    webp_bytes = to_bytes(img, "WEBP")
    res_webp = ingest(webp_bytes, limits)
    assert res_webp.source_format == "WEBP"

    png_bytes = to_bytes(img, "PNG")
    res_png = ingest(png_bytes, limits)
    assert res_png.source_format == "PNG"


def test_invalid_and_corrupt_images(limits):
    with pytest.raises(InvalidImage):
        ingest(b"hello world" * 100, limits)

    jpeg_bytes = to_bytes(flat(size=(100, 100)), "JPEG")
    with pytest.raises(InvalidImage):
        ingest(jpeg_bytes[:200], limits)


def test_dimension_limits(limits):
    img_63 = flat(size=(63, 200))
    with pytest.raises(InvalidImage):
        ingest(to_bytes(img_63, "PNG"), limits)

    img_64 = flat(size=(64, 200))
    res = ingest(to_bytes(img_64, "PNG"), limits)
    assert res.width == 64
    assert res.height == 200


@pytest.mark.asyncio
async def test_read_limited_stops_early():
    total_bytes = 11 * 1024 * 1024
    max_bytes = 10 * 1024 * 1024

    with tempfile.SpooledTemporaryFile(max_size=12 * 1024 * 1024) as f:
        f.write(b"x" * total_bytes)
        f.seek(0)
        upload = UploadFile(file=f, size=total_bytes, filename="test.jpg")

        with pytest.raises(TooLarge):
            await read_limited(upload, max_bytes)

        pos = f.tell()
        assert pos < total_bytes
        assert pos <= max_bytes + (64 * 1024)


def test_raw_upload_size_limit(limits):
    raw = b"x" * (10 * 1024 * 1024 + 1)
    with pytest.raises(TooLarge):
        ingest(raw, limits)


def test_decompression_bomb_guard(limits):
    orig_max_pixels = Image.MAX_IMAGE_PIXELS
    # Create a 7000x6000 image (42 MP > 40 MP limit)
    large_img = Image.new("L", (7000, 6000), 128)
    png_bytes = to_bytes(large_img, "PNG")

    with pytest.raises(TooLarge):
        ingest(png_bytes, limits)

    assert Image.MAX_IMAGE_PIXELS == orig_max_pixels


def test_exif_orientation_handling(limits):
    img = photo_like(42, size=(100, 200))
    raw = jpeg_with_orientation(img, orientation=6)
    ingested = ingest(raw, limits)
    assert ingested.width == 200
    assert ingested.height == 100
    assert ingested.image.size == (200, 100)


def test_transparency_and_cmyk_conversion(limits):
    transparent_img = rgba_transparent(size=(128, 128))
    png_bytes = to_bytes(transparent_img, "PNG")
    res_rgba = ingest(png_bytes, limits)
    assert res_rgba.image.mode == "RGB"
    assert res_rgba.image.getpixel((0, 0)) == (255, 255, 255)

    cmyk_img = Image.new("CMYK", (100, 100), (0, 0, 0, 0))
    cmyk_bytes = to_bytes(cmyk_img, "JPEG")
    res_cmyk = ingest(cmyk_bytes, limits)
    assert res_cmyk.image.mode == "RGB"


def test_sha256_hash_matches_raw(limits):
    img = photo_like(123)
    raw = to_bytes(img, "JPEG")
    ingested = ingest(raw, limits)
    assert ingested.sha256 == hashlib.sha256(raw).hexdigest()


def test_to_png_bytes_strips_metadata():
    img = photo_like(99, size=(100, 100))
    img.info["icc_profile"] = b"fake_icc_profile_data"
    img.info["exif"] = b"fake_exif_data"
    img.info["comment"] = "fake comment"

    png_bytes = to_png_bytes(img)
    reopened = Image.open(io.BytesIO(png_bytes))

    assert "icc_profile" not in reopened.info
    assert "exif" not in reopened.info
    for k in reopened.info:
        assert not k.startswith("Comment") and not k.startswith("comment")
