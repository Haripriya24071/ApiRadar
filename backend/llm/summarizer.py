import json
from datetime import date
from typing import List, Dict, Any, Optional
from openai import AsyncOpenAI
from config import settings
from llm.cache import LLMCache
from services.content_sanitizer import classify_change_severity
from services.content_sanitizer import clean_source_text

cache = LLMCache()

def _parse_deadline_date(val: Any) -> Optional[date]:
    if not val or not isinstance(val, str):
        return None
    try:
        return date.fromisoformat(val.strip())
    except Exception:
        return None

async def summarize_change(raw) -> List[Dict[str, Any]]:
    cache_key = f"{raw.api_name}\0{raw.source}\0{raw.url}\0{raw.content}"
    cached_result = cache.get(cache_key)
    if cached_result is not None and isinstance(cached_result, list):
        normalized_cached = []
        for item in cached_result:
            if not isinstance(item, dict):
                continue
            deadline = item.get("deadline_date")
            severity = str(item.get("severity", "INFO")).upper()
            endpoints = item.get("affected_endpoints")
            normalized_cached.append({
                "severity": classify_change_severity(raw.title + "\n" + raw.content, severity),
                "title": clean_source_text(str(item.get("title") or raw.title))[:100],
                "what_changed": clean_source_text(item.get("what_changed"))[:5000] if isinstance(item.get("what_changed"), str) else raw.content[:5000],
                "affected_endpoints": [value.strip()[:500] for value in endpoints if isinstance(value, str) and value.strip()][:100] if isinstance(endpoints, list) else [],
                "deadline_date": _parse_deadline_date(deadline) if isinstance(deadline, str) else deadline if isinstance(deadline, date) else None,
                "migration_summary": clean_source_text(item.get("migration_summary"))[:5000] if isinstance(item.get("migration_summary"), str) else None,
                "effort_estimate": item.get("effort_estimate")[:100] if isinstance(item.get("effort_estimate"), str) else None,
            })
        return normalized_cached

    def build_fallback(severity: str = "INFO") -> List[Dict[str, Any]]:
        sev = classify_change_severity(raw.title + "\n" + raw.content, severity)
        res = [{
            "severity": sev,
            "title": clean_source_text(raw.title)[:100],
            "what_changed": clean_source_text(raw.content)[:500],
            "affected_endpoints": [],
            "deadline_date": None,
            "migration_summary": None,
            "effort_estimate": None
        }]
        cache.set(cache_key, res)
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

    async def _call_openai():
        client = AsyncOpenAI(api_key=api_key)
        return await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            response_format={"type": "json_object"},
            max_tokens=1000,
        )

    try:
        try:
            response = await _call_openai()
        except Exception as api_err:
            err_str = str(api_err).lower()
            if "429" in err_str or "rate limit" in err_str or "ratelimit" in err_str:
                import asyncio
                print("OpenAI rate limit hit (429). Retrying in 10 seconds...")
                await asyncio.sleep(10)
                response = await _call_openai()
            else:
                raise api_err

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
            severity = str(item.get("severity", "INFO")).upper()
            if severity not in {"CRITICAL", "WARNING", "INFO"}:
                severity = "INFO"
            raw_endpoints = item.get("affected_endpoints")
            endpoints = (
                [endpoint.strip()[:500] for endpoint in raw_endpoints if isinstance(endpoint, str) and endpoint.strip()][:100]
                if isinstance(raw_endpoints, list)
                else []
            )
            migration_summary = item.get("migration_summary")
            effort_estimate = item.get("effort_estimate")

            change_dict = {
            "severity": classify_change_severity(raw.title + "\n" + raw.content, severity),
                "title": clean_source_text(str(item.get("title", raw.title)))[:100],
                "what_changed": (clean_source_text(item.get("what_changed"))[:5000] if isinstance(item.get("what_changed"), str) and item.get("what_changed") else clean_source_text(raw.content)[:5000]),
                "affected_endpoints": endpoints,
                "deadline_date": parsed_deadline,
                "migration_summary": clean_source_text(migration_summary)[:5000] if isinstance(migration_summary, str) else None,
                "effort_estimate": effort_estimate[:100] if isinstance(effort_estimate, str) else None,
            }
            structured_changes.append(change_dict)

            cache_item = change_dict.copy()
            cache_item["deadline_date"] = raw_deadline if parsed_deadline else None
            cache_serializable_changes.append(cache_item)

        cache.set(cache_key, cache_serializable_changes)
        return structured_changes

    except Exception as e:
        print(f"Error in OpenAI summarization: {e}")
        return build_fallback()
