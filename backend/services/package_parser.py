from typing import Dict, List, Tuple, Any

KNOWN_MAPPINGS = {
    "stripe": "stripe",
    "@stripe/stripe-js": "stripe",
    "openai": "openai",
    "groq": "groq",
    "langchain-groq": "groq",
    "@supabase/supabase-js": "supabase",
    "supabase": "supabase",
    "supabase-py": "supabase",
    "twilio": "twilio",
    "@sendgrid/mail": "sendgrid",
    "sendgrid": "sendgrid",
    "@octokit/rest": "github",
    "octokit": "github",
    "pygithub": "github",
    "google-genai": "gemini",
    "google-generativeai": "gemini",
    "langchain-google-genai": "gemini",
    "google-cloud-aiplatform": "vertex-ai",
    "langchain-google-vertexai": "vertex-ai",
    "newsapi-python": "newsapi",
    "newsapi": "newsapi",
    "wbgapi": "world-bank",
    "wbdata": "world-bank",
    "crunchbase": "crunchbase",
    "crunchbase-api": "crunchbase",
    "google-cloud-bigquery": "bigquery",
    "google-cloud-storage": "cloud-storage",
}

def parse_package_json(content: Dict[str, Any]) -> List[Tuple[str, str]]:
    packages = []
    # Accept the parser's normalized payload and the API's legacy key name.
    deps = content.get("dependencies", content.get("requirements", {}))
    if isinstance(deps, dict):
        for pkg, ver in deps.items():
            if isinstance(pkg, str) and isinstance(ver, str):
                packages.append((pkg, ver))
                
    dev_deps = content.get("devDependencies", {})
    if isinstance(dev_deps, dict):
        for pkg, ver in dev_deps.items():
            if isinstance(pkg, str) and isinstance(ver, str):
                packages.append((pkg, ver))
                
    return packages

def parse_requirements_txt(content: Dict[str, Any]) -> List[Tuple[str, str]]:
    """Normalize a requirements.txt dependency dictionary for the shared matcher."""
    deps = content.get("dependencies", content.get("requirements", {}))
    if not isinstance(deps, dict):
        return []
    return [(pkg, ver if isinstance(ver, str) else "")
            for pkg, ver in deps.items() if isinstance(pkg, str)]

def match_apis_to_catalog(packages: List[Tuple[str, str]], catalog_apis: List[Any]) -> List[Dict[str, Any]]:
    catalog_by_slug = {api.slug: api for api in catalog_apis}
    matched_results = []
    seen_slugs = set()

    for pkg_name, ver_str in packages:
        slug = KNOWN_MAPPINGS.get(pkg_name.strip().lower().replace("_", "-"))
        if slug and slug in catalog_by_slug and slug not in seen_slugs:
            api_obj = catalog_by_slug[slug]
            clean_ver = ver_str.strip()
            sdk_ver = f"{pkg_name}@{clean_ver}" if clean_ver else pkg_name
            matched_results.append({
                "api": api_obj,
                "sdk_version": sdk_ver
            })
            seen_slugs.add(slug)

    return matched_results
