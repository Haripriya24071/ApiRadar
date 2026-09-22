import json
from datetime import date
from typing import List, Dict, Any, Optional
from openai import AsyncOpenAI
from config import settings
from llm.cache import LLMCache

cache = LLMCache()

def _parse_deadline_date(val: Any) -> Optional[date]:
    if not val or not isinstance(val, str):
        return None
    try:
        return date.fromisoformat(val.strip())
    except Exception:
        return None

async def summarize_change(raw) -> List[Dict[str, Any]]:
    cached_result = cache.get(raw.content)
    if cached_result is not None and isinstance(cached_result, list):
        for c in cached_result:
            if isinstance(c.get("deadline_date"), str):
                c["deadline_date"] = _parse_deadline_date(c["deadline_date"])
        return cached_result

    def build_fallback(severity: str = "INFO") -> List[Dict[str, Any]]:
        content_lower = (raw.title + " " + raw.content).lower()
        if "deprecated" in content_lower:
            sev = "WARNING"
        elif "breaking" in content_lower or "removed" in content_lower:
            sev = "CRITICAL"
        else:
            sev = severity

        res = [{
            "severity": sev,
            "title": raw.title[:100],
            "what_changed": raw.content[:500],
            "affected_endpoints": [],
            "deadline_date": None,
            "migration_summary": None,
            "effort_estimate": None
        }]
        cache.set(raw.content, res)
        return res

    api_key = settings.OPENAI_API_KEY
    if not api_key or api_key.startswith("sk-..."):
        return build_fallback()

    system_prompt = (
        "You are an API breaking-change analyst. Read raw API changelog text and extract structured intelligence about changes that could break developer applications.\n"
        "Respond with ONLY valid JSON. No explanations, no markdown fences.\n\n"
        "Severity definitions:\n"
        "- CRITICAL: endpoint removed, required parameter added, authentication changed, breaking status code change, field removed\n"
        "- WARNING: field deprecated, response type changed, field renamed, rate limit changed, SDK major version bump\n"
        "- INFO: new optional field added, documentation update, new endpoint added, minor SDK version bump"
    )

    user_prompt = (
        f"API Name: {raw.api_name}\n"
        f"Source: {raw.source}\n"
        f"Published: {raw.published_at}\n"
        f"URL: {raw.url}\n\n"
        f"Raw Content:\n"
        f"{raw.content[:3000]}\n\n"
        "Extract ALL change events from this content. Return a JSON object with a single key \"changes\" containing an array:\n"
        "{\n"
        "  \"changes\": [\n"
        "    {\n"
        "      \"severity\": \"CRITICAL|WARNING|INFO\",\n"
        "      \"title\": \"one-line summary under 100 chars\",\n"
        "      \"what_changed\": \"precise technical description\",\n"
        "      \"affected_endpoints\": [\"list of endpoints or empty array\"],\n"
        "      \"deadline_date\": \"YYYY-MM-DD or null\",\n"
        "      \"migration_summary\": \"what the developer should do, or null\",\n"
        "      \"effort_estimate\": \"e.g. 1-2 hours, or null\"\n"
        "    }\n"
        "  ]\n"
        "}\n\n"
        "If this content contains no breaking changes or API changes at all, return {\"changes\": []}."
    )

    try:
        client = AsyncOpenAI(api_key=api_key)
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            response_format={"type": "json_object"},
            max_tokens=1000,
        )

        raw_json_str = response.choices[0].message.content
        data = json.loads(raw_json_str)
        changes_list = data.get("changes", [])

        if not isinstance(changes_list, list):
            return build_fallback()

        structured_changes = []
        cache_serializable_changes = []

        for item in changes_list:
            if not isinstance(item, dict):
                continue
            
            raw_deadline = item.get("deadline_date")
            parsed_deadline = _parse_deadline_date(raw_deadline)

            change_dict = {
                "severity": item.get("severity", "INFO"),
                "title": str(item.get("title", raw.title))[:100],
                "what_changed": item.get("what_changed") or raw.content[:500],
                "affected_endpoints": item.get("affected_endpoints") if isinstance(item.get("affected_endpoints"), list) else [],
                "deadline_date": parsed_deadline,
                "migration_summary": item.get("migration_summary"),
                "effort_estimate": item.get("effort_estimate"),
            }
            structured_changes.append(change_dict)

            cache_item = change_dict.copy()
            cache_item["deadline_date"] = raw_deadline if parsed_deadline else None
            cache_serializable_changes.append(cache_item)

        cache.set(raw.content, cache_serializable_changes)
        return structured_changes

    except Exception as e:
        print(f"Error in OpenAI summarization: {e}")
        return build_fallback()
