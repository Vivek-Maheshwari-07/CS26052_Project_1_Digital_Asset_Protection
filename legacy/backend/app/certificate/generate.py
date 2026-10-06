from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from datetime import timezone
import io

import qrcode
from fpdf import FPDF
from fpdf.enums import XPos, YPos
from PIL import Image

from app.config import settings
from app.db import get_db
from app.registry.chain import verify_record
from app import storage

router = APIRouter()

INK = (18, 16, 31)
MUTED = (110, 106, 133)
BRAND = (91, 76, 240)
BRAND_2 = (177, 61, 240)
LINE = (230, 228, 240)
SOFT = (246, 245, 251)
OK = (15, 159, 110)


def latin1(text: str) -> str:
    """Core PDF fonts are Latin-1 only."""
    return str(text).encode("latin-1", "replace").decode("latin-1")


def verify_url(work_id: str) -> str:
    return f"{settings.FRONTEND_ORIGIN.rstrip('/')}/verify/{work_id}"


def _qr_image(data: str) -> Image.Image:
    qr = qrcode.QRCode(border=1, box_size=10, error_correction=qrcode.constants.ERROR_CORRECT_M)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color=INK, back_color="white")
    return img.get_image() if hasattr(img, "get_image") else img


def _label_value(pdf: FPDF, x: float, y: float, w: float, label: str, value: str, mono: bool = False):
    pdf.set_xy(x, y)
    pdf.set_font("Helvetica", "B", 7)
    pdf.set_text_color(*MUTED)
    pdf.cell(w, 4, latin1(label.upper()), new_x=XPos.LEFT, new_y=YPos.NEXT)
    pdf.set_font("Courier" if mono else "Helvetica", "", 9 if mono else 11)
    pdf.set_text_color(*INK)
    pdf.multi_cell(w, 5, latin1(value))


