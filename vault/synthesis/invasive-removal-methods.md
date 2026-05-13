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

## Method playbook (per UC IPM)

How to actually perform each method, grounded in the UC IPM Pest Notes
ingested on 2026-05-11. WRIC remains canonical for wildland sites; UC IPM
is the residential-scale complement and is the more concrete source for
home-garden technique (dilutions, timing windows, tool choice). Cited
pages live in [`vault/raw/articles/ucipm-general/`](../raw/articles/ucipm-general/)
and [`ucipm-residential/`](../raw/articles/ucipm-residential/).

### `hand_pull`
- **When:** before flower / seed set, on annuals or first-year rosettes of
  biennials; soil moist (after irrigation, or early spring / late fall).
- **How:** dandelion knife or hori-hori for herbs; a weed wrench handles
  small woody plants up to ~3–4 ft tall (e.g. broom seedlings).
- **Limits:** rarely sufficient for established perennials with stored root
  reserves — escalate to `dig_taproot` or `dig_rhizome_complete`.
- **Sources:** [PN-Weed Management in Landscapes](../raw/articles/ucipm-general/weed-management-in-landscapes.md),
  [PN-Poison Hemlock](../raw/articles/ucipm-residential/poison-hemlock.md),
  [PN-Brooms](../raw/articles/ucipm-residential/brooms.md).

### `dig_taproot`
- **When:** biennials at second-year flowering stage; perennial taprooted
  herbs while soil is moist.
- **How:** sever the taproot 2–4 in below the crown; remove the entire
  crown — fragments re-shoot. For biennials, hand-pull first-year rosettes
  instead of digging.
- **Limits:** plants that spread by rhizomes *and* taproot (perennial
  pepperweed) need repeated digging on the same spot for 3+ seasons —
  1-inch root fragments resprout.
- **Sources:** [PN-Yellow Starthistle](../raw/articles/ucipm-residential/yellow-starthistle.md),
  [PN-Poison Hemlock](../raw/articles/ucipm-residential/poison-hemlock.md),
  [PN-Perennial Pepperweed](../raw/articles/ucipm-residential/perennial-pepperweed.md).

### `cut_stump_herbicide`
- **When:** any time of year, but most effective during active growth
  (April–July for brooms; spring or fall for blackberry). Triclopyr ester
  is more readily absorbed by woody Fabaceae and Rubus; glyphosate is the
  broader-spectrum choice.
- **How:** cut flush to the soil; within minutes paint the cut cambium with
  herbicide via brush or squeeze bottle. Concrete recipes:
  - Triclopyr ester 61% concentrate → 1:4 product:water (~20% solution).
  - Glyphosate 41% concentrate → 1:3 product:water (~25% solution).
  - Glyphosate 18% concentrate → undiluted or 1:1 with water.
- **Limits:** delaying the paint by even a few minutes lets the cambium dry
  and tanks translocation. Same-species plants near the treated stump can
  be injured via shared root grafts.
- **Sources:** [PN-Woody Weed Invaders](../raw/articles/ucipm-general/woody-weed-invaders.md),
  [PN-Brooms](../raw/articles/ucipm-residential/brooms.md),
  [PN-Wild Blackberries](../raw/articles/ucipm-residential/wild-blackberries.md).

### `cane_cut_dig_crown`
- **When:** late summer or early fall on Himalayan blackberry, after fruit
  is gone (so accidental berry consumption can't pick up herbicide residue
  if you follow with cut-stump treatment).
- **How:** cut all canes back to stubs (leather sleeves — thorns shred
  standard gloves), then mattock out each woody crown. Trace every cane
  tip that touched soil and dig the rooted node. Repeated rototilling
  through the year can work; one-pass tilling fragments rhizomes and
  *spreads* the infestation.
- **Limits:** chipping or home composting scatters live nodes — bag for
  landfill or dry on an impermeable surface first.
- **Sources:** [PN-Wild Blackberries](../raw/articles/ucipm-residential/wild-blackberries.md).

