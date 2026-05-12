---
type: synthesis
title: Invasive removal methods — canonical vocabulary
aliases: [removal vocabulary, removal_method keys]
tags: [invasives, removal, app-data, vocabulary]
status: draft
sources: []
last_updated: 2026-05-11
---

# Invasive removal methods — canonical vocabulary

This page defines the closed vocabulary of `removal_method` values used by the
Sunshower cleanup-plan app, and records the source attribution + per-plant
assignments for the initial annotated subset (38 plants).

The vocabulary lives in code at [src/app/sunshower/cleanup-plan/types.ts](../../src/app/sunshower/cleanup-plan/types.ts)
(`RemovalMethod` union) and the per-plant data lives in
[src/data/plants.json](../../src/data/plants.json). The migration script that
applied the data is at [vault/scripts/apply_removal_methods.py](../scripts/apply_removal_methods.py).

## Why a closed vocabulary

The cleanup plan groups the user's confirmed plants by `removal_method` so
that plants sharing a method become a single grouped action ("Cut at base and
paint stump with herbicide: Scotch broom, French broom, Spanish broom, gorse,
Portuguese broom"). Free-form method strings would not group. A closed
vocabulary forces every plant to roll up into a known bucket.

The keys are intentionally action-shaped, not taxonomic. Two unrelated
species that need the same physical action belong in the same group from the
user's perspective, even if Cal-IPC's profiles describe them differently.

## Vocabulary

| Key                       | Display label                                | Applies to                                                                              |
|---------------------------|----------------------------------------------|-----------------------------------------------------------------------------------------|
| `hand_pull`               | Hand-pull young plants before seed set       | Annual or shallow-rooted herbs you can yank by hand or with a weeding tool              |
| `dig_taproot`             | Dig out the entire taproot and crown         | Biennial / perennial taprooted herbs that resprout from any remaining crown tissue      |
| `cut_stump_herbicide`     | Cut at base and paint stump with herbicide   | Woody resprouters: brooms, acacia, ailanthus, cotoneaster, fig                          |
| `cane_cut_dig_crown`      | Cut canes, then dig out root crowns          | Bramble / cane plants (Rubus); canes that tip-root must be dug at each rooted node      |
| `pull_vine_dig_crown`     | Sever vines and excavate rooted crowns       | Climbing vines (ivies, Cape-ivy, old man's beard) where every rooted node re-roots      |
| `dig_rhizome_complete`    | Excavate the entire rhizome — bag fragments  | Clumping or rhizomatous perennials whose every fragment re-roots                        |
| `dig_bulb_complete`       | Dig the entire bulb chain — sift soil        | Bulbous / cormous perennials where every bulblet regrows                                |
| `sheet_mulch_smother`     | Smother under heavy cardboard and mulch      | Mat-forming groundcovers without deep taproots                                          |
| `mow_before_seed`         | Mow repeatedly just before seed set          | Annual grasses and herbs managed by repeated cutting before seed maturity               |
| `solarize_summer`         | Solarize under clear plastic in summer       | Reserved: clear plastic over moist soil, June–September, as a follow-up pass            |

`solarize_summer` is in the vocabulary but no plant currently uses it as its
primary method. It is referenced in `removal_notes[]` for several plants as
a recommended follow-up. It stays in the union so Agent D and later work can
recognize it without a schema change.

## Sources

Per-plant method assignments and `removal_notes[]` are grounded in the WRIC
*Weed Reports*, the canonical California natural-area weed management
reference. The full 274-PDF archive was ingested to markdown via firecrawl
on 2026-05-11 (see [[sources/wric]] for the meta-page covering the dataset
and the scrape recipe). Citation slugs in `plants.json` follow the pattern
`wric/<PdfStem>` and resolve to `vault/raw/articles/wric/<PdfStem>.md`.

Recommended citation for any user-facing surfacing of removal guidance:

> DiTomaso, J.M., G.B. Kyser et al. 2013. *Weed Control in Natural Areas in
> the Western United States.* Weed Research and Information Center,
> University of California. 544 pp.

[[sources/calipc]] Plant Assessment Forms in
`vault/raw/articles/calipc/` confirm severity, spread mechanisms, and
habitat but explicitly do not carry management methods.

**Per-plant source attribution for the annotated 38:**

- **35 plants** cite a WRIC PDF that directly covers the species.
- **1 plant** uses a congener-only citation — *Acacia dealbata* (silver
  wattle) is covered indirectly via the WRIC notes for *Acacia melanoxylon*
  (black acacia); the management notes apply broadly to both.
- **1 plant** carries no WRIC source — *Oncosiphon pilulifer* (stinknet) is
  a post-2013 invader, not covered in the source book. Its notes are
  synthesized from Cal-IPC profile content + county Ag commissioner
  advisories; `removal_sources` is empty for this plant only.

## Annotated plants (38)

Grouped by assigned method. The grouping doubles as a sanity check: plants
in the same row should produce a coherent shared action in the cleanup plan.

### `cut_stump_herbicide` (8)
- *Acacia dealbata* — silver wattle
- *Ailanthus altissima* — tree-of-heaven
- *Cotoneaster pannosus* — silverleaf cotoneaster
- *Cytisus scoparius* — Scotch broom
- *Cytisus striatus* — Portuguese broom
- *Genista monspessulana* — French broom
- *Spartium junceum* — Spanish broom
- *Ulex europaeus* — gorse

### `dig_taproot` (8)
- *Carduus pycnocephalus* — Italian thistle
- *Centaurea solstitialis* — yellow starthistle
- *Cirsium vulgare* — bull thistle
- *Conium maculatum* — poison-hemlock
- *Cynara cardunculus* — artichoke thistle
- *Dipsacus fullonum* — wild teasel
- *Foeniculum vulgare* — fennel
- *Lepidium latifolium* — perennial pepperweed

### `dig_rhizome_complete` (5)
- *Arundo donax* — giant reed
- *Cortaderia jubata* — jubatagrass
- *Cortaderia selloana* — pampasgrass
- *Cynodon dactylon* — Bermuda grass
- *Pennisetum setaceum* — fountain grass

### `mow_before_seed` (5)
- *Avena fatua* — wild oats
- *Bromus diandrus* — ripgut brome
- *Bromus madritensis* ssp. *rubens* — red brome
- *Bromus tectorum* — cheatgrass
- *Hordeum murinum* — foxtail / hare barley

### `pull_vine_dig_crown` (4)
- *Clematis vitalba* — old man's beard
- *Delairea odorata* — Cape-ivy
- *Hedera canariensis* — Algerian ivy
- *Hedera helix* — English ivy

### `hand_pull` (4)
- *Alliaria petiolata* — garlic mustard
- *Brassica nigra* — black mustard
- *Hirschfeldia incana* — short-pod mustard
- *Oncosiphon pilulifer* — stinknet

### `sheet_mulch_smother` (2)
- *Carpobrotus edulis* — highway iceplant
- *Vinca major* — periwinkle

### `cane_cut_dig_crown` (1)
- *Rubus armeniacus* — Himalayan blackberry

### `dig_bulb_complete` (1)
- *Oxalis pes-caprae* — Bermuda buttercup

## Selection criteria for the initial 38

The 137-plant inventory includes aquatic, salt-marsh, coastal-dune, and
remote-rangeland invasives that a CA residential homeowner is unlikely to
encounter in a yard. The initial 38 prioritize:

1. **Yard-likely encounters in Bay Area / inland CA** — brooms, blackberry,
   ivy, fennel, thistles, common annual grasses, mat-forming groundcovers.
2. **Method-group coverage for Agent D's grouped output** — five brooms in
   one bucket, five bromes/oats in another, four vines, three thistles. A
   user who picks several plants from one bucket gets one grouped action,
   not multiple near-identical cards. (Per [planning/sunshower_gui_mvp.md](../../planning/sunshower_gui_mvp.md) Agent D.)
3. **Severity** — bias toward Cal-IPC "High" ratings, with selected
   "Moderate" entries (mustards, common thistles, taproot herbs, fountain
   grass, cotoneaster) added because they are far more common in residential
   yards than some of the High-rated aquatics.

## Next steps (deferred)

- Ingest per-species WRIC PDFs into `vault/raw/articles/wric/` and reconcile
  `removal_notes[]` against the canonical text.
- Annotate the remaining ~100 plants — extend coverage to rural/peri-urban
  sites once the user base broadens beyond residential yards.
- Add `removal_timing` (per-region, per-method) when zone/region data lands.
- Add `requires_followup_years` so the plan can surface a multi-year
  watch-and-sweep block separately from the immediate action.
