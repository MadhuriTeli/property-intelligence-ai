"""Conservative public-page collector. Respects robots.txt and never bypasses access controls."""
import json
import os
import re
import time
from collections import deque
from pathlib import Path
from urllib.parse import urljoin, urlparse, urldefrag
from urllib.robotparser import RobotFileParser
import requests
from bs4 import BeautifulSoup

USER_AGENT = "PropertyIntelligenceResearchBot/1.0 (educational project; contact: replace-with-your-email)"
MAX_PAGES = int(os.getenv("MAX_PAGES", "20"))
DELAY = float(os.getenv("REQUEST_DELAY_SECONDS", "1.5"))
SEEDS = [x.strip() for x in os.getenv(
    "SEED_URLS", "https://darglobal.co.uk/,https://wasalt.sa/"
).split(",") if x.strip()]
DATA_PATH = Path(os.getenv("DATA_PATH", "data/documents.json"))
TIMEOUT = 15

def canonical(url: str) -> str:
    return urldefrag(url)[0].rstrip("/")

def get_robots(origin: str) -> RobotFileParser:
    rp = RobotFileParser()
    rp.set_url(origin.rstrip("/") + "/robots.txt")
    try:
        rp.read()
    except Exception:
        # Conservative default: if robots cannot be checked, do not crawl.
        rp.parse(["User-agent: *", "Disallow: /"])
    return rp

def allowed_url(url: str, robots: dict[str, RobotFileParser]) -> bool:
    parsed = urlparse(url)
    origin = f"{parsed.scheme}://{parsed.netloc}"
    if origin not in robots:
        robots[origin] = get_robots(origin)
    return robots[origin].can_fetch(USER_AGENT, url)

def clean_text(soup: BeautifulSoup) -> str:
    for el in soup(["script", "style", "nav", "footer", "header", "noscript", "svg"]):
        el.decompose()
    text = re.sub(r"\s+", " ", soup.get_text(" ", strip=True))
    return text[:12000]

def source_name(url: str) -> str:
    host = urlparse(url).netloc.lower()
    if "darglobal" in host:
        return "DarGlobal"
    if "wasalt" in host:
        return "Wasalt"
    return host

def collect():
    session = requests.Session()
    session.headers.update({"User-Agent": USER_AGENT})
    robots: dict[str, RobotFileParser] = {}
    visited: set[str] = set()
    queue = deque(SEEDS)
    documents = []
    allowed_hosts = {urlparse(s).netloc.lower() for s in SEEDS}

    while queue and len(documents) < MAX_PAGES:
        url = canonical(queue.popleft())
        if not url or url in visited:
            continue
        visited.add(url)
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https") or parsed.netloc.lower() not in allowed_hosts:
            continue
        if not allowed_url(url, robots):
            print(f"Skipping disallowed by robots.txt: {url}")
            continue
        try:
            response = session.get(url, timeout=TIMEOUT, allow_redirects=True)
            if response.status_code in (401, 403, 429):
                print(f"Access restricted ({response.status_code}); stopping this URL: {url}")
                continue
            response.raise_for_status()
            content_type = response.headers.get("content-type", "")
            if "text/html" not in content_type:
                continue
        except requests.RequestException as exc:
            print(f"Could not fetch {url}: {exc.__class__.__name__}")
            continue

        soup = BeautifulSoup(response.text, "html.parser")
        title = soup.title.get_text(" ", strip=True) if soup.title else url
        text = clean_text(soup)
        if len(text) >= 100:
            documents.append({
                "title": title[:300],
                "url": response.url,
                "source": source_name(response.url),
                "text": text,
            })
            print(f"Collected: {title[:80]}")

        # Discover links only within the original allowed host.
        for a in soup.select("a[href]"):
            href = urljoin(response.url, a.get("href", ""))
            href = canonical(href)
            p = urlparse(href)
            if p.scheme in ("http", "https") and p.netloc.lower() in allowed_hosts and href not in visited:
                # Skip obvious non-content endpoints.
                if not re.search(r"\.(pdf|jpg|jpeg|png|gif|svg|zip|css|js)(?:$|\?)", p.path, re.I):
                    queue.append(href)
        time.sleep(DELAY)

    DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
    DATA_PATH.write_text(json.dumps(documents, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Saved {len(documents)} pages to {DATA_PATH.resolve()}")
    if not documents:
        print("No pages collected. Check robots.txt, site terms, and whether the site blocks automated requests.")
        print("Do not bypass blocks. Add permitted, manually reviewed public URLs or curated public facts with source links.")

if __name__ == "__main__":
    collect()
