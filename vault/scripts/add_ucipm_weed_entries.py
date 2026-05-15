"""
Add the 21 UC IPM residential-weed plant entries to src/data/plants.json.

These are the non-Cal-IPC weeds added in the May 2026 cleanup-plan scope
expansion (see vault/sources/ucipm-residential.md). They get base identity
fields populated from their wiki frontmatter; Cal-IPC fields stay null
(they aren't on the Cal-IPC inventory); photos stay empty (deferred to a
separate iNat/Wikimedia pull); Layer A/B/C fields are filled by the
sibling apply_*.py scripts in the established run order.

Idempotent: re-running upserts entries by slug without touching the rest
of the file. Existing plants (including isatis-tinctoria) are untouched.
"""

from __future__ import annotations

import json
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
PLANTS_JSON = REPO / "src" / "data" / "plants.json"

# Layer-0 identity fields. All entries are nativity=invasive except poison-oak
# (native; included for safety-removal — see feedback_sunshower_weed_scope memory
# and vault/sources/ucipm-residential.md "Native exception" note).
ENTRIES: list[dict] = [
    {
        "slug": "convolvulus-arvensis",
        "scientific_name": "Convolvulus arvensis",
        "common_names": ["field bindweed", "perennial morningglory", "creeping jenny"],
        "aliases": ["field bindweed", "perennial morningglory", "creeping jenny", "bellbine", "sheepbine", "cornbind"],
        "nativity": "invasive",
        "plant_type": "perennial",
        "height_ft": None,
        "width_ft": None,
        "water": "low",
        "sun": "full",
    },
    {
        "slug": "cuscuta-pentagona",
        "scientific_name": "Cuscuta pentagona",
        "common_names": ["field dodder", "dodder"],
        "aliases": ["field dodder", "Cuscuta campestris", "swamp dodder", "Cuscuta gronovii", "Cuscuta indecora", "Japanese dodder", "Cuscuta japonica", "dodder", "devil's hair", "witch's hair", "strangleweed"],
        "nativity": "invasive",
        "plant_type": "annual",
        "height_ft": None,
        "width_ft": None,
        "water": None,
        "sun": None,
    },
    {
        "slug": "euphorbia-maculata",
        "scientific_name": "Euphorbia maculata",
        "common_names": ["spotted spurge", "prostrate spurge", "milk purslane"],
        "aliases": ["spotted spurge", "Chamaesyce maculata", "prostrate spurge", "milk purslane"],
        "nativity": "invasive",
        "plant_type": "annual",
        "height_ft": None,
        "width_ft": 3,
        "water": None,
        "sun": "full",
    },
    {
        "slug": "galium-aparine",
        "scientific_name": "Galium aparine",
        "common_names": ["catchweed bedstraw", "cleavers", "stickywilly"],
        "aliases": ["catchweed bedstraw", "cleavers", "bedstraw", "stickywilly", "velcro plant", "goosegrass"],
        "nativity": "invasive",
        "plant_type": "annual",
        "height_ft": 6,
        "width_ft": None,
        "water": None,
        "sun": None,
    },
    {
        "slug": "kyllinga-brevifolia",
        "scientific_name": "Kyllinga brevifolia",
        "common_names": ["green kyllinga"],
        "aliases": ["green kyllinga", "false-green kyllinga"],
        "nativity": "invasive",
        "plant_type": "perennial",
        "height_ft": None,
        "width_ft": None,
        "water": None,
        "sun": None,
    },
    {
        "slug": "malva-parviflora",
        "scientific_name": "Malva parviflora",
        "common_names": ["little mallow", "cheeseweed"],
        "aliases": ["little mallow", "cheeseweed", "small-flowered mallow", "Malva neglecta", "common mallow"],
        "nativity": "invasive",
        "plant_type": "annual",
        "height_ft": 5,
        "width_ft": None,
        "water": None,
        "sun": "full",
    },
    {
        "slug": "paspalum-dilatatum",
        "scientific_name": "Paspalum dilatatum",
        "common_names": ["dallisgrass"],
        "aliases": ["dallisgrass"],
        "nativity": "invasive",
        "plant_type": "perennial",
        "height_ft": 5,
        "width_ft": None,
        "water": None,
        "sun": None,
    },
    {
        "slug": "pennisetum-clandestinum",
        "scientific_name": "Pennisetum clandestinum",
        "common_names": ["kikuyugrass"],
        "aliases": ["kikuyugrass", "Cenchrus clandestinus"],
        "nativity": "invasive",
        "plant_type": "perennial",
        "height_ft": None,
        "width_ft": None,
        "water": None,
        "sun": None,
    },
    {
        "slug": "phytolacca-americana",
        "scientific_name": "Phytolacca americana",
        "common_names": ["American pokeweed", "pokeweed"],
        "aliases": ["pokeweed", "American pokeweed", "poke salad", "poke sallet", "pokeberry", "inkberry", "American nightshade", "scoke", "pigeonberry"],
        "nativity": "invasive",
        "plant_type": "perennial",
        "height_ft": 10,
        "width_ft": 5,
        "water": None,
        "sun": None,
    },
    {
        "slug": "plantago-major",
        "scientific_name": "Plantago major",
        "common_names": ["broadleaf plantain", "common plantain"],
        "aliases": ["broadleaf plantain", "common plantain", "dooryard plantain", "Plantago lanceolata", "buckhorn plantain", "narrow-leaf plantain", "ribwort plantain", "English plantain", "ribgrass"],
        "nativity": "invasive",
        "plant_type": "perennial",
        "height_ft": None,
        "width_ft": None,
        "water": None,
        "sun": None,
    },
    {
        "slug": "poa-annua",
        "scientific_name": "Poa annua",
        "common_names": ["annual bluegrass"],
        "aliases": ["annual bluegrass", "Poa", "annual meadow-grass"],
        "nativity": "invasive",
        "plant_type": "annual",
        "height_ft": None,
        "width_ft": None,
        "water": None,
        "sun": None,
    },
    {
        "slug": "polygonum-aviculare",
        "scientific_name": "Polygonum aviculare",
        "common_names": ["common knotweed", "prostrate knotweed", "wiregrass"],
        "aliases": ["common knotweed", "Polygonum arenastrum", "wiregrass", "wireweed", "matweed", "doorweed", "prostrate knotweed"],
        "nativity": "invasive",
        "plant_type": "annual",
        "height_ft": None,
        "width_ft": 4,
        "water": None,
        "sun": None,
    },
    {
        "slug": "portulaca-oleracea",
        "scientific_name": "Portulaca oleracea",
        "common_names": ["common purslane", "verdolaga"],
        "aliases": ["common purslane", "verdolaga", "pursley"],
        "nativity": "invasive",
        "plant_type": "annual",
        "height_ft": None,
        "width_ft": None,
        "water": None,
        "sun": "full",
    },
    {
        "slug": "salsola-tragus",
        "scientific_name": "Salsola tragus",
        "common_names": ["Russian thistle", "tumbleweed"],
        "aliases": ["Russian thistle", "tumbleweed", "Salsola kali", "Salsola ryanii", "Salsola paulsenii"],
        "nativity": "invasive",
        "plant_type": "annual",
        "height_ft": None,
        "width_ft": 6,
        "water": None,
        "sun": None,
    },
    {
        "slug": "senecio-vulgaris",
        "scientific_name": "Senecio vulgaris",
        "common_names": ["common groundsel", "old-man-of-the-spring"],
        "aliases": ["common groundsel", "old-man-of-the-spring"],
        "nativity": "invasive",
        "plant_type": "annual",
        "height_ft": 2,
        "width_ft": None,
        "water": None,
        "sun": None,
    },
    {
        "slug": "stellaria-media",
        "scientific_name": "Stellaria media",
        "common_names": ["common chickweed"],
        "aliases": ["common chickweed", "chickweed", "sticky chickweed", "Cerastium glomeratum", "mouseear chickweed", "Cerastium fontanum"],
        "nativity": "invasive",
        "plant_type": "annual",
        "height_ft": None,
        "width_ft": None,
        "water": None,
        "sun": None,
    },
    {
        "slug": "taraxacum-officinale",
        "scientific_name": "Taraxacum officinale",
        "common_names": ["dandelion", "common dandelion"],
        "aliases": ["dandelion", "lion's tooth", "common dandelion", "puffball", "blowball", "monk's head"],
        "nativity": "invasive",
        "plant_type": "perennial",
        "height_ft": 2,
        "width_ft": 1,
        "water": None,
        "sun": "full",
    },
    {
        "slug": "toxicodendron-diversilobum",
        "scientific_name": "Toxicodendron diversilobum",
        "common_names": ["Pacific poison-oak", "western poison-oak"],
        "aliases": ["poison-oak", "Pacific poison-oak", "western poison-oak", "Rhus diversiloba"],
        "nativity": "native",
        "plant_type": "perennial",
        "height_ft": None,
        "width_ft": None,
        "water": None,
        "sun": None,
    },
    {
        "slug": "tribulus-terrestris",
        "scientific_name": "Tribulus terrestris",
        "common_names": ["puncturevine", "goathead", "caltrop"],
        "aliases": ["puncturevine", "caltrop", "goathead"],
        "nativity": "invasive",
        "plant_type": "annual",
        "height_ft": None,
        "width_ft": 5,
        "water": None,
        "sun": None,
    },
    {
        "slug": "trifolium-repens",
        "scientific_name": "Trifolium repens",
        "common_names": ["white clover", "Dutch clover"],
        "aliases": ["white clover", "Dutch clover", "black medic", "Medicago lupulina", "California burclover", "Medicago polymorpha", "strawberry clover", "Trifolium fragiferum", "yellow sweetclover", "Melilotus officinalis", "white sweetclover", "Melilotus alba"],
        "nativity": "invasive",
        "plant_type": "perennial",
        "height_ft": None,
        "width_ft": None,
        "water": None,
        "sun": None,
    },
    {
        "slug": "urtica-urens",
        "scientific_name": "Urtica urens",
        "common_names": ["burning nettle", "dwarf nettle", "small nettle"],
        "aliases": ["burning nettle", "dwarf nettle", "small nettle", "Urtica dioica", "stinging nettle", "American stinging nettle", "California nettle", "coast nettle", "Lyall nettle", "hoary nettle"],
        "nativity": "invasive",
        "plant_type": "annual",
        "height_ft": 2,
        "width_ft": None,
        "water": None,
        "sun": None,
    },
]


