#!/usr/bin/env python3
"""Build native plant wiki pages from the Calscape (CNPS) location-filtered export.

Calscape's `/export/search/?lat=&lng=` endpoint returns an .xlsx carrying the
*full* structured dataset (50 columns) for every native taxon whose verified
range includes that point — not just a name list. One request ≈ the entire
`plants` table for the region. This script downloads that export, parses it
with the stdlib (no openpyxl), normalizes Calscape's vocabularies into the
vault plant-frontmatter schema (vault/CLAUDE.md), and emits one
`vault/plants/<scientific-name-kebab>.md` per species.

Two fields are NOT in the export and need a per-species page-scrape enrichment
pass (deferred — see sources/calscape.md): the full editorial "About" prose,
and the *named* butterfly/moth host species (the export gives only a count).
Pages are therefore emitted at `status: stub`.

Usage:
  python3 vault/scripts/build_calscape_plant_pages.py --only "Aesculus californica;Achillea millefolium"
  python3 vault/scripts/build_calscape_plant_pages.py --all
  python3 vault/scripts/build_calscape_plant_pages.py --lat 37.3382 --lng -121.8863 --all

Default coords are San Jose (Luc's region — RPRP scope). Idempotent: rewrites
the structured frontmatter + Calscape-derived body, leaving the file otherwise
stable so re-runs are clean diffs.
"""
from __future__ import annotations
import argparse, datetime, html, re, sys, urllib.request, xml.etree.ElementTree as ET, zipfile
from pathlib import Path

NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
EXPORT_URL = "https://calscape.org/export/search/?lat={lat}&lng={lng}"
REPO = Path(__file__).resolve().parents[2]
PLANTS_DIR = REPO / "vault" / "plants"
TODAY = datetime.date.today().isoformat()


# ---------- xlsx parsing (stdlib only) ----------------------------------------
def _col(ref: str) -> int:
    s = 0
    for ch in re.match(r"([A-Z]+)", ref).group(1):
        s = s * 26 + (ord(ch) - 64)
    return s - 1


def read_export(xlsx: bytes) -> list[dict]:
    z = zipfile.ZipFile(__import__("io").BytesIO(xlsx))
    shared = [
        "".join(t.text or "" for t in si.iter(NS + "t"))
        for si in ET.fromstring(z.read("xl/sharedStrings.xml")).findall(NS + "si")
    ]
    rows = []
    for row in ET.fromstring(z.read("xl/worksheets/sheet1.xml")).find(NS + "sheetData").findall(NS + "row"):
        cells = {}
        for c in row.findall(NS + "c"):
            v, isn = c.find(NS + "v"), c.find(NS + "is")
            if v is not None:
                val = shared[int(v.text)] if c.get("t") == "s" else v.text
            elif isn is not None:
                val = "".join(x.text or "" for x in isn.iter(NS + "t"))
            else:
                val = ""
            cells[_col(c.get("r"))] = html.unescape(val) if val else val
        rows.append([cells.get(i, "") for i in range((max(cells) + 1) if cells else 0)])
    # Header is the first row whose first cell is the botanical-name column.
    hi = next(i for i, r in enumerate(rows) if r and str(r[0]).strip() == "Botanical Name")
    header = [str(h).strip() for h in rows[hi]]
    return [
        {header[i]: (r[i] if i < len(r) else "") for i in range(len(header))}
        for r in rows[hi + 1 :]
        if r and str(r[0]).strip()
    ]


