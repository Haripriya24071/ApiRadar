from typing import Dict, List, Tuple, Any

KNOWN_MAPPINGS = {
    "stripe": "stripe",
    "@stripe/stripe-js": "stripe",
    "openai": "openai",
    "@supabase/supabase-js": "supabase",
    "twilio": "twilio",
    "@sendgrid/mail": "sendgrid",
    "@octokit/rest": "github",
    "octokit": "github"
}

def parse_package_json(content: Dict[str, Any]) -> List[Tuple[str, str]]:
    packages = []
    deps = content.get("dependencies", {})
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

def match_apis_to_catalog(packages: List[Tuple[str, str]], catalog_apis: List[Any]) -> List[Dict[str, Any]]:
    catalog_by_slug = {api.slug: api for api in catalog_apis}
    matched_results = []
    seen_slugs = set()

    for pkg_name, ver_str in packages:
        slug = KNOWN_MAPPINGS.get(pkg_name.lower())
        if slug and slug in catalog_by_slug and slug not in seen_slugs:
            api_obj = catalog_by_slug[slug]
            clean_ver = ver_str.strip().lstrip("^~=>")
            sdk_ver = f"{pkg_name}@{clean_ver}" if clean_ver else pkg_name
            matched_results.append({
                "api": api_obj,
                "sdk_version": sdk_ver
            })
            seen_slugs.add(slug)

    return matched_results