def build_certificate(record: dict, check: dict) -> bytes:
    pdf = FPDF(orientation="L", unit="mm", format="A4")
    pdf.set_auto_page_break(False)
    pdf.add_page()
    W, H = 297, 210

    # Background, frame and accent bar
    pdf.set_fill_color(*SOFT)
    pdf.rect(0, 0, W, H, "F")
    pdf.set_fill_color(255, 255, 255)
    pdf.set_draw_color(*LINE)
    pdf.set_line_width(0.4)
    pdf.rect(10, 10, W - 20, H - 20, "DF")
    steps = 60
    for i in range(steps):
        t = i / (steps - 1)
        pdf.set_fill_color(*[round(BRAND[k] * (1 - t) + BRAND_2[k] * t) for k in range(3)])
        pdf.rect(10 + (W - 20) * i / steps, 10, (W - 20) / steps + 0.2, 3, "F")

    left, top = 24, 26
    col_w = 160

    # Brand
    pdf.set_fill_color(*BRAND)
    pdf.rect(left, top, 7, 7, "F")
    pdf.set_xy(left + 9.5, top + 0.3)
    pdf.set_font("Helvetica", "B", 12)
    pdf.set_text_color(*INK)
    pdf.cell(60, 6.5, "Provenance")

    pdf.set_xy(left, top + 16)
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(*BRAND)
    pdf.cell(col_w, 5, "CERTIFICATE OF REGISTRATION", new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    pdf.set_xy(left, top + 23)
    pdf.set_font("Helvetica", "B", 26)
    pdf.set_text_color(*INK)
    pdf.multi_cell(col_w, 11, latin1(record["title"]), max_line_height=11)
    y = pdf.get_y() + 1
    pdf.set_xy(left, y)
    pdf.set_font("Helvetica", "", 12)
    pdf.set_text_color(*MUTED)
    pdf.cell(col_w, 6, latin1(f"Registered by {record['owner_name']}"))

    created = record["created_at"]
    if created.tzinfo is None:
        created = created.replace(tzinfo=timezone.utc)

    y += 14
    half = col_w / 2 - 4
    _label_value(pdf, left, y, half, "Registered (UTC)", created.strftime("%d %B %Y, %H:%M:%S"))
    _label_value(pdf, left + half + 8, y, half, "Registry position", f"#{check['position']}")
    y += 15
    dims = f"{record['width']} x {record['height']} px" if record.get("width") else "-"
    _label_value(pdf, left, y, half, "Image", dims)
    _label_value(pdf, left + half + 8, y, half, "Perceptual hash", record["phash"], mono=True)
    y += 15
    _label_value(pdf, left, y, col_w, "Work ID", record["id"], mono=True)
    y += 13
    _label_value(pdf, left, y, col_w, "Registry hash (SHA-256)", record["entry_hash"], mono=True)
    y += 13
    _label_value(pdf, left, y, col_w, "Previous entry hash", record["prev_hash"], mono=True)

    # Status line
    y += 14
    intact = check["intact"] and check["linked"]
    pdf.set_xy(left, y)
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(*(OK if intact else (224, 56, 78)))
    pdf.cell(col_w, 5, "Record verified intact in the registry chain" if intact
             else "Warning: this record failed registry verification")
    anchor = record.get("anchor_status")
    pdf.set_xy(left, y + 5.5)
    pdf.set_font("Helvetica", "", 8.5)
    pdf.set_text_color(*MUTED)
    pdf.cell(col_w, 5, "Hash submitted to Bitcoin via OpenTimestamps (proof downloadable from the verification page)"
             if anchor in ("pending", "confirmed") else "Bitcoin timestamp: not yet anchored")

    # Right column: artwork + QR
    rx, rw = 200, 73
    raw = storage.read_image(record["image_path"]) if record.get("image_path") else None
    if raw:
        try:
            img = Image.open(io.BytesIO(raw)).convert("RGB")
            img.thumbnail((700, 700))
            box = 62
            ratio = img.width / img.height
            iw, ih = (box, box / ratio) if ratio >= 1 else (box * ratio, box)
            # Embed as JPEG; a PIL image would be stored losslessly (~1 MB)
            jpeg = io.BytesIO()
            img.save(jpeg, "JPEG", quality=85)
            jpeg.seek(0)
            pdf.set_fill_color(*SOFT)
            pdf.rect(rx, top, rw, box + 11, "F")
            pdf.image(jpeg, x=rx + (rw - iw) / 2, y=top + 5.5 + (box - ih) / 2, w=iw, h=ih)
        except Exception:
            pass

    qr_size = 40
    qy = 112
    pdf.image(_qr_image(verify_url(record["id"])), x=rx + (rw - qr_size) / 2, y=qy, w=qr_size, h=qr_size)
    pdf.set_xy(rx, qy + qr_size + 2)
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(*INK)
    pdf.cell(rw, 5, "Scan to verify", align="C", new_x=XPos.LEFT, new_y=YPos.NEXT)
    pdf.set_font("Helvetica", "", 7)
    pdf.set_text_color(*MUTED)
    pdf.multi_cell(rw, 3.5, latin1(verify_url(record["id"])), align="C")

    # Footer
    pdf.set_draw_color(*LINE)
    pdf.line(left, H - 30, W - 24, H - 30)
    pdf.set_xy(left, H - 27)
    pdf.set_font("Helvetica", "", 7.5)
    pdf.set_text_color(*MUTED)
    pdf.multi_cell(
        W - 48, 3.8,
        "The registry hash is the SHA-256 of this record's canonical data, including its fingerprints and the hash of the "
        "entry before it. Changing any registered detail after the fact would change this hash and break every later link "
        "in the chain. Scan the QR code or open the link beside it to verify this certificate.",
    )
    return bytes(pdf.output())


@router.get("/{work_id}/certificate")
async def generate_certificate(work_id: str, db = Depends(get_db)):
    record = await db.works.find_one({"id": work_id}, {"ots_proof": 0})
    if not record:
        raise HTTPException(status_code=404, detail="Work not found")
    pdf_bytes = build_certificate(record, await verify_record(db, record))
    return Response(
        pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="certificate_{work_id}.pdf"'},
    )