### `pull_vine_dig_crown`
- **When:** ivies any time soil is moist enough to dislodge runners.
- **How:** sever climbing stems from the trunk first to kill the aerial
  canopy. On the ground, pull or shovel out every runner — Hedera roots at
  every node and missed runners regenerate. Foliar glyphosate on regrowth
  handles residual ground cover.
- **Limits:** ivy dermatitis is common; gloves + long sleeves are
  standard. Cape-ivy (*Delairea*) and old man's beard (*Clematis vitalba*)
  follow the same physical recipe but lack a dedicated UC IPM PN.
- **Sources:** [PN-Woody Weed Invaders](../raw/articles/ucipm-general/woody-weed-invaders.md).

### `dig_rhizome_complete`
- **When:** during active growth when soil is workable.
- **How:** physically remove every rhizome; partial removal regrows. For
  pampasgrass / jubatagrass, a wick applicator with a 1:2
  glyphosate-concentrate:water mix (33% solution) wiped on every tiller is
  an alternative to digging the whole clump. Dispose of rhizomes away from
  water — arundo and bamboo fragments re-root downstream.
- **Limits:** burning, mowing, and mulching don't control deep-storage
  perennials. Solarization controls bermudagrass and johnsongrass rhizomes
  only when they sit near the soil surface.
- **Sources:** [PN-Woody Weed Invaders](../raw/articles/ucipm-general/woody-weed-invaders.md),
  [PN-Perennial Pepperweed](../raw/articles/ucipm-residential/perennial-pepperweed.md).

### `dig_bulb_complete`
- **When:** Bermuda buttercup forms fresh bulbs in autumn — dig then. Cut
  foliage during bloom (Jan–Mar) first to weaken the bulb reserves.
- **How:** lift the entire bulb chain; sift soil through hardware cloth.
  Solarize the bed for 4+ weeks during June–August *before* replanting to
  kill missed bulblets. As a slower alternative without solarization,
  cardboard + thick organic mulch over the infestation can deplete bulbs
  over years (UC IPM describes this as investigated but not proven).
- **Limits:** foliar herbicides kill leaves but not bulbs; regrowth is the
  default outcome of any non-physical treatment.
- **Sources:** [PN-Creeping Woodsorrel and Bermuda Buttercup](../raw/articles/ucipm-residential/creeping-woodsorrel-and-bermuda-buttercup.md).

### `sheet_mulch_smother`
- **When:** mat-forming groundcovers without deep taproots (iceplant,
  periwinkle). Install before the rainy season so the smother layer is
  in place when winter germination begins.
- **How:** coarse organic mulch (3/4-inch wood chips or larger) at 3–4 in
  depth. Landscape fabric beneath the mulch sharply boosts suppression and
  is preferred over black plastic, which restricts air and water movement
  and breaks down quickly. Replenish as the organic layer decomposes —
  thin mulch is a weed-seed nursery.
- **Limits:** deep-rhizome perennials (pepperweed, field bindweed,
  nutsedge) push through mulch using stored reserves.
- **Sources:** [PN-Weed Management in Landscapes](../raw/articles/ucipm-general/weed-management-in-landscapes.md).

### `mow_before_seed`
- **When:** repeatedly through the growing season, timed to just before
  flower-head maturity. For yellow starthistle: late spiny / early
  flowering stage, on plants with a high-branching pattern.
- **How:** annual grasses (oats, bromes, hare barley) are managed by
  cutting before seed maturity. Mowing favors low-growing perennials and
  grasses, so it is a maintenance tool for keeping seed input down, not an
  eradication tool.
- **Limits:** plants that flower below mower height (spotted spurge,
  creeping woodsorrel) are not controlled. Late-season mowing spreads
  seeds via equipment — wash mowers between sites.
- **Sources:** [PN-Weed Management in Landscapes](../raw/articles/ucipm-general/weed-management-in-landscapes.md),
  [PN-Yellow Starthistle](../raw/articles/ucipm-residential/yellow-starthistle.md).

### `solarize_summer`
- **When:** June–August, on flat or south-facing slopes with ≥4 hours of
  direct sun. July is the most reliable month inland; coastal areas may
  need August–September.
