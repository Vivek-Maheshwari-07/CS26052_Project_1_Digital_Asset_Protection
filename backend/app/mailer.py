import asyncio
import logging
import smtplib
import ssl
from email.message import EmailMessage

from app.config import settings

logger = logging.getLogger("uvicorn.error")

PURPOSE_COPY = {
    "signup": {
        "subject": "Your Provenance verification code",
        "heading": "Verify your email",
        "body": "Use the code below to finish creating your Provenance account.",
    },
    "reset": {
        "subject": "Your Provenance password reset code",
        "heading": "Reset your password",
        "body": "Use the code below to set a new password for your Provenance account.",
    },
}


def _render_html(name: str, code: str, purpose: str) -> str:
    copy = PURPOSE_COPY[purpose]
    digits = "".join(
        f'<span style="display:inline-block;width:44px;height:54px;line-height:54px;margin:0 4px;'
        f'border-radius:10px;background:#f1f0fb;color:#1e1b4b;font-size:26px;font-weight:700;'
        f'font-family:Menlo,Consolas,monospace;text-align:center;">{d}</span>'
        for d in code
    )
    return f"""\
<!doctype html>
<html><body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(30,27,75,.08);">
        <tr><td style="background:linear-gradient(135deg,#4f46e5,#9333ea);padding:28px 32px;">
          <div style="color:#fff;font-size:20px;font-weight:700;letter-spacing:-.01em;">&#9673; Provenance</div>
        </td></tr>
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 8px;font-size:22px;color:#111827;">{copy["heading"]}</h1>
          <p style="margin:0 0 24px;color:#4b5563;font-size:15px;line-height:1.6;">Hi {name},<br>{copy["body"]}</p>
          <div style="text-align:center;margin:0 0 24px;">{digits}</div>
          <p style="margin:0 0 8px;color:#6b7280;font-size:13px;">This code expires in {settings.OTP_EXPIRE_MINUTES} minutes.</p>
          <p style="margin:0;color:#9ca3af;font-size:13px;">If you didn't request this, you can safely ignore this email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>"""


def _send_smtp(msg: EmailMessage) -> None:
    if settings.SMTP_USE_SSL:
        with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, context=ssl.create_default_context(), timeout=20) as s:
            if settings.SMTP_USER:
                s.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            s.send_message(msg)
    else:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=20) as s:
            s.starttls(context=ssl.create_default_context())
            if settings.SMTP_USER:
                s.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            s.send_message(msg)


async def send_otp_email(to: str, name: str, code: str, purpose: str) -> None:
    """Send an OTP email. Raises on SMTP failure so callers can report it."""
    copy = PURPOSE_COPY[purpose]

    if not settings.email_enabled:
        logger.warning(
            "\n" + "=" * 60 +
            f"\n  [DEV EMAIL] SMTP not configured — {purpose} code for {to}: {code}\n" +
            "=" * 60
        )
        return

    msg = EmailMessage()
    msg["Subject"] = copy["subject"]
    sender = settings.EMAIL_FROM or settings.SMTP_USER
    msg["From"] = f"{settings.EMAIL_FROM_NAME} <{sender}>"
    msg["To"] = to
    msg.set_content(
        f"Hi {name},\n\n{copy['body']}\n\nYour code: {code}\n\n"
        f"It expires in {settings.OTP_EXPIRE_MINUTES} minutes. "
        "If you didn't request this, ignore this email."
    )
    msg.add_alternative(_render_html(name, code, purpose), subtype="html")

    await asyncio.to_thread(_send_smtp, msg)
