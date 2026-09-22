import json
from typing import Dict, Any
from scrapers.base import RawChange
from config import settings

def summarize_change(raw_change: RawChange) -> Dict[str, Any]:
    content_lower = (raw_change.title + " " + raw_change.content).lower()
    severity = "info"
    if "deprecated" in content_lower or "deprecation" in content_lower:
        severity = "deprecated"
    elif "breaking" in content_lower or "removed" in content_lower or "disabled" in content_lower:
        severity = "breaking"

    return {
        "api_id": raw_change.api_id,
        "source": raw_change.source,
        "severity": severity,
        "title": raw_change.title,
        "what_changed": raw_change.content,
        "affected_endpoints": [],
        "deadline_date": None,
        "migration_summary": "Review details in raw change source.",
        "effort_estimate": "medium" if severity in ["breaking", "deprecated"] else "low",
        "raw_content": f"URL: {raw_change.url}\n\n{raw_change.content}",
        "published_at": raw_change.published_at,
    }
