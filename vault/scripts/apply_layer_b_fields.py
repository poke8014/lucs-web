"""
Apply Layer B summary fields to src/data/plants.json:
  - removal_timing_window  (short natural-language window)
  - requires_followup_years (integer; multi-year horizon)
  - safety_flags[]          (closed vocabulary, see types.ts SafetyFlag)

Sibling to apply_removal_methods.py — same idempotent pattern. Sourced from
the wiki bodies (vault/plants/*.md) plus the existing removal_notes already
in plants.json. Rest of the 137 plants get null/empty defaults so the schema
is uniform.
"""

from __future__ import annotations

import json
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
PLANTS_JSON = REPO / "src" / "data" / "plants.json"

# Closed vocabulary — keep in sync with SafetyFlag in
# src/app/sunshower/cleanup-plan/types.ts.
SAFETY_FLAGS = {
    "fragment_spreader",
    "spines_thorns",
    "irritant_sap",
    "toxic_handling",
    "do_not_burn",
    "do_not_mow",
    "allergenic_pollen",
}

# slug -> {timing, followup_years, flags}
DATA: dict[str, dict] = {
    # --- Woody trees / large shrubs ---
    "acacia-dealbata": {
        "timing": "Late spring–summer (cut in dry season)",
        "followup_years": 25,
        "flags": ["fragment_spreader"],
    },
    "ailanthus-altissima": {
        "timing": "Late summer (active translocation to roots)",
        "followup_years": 5,
        "flags": ["irritant_sap"],
    },
    "cotoneaster-pannosus": {
        "timing": "Late spring–summer (any time, really)",
        "followup_years": 10,
        "flags": [],
    },

    # --- Brooms (cut-stump workhorses; long seedbanks; do not burn) ---
    "cytisus-scoparius": {
        "timing": "May–June (before pods ripen)",
        "followup_years": 60,
        "flags": ["do_not_burn"],
    },
    "cytisus-striatus": {
        "timing": "May–June (before pods ripen)",
        "followup_years": 60,
        "flags": ["do_not_burn"],
    },
    "genista-monspessulana": {
        "timing": "April (just before flowering peak)",
        "followup_years": 60,
        "flags": ["do_not_burn"],
    },
    "spartium-junceum": {
        "timing": "May–June (before pods ripen)",
        "followup_years": 30,
        "flags": ["do_not_burn"],
    },
    "ulex-europaeus": {
        "timing": "Spring, or shortly after winter rain",
        "followup_years": 30,
        "flags": ["spines_thorns", "do_not_burn"],
    },

    # --- Mustard family / annual broadleaf ---
    "alliaria-petiolata": {
        "timing": "Spring rosette → before May seed set",
        "followup_years": 5,
        "flags": [],
    },
    "brassica-nigra": {
        "timing": "February–March (before pods yellow)",
        "followup_years": 50,
        "flags": ["allergenic_pollen"],
    },
    "hirschfeldia-incana": {
        "timing": "Spring (revisit every 3–4 weeks)",
        "followup_years": 10,
        "flags": ["allergenic_pollen"],
    },
    "oncosiphon-piluliferum": {
        "timing": "February–April (before seed set, soil moist)",
        "followup_years": 5,
        "flags": ["irritant_sap", "allergenic_pollen", "do_not_mow"],
    },

    # --- Annual grasses (mow at boot stage) ---
    "avena-fatua": {
        "timing": "March–April (boot stage)",
        "followup_years": 3,
        "flags": ["spines_thorns"],
    },
    "bromus-diandrus": {
        "timing": "April (boot stage, before awns harden)",
        "followup_years": 3,
        "flags": ["spines_thorns"],
    },
    "bromus-madritensis-ssp-rubens": {
        "timing": "March–April (boot stage)",
        "followup_years": 3,
        "flags": ["spines_thorns", "do_not_burn"],
    },
    "bromus-tectorum": {
        "timing": "April–May (before May dry-down)",
        "followup_years": 3,
        "flags": ["spines_thorns", "do_not_burn"],
    },
    "horderum-murinum": {
        "timing": "April (boot stage, before awns turn tan)",
        "followup_years": 3,
        "flags": ["spines_thorns"],
    },

    # --- Thistles & taprooted broadleaf ---
    "carduus-pycnocephalus": {
        "timing": "Spring rosette (before stems lignify)",
        "followup_years": 5,
        "flags": ["spines_thorns"],
    },
    "centaurea-solstitialis": {
        "timing": "May–June (bolt, before mid-bloom)",
        "followup_years": 10,
        "flags": ["spines_thorns"],
    },
    "cirsium-vulgare": {
        "timing": "Spring rosette → April–June flowering stalks",
        "followup_years": 5,
        "flags": ["spines_thorns"],
    },
    "cynara-cardunculus": {
        "timing": "Spring rosette → May (before seed set)",
        "followup_years": 10,
        "flags": ["spines_thorns"],
    },
    "dipsacus-fullonum": {
        "timing": "Spring rosette → before bolt",
        "followup_years": 5,
        "flags": ["spines_thorns"],
    },
    "foeniculum-vulgare": {
        "timing": "February–March (soil still moist)",
        "followup_years": 5,
        "flags": ["fragment_spreader"],
    },
    "lepidium-latifolium": {
        "timing": "May–June (bud → flowering)",
        "followup_years": 10,
        "flags": ["fragment_spreader"],
    },
    "conium-maculatum": {
        "timing": "February–April (rosette → bolt, before seed)",
        "followup_years": 6,
        "flags": ["toxic_handling", "do_not_burn"],
    },

    # --- Vines (sever, dig crown) ---
    "clematis-vitalba": {
        "timing": "Any cool month (before late-summer seed)",
        "followup_years": 5,
        "flags": ["irritant_sap", "fragment_spreader"],
    },
    "delairea-odorata": {
        "timing": "Any cool month (winter–spring)",
        "followup_years": 5,
        "flags": ["fragment_spreader", "do_not_mow"],
    },
    "hedera-canariensis": {
        "timing": "Any cool month",
        "followup_years": 5,
        "flags": ["irritant_sap", "fragment_spreader", "do_not_mow"],
    },
    "hedera-helix": {
        "timing": "Any cool month",
        "followup_years": 5,
        "flags": ["irritant_sap", "fragment_spreader", "do_not_mow"],
    },

    # --- Bramble ---
    "rubus-armeniacus": {
        "timing": "Late summer–early fall (foliar herbicide window)",
        "followup_years": 5,
        "flags": ["spines_thorns", "fragment_spreader"],
    },

    # --- Perennial grasses (rhizomatous) ---
    "arundo-donax": {
        "timing": "Late summer (rhizome resources low)",
        "followup_years": 10,
        "flags": ["fragment_spreader", "do_not_burn"],
    },
    "cortaderia-jubata": {
        "timing": "Any time (easier when soil is moist in winter)",
        "followup_years": 5,
        "flags": ["spines_thorns", "fragment_spreader"],
    },
    "cortaderia-selloana": {
        "timing": "Any time (easier when soil is moist in winter)",
        "followup_years": 5,
        "flags": ["spines_thorns", "fragment_spreader"],
    },
    "cynodon-dactylon": {
        "timing": "Summer (combine digging with solarization)",
        "followup_years": 5,
        "flags": ["fragment_spreader", "do_not_mow"],
    },
    "pennisetum-setaceum": {
        "timing": "Before seed dispersal (late spring)",
        "followup_years": 5,
        "flags": ["spines_thorns"],
    },

    # --- Mat-formers ---
    "carpobrotus-edulis": {
        "timing": "Any cool month (avoid summer scorch under cardboard)",
        "followup_years": 1,
        "flags": ["fragment_spreader"],
    },
    "vinca-major": {
        "timing": "Any cool month (cardboard down before summer)",
        "followup_years": 2,
        "flags": ["fragment_spreader"],
    },

    # --- Bulb chains ---
    "oxalis-pes-caprae": {
        "timing": "Autumn dig (fresh bulbs visible) + Jan–March foliage pulls",
        "followup_years": 5,
        "flags": ["fragment_spreader"],
    },
}


