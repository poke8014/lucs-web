"""
Sync iNaturalist photo metadata into src/data/plants.json `photos[]`.

For every plant in plants.json that has a corresponding
`vault/raw/assets/inaturalist/<slug>/metadata.json`, project each photo down
to the four fields the cleanup-plan picker reads (url, attribution, license,
observation_url) and overwrite the plant's `photos` array.

Source of truth: the fetcher (vault/scripts/fetch_inaturalist_photos.py)
writes metadata.json. This script reflects that into plants.json. Re-running
is idempotent — same metadata in, same plants.json out.

Usage:
    python3 vault/scripts/sync_inat_photos_to_plants_json.py            # all
    python3 vault/scripts/sync_inat_photos_to_plants_json.py <slug>...  # subset
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
PLANTS_JSON = REPO / "src" / "data" / "plants.json"
INAT_DIR = REPO / "vault" / "raw" / "assets" / "inaturalist"

PICKER_FIELDS = ("url", "attribution", "license", "observation_url")


def picker_photo(meta_photo: dict) -> dict:
    return {k: meta_photo.get(k, "") for k in PICKER_FIELDS}


def load_inat_photos(slug: str) -> list[dict] | None:
    meta_path = INAT_DIR / slug / "metadata.json"
    if not meta_path.exists():
        return None
    meta = json.loads(meta_path.read_text(encoding="utf-8"))
    return [picker_photo(p) for p in meta.get("photos", [])]


def main() -> None:
    requested = set(sys.argv[1:])
    plants = json.loads(PLANTS_JSON.read_text(encoding="utf-8"))

    updated = 0
    unchanged = 0
    no_meta = 0
    for plant in plants:
        slug = plant["slug"]
        if requested and slug not in requested:
            continue
        photos = load_inat_photos(slug)
        if photos is None:
            no_meta += 1
            continue
        if plant.get("photos") == photos:
            unchanged += 1
            continue
        plant["photos"] = photos
        updated += 1

    PLANTS_JSON.write_text(
        json.dumps(plants, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"sync_inat_photos_to_plants_json: updated={updated}  unchanged={unchanged}  no_metadata={no_meta}")


if __name__ == "__main__":
    main()
