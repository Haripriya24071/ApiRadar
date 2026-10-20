import hashlib
import hmac
from datetime import datetime, timezone
from html import escape

import httpx
from fastapi import Request, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from models.login_device import LoginDevice
from models.user import User


DEVICE_COOKIE = "apiradar_device"
DEVICE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365


def _device_digest(raw_device_id: str) -> str:
    return hmac.new(settings.SECRET_KEY.encode(), raw_device_id.encode(), hashlib.sha256).hexdigest()


async def register_login_device(user: User, request: Request, response: Response, db: AsyncSession) -> bool:
    """Remember this browser without persisting its raw, HttpOnly device cookie."""
    raw_device_id = request.cookies.get(DEVICE_COOKIE)
    is_new_device = not raw_device_id
    if not raw_device_id:
        import secrets
        raw_device_id = secrets.token_urlsafe(32)
        response.set_cookie(
            DEVICE_COOKIE,
            raw_device_id,
            max_age=DEVICE_COOKIE_MAX_AGE,
            httponly=True,
            secure=settings.APP_ENV.lower() in {"production", "prod"},
            samesite="lax",
            path="/",
        )

    digest = _device_digest(raw_device_id)
    result = await db.execute(select(LoginDevice).where(
        LoginDevice.user_id == user.id,
        LoginDevice.device_hash == digest,
    ))
    device = result.scalar_one_or_none()
    now = datetime.now(timezone.utc)
    if device is None:
        db.add(LoginDevice(user_id=user.id, device_hash=digest, last_seen_at=now))
        is_new_device = True
    else:
        device.last_seen_at = now
    await db.commit()
    return is_new_device


async def send_new_device_alert(email: str, user_agent: str) -> bool:
    if not settings.RESEND_API_KEY or not settings.EMAIL_FROM:
        print("[Login Alert] Resend API key or verified sender is not configured; skipping new-device email.")
        return False

    browser = escape((user_agent or "Unknown browser")[:300])
    html = (
        "<div style='font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#202124'>"
        "<h2>New sign-in to ApiRadar</h2>"
        f"<p>Your ApiRadar account was signed in from a new browser or device: <b>{browser}</b>.</p>"
        "<p>If this was you, no action is needed. If you do not recognize this sign-in, "
        "change your password and review the accounts connected to ApiRadar.</p>"
        "</div>"
    )
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {settings.RESEND_API_KEY}", "Content-Type": "application/json"},
                json={
                    "from": settings.EMAIL_FROM,
                    "to": [email],
                    "subject": "New sign-in to ApiRadar",
                    "html": html,
                },
            )
            response.raise_for_status()
        return True
    except Exception as exc:
        # Mail delivery must never make an otherwise valid sign-in fail.
        print(f"[Login Alert] Could not send new-device alert: {type(exc).__name__}")
        return False
