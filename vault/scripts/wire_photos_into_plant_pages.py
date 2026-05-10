#!/usr/bin/env python3
"""Insert/refresh a `## Photos` section in every plant page in vault/plants/.

For each plant slug, the section pulls images from:
  - vault/raw/assets/inaturalist/<slug>/  (with metadata.json sidecar)
  - vault/raw/assets/calipc/<slug>/       (filename-derived attribution)

Idempotent: re-running replaces the existing block in place.
The section is inserted before `## Sources`.

Usage:
    python3 vault/scripts/wire_photos_into_plant_pages.py            # all plants
    python3 vault/scripts/wire_photos_into_plant_pages.py <slug>...  # subset
    python3 vault/scripts/wire_photos_into_plant_pages.py --dry-run  # preview
"""

import json
import re
import sys
import urllib.parse
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PLANTS_DIR = ROOT / "vault" / "plants"
INAT_DIR = ROOT / "vault" / "raw" / "assets" / "inaturalist"
CALIPC_DIR = ROOT / "vault" / "raw" / "assets" / "calipc"

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}

# WordPress-ish suffixes Cal-IPC filenames accumulate (e.g. _cropped-scaled,
# _cropped-1-scaled, -e15101...).
SUFFIX_RE = re.compile(
    r"(?:[_-]+(?:cropped(?:-\d+)?(?:-scaled)?|scaled)|-e\d{8,})+$",
    re.IGNORECASE,
)


def parse_calipc_filename(filename: str) -> str:
    """Best-effort photographer (and year) from a Cal-IPC image filename.

    Falls back to the bare stem if parsing fails. Names are messy — we don't
    aim for perfection, just a recognizable credit line.
    """
    stem = filename.rsplit(".", 1)[0]
    stem = urllib.parse.unquote(stem)

    # Strip common suffixes (e.g. _cropped, _cropped-scaled, -e15101...).
    while True:
        new_stem = SUFFIX_RE.sub("", stem)
        if new_stem == stem:
            break
        stem = new_stem

    if "_" not in stem:
        return _format_name(stem)

    parts = [p for p in stem.split("_") if p]

    # First segment is the scientific name (Genus-species). A handful use
    # `Genus_species_...` instead — detect by lowercase second segment.
    if len(parts) >= 2 and parts[0][:1].isupper() and parts[1][:1].islower() \
            and "-" not in parts[0] and "-" not in parts[1]:
        parts = parts[2:]
    else:
        parts = parts[1:]

    if not parts:
        return _format_name(stem)

    # Pull out year and `copyright` markers.
    year = None
    cleaned = []
    for p in parts:
        bare = p.strip("-")
        if not bare:
            continue
        m = re.fullmatch(r"(?:copyright[_-]?)?(\d{4})", bare, re.IGNORECASE)
        if m:
            year = m.group(1)
            continue
        if bare.lower() == "copyright":
            continue
        cleaned.append(bare)

    if not cleaned:
        return _format_name(stem)

    photographer = cleaned[-1]
    # `copyright-CDFA-1` / `copyright-CDFA-2001` patterns: trim the copyright
    # marker and pull out a year if present.
    photographer = re.sub(r"^copyright[-_]?", "", photographer, flags=re.IGNORECASE)
    ym = re.search(r"-(\d{4})$", photographer)
    if ym:
        year = year or ym.group(1)
        photographer = photographer[: ym.start()]
    # Trailing version numbers (`-1`, `-2`) from WordPress dedupe.
    photographer = re.sub(r"-\d+$", "", photographer)

    name = _format_name(photographer)
    return f"{name}, {year}" if year else name


def _format_name(raw: str) -> str:
    raw = raw.strip("-_ .")
    raw = raw.replace(".", "")
    parts = [p for p in raw.split("-") if p]
    spaced = []
    for p in parts:
        # Insert space at lower→upper boundaries: NealKramer -> Neal Kramer.
        s = re.sub(r"(?<=[a-z])([A-Z])", r" \1", p)
        # Acronym→word boundary: CDFADeanKelch -> CDFA DeanKelch -> CDFA Dean Kelch.
        s = re.sub(r"([A-Z]{2,})([A-Z][a-z])", r"\1 \2", s)
        spaced.append(s)
    return " ".join(spaced)


