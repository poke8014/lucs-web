#!/usr/bin/env python3
"""Calscape per-species enrichment scrape — the deferred second pass.

`build_calscape_plant_pages.py` got the full structured dataset from the
location-filtered export in one request, but the export omits two fields
(see sources/calscape.md). This script fills them by scraping each species'
Calscape page:

1. **Editorial "About" prose** — the "Plant description" block, JS-rendered
   (needs firecrawl --wait-for; absent from a plain scrape). NOTE: this prose
   is Wikipedia-derived. Per the vault licensing posture it is captured here
   as *input for re-expression only* — it is written to the gitignored
   `.firecrawl/` scratch tier, never committed verbatim to a wiki page. The
   applier consumes hand-authored originals in `_prose.json`, not this text.
2. **Named butterfly/moth host species** — the export gives only a count; the
   named leps (confirmed + likely) live on the `/host` subpage. This is the
   high-value `host_plant_for` RPRP data.

Pipeline: scrape -> parse -> `_extracted.json` (the deterministic artifact the
applier reads). Idempotent and resumable: a species whose raw files already
exist is skipped, so a re-run only fills gaps / retries failures — this also
protects the firecrawl credit budget (~150 main + ~133 host scrapes).

Usage:
  python3 vault/scripts/scrape_calscape_enrichment.py --only "Eschscholzia californica;Acer macrophyllum"
  python3 vault/scripts/scrape_calscape_enrichment.py --all
  python3 vault/scripts/scrape_calscape_enrichment.py --all --limit 5     # pilot
  python3 vault/scripts/scrape_calscape_enrichment.py --parse-only        # re-parse raw, no scrape

Default coords are San Jose (Luc's region — RPRP scope), matching the export
that produced the 150 pages. The 17 taxa with 0 butterflies/moths supported
skip the /host scrape entirely (nothing to fetch).

OPERATIONAL CAUTION (learned the hard way, 2026-05-18 — cost ~273 credits):
this script spends firecrawl credits and writes ONLY to gitignored .firecrawl/.
To run it in the background, make THIS command the backgrounded command itself
(harness-tracked) — never wrap it in `nohup … &` nested inside another
backgrounded shell. A double-detached run lands in a sandbox whose gitignored
output is discarded on teardown: credits charged, output gone. For a long full
run, prefer foreground, or background the bare `python3 … --all` invocation and
let the harness notify on completion. The script is idempotent/resumable, so a
re-run after a partial loss only refills gaps — but only if the raw files
actually survived.
"""
from __future__ import annotations
import argparse, json, re, subprocess, sys, urllib.parse, urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_calscape_plant_pages import read_export, kebab, EXPORT_URL  # noqa: E402

REPO = Path(__file__).resolve().parents[2]
SCRATCH = REPO / ".firecrawl" / "calscape-enrich"
EXTRACTED = SCRATCH / "_extracted.json"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"


# ---------- export -> work list ----------------------------------------------
def host_url(plant_url: str) -> str:
    """Derive the /host subpage URL from the export's Plant Url.
    'https://calscape.org/Acer-macrophyllum-%28Big-Leaf-Maple%29'
      -> 'https://calscape.org/plant/Acer-macrophyllum-(Big-Leaf-Maple)/host'
    Verified to round-trip cleanly incl. apostrophes (Acmispon americanus)."""
    path = urllib.parse.unquote(urllib.parse.urlparse(plant_url).path).strip("/")
    return f"https://calscape.org/plant/{path}/host"


def worklist(lat: str, lng: str) -> list[dict]:
    req = urllib.request.Request(EXPORT_URL.format(lat=lat, lng=lng), headers={"User-Agent": UA})
    recs = read_export(urllib.request.urlopen(req, timeout=60).read())
    out = []
    for r in recs:
        sci = str(r["Botanical Name"]).strip()
        purl = str(r.get("Plant Url", "")).strip()
        try:
            bm = int(str(r.get("Butterflies and Moths Supported", "")).strip() or "0")
        except ValueError:
            bm = 0
        out.append({
            "sci": sci,
            "slug": kebab(sci),
            "common": str(r.get("Common Name", "")).strip(),
            "plant_url": purl,
            "host_url": host_url(purl) if purl else "",
            "bm_count": bm,
        })
    return out


# ---------- scrape (firecrawl CLI subprocess) --------------------------------
def _scrape(url: str, dest: Path, wait_ms: int = 0) -> bool:
    """One firecrawl scrape -> dest (markdown). Idempotent: skip if dest is
    already non-empty (resumable; credit-safe). Returns True if dest is good."""
    if dest.exists() and dest.stat().st_size > 200:
        return True
    cmd = ["firecrawl", "scrape", url, "-o", str(dest)]
    if wait_ms:
        cmd += ["--wait-for", str(wait_ms)]
    else:
        cmd += ["--only-main-content"]
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=180)
    ok = dest.exists() and dest.stat().st_size > 200
    if not ok:
        print(f"  ! scrape failed {url}\n    {r.stderr.strip()[:200]}", file=sys.stderr)
    return ok


