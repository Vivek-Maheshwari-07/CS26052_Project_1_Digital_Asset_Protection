"""Takedown notices and licence offers for a case, as text and as a PDF evidence pack.

Three templates, each filled from the case, the registered work, the check that found the copy, the
gate's grade and its plain-language "what changed" description:

  dmca     A notice with every element 17 U.S.C. 512(c)(3) asks for (for platforms that follow the DMCA)
  india    A complaint to an intermediary's Grievance Officer under the IT Rules, 2021
  license  A friendly offer to license the use after the fact instead of a takedown

These are templates for the creator to review, not legal advice; the UI says so. Wording follows the
evidence grade: a lead is never described as proof, and needs the creator's own review first.
"""
import io
from dataclasses import dataclass
from datetime import date, datetime, timezone
from typing import Optional

from fpdf import FPDF
from fpdf.enums import XPos, YPos
from PIL import Image

from app import storage
from app.certificate.generate import BRAND, INK, MUTED, SOFT, _qr_image, latin1, verify_url

PLATFORMS = {
    "instagram": ("Instagram", "Instagram's copyright report form (Help Centre > Intellectual property)"),
    "facebook": ("Facebook", "Facebook's copyright report form (Help Centre > Intellectual property)"),
    "youtube": ("YouTube", "YouTube's copyright takedown webform (YouTube Studio > Copyright)"),
    "x": ("X (Twitter)", "X's copyright report form (Help Centre > Copyright)"),
    "pinterest": ("Pinterest", "Pinterest's copyright report form"),
    "etsy": ("Etsy", "Etsy's intellectual property report form"),
    "redbubble": ("Redbubble", "Redbubble's intellectual property report form"),
    "amazon": ("Amazon", "Amazon's 'Report infringement' form"),
    "website": ("Website", "the site owner, or the copyright/abuse contact of the company hosting the site"),
    "other": ("Other", "the platform's copyright or grievance contact"),
}
# How a platform is named inside a sentence, where it differs from its label
_IN_SENTENCE = {"website": "the website", "other": "the platform"}


def platform_name(key: str) -> str:
    return _IN_SENTENCE.get(key) or PLATFORMS.get(key, PLATFORMS["other"])[0]
NOTICE_TYPES = ("dmca", "india", "license")
MISSING_URL = "[add the link to the copy]"


@dataclass
class Complainant:
    name: str
    email: str
    address: str = ""
    phone: str = ""


def _when(dt) -> str:
    if isinstance(dt, str):
        dt = datetime.fromisoformat(dt)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.strftime("%d %B %Y, %H:%M UTC")


def _evidence_paragraph(ctx: dict) -> str:
    """What the comparison showed, worded no stronger than its grade."""
    if ctx["grade"] == "evidence":
        lines = ["An image comparison aligned the copy onto my registered original and found pixel evidence that it "
                 "is derived from it: the regions that were not edited match pixel for pixel."]
    else:
        lines = ["An image comparison found the copy closely related to my registered original, and I have compared "
                 "the two images myself."]
    changes = ctx.get("changes")
    if changes and changes.get("items"):
        lines.append("What was changed in the copy: " + changes["headline"])
        lines += [f"  - {i['detail']}" for i in changes["items"]]
    return "\n".join(lines)


def _work_paragraph(ctx: dict) -> str:
    work = ctx["work"]
    lines = [f'"{work["title"]}" by {work["owner_name"]}, registered in the Provenance registry on '
             f'{_when(work["created_at"])} (registry entry {work["entry_hash"]}).']
    if work.get("ots_block_height") and work.get("ots_block_checked"):
        lines.append(f"The registration is timestamped in Bitcoin block {work['ots_block_height']}, which proves it existed "
                     f"no later than {_when(work['ots_block_time'])}.")
    lines.append(f"Public record anyone can verify: {verify_url(work['id'])}")
    return " ".join(lines)


def _copy_paragraph(case: dict) -> str:
    where = case.get("found_url") or MISSING_URL
    by = f", posted by {case['infringer']}" if case.get("infringer") else ""
    return f"{where}{by}"


def _contact(c: Complainant) -> str:
    return "\n".join(x for x in (c.name, c.email, c.address, c.phone) if x)