- **How:** clear debris, level the bed, wet the soil to 12-inch depth, then
  lay 1–4 mil **clear** (not black) plastic flat against the surface. Bury
  edges in trenches and pull tight — air gaps sharply reduce heating.
  Leave 4–6 weeks (8 in cool/windy spots). Target 110–125°F at top 6 in.
- **Limits:** controls many annuals and surface-rooted perennials but
  deep-rhizome perennials (bermudagrass, johnsongrass, bindweed, nutsedge)
  often survive — rhizomes below the heat zone resprout. Coastal fog and
  shaded sites may not reach lethal temperatures.
- **Sources:** [PN-Soil Solarization](../raw/articles/ucipm-general/soil-solarization-for-gardens-and-landscapes.md).

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

### UC IPM Pest Notes — secondary source (ingested 2026-05-11)

WRIC is the canonical natural-areas reference, but it is biased toward
agronomic and wildland contexts. To complement it with **residential
home-and-landscape** guidance, the weed-relevant subset of the UC IPM
Pest Notes series was scraped on 2026-05-11 via firecrawl + the
[`vault/scripts/scrape_ucipm.py`](../scripts/scrape_ucipm.py) script:

- 28 per-species/species-group pages → [`vault/raw/articles/ucipm-residential/`](../raw/articles/ucipm-residential/)
- 6 cross-cutting method pages → [`vault/raw/articles/ucipm-general/`](../raw/articles/ucipm-general/) (Soil Solarization, Weed Management in Landscapes, Weed Management in Lawns, Woody Weed Invaders, Invasive Plants overview, Roses)

Coverage:
- **10 of the annotated 38** have a UC IPM Pest Note that covers them (the
  Brooms PN covers Cytisus scoparius, Cytisus striatus, Genista monspessulana,
  Spartium junceum, Ulex europaeus; the Wild Blackberries PN covers Rubus
  armeniacus; plus PNs for *Centaurea solstitialis*, *Conium maculatum*,
  *Lepidium latifolium*, *Oxalis pes-caprae*).
- **18 additional Pest Notes** cover residential weeds **not in the
  Cal-IPC inventory** — dandelion, mallows, plantains, field bindweed,
  common groundsel, chickweeds, clovers, catchweed bedstraw, spurges,
  knotweed, purslane, dallisgrass, kikuyugrass, puncturevine, Russian
  thistle, Dyer's woad, pokeweed, dodder, green kyllinga, burning/stinging
  nettles, annual bluegrass, poison oak. These are queued for **future
  inventory expansion** beyond Cal-IPC's wildland focus, and become
  candidates for the cleanup-plan plant picker once the data layer is ready
  to carry non-Cal-IPC entries.

The general/method pages anchor the "Method playbook" section above —
specifically PN-Soil Solarization for `solarize_summer`, PN-Woody Weed
Invaders + PN-Brooms + PN-Wild Blackberries for `cut_stump_herbicide`, and
PN-Weed Management in Landscapes for the residential mulch / hand-pull
defaults. PN-Invasive Plants reinforces the project's RPRP framing: UC IPM
attributes ~63% of CA invasives to intentional introduction (vs the 25%
horticultural-pathway figure surfaced by Cal-IPC PAF text in
[[synthesis/calipc-top-tier-overview]]), with ~80% of that intentional
group entering via the nursery industry. The discrepancy is a measurement
difference (UC IPM counts all intentional pathways including forage and
soil-stabilization) and is noted, not flagged as a contradiction.

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

## Per-species deltas — UC IPM vs current `removal_notes`

For each of the 10 annotated plants directly covered by a UC IPM Pest Note,
this section captures what UC IPM adds, confirms, or contradicts vs the v0
`removal_notes[]` in [`src/data/plants.json`](../../src/data/plants.json).
Material additions are candidates for a per-plant note rewrite; pure
confirmations are noted briefly. No outright contradictions were found.

### *Cytisus scoparius* — Scotch broom
**Add:** PN-Brooms recommends triclopyr ester (1:4 with water from 61%
concentrate) as an alternative to glyphosate for cut-stump. **Confirm:**
weed-wrench for small plants, cut + paint for established, pre-pod timing.

