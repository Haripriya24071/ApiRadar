import asyncio
from datetime import datetime, timedelta, timezone
from typing import List
from sqlalchemy import select
from sqlalchemy.orm import selectinload
import resend

from tasks.celery_app import celery_app
from database import SessionLocal
from config import settings
from models.user import User
from models.stack_profile import StackProfile, WatchedAPI
from models.change_event import ChangeEvent

def build_digest_email(user_email: str, changes: List[ChangeEvent]) -> str:
    """
    Builds a clean, dark-themed HTML email digest with inline CSS styling.
    """
    rows_html = ""
    for change in changes:
        severity = (change.severity or "INFO").upper()
        if severity == "CRITICAL":
            badge_color = "#ef4444"
            badge_bg = "rgba(239, 68, 68, 0.15)"
            badge_border = "#ef4444"
        elif severity == "WARNING":
            badge_color = "#f59e0b"
            badge_bg = "rgba(245, 158, 11, 0.15)"
            badge_border = "#f59e0b"
        else:
            badge_color = "#3b82f6"
            badge_bg = "rgba(59, 130, 246, 0.15)"
            badge_border = "#3b82f6"

        api_name = change.api.name if hasattr(change, "api") and change.api else "Watched API"
        title = change.title or "API Change Event"
        
        mig_summary = change.migration_summary or ""
        if len(mig_summary) > 200:
            mig_summary = mig_summary[:200] + "..."

        deadline_str = ""
        if change.deadline_date:
            deadline_str = f'<div style="margin-top: 8px; font-size: 12px; color: #ef4444; font-weight: 600;">⏰ Action Deadline: {change.deadline_date}</div>'

        migration_html = ""
        if mig_summary:
            migration_html = f'<div style="margin-top: 8px; font-size: 13px; color: #94a3b8; line-height: 1.5; background-color: #0f172a; padding: 10px; border-radius: 6px; border: 1px solid #1e293b;">{mig_summary}</div>'

        rows_html += f"""
        <div style="background-color: #1e1e2e; border: 1px solid #2e2e44; border-radius: 10px; padding: 16px; margin-bottom: 16px;">
          <div style="margin-bottom: 8px;">
            <span style="display: inline-block; padding: 3px 8px; font-size: 11px; font-weight: 700; text-transform: uppercase; color: {badge_color}; background-color: {badge_bg}; border: 1px solid {badge_border}; border-radius: 4px; margin-right: 8px;">{severity}</span>
            <span style="font-size: 13px; font-weight: 600; color: #6366f1; background-color: #1e1b4b; padding: 3px 8px; border-radius: 4px;">{api_name}</span>
          </div>
          <div style="font-size: 15px; font-weight: 700; color: #ffffff; line-height: 1.4;">{title}</div>
          {migration_html}
          {deadline_str}
        </div>
        """

    html = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>ApiRadar Daily Digest</title>
</head>
<body style="background-color: #0b0b10; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 24px; color: #e2e8f0;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #111118; border: 1px solid #1e1e2e; border-radius: 12px; padding: 28px; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);">
    
    <!-- Header -->
    <div style="text-align: center; border-bottom: 1px solid #1e1e2e; padding-bottom: 20px; margin-bottom: 24px;">
      <h1 style="font-size: 22px; font-weight: 800; color: #ffffff; margin: 0 0 6px 0;">🛰️ ApiRadar Daily Digest</h1>
      <p style="font-size: 14px; color: #94a3b8; margin: 0;">Here's what changed in your stack in the last 24 hours</p>
    </div>

    <!-- Changes List -->
    <div>
      {rows_html}
    </div>

    <!-- Footer -->
    <div style="text-align: center; border-top: 1px solid #1e1e2e; padding-top: 20px; margin-top: 28px; font-size: 12px; color: #64748b;">
      You're receiving this because you watch these APIs on ApiRadar
    </div>

  </div>
</body>
</html>"""
    return html

def send_email_via_resend(to_email: str, subject: str, html_content: str) -> bool:
    if not settings.RESEND_API_KEY:
        print(f"[Email Digest] RESEND_API_KEY not configured. Skipping email send to {to_email}.")
        return False

    try:
        resend.api_key = settings.RESEND_API_KEY
        resend.Emails.send({
            "from": "ApiRadar <onboarding@resend.dev>",
            "to": [to_email],
            "subject": subject,
            "html": html_content,
        })
        print(f"[Email Digest] Successfully sent daily digest email to {to_email}")
        return True
    except Exception as e:
        print(f"[Email Digest] Failed to send email to {to_email}: {e}")
        return False

async def _async_send_daily_digests():
    emails_sent = 0
    twenty_four_hours_ago = datetime.now(timezone.utc) - timedelta(hours=24)

    async with SessionLocal() as db:
        res_users = await db.execute(select(User))
        users = res_users.scalars().all()

        for user in users:
            # Get all watched api_ids across all stack profiles for this user
            stmt_watched = (
                select(WatchedAPI.api_id)
                .join(StackProfile, WatchedAPI.profile_id == StackProfile.id)
                .where(StackProfile.user_id == user.id)
            )
            res_watched = await db.execute(stmt_watched)
            watched_api_ids = list(res_watched.scalars().all())

            if not watched_api_ids:
                continue

            # Query change_events from last 24 hours WHERE api_id IN watched_api_ids
            # Filter to only CRITICAL and WARNING severity
            stmt_changes = (
                select(ChangeEvent)
                .where(
                    ChangeEvent.api_id.in_(watched_api_ids),
                    ChangeEvent.created_at >= twenty_four_hours_ago,
                    ChangeEvent.severity.in_(["CRITICAL", "WARNING"])
                )
                .options(selectinload(ChangeEvent.api))
                .order_by(ChangeEvent.created_at.desc())
            )
            res_changes = await db.execute(stmt_changes)
            changes = list(res_changes.scalars().all())

            if not changes:
                continue

            # Build HTML digest email & send via Resend API
            email_html = build_digest_email(user.email, changes)
            sent = send_email_via_resend(user.email, "🛰️ ApiRadar Daily Digest", email_html)
            if sent:
                emails_sent += 1

    return {"status": "ok", "emails_sent": emails_sent}

@celery_app.task
def send_daily_digests():
    print("Email digest task triggered")
    try:
        return asyncio.run(_async_send_daily_digests())
    except Exception as e:
        print(f"Error in send_daily_digests task: {e}")
        return {"status": "error", "message": str(e)}