def build_notice(kind: str, ctx: dict, complainant: Complainant, license_fee: str = "", payment_link: str = "") -> dict:
    """{"subject", "body", "send_to"} for one of NOTICE_TYPES. `ctx` holds the case, work, check and grade."""
    case, work = ctx["case"], ctx["work"]
    key = case.get("platform") if case.get("platform") in PLATFORMS else "other"
    where, send_to = platform_name(key), PLATFORMS[key][1]
    today = date.today().strftime("%d %B %Y")
    title = work["title"]

    if kind == "dmca":
        subject = f'DMCA copyright infringement notice: "{title}"'
        body = f"""To the designated copyright agent of {where},

I am writing to report copyright infringement under the Digital Millennium Copyright Act, 17 U.S.C. 512(c)(3).

1. The copyrighted work:
{_work_paragraph(ctx)}

2. The infringing material, and where to find it:
{_copy_paragraph(case)}

{_evidence_paragraph(ctx)}

3. My contact information:
{_contact(complainant)}

4. I have a good faith belief that use of the material in the manner complained of is not authorized by the copyright owner, its agent, or the law.

5. The information in this notification is accurate, and under penalty of perjury, I am the owner, or authorized to act on behalf of the owner, of an exclusive right that is allegedly infringed.

Please remove or disable access to the infringing material.

Signature: /{complainant.name}/
Date: {today}"""
        return {"subject": subject, "body": body, "send_to": send_to}

    if kind == "india":
        subject = f'Copyright infringement complaint and request for removal: "{title}"'
        body = f"""To the Grievance Officer, {where},

I am the owner of the copyright in the following work, or authorised to act on the owner's behalf:
{_work_paragraph(ctx)}

The following material reproduces this work without my permission:
{_copy_paragraph(case)}

{_evidence_paragraph(ctx)}

Reproducing and communicating the work to the public without the owner's licence infringes copyright under Section 51 of the Copyright Act, 1957. Hosting it is contrary to Rule 3(1)(b) of the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021. I request that you remove or disable access to this material, and act on this complaint in accordance with Rule 3(2) of those Rules.

I declare that the information in this complaint is true and correct to the best of my knowledge.

{_contact(complainant)}
Date: {today}"""
        return {"subject": subject, "body": body, "send_to": f"the Grievance Officer listed on {where}'s website or app"}

    if kind == "license":
        greeting = f"Hi {case['infringer']}," if case.get("infringer") else "Hello,"
        fee = license_fee.strip() or "[your fee]"
        pay = f"\nYou can pay here: {payment_link.strip()}" if payment_link.strip() else ""
        subject = f'Licence for your use of "{title}"'
        body = f"""{greeting}

I'm {complainant.name}, the creator of "{title}". I noticed it is being used here without a licence:
{_copy_paragraph(case)}

{_work_paragraph(ctx)}

{_evidence_paragraph(ctx)}

Rather than filing a takedown, I'm happy to grant you a licence for this use, covering it from the start, for {fee}.{pay}

Please settle within 14 days, or remove the image. If you believe you already have permission to use it, just reply with the details.

Thanks,
{_contact(complainant)}"""
        return {"subject": subject, "body": body, "send_to": "the person or business using the image (direct message or email)"}

    raise ValueError(f"Unknown notice type: {kind}")


# ---------- PDF evidence pack ----------

def _image(rel: Optional[str]) -> Optional[Image.Image]:
    data = storage.read_image(rel) if rel else None
    if not data:
        return None
    try:
        img = Image.open(io.BytesIO(data))
        img.load()
        return img.convert("RGB")
    except Exception:
        return None


PDF_IMAGE_SIDE = 1200  # px: sharp when printed at this size, and keeps the pack small enough to attach


def _fit(pdf: FPDF, img: Image.Image, x: float, y: float, w: float, h: float) -> None:
    scale = min(w / img.width, h / img.height)
    iw, ih = img.width * scale, img.height * scale
    small = img.copy()
    small.thumbnail((PDF_IMAGE_SIDE, PDF_IMAGE_SIDE))
    buf = io.BytesIO()
    small.save(buf, "JPEG", quality=85)  # a PIL image would be embedded losslessly, megabytes each
    pdf.image(buf, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih)