# ---------- parse ------------------------------------------------------------
def parse_prose(md: str) -> str:
    """Editorial 'About' text — the block between the 'Plant description' and
    'Plant overview' section labels in the JS-rendered main page. Captured for
    re-expression only (see module docstring); '' when Calscape has none."""
    lines = md.split("\n")
    try:
        i = next(k for k, ln in enumerate(lines) if ln.strip() == "Plant description")
    except StopIteration:
        return ""
    body = []
    for ln in lines[i + 1:]:
        if ln.strip() in ("Plant overview", "Plant description"):
            break
        body.append(ln)
    return re.sub(r"\n{3,}", "\n\n", "\n".join(body)).strip()


_LEP_LINK = re.compile(r"\]\(https://calscape\.org/lep/([^)]*?)-\(([^)]*)\)\)")


def parse_hosts(md: str) -> list[dict]:
    """Named leps from a /host subpage. Each entry: a lep link, then a
    confirmed.png / likely.png status marker, then an optional '#### Common'
    heading, then the scientific name. Sci is taken from the URL slug (before
    the final '-('); common from the '####' heading when present."""
    out, seen = [], set()
    # Split into per-lep blocks on each lep link occurrence.
    hits = list(_LEP_LINK.finditer(md))
    for n, m in enumerate(hits):
        sci_slug, _common_slug = m.group(1), m.group(2)
        block = md[m.end(): hits[n + 1].start() if n + 1 < len(hits) else len(md)]
        sci = sci_slug.replace("-", " ").strip()
        if not sci or sci in seen:
            continue
        seen.add(sci)
        status = "confirmed" if "confirmed.png" in block else (
            "likely" if "likely.png" in block else "")
        h = re.search(r"^####\s+(.+?)\s*$", block, re.M)
        common = h.group(1).strip() if h else ""
        out.append({"sci": sci, "common": common, "status": status})
    return out


def parse_all(work: list[dict]) -> dict:
    data = {}
    for w in work:
        slug = w["slug"]
        main_f = SCRATCH / f"{slug}.main.md"
        host_f = SCRATCH / f"{slug}.host.md"
        prose = parse_prose(main_f.read_text()) if main_f.exists() else ""
        hosts = parse_hosts(host_f.read_text()) if host_f.exists() else []
        n_conf = sum(h["status"] == "confirmed" for h in hosts)
        n_lik = sum(h["status"] == "likely" for h in hosts)
        data[slug] = {
            "sci": w["sci"], "common": w["common"], "bm_count": w["bm_count"],
            "prose": prose, "hosts": hosts,
            "n_confirmed": n_conf, "n_likely": n_lik,
            # Calscape's /host page lazy-loads past ~60 entries; large lists are
            # cut. Confirmed hosts sort first and are always few, so the
            # confirmed tier (-> host_plant_for) is complete; only the
            # lower-confidence 'likely' tail is partial. Flagged for honest
            # provenance: bm_count (export) is the authoritative total.
            "truncated": (n_conf + n_lik) < w["bm_count"],
        }
    return data


# ---------- main -------------------------------------------------------------
def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--lat", default="37.3382")
    ap.add_argument("--lng", default="-121.8863")
    ap.add_argument("--only", default="", help="';'-separated botanical names")
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--limit", type=int, default=0, help="cap species (pilot)")
    ap.add_argument("--parse-only", action="store_true", help="re-parse raw, no scrape")
    args = ap.parse_args()

    SCRATCH.mkdir(parents=True, exist_ok=True)
    work = worklist(args.lat, args.lng)
    print(f"  {len(work)} taxa in export", file=sys.stderr)

    if args.only:
        want = {n.strip().lower() for n in args.only.split(";")}
        work = [w for w in work if w["sci"].lower() in want]
    elif not (args.all or args.parse_only):
        ap.error("pass --all, --only, or --parse-only")
    if args.limit:
        work = work[: args.limit]

    if not args.parse_only:
        for i, w in enumerate(work, 1):
            print(f"[{i}/{len(work)}] {w['sci']}", file=sys.stderr)
            _scrape(w["plant_url"], SCRATCH / f"{w['slug']}.main.md", wait_ms=4000)
            if w["bm_count"] > 0 and w["host_url"]:
                _scrape(w["host_url"], SCRATCH / f"{w['slug']}.host.md")

    data = parse_all(work)
    EXTRACTED.write_text(json.dumps(data, indent=2, ensure_ascii=False))
    np = sum(1 for v in data.values() if v["prose"])
    nh = sum(v["n_confirmed"] + v["n_likely"] for v in data.values())
    print(f"✓ {len(data)} taxa | prose: {np} | host records: {nh} "
          f"-> {EXTRACTED.relative_to(REPO)}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