# ---------- normalization -----------------------------------------------------
def kebab(sci: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", sci.lower()).strip("-")


def _split(s: str, sep=",") -> list[str]:
    return [x.strip() for x in str(s).split(sep) if x.strip()]


# schema enum: perennial | annual | shrub | tree | groundcover | grass | vine
# Calscape can list several ("Annual herb, Perennial herb"); pick the longest-
# lived single value for the schema field, keep the raw string in native:.
_TYPE_RANK = ["tree", "shrub", "vine", "grass", "groundcover", "perennial", "annual"]


def plant_type(raw: str) -> str:
    found = set()
    for tok in _split(raw):
        t = tok.lower()
        if "tree" in t:
            found.add("tree")
        elif "shrub" in t:
            found.add("shrub")
        elif "vine" in t:
            found.add("vine")
        elif "grass" in t or "graminoid" in t:
            found.add("grass")
        elif "groundcover" in t or "ground cover" in t:
            found.add("groundcover")
        elif "perennial" in t or "geophyte" in t:
            found.add("perennial")
        elif "fern" in t:
            found.add("perennial")  # ferns/horsetails: perennial is the closest
        elif "annual" in t:        # schema enum (no `fern`); raw kept in native:
            found.add("annual")
    for r in _TYPE_RANK:
        if r in found:
            return r
    return ""


# sun/water are tolerance *ranges* in Calscape; schema field is single, so we
# record the preferred (sunniest / driest) value and keep the full range in native:.
def sun(raw: str) -> str:
    toks = [t.lower() for t in _split(raw)]
    if any("full sun" in t for t in toks):
        return "full"
    if any("partial" in t or "part" in t for t in toks):
        return "part"
    if any("shade" in t for t in toks):
        return "shade"
    return ""


def water(raw: str) -> str:
    toks = [t.lower() for t in _split(raw)]
    if any("very low" in t or t == "low" for t in toks):
        return "low"
    if any("moderate" in t for t in toks):
        return "moderate"
    if any("high" in t for t in toks):
        return "high"
    return ""


def bloom(raw: str) -> list[str]:
    order = ["winter", "spring", "summer", "fall"]
    have = {t.lower() for t in _split(raw)}
    return [s for s in order if s in have]


# Calscape "Attracts Wildlife": Bats, Bees, Birds, Butterflies, Caterpillars,
# Hummingbirds. Schema pollinators vocab: bees, butterflies, hummingbirds,
# moths, beetles, flies. Map only true pollinator overlap; keep the full list
# under native.attracts_wildlife. "Caterpillars"/butterfly count → host data.
_POLL = {"bees": "bees", "butterflies": "butterflies", "hummingbirds": "hummingbirds"}


def pollinators(raw: str) -> list[str]:
    return [_POLL[t.lower()] for t in _split(raw) if t.lower() in _POLL]


def ft_range(raw: str) -> str:
    """'30 - 115 ft' / '4 - 28 in' / '2 ft' / '' -> 'min-max' in feet, or ''."""
    raw = str(raw).strip()
    if not raw:
        return ""
    unit = "in" if re.search(r"\bin\b", raw) else "ft"
    nums = [float(n) for n in re.findall(r"\d+(?:\.\d+)?", raw)]
    if not nums:
        return ""
    if unit == "in":
        nums = [round(n / 12, 1) for n in nums]
    return f"{nums[0]:g} - {nums[-1]:g}" if len(nums) > 1 else f"{nums[0]:g}"


def soil_tags(drainage: str, ph: str) -> list[str]:
    """Conservative flat-field derivation. The Phase-2 selector reads the raw
    structured `native.soil_drainage` / `native.soil_ph` instead — this list is
    only a coarse convenience tag, so it asserts nothing it can't stand behind:
    'slow' drainage is a *tolerance*, not a moisture preference, and a wide pH
    range carries no usable signal."""
    tags = []
    d = drainage.lower()
    if "fast" in d:
        tags.append("well-drained")
    if "standing" in d:
        tags.append("moist")
    nums = [float(n) for n in re.findall(r"\d+(?:\.\d+)?", ph)]
    if len(nums) >= 2 and (nums[-1] - nums[0]) <= 2.0:  # only when informative
        lo, hi = nums[0], nums[-1]
        if hi < 6.5:
            tags.append("acidic")
        elif lo > 7.0:
            tags.append("alkaline")
        else:
            tags.append("neutral")
    return tags


def companions(raw: str) -> list[str]:
    """Scientific binomials from the Companions HTML, e.g. '(Platanus racemosa)'.
    Best-effort — feeds the Phase-2 plant-pairing feature."""
    text = re.sub(r"<[^>]+>", " ", str(raw))
    seen, out = set(), []
    for n in re.findall(r"\(([A-Z][a-z]+ [a-z][a-z-]+)\)", text):
        if n not in seen:
            seen.add(n)
            out.append(n)
    return out


def common_names(rec: dict) -> tuple[list[str], list[str]]:
    primary = str(rec.get("Common Name", "")).strip()
    alts = _split(rec.get("Alternative Common Names", ""))
    # "Other Names" is inverted ("Buckeye, California"); de-invert pipe-separated.
    others = []
    for tok in _split(rec.get("Other Names", ""), "|"):
        parts = [p.strip() for p in tok.split(",")]
        others.append(" ".join(reversed(parts)) if len(parts) == 2 else tok)
    names, seen = [], set()
    for n in [primary, *alts, *others]:
        if n and n.lower() not in seen:
            seen.add(n.lower())
            names.append(n)
    return ([primary] if primary else []), names


def yaml_list(xs: list[str]) -> str:
    return "[" + ", ".join(xs) + "]" if xs else "[]"


# ---------- page emission -----------------------------------------------------
def render(rec: dict) -> tuple[str, str]:
    sci = str(rec["Botanical Name"]).strip()
    slug = kebab(sci)
    cn, all_names = common_names(rec)
    primary = cn[0] if cn else sci
    aliases = [n for n in all_names if n != primary]
    ptype = plant_type(rec.get("Plant Type", ""))
    polls = pollinators(rec.get("Attracts Wildlife", ""))
    blooms = bloom(rec.get("Flowering Season", ""))
    soil = soil_tags(rec.get("Soil Drainage", ""), rec.get("Soil pH", ""))
    bm = str(rec.get("Butterflies and Moths Supported", "")).strip() or "0"
    is_cult = str(rec.get("Is Cultivar", "")).strip().upper() == "Y"
    tags = ["native"] + ([ptype] if ptype else []) + (["pollinator-plant"] if polls else [])

    def q(s):  # YAML-safe scalar
        s = str(s).replace('"', "'").strip()
        return f'"{s}"' if s else '""'

    fm = f"""---
type: plant
title: {sci} ({primary})
aliases: {yaml_list(aliases)}
tags: {yaml_list(tags)}
status: stub
sources:
  - {EXPORT_URL.format(lat="<lat>", lng="<lng>")}  # Calscape export — see sources/calscape.md
last_updated: {TODAY}

scientific_name: {sci}
common_names: {yaml_list(cn)}
plant_type: {ptype}
nativity: native
pollinators: {yaml_list(polls)}
water: {water(rec.get("Water Requirement", ""))}
sun: {sun(rec.get("Sun", ""))}
soil: {yaml_list(soil)}
bloom_season: {yaml_list(blooms)}
height_ft: {q(ft_range(rec.get("Height", "")))}
width_ft: {q(ft_range(rec.get("Width", "")))}
regions: []
host_plant_for: []  # named lep species — pending Calscape /host enrichment scrape

# PROPOSED schema block (parallel to invasive:) — confirm in sources/calscape.md
native:
  butterflies_moths_supported: {bm}
  attracts_wildlife: {yaml_list(_split(rec.get("Attracts Wildlife", "")))}
  plant_type_raw: {q(rec.get("Plant Type", ""))}
  sun_range: {q(rec.get("Sun", ""))}
  water_range: {q(rec.get("Water Requirement", ""))}
  ease_of_care: {q(rec.get("Ease of Care", ""))}
  soil_drainage: {yaml_list(_split(rec.get("Soil Drainage", "")))}
  soil_ph: {q(rec.get("Soil pH", ""))}
  communities: {yaml_list(_split(rec.get("Communities", "")))}
  communities_simplified: {yaml_list(_split(rec.get("Communities (simplified)", "")))}
  companions: {yaml_list(companions(rec.get("Companions", "")))}
  sunset_zones: {q(rec.get("Sunset Zones", ""))}
  hardiness: {q(rec.get("Hardiness", ""))}
  nursery_availability: {q(rec.get("Nursery Availability", ""))}
  rarity: {q(rec.get("Rarity", ""))}
  is_cultivar: {str(is_cult).lower()}
  jepson_url: {q(rec.get("Jepson Link", ""))}
  calscape_url: {q(rec.get("Plant Url", ""))}
  retrieved: {TODAY}
---"""

    def sec(title, pairs):
        rows = [f"- **{k}:** {v}" for k, v in pairs if str(v).strip()]
        return f"\n## {title}\n\n" + "\n".join(rows) + "\n" if rows else ""

    poll_line = ", ".join(polls) if polls else "none recorded as pollinators"
    intro = (
        f"{sci} ({primary}) is a California-native {ptype or 'plant'} of "
        f"{rec.get('Communities (simplified)', 'California') or 'California'}. "
        f"Calscape records **{bm}** butterfly/moth species supported. "
        f"_Structured data only — full description and named host species pending "
        f"the Calscape page-scrape enrichment pass (see [[sources/calscape]])._"
    )

    body = f"""

# {sci} ({primary})

{intro}
"""
    body += sec("Identify", [
        ("Form", rec.get("Form", "")),
        ("Height", rec.get("Height", "")),
        ("Width", rec.get("Width", "")),
        ("Flower color", rec.get("Flower Color", "")),
        ("Flowering season", rec.get("Flowering Season", "")),
        ("Seasonality", rec.get("Seasonality", "")),
        ("Fragrance", rec.get("Fragrance", "")),
    ])
    body += sec("Grow", [
        ("Sun", rec.get("Sun", "")),
        ("Water", rec.get("Water Requirement", "")),
        ("Summer irrigation", rec.get("Summer Irrigation", "")),
        ("Soil drainage", rec.get("Soil Drainage", "")),
        ("Soil pH", rec.get("Soil pH", "")),
        ("Soil notes", rec.get("Soil", "")),
        ("Ease of care", rec.get("Ease of Care", "")),
        ("Propagation", re.sub(r"<[^>]+>", "", str(rec.get("Propagation", ""))).strip()),
        ("Tips", re.sub(r"<[^>]+>", "", str(rec.get("Tips", ""))).strip()),
    ])
    body += sec("Wildlife value", [
        ("Pollinators", poll_line),
        ("Butterflies & moths supported", f"{bm} (named species pending enrichment)"),
        ("Attracts wildlife", rec.get("Attracts Wildlife", "")),
        ("Special uses", rec.get("Special Uses", "")),
    ])
    body += sec("Where it belongs", [
        ("Plant communities", rec.get("Communities", "")),
        ("Sunset zones", rec.get("Sunset Zones", "")),
        ("Cold hardiness", rec.get("Hardiness", "")),
        ("Site type", rec.get("Site Type", "")),
        ("Rarity", rec.get("Rarity", "")),
        ("Nursery availability", rec.get("Nursery Availability", "")),
    ])
    body += f"""
## Sources

- Calscape (CNPS) — [{sci}]({rec.get('Plant Url', '')}). Structured fields from the
  location-filtered Calscape export; see [[sources/calscape]] for the dataset
  meta-page, retrieval recipe, and licensing.
- Jepson eFlora — [taxon record]({rec.get('Jepson Link', '')}).
"""
    page = fm + body
    return slug, "\n".join(line.rstrip() for line in page.split("\n"))


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--lat", default="37.3382")
    ap.add_argument("--lng", default="-121.8863")
    ap.add_argument("--only", default="", help="';'-separated botanical names")
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--xlsx", default="", help="use a local .xlsx instead of downloading")
    args = ap.parse_args()

    if args.xlsx:
        data = Path(args.xlsx).read_bytes()
    else:
        url = EXPORT_URL.format(lat=args.lat, lng=args.lng)
        print(f"↓ {url}", file=sys.stderr)
        # Calscape now 403s requests with no User-Agent (added after the
        # initial 2026-05-17 rollout); send a browser UA.
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 "
            "(Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"})
        data = urllib.request.urlopen(req, timeout=60).read()

    recs = read_export(data)
    print(f"  {len(recs)} taxa in export", file=sys.stderr)
    if args.only:
        want = {n.strip().lower() for n in args.only.split(";")}
        recs = [r for r in recs if str(r["Botanical Name"]).strip().lower() in want]
    elif not args.all:
        ap.error("pass --all or --only")

    PLANTS_DIR.mkdir(parents=True, exist_ok=True)
    for rec in recs:
        slug, page = render(rec)
        (PLANTS_DIR / f"{slug}.md").write_text(page)
        print(f"  wrote vault/plants/{slug}.md", file=sys.stderr)
    print(f"✓ {len(recs)} page(s)", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
