"""
Scrape every WRIC weed-management PDF catalogued in
vault/raw/pdfs/wric/_index.md into vault/raw/articles/wric/<PdfName>.md.

The Box viewer URL pattern that the index links to (`ucdavis.app.box.com/.../file/<ID>`)
returns the Box JS app, not PDF text, when fed to firecrawl. The direct
download URL pattern below 302s to a public.boxcloud.com PDF URL, which
firecrawl-scrape parses cleanly (~1 credit per PDF).

Idempotent: re-running skips PDFs whose output file already exists with
non-trivial content. Pass --force to re-scrape.

Usage:
  python3 vault/scripts/scrape_wric.py            # scrape all missing
  python3 vault/scripts/scrape_wric.py --force    # re-scrape everything
  python3 vault/scripts/scrape_wric.py --limit 3  # only 3 (smoke test)
  python3 vault/scripts/scrape_wric.py --only Acacia,Cytisus
"""

from __future__ import annotations

import argparse
import concurrent.futures as cf
import json
import re
import subprocess
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
INDEX = REPO / "vault" / "raw" / "pdfs" / "wric" / "_index.md"
OUT_DIR = REPO / "vault" / "raw" / "articles" / "wric"
SHARED_NAME = "t266vkfh1ym7bb7j57k5ufkrv9vrby3v"

# Lines look like:
#   -   [Acacia.pdf](https://ucdavis.app.box.com/s/.../file/2053578364326)
# Locally-downloaded files carry a ✓ marker before the link:
#   - ✓ [Cytisus.pdf](https://ucdavis.app.box.com/s/.../file/...)
PDF_LINE = re.compile(
    r"^\-\s+(?:✓\s+)?\[(?P<filename>[^\]]+\.pdf)\]"
    r"\(https://ucdavis\.app\.box\.com/s/[^/]+/file/(?P<file_id>\d+)\)",
    re.MULTILINE,
)


def parse_index(text: str) -> list[tuple[str, str]]:
    """Return [(filename, file_id), ...] in index order."""
    pairs = [(m.group("filename"), m.group("file_id")) for m in PDF_LINE.finditer(text)]
    # Deduplicate while preserving order.
    seen: set[str] = set()
    unique: list[tuple[str, str]] = []
    for fn, fid in pairs:
        if fn in seen:
            continue
        seen.add(fn)
        unique.append((fn, fid))
    return unique


def download_url(file_id: str) -> str:
    return (
        f"https://ucdavis.box.com/index.php?"
        f"rm=box_download_shared_file&shared_name={SHARED_NAME}&file_id=f_{file_id}"
    )


def output_path(filename: str) -> Path:
    return OUT_DIR / (filename.removesuffix(".pdf") + ".md")


def has_useful_content(path: Path) -> bool:
    if not path.exists():
        return False
    text = path.read_text(encoding="utf-8", errors="replace")
    # Avoid keeping zero-byte stubs or HTML-fallback responses.
    return len(text.strip()) > 500


def scrape_one(filename: str, file_id: str) -> tuple[str, str, str | None]:
    """Returns (filename, status, error_msg). Status in {'ok','skip','fail'}."""
    out = output_path(filename)
    if has_useful_content(out):
        return filename, "skip", None

    url = download_url(file_id)
    tmp_json = OUT_DIR / f".raw-{filename}.json"

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
        return filename, "fail", "timeout"

    if result.returncode != 0:
        return filename, "fail", (result.stderr or result.stdout)[-400:]

    if not tmp_json.exists():
        return filename, "fail", "no output file"

    try:
        data = json.loads(tmp_json.read_text(encoding="utf-8"))
    except Exception as e:
        return filename, "fail", f"json parse: {e}"

    markdown = data.get("markdown") or ""
    if not markdown.strip():
        tmp_json.unlink(missing_ok=True)
        return filename, "fail", "empty markdown"

    metadata = data.get("metadata", {})
    final_url = metadata.get("url", "")
    content_type = metadata.get("contentType", "")

    header = (
        f"<!-- Source: WRIC weed management notes\n"
        f"     Box file: {filename}\n"
        f"     Box file id: {file_id}\n"
        f"     Box share: https://ucdavis.app.box.com/s/{SHARED_NAME}/file/{file_id}\n"
        f"     Download URL (302 -> public.boxcloud.com): {url}\n"
        f"     Final content URL (short-lived): {final_url}\n"
        f"     Content-Type: {content_type}\n"
        f"     Scraped via: firecrawl scrape\n"
        f"-->\n\n"
    )
    out.write_text(header + markdown.rstrip() + "\n", encoding="utf-8")
    tmp_json.unlink(missing_ok=True)
    return filename, "ok", None


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true", help="re-scrape even if output exists")
    ap.add_argument("--limit", type=int, default=0, help="only scrape this many (after filtering)")
    ap.add_argument("--only", type=str, default="", help="comma-separated filename stems to scrape")
    ap.add_argument("--concurrency", type=int, default=4, help="parallel scrapes")
    args = ap.parse_args()

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    pairs = parse_index(INDEX.read_text(encoding="utf-8"))
    if not pairs:
        raise SystemExit("No PDF entries found in _index.md")

    if args.only:
        wanted = {s.strip() for s in args.only.split(",") if s.strip()}
        pairs = [(fn, fid) for (fn, fid) in pairs if fn.removesuffix(".pdf") in wanted]

    if not args.force:
        pairs = [(fn, fid) for (fn, fid) in pairs if not has_useful_content(output_path(fn))]

    if args.limit:
        pairs = pairs[: args.limit]

    if not pairs:
        print("Nothing to scrape.")
        return

    print(f"Scraping {len(pairs)} PDF(s) with concurrency={args.concurrency}...")

    ok = skip = fail = 0
    with cf.ThreadPoolExecutor(max_workers=args.concurrency) as pool:
        futures = {pool.submit(scrape_one, fn, fid): fn for (fn, fid) in pairs}
        for fut in cf.as_completed(futures):
            filename, status, err = fut.result()
            tag = {"ok": "✓", "skip": "·", "fail": "✗"}[status]
            print(f"  {tag} {filename}" + (f"  ({err})" if err else ""))
            ok += status == "ok"
            skip += status == "skip"
            fail += status == "fail"

    print(f"\nDone. ok={ok}  skip={skip}  fail={fail}")
    if fail:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
