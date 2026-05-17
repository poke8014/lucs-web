"""
Backfill `removal_sources` on annotated plants in src/data/plants.json by
mapping each plant slug to the source documents that cover it. Two source
families are wired here:

  - WRIC (UC Davis Weed Research and Information Center) — natural-area
    weed reports; the original 38 annotated Cal-IPC plants.
  - UC IPM (UC Statewide IPM Program) residential Pest Notes — the
    May 2026 cleanup-plan scope expansion (22 new entries plus 11 overlap
    plants that also have a WRIC report).

Where a plant has both a WRIC entry and a UC IPM Pest Note, both are listed;
the user-facing render prefers the residential one. WRIC stays the canonical
wildland-management source.

Also ensures every plant carries the field with at least an empty array, so
the schema is uniform across all records.

Mapping notes:
- Some WRIC PDFs cover multiple congeners (Bromus_diandrus-madritensis-tectorum,
  Hedera_canariensis-helix-hibernica, Cortaderia_jubata-selloana, Cytisus).
- Some plants have no direct WRIC entry; the closest available congener is
  used and flagged in the synthesis page. See `CONGENER_SOURCE`.
- Stinknet (Oncosiphon pilulifer) has no WRIC entry at all — too new an
  invader for the 2013 source book. Left without a WRIC source.
- UC IPM citation slugs follow `ucipm-residential/<page-slug>` and resolve to
  vault/raw/articles/ucipm-residential/<page-slug>.md.

Run after vault/scripts/scrape_wric.py and vault/scripts/scrape_ucipm.py have
populated vault/raw/articles/{wric,ucipm-residential}/.
"""

from __future__ import annotations

import json
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
PLANTS_JSON = REPO / "src" / "data" / "plants.json"
WRIC_DIR = REPO / "vault" / "raw" / "articles" / "wric"
UCIPM_RESIDENTIAL_DIR = REPO / "vault" / "raw" / "articles" / "ucipm-residential"

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

# Plants with no WRIC entry at all — left without a WRIC citation. They may
# still receive a UC IPM Pest Note citation via UCIPM_RESIDENTIAL below.
NO_WRIC: set[str] = {
    "oncosiphon-piluliferum",  # stinknet — post-dates the 2013 source book
}

# UC IPM residential Pest Note mappings: slug -> page-slug under
# vault/raw/articles/ucipm-residential/. Citation slug emitted is
# "ucipm-residential/<page-slug>". Both overlap (Cal-IPC + UC IPM) and
# new-weed-only (non-Cal-IPC) plants live here in one dict.
UCIPM_RESIDENTIAL: dict[str, str] = {
    # --- Cal-IPC overlap plants (already have a WRIC citation) ---
    "centaurea-solstitialis": "yellow-starthistle",
    "conium-maculatum": "poison-hemlock",
    "cytisus-scoparius": "brooms",
    "cytisus-striatus": "brooms",
    "genista-monspessulana": "brooms",
    "isatis-tinctoria": "dyers-woad",
    "lepidium-latifolium": "perennial-pepperweed",
    "oxalis-pes-caprae": "creeping-woodsorrel-and-bermuda-buttercup",
    "rubus-armeniacus": "wild-blackberries",
    "spartium-junceum": "brooms",
    "ulex-europaeus": "brooms",
    # --- Non-Cal-IPC residential weeds (UC IPM is the sole source) ---
    "convolvulus-arvensis": "field-bindweed",
    "cuscuta-pentagona": "dodder",
    "euphorbia-maculata": "spotted-spurge-and-other-spurges",
    "galium-aparine": "catchweed-bedstraw",
    "kyllinga-brevifolia": "green-kyllinga",
    "malva-parviflora": "mallows",
    "oxalis-corniculata": "creeping-woodsorrel-and-bermuda-buttercup",
    "paspalum-dilatatum": "dallisgrass",
    "pennisetum-clandestinum": "kikuyugrass",
    "phytolacca-americana": "pokeweed",
    "plantago-major": "plantains",
    "poa-annua": "annual-bluegrass",
    "polygonum-aviculare": "common-knotweed",
    "portulaca-oleracea": "common-purslane",
    "salsola-tragus": "russian-thistle",
    "senecio-vulgaris": "common-groundsel",
    "stellaria-media": "chickweeds",
    "taraxacum-officinale": "dandelion",
    "toxicodendron-diversilobum": "poison-oak",
    "tribulus-terrestris": "puncturevine",
    "trifolium-repens": "clovers",
    "urtica-urens": "burning-and-stinging-nettles",
}


def main() -> None:
    plants = json.loads(PLANTS_JSON.read_text(encoding="utf-8"))

    # Sanity-check that every cited source file actually exists on disk.
    wric_stems = set(DIRECT_SOURCE.values()) | {s for (s, _) in CONGENER_SOURCE.values()}
    missing_wric = [stem for stem in wric_stems if not (WRIC_DIR / f"{stem}.md").exists()]
    if missing_wric:
        raise SystemExit(
            "WRIC markdown files missing — run vault/scripts/scrape_wric.py first:\n"
            + "\n".join(f"  vault/raw/articles/wric/{m}.md" for m in sorted(missing_wric))
        )

    ucipm_stems = set(UCIPM_RESIDENTIAL.values())
    missing_ucipm = [
        stem for stem in ucipm_stems
        if not (UCIPM_RESIDENTIAL_DIR / f"{stem}.md").exists()
    ]
    if missing_ucipm:
        raise SystemExit(
            "UC IPM residential markdown files missing — run vault/scripts/scrape_ucipm.py first:\n"
            + "\n".join(f"  vault/raw/articles/ucipm-residential/{m}.md" for m in sorted(missing_ucipm))
        )

    wric_direct = 0
    wric_congener = 0
    ucipm_added = 0
    empty_default = 0
    for plant in plants:
        slug = plant["slug"]
        sources: list[str] = []
        if slug in DIRECT_SOURCE:
            sources.append(f"wric/{DIRECT_SOURCE[slug]}")
            wric_direct += 1
        elif slug in CONGENER_SOURCE:
            stem, _ = CONGENER_SOURCE[slug]
            sources.append(f"wric/{stem}")
            wric_congener += 1
        if slug in UCIPM_RESIDENTIAL:
            sources.append(f"ucipm-residential/{UCIPM_RESIDENTIAL[slug]}")
            ucipm_added += 1
        if sources:
            plant["removal_sources"] = sources
        else:
            plant.setdefault("removal_sources", [])
            empty_default += 1

    PLANTS_JSON.write_text(
        json.dumps(plants, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(
        f"Backfilled removal_sources: wric_direct={wric_direct}  wric_congener={wric_congener}  "
        f"ucipm_added={ucipm_added}  empty_default={empty_default}"
    )


if __name__ == "__main__":
    main()
