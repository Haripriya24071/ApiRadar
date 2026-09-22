import json
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
import httpx
import yaml
from deepdiff import DeepDiff
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.api_catalog import APICatalog
from models.openapi_snapshot import OpenAPISnapshot

async def fetch_spec(url: str) -> Optional[dict]:
    try:
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            response = await client.get(url)
            response.raise_for_status()
            text = response.text

            if url.endswith(".yaml") or url.endswith(".yml"):
                return yaml.safe_load(text)
            
            # Try parsing JSON first
            try:
                return json.loads(text)
            except json.JSONDecodeError:
                # Fallback to YAML if JSON decode fails
                return yaml.safe_load(text)
    except Exception as e:
        print(f"Error fetching OpenAPI spec from {url}: {e}")
        return None

def classify_diff(change_type: str, path: str) -> str:
    path_lower = path.lower()
    if change_type == "dictionary_item_removed" and "paths" in path_lower:
        return "CRITICAL"
    if change_type == "dictionary_item_removed" and "required" in path_lower:
        return "CRITICAL"
    if change_type == "dictionary_item_added" and "required" in path_lower:
        return "CRITICAL"
    if change_type == "type_changes" and "schema" in path_lower:
        return "WARNING"
    if change_type == "values_changed" and "deprecated" in path_lower:
        return "WARNING"
    if change_type == "dictionary_item_added" and "paths" in path_lower:
        return "INFO"
    return "INFO"

async def diff_api_spec(api: APICatalog, db: AsyncSession) -> List[Dict[str, Any]]:
    if not api.openapi_spec_url:
        return []

    current_spec = await fetch_spec(api.openapi_spec_url)
    if not current_spec or not isinstance(current_spec, dict):
        return []

    # Query latest snapshot
    stmt = (
        select(OpenAPISnapshot)
        .where(OpenAPISnapshot.api_id == api.id)
        .order_by(OpenAPISnapshot.fetched_at.desc())
    )
    res = await db.execute(stmt)
    last_snapshot = res.scalars().first()

    spec_ver = None
    if isinstance(current_spec.get("info"), dict):
        spec_ver = str(current_spec["info"].get("version", ""))

    if not last_snapshot:
        # Save current spec as initial snapshot
        first_snapshot = OpenAPISnapshot(
            api_id=api.id,
            spec_json=current_spec,
            spec_version=spec_ver
        )
        db.add(first_snapshot)
        await db.commit()
        return []

    diff = DeepDiff(last_snapshot.spec_json, current_spec, ignore_order=True)
    if not diff:
        return []

    changes = []
    now_utc = datetime.now(timezone.utc)

    for change_type, change_data in diff.items():
        if isinstance(change_data, dict):
            paths_iter = change_data.keys()
        elif isinstance(change_data, (set, list)):
            paths_iter = change_data
        else:
            paths_iter = [str(change_data)]

        for path_key in paths_iter:
            path_str = str(path_key)
            severity = classify_diff(change_type, path_str)

            affected = [path_str] if "paths" in path_str.lower() else []
            change_dict = {
                "api_id": api.id,
                "source": "openapi_diff",
                "severity": severity,
                "title": f"OpenAPI spec change detected in {api.name}: {change_type}",
                "what_changed": f"{change_type} at path: {path_str}",
                "affected_endpoints": affected,
                "deadline_date": None,
                "migration_summary": "Review the OpenAPI spec diff and update your integration accordingly.",
                "effort_estimate": None,
                "raw_content": str(diff)[:500],
                "published_at": now_utc,
            }
            changes.append(change_dict)

    # Save new snapshot
    new_snapshot = OpenAPISnapshot(
        api_id=api.id,
        spec_json=current_spec,
        spec_version=spec_ver
    )
    db.add(new_snapshot)
    await db.commit()

    return changes