def new_plant_row(entry: dict) -> dict:
    """Build a full plants.json row from an entries dict, defaulting Cal-IPC
    fields to null/empty (these weeds aren't on the Cal-IPC inventory) and
    leaving all Layer A/B/C fields for the sibling apply_*.py scripts."""
    return {
        "slug": entry["slug"],
        "scientific_name": entry["scientific_name"],
        "common_names": list(entry["common_names"]),
        "aliases": list(entry["aliases"]),
        "nativity": entry["nativity"],
        "plant_type": entry["plant_type"],
        "height_ft": entry["height_ft"],
        "width_ft": entry["width_ft"],
        "water": entry["water"],
        "sun": entry["sun"],
        "cal_ipc_rating": None,
        "cdfa_rating": None,
        "impact_score": None,
        "invasiveness_score": None,
        "distribution_score": None,
        "spread_mechanisms": [],
        "habitat_types": [],
        "jepson_regions": [],
        "photos": [],
        "removal_method": None,
        "removal_notes": [],
        "removal_sources": [],
        "removal_timing_window": None,
        "requires_followup_years": None,
        "safety_flags": [],
    }


def main() -> None:
    plants = json.loads(PLANTS_JSON.read_text(encoding="utf-8"))
    existing_index = {p["slug"]: i for i, p in enumerate(plants)}

    added = 0
    updated = 0
    for entry in ENTRIES:
        slug = entry["slug"]
        row = new_plant_row(entry)
        if slug in existing_index:
            # Upsert: preserve fields we don't manage here (photos, Cal-IPC
            # scoring if anything is later populated, Layer A/B/C handled by
            # downstream scripts).
            existing = plants[existing_index[slug]]
            for key in ("scientific_name", "common_names", "aliases", "nativity",
                        "plant_type", "height_ft", "width_ft", "water", "sun"):
                existing[key] = row[key]
            updated += 1
        else:
            plants.append(row)
            added += 1

    # Sort entries by slug so the file stays deterministic.
    plants.sort(key=lambda p: p["slug"])

    PLANTS_JSON.write_text(
        json.dumps(plants, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"add_ucipm_weed_entries: added={added}  updated={updated}  total={len(plants)}")


if __name__ == "__main__":
    main()