def main() -> None:
    for slug, entry in DATA.items():
        bad = [f for f in entry["flags"] if f not in SAFETY_FLAGS]
        if bad:
            raise SystemExit(f"{slug}: unknown safety flag(s) {bad}")

    plants = json.loads(PLANTS_JSON.read_text())
    known_slugs = {p["slug"] for p in plants}
    missing = sorted(s for s in DATA if s not in known_slugs)
    if missing:
        raise SystemExit(f"Slugs not found in plants.json: {missing}")

    filled = 0
    for plant in plants:
        slug = plant["slug"]
        if slug in DATA:
            entry = DATA[slug]
            plant["removal_timing_window"] = entry["timing"]
            plant["requires_followup_years"] = entry["followup_years"]
            plant["safety_flags"] = list(entry["flags"])
            filled += 1
        else:
            plant.setdefault("removal_timing_window", None)
            plant.setdefault("requires_followup_years", None)
            plant.setdefault("safety_flags", [])

    PLANTS_JSON.write_text(
        json.dumps(plants, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"Annotated {filled} / {len(plants)} plants with Layer B fields.")
    flag_counts: dict[str, int] = {}
    for plant in plants:
        for f in plant.get("safety_flags", []):
            flag_counts[f] = flag_counts.get(f, 0) + 1
    print("Safety flag distribution:")
    for f in sorted(flag_counts):
        print(f"  {f}: {flag_counts[f]}")


if __name__ == "__main__":
    main()
