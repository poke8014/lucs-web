"""
Scrape UC IPM Pest Notes (weed-relevant subset) catalogued in
  vault/raw/articles/ucipm-residential/_index.md
  vault/raw/articles/ucipm-general/_index.md
into vault/raw/articles/ucipm-<bucket>/<slug>.md.

Unlike WRIC (Box-hosted PDFs behind a 302 redirect), UC IPM Pest Notes are
static HTML at https://ipm.ucanr.edu/PMG/PESTNOTES/pnXXXXX.html. We still use
the firecrawl CLI to keep tooling consistent with scrape_wric.py and to get
clean HTML->markdown conversion that strips UC IPM's nav chrome.

Idempotent: re-running skips pages whose output file already exists with
non-trivial content. Pass --force to re-scrape.

Usage:
  python3 vault/scripts/scrape_ucipm.py                  # scrape all missing
  python3 vault/scripts/scrape_ucipm.py --force          # re-scrape everything
  python3 vault/scripts/scrape_ucipm.py --limit 2        # only 2 (smoke test)
  python3 vault/scripts/scrape_ucipm.py --only brooms,dandelion
  python3 vault/scripts/scrape_ucipm.py --bucket residential   # one bucket only
"""

from __future__ import annotations

import argparse
import concurrent.futures as cf
import json
import re
import subprocess
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
BUCKETS = {
    "residential": REPO / "vault" / "raw" / "articles" / "ucipm-residential",
    "general":     REPO / "vault" / "raw" / "articles" / "ucipm-general",
}

# Lines look like:
#   - [annual-bluegrass.md](https://ipm.ucanr.edu/PMG/PESTNOTES/pn7464.html) — Annual Bluegrass (*Poa annua*)
ENTRY_LINE = re.compile(
    r"^\-\s+\[(?P<slug>[a-z0-9-]+)\.md\]"
    r"\((?P<url>https://ipm\.ucanr\.edu/PMG/PESTNOTES/pn\d+\.html)\)"
    r"\s+(?:—|--)\s+(?P<title>.+?)\s*$",
    re.MULTILINE,
)


def parse_index(path: Path) -> list[tuple[str, str, str]]:
    """Return [(slug, url, title), ...] in index order, deduped on slug."""
    text = path.read_text(encoding="utf-8")
    entries: list[tuple[str, str, str]] = []
    seen: set[str] = set()
    for m in ENTRY_LINE.finditer(text):
        slug = m.group("slug")
        if slug in seen:
            continue
        seen.add(slug)
        entries.append((slug, m.group("url"), m.group("title")))
    return entries


def output_path(bucket: str, slug: str) -> Path:
    return BUCKETS[bucket] / f"{slug}.md"


def has_useful_content(path: Path) -> bool:
    if not path.exists():
        return False
    text = path.read_text(encoding="utf-8", errors="replace")
    return len(text.strip()) > 800  # PN pages are substantial; stubs are < 1KB


def scrape_one(bucket: str, slug: str, url: str, title: str) -> tuple[str, str, str | None]:
    """Returns (slug, status, error_msg). Status in {'ok','skip','fail'}."""
    out = output_path(bucket, slug)
    if has_useful_content(out):
        return slug, "skip", None

    tmp_json = BUCKETS[bucket] / f".raw-{slug}.json"

    try:
        result = subprocess.run(
            [
                "firecrawl", "scrape", url,
                "--pretty",
                "-o", str(tmp_json),
            ],
            capture_output=True, text=True, timeout=120,
        )
    except subprocess.TimeoutExpired:
        return slug, "fail", "timeout"

    if result.returncode != 0:
        return slug, "fail", (result.stderr or result.stdout)[-400:]

    if not tmp_json.exists():
        return slug, "fail", "no output file"

    try:
        data = json.loads(tmp_json.read_text(encoding="utf-8"))
    except Exception as e:
        return slug, "fail", f"json parse: {e}"

    markdown = data.get("markdown") or ""
    if not markdown.strip():
        tmp_json.unlink(missing_ok=True)
        return slug, "fail", "empty markdown"

    metadata = data.get("metadata", {})
    final_url = metadata.get("url", url)
    content_type = metadata.get("contentType", "")

    header = (
        f"<!-- Source: UC IPM Pest Note\n"
        f"     Title: {title}\n"
        f"     URL: {url}\n"
        f"     Final content URL: {final_url}\n"
        f"     Content-Type: {content_type}\n"
        f"     Scraped via: firecrawl scrape\n"
        f"-->\n\n"
    )
    out.write_text(header + markdown.rstrip() + "\n", encoding="utf-8")
    tmp_json.unlink(missing_ok=True)
    return slug, "ok", None


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true", help="re-scrape even if output exists")
    ap.add_argument("--limit", type=int, default=0, help="only scrape this many (after filtering)")
    ap.add_argument("--only", type=str, default="", help="comma-separated slugs to scrape")
    ap.add_argument("--bucket", choices=["residential", "general", "both"], default="both")
    ap.add_argument("--concurrency", type=int, default=4, help="parallel scrapes")
    args = ap.parse_args()

    buckets_to_run = ["residential", "general"] if args.bucket == "both" else [args.bucket]

    jobs: list[tuple[str, str, str, str]] = []  # (bucket, slug, url, title)
    for bucket in buckets_to_run:
        BUCKETS[bucket].mkdir(parents=True, exist_ok=True)
        entries = parse_index(BUCKETS[bucket] / "_index.md")
        if not entries:
            raise SystemExit(f"No entries found in {bucket}/_index.md")
        for slug, url, title in entries:
            jobs.append((bucket, slug, url, title))

    if args.only:
        wanted = {s.strip() for s in args.only.split(",") if s.strip()}
        jobs = [j for j in jobs if j[1] in wanted]

    if not args.force:
        jobs = [j for j in jobs if not has_useful_content(output_path(j[0], j[1]))]

    if args.limit:
        jobs = jobs[: args.limit]

    if not jobs:
        print("Nothing to scrape.")
        return

    print(f"Scraping {len(jobs)} Pest Note(s) with concurrency={args.concurrency}...")

    ok = skip = fail = 0
    with cf.ThreadPoolExecutor(max_workers=args.concurrency) as pool:
        futures = {pool.submit(scrape_one, b, s, u, t): (b, s) for (b, s, u, t) in jobs}
        for fut in cf.as_completed(futures):
            slug, status, err = fut.result()
            tag = {"ok": "✓", "skip": "·", "fail": "✗"}[status]
            print(f"  {tag} {slug}" + (f"  ({err})" if err else ""))
            ok += status == "ok"
            skip += status == "skip"
            fail += status == "fail"

    print(f"\nDone. ok={ok}  skip={skip}  fail={fail}")
    if fail:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