def build_inat_block(slug: str) -> str | None:
    meta_path = INAT_DIR / slug / "metadata.json"
    if not meta_path.exists():
        return None
    meta = json.loads(meta_path.read_text())
    photos = meta.get("photos", [])
    if not photos:
        return None

    lines = ["### iNaturalist", ""]
    if meta.get("photos_from_parent_species"):
        lines.append(
            "> Note: photos are of the parent species "
            f"(taxon {meta.get('photos_taxon_id')}), not the subspecies — "
            "iNaturalist had no CC-licensed photos at the subspecies rank."
        )
        lines.append("")

    for p in photos:
        rel = f"../raw/assets/inaturalist/{slug}/{p['filename']}"
        attribution = p.get("attribution", "").strip()
        obs_url = p.get("observation_url", "").strip()
        lines.append(f"![]({rel})")
        if attribution and obs_url:
            lines.append(f"*{attribution} — [observation]({obs_url})*")
        elif attribution:
            lines.append(f"*{attribution}*")
        elif obs_url:
            lines.append(f"*[observation]({obs_url})*")
        lines.append("")
    return "\n".join(lines).rstrip() + "\n"


def build_calipc_block(slug: str) -> str | None:
    d = CALIPC_DIR / slug
    if not d.exists():
        return None
    files = sorted(
        f for f in d.iterdir()
        if f.is_file() and f.suffix.lower() in IMAGE_EXTS
    )
    if not files:
        return None

    lines = ["### Cal-IPC", ""]
    for f in files:
        rel = f"../raw/assets/calipc/{slug}/{f.name}"
        credit = parse_calipc_filename(f.name)
        lines.append(f"![]({rel})")
        if credit:
            lines.append(f"*{credit}*")
        lines.append("")
    return "\n".join(lines).rstrip() + "\n"


def build_photos_section(slug: str) -> str | None:
    inat = build_inat_block(slug)
    calipc = build_calipc_block(slug)
    if not inat and not calipc:
        return None

    sections = []
    if inat:
        sections.append(inat.rstrip())
    if calipc:
        sections.append(calipc.rstrip())
    body = "\n\n".join(sections)
    return f"## Photos\n\n{body}\n"


# Match an existing `## Photos` block up to (but not including) the next `## ` heading.
PHOTOS_BLOCK_RE = re.compile(
    r"(?ms)^## Photos\b.*?(?=^## |\Z)",
)


def update_page(page_path: Path, photos_section: str, dry_run: bool = False) -> str:
    """Returns one of: 'updated', 'unchanged', 'inserted', 'no-anchor'."""
    text = page_path.read_text()
    block = photos_section.rstrip() + "\n\n"

    if PHOTOS_BLOCK_RE.search(text):
        new_text = PHOTOS_BLOCK_RE.sub(block, text, count=1)
        status = "updated"
    else:
        m = re.search(r"(?m)^## Sources\b", text)
        if m:
            insertion = m.start()
            new_text = text[:insertion] + block + text[insertion:]
            status = "inserted"
        else:
            new_text = text.rstrip() + "\n\n" + block
            status = "no-anchor"

    if new_text == text:
        return "unchanged"
    if not dry_run:
        page_path.write_text(new_text)
    return status


def main(argv: list[str]) -> int:
    args = list(argv[1:])
    dry_run = False
    if "--dry-run" in args:
        dry_run = True
        args.remove("--dry-run")

    if args:
        slugs = args
    else:
        slugs = sorted(p.stem for p in PLANTS_DIR.glob("*.md"))

    counts = {"updated": 0, "inserted": 0, "unchanged": 0, "no-anchor": 0, "skipped": 0}
    for slug in slugs:
        page = PLANTS_DIR / f"{slug}.md"
        if not page.exists():
            print(f"  ! missing page: {slug}")
            counts["skipped"] += 1
            continue
        section = build_photos_section(slug)
        if not section:
            print(f"  - no assets: {slug}")
            counts["skipped"] += 1
            continue
        status = update_page(page, section, dry_run=dry_run)
        counts[status] += 1
        if status != "unchanged":
            tag = "[dry] " if dry_run else ""
            print(f"  {tag}{status}: {slug}")

    summary = ", ".join(f"{k}={v}" for k, v in counts.items())
    print(f"\nDone ({summary})")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
