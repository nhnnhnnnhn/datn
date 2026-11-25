"""Outbound email helpers (SMTP)."""

from __future__ import annotations

import smtplib
from email.message import EmailMessage

from app.core.config import get_settings
from app.core.log import get_logger

log = get_logger("email")


def smtp_configured() -> bool:
    settings = get_settings()
    return bool(settings.smtp_host and (settings.smtp_from or settings.smtp_user))


def send_email(*, to: str, subject: str, text: str, html: str | None = None) -> bool:
    """Send one email. Returns True on success; False if SMTP is missing or send fails."""
    settings = get_settings()
    if not smtp_configured():
        log.warning("SMTP not configured; skip send to %s", to)
        return False

    from_addr = (settings.smtp_from or settings.smtp_user).strip()
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = from_addr
    msg["To"] = to
    msg.set_content(text)
    if html:
        msg.add_alternative(html, subtype="html")

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=20) as smtp:
            if settings.smtp_use_tls:
                smtp.starttls()
            if settings.smtp_user:
                smtp.login(settings.smtp_user, settings.smtp_password)
            smtp.send_message(msg)
    except Exception:
        log.exception("Failed to send email to %s", to)
        return False

    log.info("Sent email to %s (%s)", to, subject)
    return True


def send_password_reset_email(*, to: str, reset_token: str, name: str = "") -> bool:
    settings = get_settings()
    minutes = settings.password_reset_expire_minutes
    greeting = f"Xin chào {name}," if name.strip() else "Xin chào,"
    subject = "Mã đặt lại mật khẩu VIVID"
    text = (
        f"{greeting}\n\n"
        f"Bạn (hoặc ai đó) đã yêu cầu đặt lại mật khẩu tài khoản VIVID.\n\n"
        f"Mã đặt lại của bạn: {reset_token}\n\n"
        f"Mã có hiệu lực trong {minutes} phút. "
        "Nếu bạn không yêu cầu, hãy bỏ qua email này.\n"
    )
    code_style = (
        "font-family:monospace;font-size:28px;letter-spacing:0.2em;"
        "font-weight:700;background:#f5f5f4;padding:16px;"
        "border-radius:8px;display:inline-block"
    )
    html = (
        "<html><body>"
        f"<p>{greeting}</p>"
        "<p>Bạn (hoặc ai đó) đã yêu cầu đặt lại mật khẩu tài khoản "
        "<strong>VIVID</strong>.</p>"
        "<p>Mã đặt lại của bạn:</p>"
        f'<p style="{code_style}">{reset_token}</p>'
        "<p>Mã có hiệu lực trong "
        f"<strong>{minutes} phút</strong>. "
        "Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>"
        "</body></html>"
    )
    return send_email(to=to, subject=subject, text=text, html=html)