def _heading(pdf: FPDF, kicker: str, title: str) -> None:
    pdf.set_font("Helvetica", "B", 8)
    pdf.set_text_color(*BRAND)
    pdf.cell(0, 5, latin1(kicker.upper()), new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.set_font("Helvetica", "B", 15)
    pdf.set_text_color(*INK)
    pdf.multi_cell(0, 7, latin1(title), new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.ln(2)


def _captioned(pdf: FPDF, img: Optional[Image.Image], caption: str, x: float, y: float, w: float, h: float) -> None:
    pdf.set_fill_color(*SOFT)
    pdf.rect(x, y, w, h, "F")
    if img is not None:
        _fit(pdf, img, x + 2, y + 2, w - 4, h - 4)
    pdf.set_xy(x, y + h + 1)
    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(*MUTED)
    pdf.cell(w, 4, latin1(caption), align="C")


def build_evidence_pack(notice: dict, ctx: dict) -> bytes:
    """Page 1: the notice. Page 2: the images and the measured changes. Page 3: the registration proof."""
    case, work, check = ctx["case"], ctx["work"], ctx["check"]
    pdf = FPDF(unit="mm", format="A4")
    pdf.set_margins(18, 18, 18)
    pdf.set_auto_page_break(True, 18)

    pdf.add_page()
    _heading(pdf, "Notice", notice["subject"])
    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(*MUTED)
    pdf.multi_cell(0, 4, latin1(f"Send to: {notice['send_to']}. Template prepared with Provenance; review it before sending. "
                                "It is not legal advice."), new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.ln(3)
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(*INK)
    pdf.multi_cell(0, 5, latin1(notice["body"]), new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    pdf.add_page()
    _heading(pdf, "Evidence", f'The copy and the registered original "{work["title"]}"')
    y = pdf.get_y() + 2
    col = (210 - 36 - 6) / 2
    _captioned(pdf, _image(check.get("image_path")), "The copy", 18, y, col, 70)
    _captioned(pdf, _image(work.get("image_path")), "Registered original", 18 + col + 6, y, col, 70)
    evidence = ctx.get("evidence_paths") or {}
    if evidence.get("overlay") or evidence.get("changes"):
        y2 = y + 80
        _captioned(pdf, _image(evidence.get("overlay")), "Copy aligned onto the original (50/50 blend)", 18, y2, col, 70)
        _captioned(pdf, _image(evidence.get("changes")), "Changed regions, tinted red", 18 + col + 6, y2, col, 70)
        pdf.set_y(y2 + 78)
    else:
        pdf.set_y(y + 78)
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(*INK)
    pdf.multi_cell(0, 5, latin1(_evidence_paragraph(ctx)), new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    changes = ctx.get("changes")
    if changes:
        pdf.ln(1)
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(*MUTED)
        pdf.multi_cell(0, 4.5, latin1(changes["footer"]), new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.ln(2)
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(*MUTED)
    pdf.multi_cell(0, 4.5, latin1(f"Copy found at: {case.get('found_url') or 'not recorded'}. "
                                  f"Checked on {_when(check['created_at'])} (check {check['id']})."),
                   new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    pdf.add_page()
    _heading(pdf, "Proof of registration", "Anyone can verify this without trusting Provenance")
    rows = [("Work", f'"{work["title"]}" by {work["owner_name"]}'),
            ("Registered", _when(work["created_at"])),
            ("Registry entry hash", work["entry_hash"])]
    if work.get("file_sha256"):
        rows.append(("Registered file SHA-256", work["file_sha256"]))
    if work.get("ots_block_height"):
        checked = "cross-checked with a public block explorer" if work.get("ots_block_checked") else "not yet cross-checked"
        when = f", mined {_when(work['ots_block_time'])}" if work.get("ots_block_time") else ""
        rows.append(("Bitcoin timestamp", f"block {work['ots_block_height']}{when} ({checked})"))
    else:
        rows.append(("Bitcoin timestamp", "submitted to OpenTimestamps; confirmation pending"))
    rows.append(("Public record", verify_url(work["id"])))
    for label, value in rows:
        pdf.set_font("Helvetica", "B", 7)
        pdf.set_text_color(*MUTED)
        pdf.cell(0, 4, latin1(label.upper()), new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        pdf.set_font("Courier" if "hash" in label.lower() or "SHA" in label else "Helvetica", "", 9)
        pdf.set_text_color(*INK)
        pdf.multi_cell(0, 5, latin1(value), new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        pdf.ln(1.5)
    y = pdf.get_y() + 2
    pdf.image(_qr_image(verify_url(work["id"])), 18, y, 34, 34)
    pdf.set_xy(56, y + 2)
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(*INK)
    pdf.multi_cell(0, 4.8, latin1("Scan to open the public record. It recomputes the record's hash, checks its place in the "
                                  "hash chain, and offers a verification kit: a script that checks the record, the Bitcoin "
                                  "timestamp and, given the original file, that it is the exact file that was registered."))
    return bytes(pdf.output())
