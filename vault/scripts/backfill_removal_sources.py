"""
Backfill `removal_sources` on the 38 annotated plants in src/data/plants.json
by mapping each plant slug to the WRIC PDF (now scraped to markdown) that
covers it.

Also ensures every plant carries the field with at least an empty array, so
the schema is uniform across all 137 records.

Mapping notes:
- Some WRIC PDFs cover multiple congeners (Bromus_diandrus-madritensis-tectorum,
  Hedera_canariensis-helix-hibernica, Cortaderia_jubata-selloana, Cytisus).
- Some plants have no direct WRIC entry; the closest available congener is
  used and flagged in the synthesis page. See `CONGENER_SOURCE`.
- Stinknet (Oncosiphon pilulifer) has no WRIC entry at all — too new an
  invader for the 2013 source book. Left without a WRIC source.

Run after vault/scripts/scrape_wric.py has populated vault/raw/articles/wric/.
"""

from __future__ import annotations

import json
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
PLANTS_JSON = REPO / "src" / "data" / "plants.json"
WRIC_DIR = REPO / "vault" / "raw" / "articles" / "wric"

# Direct mappings: slug -> WRIC markdown filename stem (i.e. file in vault/raw/articles/wric/<stem>.md).
# Citation slug emitted into plants.json is "wric/<stem>".
DIRECT_SOURCE: dict[str, str] = {
    "ailanthus-altissima": "Ailanthus",
    "alliaria-petiolata": "Alliaria",
    "arundo-donax": "Arundo",
    "avena-fatua": "Avena_barbata-fatua",
    "brassica-nigra": "Brassica_nigra",
    "bromus-diandrus": "Bromus_diandrus-madritensis-tectorum",
    "bromus-madritensis-ssp-rubens": "Bromus_diandrus-madritensis-tectorum",
    "bromus-tectorum": "Bromus_diandrus-madritensis-tectorum",
    "carduus-pycnocephalus": "Carduus_acanthoides-nutans-pycnocephalus-tenuiflorus",
    "carpobrotus-edulis": "Carpobrotus",
    "centaurea-solstitialis": "Centaurea_solstitialis",
    "cirsium-vulgare": "Cirsium_vulgare",
    "clematis-vitalba": "Clematis",
    "conium-maculatum": "Conium",
    "cortaderia-jubata": "Cortaderia_jubata-selloana",
    "cortaderia-selloana": "Cortaderia_jubata-selloana",
    "cotoneaster-pannosus": "Cotoneaster",
    "cynara-cardunculus": "Cynara",
    "cynodon-dactylon": "Cynodon",
    "cytisus-scoparius": "Cytisus",
    "cytisus-striatus": "Cytisus",
    "delairea-odorata": "Delairea",
    "dipsacus-fullonum": "Dipsacus_fullonum-laciniatus-sativus",
    "foeniculum-vulgare": "Foeniculum",
    "genista-monspessulana": "Genista",
    "hedera-canariensis": "Hedera_canariensis-helix-hibernica",
    "hedera-helix": "Hedera_canariensis-helix-hibernica",
    "hirschfeldia-incana": "Hirschfeldia",
    "horderum-murinum": "Hordeum_marinum-murinum",
    "lepidium-latifolium": "Lepidium_latifolium",
    "oxalis-pes-caprae": "Oxalis",
    "pennisetum-setaceum": "Pennisetum_setaceum",
    "rubus-armeniacus": "Rubus",
    "spartium-junceum": "Spartium",
    "ulex-europaeus": "Ulex",
    "vinca-major": "Vinca",
}

# Congener-only mappings: the WRIC PDF doesn't cover the exact species but
# covers a closely-related one with broadly applicable management notes.
# The synthesis page documents the caveat per plant.
CONGENER_SOURCE: dict[str, tuple[str, str]] = {
    # slug -> (wric stem, congener actually covered)
    "acacia-dealbata": ("Acacia", "Acacia melanoxylon (black acacia)"),
}

# Plants with no WRIC entry at all — left without a removal_sources citation.
NO_WRIC: set[str] = {
    "oncosiphon-piluliferum",  # stinknet — post-dates the 2013 source book
}


def main() -> None:
    plants = json.loads(PLANTS_JSON.read_text(encoding="utf-8"))

    # Sanity-check that every cited WRIC file actually exists on disk.
    expected_stems = set(DIRECT_SOURCE.values()) | {s for (s, _) in CONGENER_SOURCE.values()}
    missing = [stem for stem in expected_stems if not (WRIC_DIR / f"{stem}.md").exists()]
    if missing:
        raise SystemExit(
            "WRIC markdown files missing — run vault/scripts/scrape_wric.py first:\n"
            + "\n".join(f"  vault/raw/articles/wric/{m}.md" for m in sorted(missing))
        )

    annotated = 0
    congener = 0
    none_field = 0
    for plant in plants:
        slug = plant["slug"]
        if slug in DIRECT_SOURCE:
            plant["removal_sources"] = [f"wric/{DIRECT_SOURCE[slug]}"]
            annotated += 1
        elif slug in CONGENER_SOURCE:
            stem, _ = CONGENER_SOURCE[slug]
            plant["removal_sources"] = [f"wric/{stem}"]
            congener += 1
        else:
            plant.setdefault("removal_sources", [])
            none_field += 1

    PLANTS_JSON.write_text(
        json.dumps(plants, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(
        f"Backfilled removal_sources: direct={annotated}  congener={congener}  empty_default={none_field}"
    )


if __name__ == "__main__":
    main()