### *Cytisus striatus* — Portuguese broom
**Confirm:** managed identically to Scotch broom (PN-Brooms covers all
five broom genera together).

### *Genista monspessulana* — French broom
**Add:** PN-Brooms specifies foliar-spray window of April–July when plants
are actively growing. **Confirm:** aggressive resprouting; stump painting
is essential.

### *Spartium junceum* — Spanish broom
**Add:** PN-Brooms confirms triclopyr ester is viable here too; current
note only mentions glyphosate. **Confirm:** frequent survival of single
cut, year-2 follow-up expected.

### *Ulex europaeus* — gorse
**Confirm:** triclopyr is the preferred chemistry; multi-year follow-up.

### *Centaurea solstitialis* — yellow starthistle
**Add:** PN-Yellow Starthistle describes a viable alternative path for
high-branching plants — repeated mowing at late spiny / early flowering
stage. Aminopyralid / clopyralid herbicides are options but require
non-residential land use (rangeland / roadside). **Confirm:** taproot dig
is correct for residential single-plant scale; 3–10 year seedbank.

### *Conium maculatum* — poison-hemlock
**Add:** PN-Poison Hemlock notes that repeated mowing once plants have
bolted but before flowering depletes taproot reserves and prevents seed
set — a secondary tactic when digging isn't feasible. **Confirm:**
toxicity warnings, no-burn rule, biennial timing.

### *Lepidium latifolium* — perennial pepperweed *(material additions)*
**Add:** PN-Perennial Pepperweed gives concrete residential guidance not
in the current notes:
- 10-foot lateral root spread — any tarp / sheet-mulch barrier must
  extend at least 10 ft past the visible patch.
- For replanting after control: glyphosate, then a 2–6 month wait period
  to let any remaining roots resprout for re-treatment, then dense
  herbaceous perennials or turf to outcompete.
- Tarping with thick black plastic for **two growing seasons** can
  eventually exhaust the root system (less inconsistent than annual
  solarization).

### *Oxalis pes-caprae* — Bermuda buttercup *(material additions)*
**Add:** PN-Creeping Woodsorrel and Bermuda Buttercup describes a
cardboard + thick organic mulch alternative for users who can't solarize.
Documented as investigated; multi-year timeline. **Confirm:** every bulb
matters; sift soil; pull foliage during bloom to weaken bulbs before
autumn dig.

### *Rubus armeniacus* — Himalayan blackberry *(material additions)*
**Add:** PN-Wild Blackberries adds the chemical-control option currently
absent from `removal_notes`:
- Cut-stump triclopyr ester (61% concentrate at 1:4 in water) or
  glyphosate (41% at 1:3 in water) painted on stubs immediately after
  cutting.
- Foliar glyphosate is best applied in late summer / early fall after
  flowering, before leaves drop.
- Repeated rototilling through the year is an effective home-gardener
  mechanical alternative; single-pass tilling makes things worse.

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

- **WRIC body rollout complete (2026-05-12):** all 38 annotated plants now
  have Identify / Remove / Prevent sections grounded in WRIC + UC IPM where
  applicable. Remaining ~99 Cal-IPC plants are stubs awaiting inventory
  expansion beyond residential scope.
- Rewrite per-plant `removal_notes[]` in `src/data/plants.json` for the 3
  plants with material UC IPM deltas (pepperweed, Bermuda buttercup,
  Himalayan blackberry) and fold the chemical-recipe specifics into the
  broom + starthistle notes. Concrete dilutions now live on the plant pages
  but the cleanup-plan app reads from `plants.json`, so notes still need
  updating.
- Annotate the remaining ~99 plants — extend coverage to rural/peri-urban
  sites once the user base broadens beyond residential yards. These are
  primarily aquatic, salt-marsh, coastal-dune, and remote-rangeland
  invasives.
- Add `removal_timing` (per-region, per-method) when zone/region data
  lands.
- Add `requires_followup_years` so the plan can surface a multi-year
  watch-and-sweep block separately from the immediate action.
- Create `sources/ucipm.md` meta-page covering the UC IPM dataset
  (deferred from the 2026-05-11 UC IPM ingest entry in `log.md`).
