import html
import re
from html.parser import HTMLParser


class _TextFromHTML(HTMLParser):
    BLOCK_TAGS = {"br", "p", "div", "li", "h1", "h2", "h3", "h4", "tr", "section"}
    HIDDEN_TAGS = {"script", "style", "noscript", "svg"}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []
        self.hidden_depth = 0

    def handle_starttag(self, tag, attrs):
        if tag in self.HIDDEN_TAGS:
            self.hidden_depth += 1
        elif not self.hidden_depth and tag in self.BLOCK_TAGS:
            self.parts.append("\n")

    def handle_endtag(self, tag):
        if tag in self.HIDDEN_TAGS and self.hidden_depth:
            self.hidden_depth -= 1
        elif not self.hidden_depth and tag in self.BLOCK_TAGS:
            self.parts.append("\n")

    def handle_data(self, data):
        if not self.hidden_depth:
            self.parts.append(data)


def clean_source_text(value: str | None) -> str:
    """Convert provider HTML/Markdown fragments into readable plain text."""
    if not value:
        return ""
    text = html.unescape(str(value))
    parser = _TextFromHTML()
    try:
        parser.feed(text)
        text = "".join(parser.parts)
    except Exception:
        pass

    text = re.sub(r"!\[([^\]]*)\]\([^)]*\)", r"\1", text)
    text = re.sub(r"\[([^\]]+)\]\((?:[^()]|\([^()]*\))*\)", r"\1", text)
    # LLM output can be truncated mid-link; remove the unfinished destination too.
    text = re.sub(r"\[([^\]]+)\]\(https?://[^\s]*", r"\1", text)
    text = re.sub(r"^\s{0,3}#{1,6}\s*", "", text, flags=re.MULTILINE)
    text = re.sub(r"^\s*[-*+]\s+", "• ", text, flags=re.MULTILINE)
    text = re.sub(r"^\s*>\s?", "", text, flags=re.MULTILINE)
    text = re.sub(r"`{1,3}", "", text)
    text = re.sub(r"\*\*(.*?)\*\*|__(.*?)__", lambda m: m.group(1) or m.group(2) or "", text)
    text = re.sub(r"(?<!\w)[*_~](.*?)[*_~](?!\w)", r"\1", text)
    text = re.sub(r"^\s*\[[^\]]+\]:\s*\S+.*$", "", text, flags=re.MULTILINE)
    text = re.sub(r"\r", "", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r" *\n *", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    # Release feeds often repeat the same heading or status line in nested
    # product sections. Remove adjacent duplicates without losing distinct entries.
    lines = []
    previous_content_line = None
    for line in text.splitlines():
        if line.strip():
            if line.strip().casefold() == previous_content_line:
                continue
            previous_content_line = line.strip().casefold()
        lines.append(line)
    return "\n".join(lines).strip()


_CRITICAL_PATTERNS = re.compile(
    r"\b(breaking change|backwards?[- ]incompatible|incompatible change|"
    r"required (?:query )?parameter|authentication (?:has )?changed|"
    r"(?:endpoint|field|parameter|method) (?:was |has been |will be )?removed|"
    r"no longer supported)\b",
    re.IGNORECASE,
)
_WARNING_PATTERNS = re.compile(
    r"\b(deprecated|deprecation|sunset|end of support|will be discontinued|"
    r"support ends|major version upgrade)\b",
    re.IGNORECASE,
)


def classify_change_severity(content: str, suggested: str = "INFO") -> str:
    """Keep severity conservative unless the source contains clear impact language."""
    evidence = clean_source_text(content)
    if _CRITICAL_PATTERNS.search(evidence):
        return "CRITICAL"
    if _WARNING_PATTERNS.search(evidence):
        return "WARNING"
    # Model/provider severity alone is not enough evidence for a breaking-change alert.
    return "INFO"


_GENERIC_RSS_TITLE = re.compile(
    r"^(?:change|changes|update|updates|release|20\d{2}[-/]\d{1,2}[-/]\d{1,2}|"
    r"(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2},?\s+20\d{2})$",
    re.IGNORECASE,
)


def improve_rss_title(title: str, content: str) -> str:
    clean_title = clean_source_text(title)
    clean_content = clean_source_text(content)
    lines = [line.strip() for line in clean_content.splitlines() if line.strip()]
    if _GENERIC_RSS_TITLE.fullmatch(clean_title.strip()):
        first_line = lines[0] if lines else ""
        if first_line:
            return first_line[:500]
    if lines and lines[0].casefold() == clean_title.strip().casefold():
        release_id = next(
            (match for line in lines[1:] if (match := re.search(r"\b20\d{6}[-.]\d{4}(?:-[a-z0-9.-]+)?\b", line, re.IGNORECASE))),
            None,
        )
        if release_id:
            return f"{clean_title} · {release_id.group(0)}"[:500]
    return clean_title[:500] or "Provider update"
