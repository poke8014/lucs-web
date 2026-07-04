# Sunshower Wiki — Schema

This vault implements the [LLM Wiki pattern](./llm-wiki.md): an LLM-maintained, persistent, interlinked knowledge base for the Sunshower project (native California pollinator garden app).

**Domain:** Native California pollinator gardening — plants, pollinators, design frameworks, regions, nurseries, ecological concepts.

**My role (the LLM):** Read raw sources, write and maintain the wiki, keep it consistent. I create pages, update cross-references, flag contradictions, and keep `index.md` and `log.md` current. I never modify files in `raw/`.

**Your role (Luc):** Curate sources, drop them in `raw/`, ask questions, direct emphasis, review the graph in Obsidian.

---

## Layout

```
vault/
  CLAUDE.md          # this file — the schema
  llm-wiki.md        # Karpathy's pattern doc (reference, do not modify)
  index.md           # content catalog (I keep current)
  log.md             # chronological record (I append on every op)
  raw/               # IMMUTABLE source tier — I read, never write
    articles/        # clipped web articles (markdown)
      <source-slug>/   # bulk-scraped sources go in a per-source subfolder (e.g. calipc/, calscape/)
                       # individually-clipped articles stay flat at raw/articles/
    pdfs/            # research papers, design guides, agency PDFs
    assets/          # downloaded images
  # Wiki pages (created as sources arrive — no preemptive taxonomy):
  # plants/          — one page per plant species
  # pollinators/     — bees, butterflies, hummingbirds, etc.
  # concepts/        — design principles, frameworks, ecological concepts
  # regions/         — geographic entities (state, ecoregion, county, city)
  # nurseries/       — local nurseries and online suppliers
  # sources/         — one summary page per ingested source
  # synthesis/       — cross-cutting analyses, comparisons, overviews
```

I create category folders the first time a source produces a page in that category. I don't pre-stamp empty folders.

---

## Page conventions

Every wiki page (NOT raw sources) starts with YAML frontmatter:

```yaml
---
type:        # plant | pollinator | concept | region | nursery | source | synthesis
title:
aliases: []  # other names this entity is known by
tags: []
status:      # stub | draft | review | stable
sources: []  # filenames in raw/ that fed this page (e.g., raw/articles/calscape-poppy.md)
last_updated: 2026-05-07
---
```

**File naming:**
- Plants: `plants/<scientific-name-kebab>.md` — e.g., `plants/eschscholzia-californica.md`
- Pollinators: `pollinators/<common-name-kebab>.md`
- Concepts: `concepts/<concept-kebab>.md`
- Regions: `regions/<region-kebab>.md`
- Nurseries: `nurseries/<vendor-or-location-kebab>.md`
- Source summaries: `sources/<source-id>.md` where `source-id` matches the raw filename stem. For subfolder sources, prefix the source slug: `raw/articles/calipc/arctotheca-prostrata-profile.md` → `sources/calipc-arctotheca-prostrata-profile.md`
- **Exception for dataset-style sources** (per-record entries from a structured database — Cal-IPC, Calscape, USDA, etc., where each record shares the same schema): create ONE meta-page `sources/<source-slug>.md` covering the dataset (org, methodology, scoring vocab, what we ingested), instead of per-record summaries. Plant/entity pages still list their raw files in `sources:` frontmatter — those are the primary records. Per-source pages remain the rule for unique authored articles.
- Synthesis: `synthesis/<topic-kebab>.md`

**Wikilinks:** Use Obsidian-style `[[Page Title]]` for internal links. Cross-link aggressively — pollinator pages link to plant pages they visit, plant pages link to region pages, etc.

**Plant pages** carry extra structured frontmatter (used by Dataview now and by Supabase later):
```yaml
scientific_name:
common_names: []
plant_type:        # perennial | annual | shrub | tree | groundcover | grass | vine
nativity:          # native | non_native_safe | invasive
pollinators: []    # bees, butterflies, hummingbirds, moths, beetles, flies (omit for invasives)
water:             # low | moderate | high
sun:               # full | part | shade
soil: []
bloom_season: []   # winter, spring, summer, fall (omit for invasives)
height_ft:
width_ft:
sociability:       # 1–5: how strongly the plant naturally groups (1 = solitary/small groups … 5 = large carpets). Design axis for layout + density. Scale from [[concepts/plant-sociability]] (Hansen & Stahl via Rainer & West). Leave unset until a CA-native-values source lands — omit for invasives.
regions: []        # link these to entries in regions/
host_plant_for: [] # specific butterflies/moths if applicable (omit for invasives)

# Invasive-only block — omit entirely when nativity != invasive.
# Sourced from Cal-IPC Plant Assessment Forms (PAFs).
invasive:
  cal_ipc_rating:        # high | moderate | limited | watch | alert
  cdfa_rating:           # A | B | C | none
  impact_score:          # A | B | C | D (overall Section 1 score)
  invasiveness_score:    # A | B | C | D (overall Section 2 score)
  distribution_score:    # A | B | C | D (overall Section 3 score)
  spread_mechanisms: []  # stolons, rhizomes, seeds, fragments, mowing, dumping, water, animals
  habitat_types: []      # coastal_prairie, coastal_scrub, riparian, valley_grassland, ...
  jepson_regions: []     # Central West, Great Valley, Northwest, Southwest, ...
  evaluated_on:          # YYYY-MM-DD from the PAF

# Native-only block — omit entirely when nativity != native.
# Sourced from the Calscape location-filtered export; schema approved 2026-05-17
# (see [[sources/calscape]]). Emitted by vault/scripts/build_calscape_plant_pages.py.
native:
  butterflies_moths_supported:  # count from the export; *named* species land in host_plant_for via the /host enrichment scrape
  attracts_wildlife: []         # e.g. Bats, Bees, Birds, Butterflies, Caterpillars
  plant_type_raw:               # Calscape's original vocab ("Perennial herb", "Fern", ...) — flat plant_type holds the normalized enum
  sun_range:                    # full tolerance range as prose; flat sun: is the coarse single value
  water_range:                  # ditto for flat water:
  ease_of_care:                 # Calscape vocab, e.g. "Easy"
  soil_drainage: []             # Fast, Medium, Slow
  soil_ph:                      # "min - max"
  communities: []               # plant communities — the ecology-level garden-type facet for the Phase-2 selector
  communities_simplified: []    # coarse rollup (Forest, Meadow, ...)
  companions: []                # scientific binomials — the Phase-2 companion-pairing graph
  sunset_zones:                 # Sunset climate zone string ("*" = best zones)
  hardiness:                    # cold-tolerance prose
  nursery_availability:         # Calscape vocab, e.g. "Commonly Available"
  rarity:
  is_cultivar:                  # cultivars sit as flagged rows; the species page stays canonical
  jepson_url:
  calscape_url:
  retrieved:                    # YYYY-MM-DD
```

The `invasive:` block maps to a separate `invasive_assessments` table when Supabase comes online (joined on `plant_id`); the `native:` block will follow the same join pattern (exact table shape decided when Supabase lands); the rest of the frontmatter maps to the `plants` table 1:1 as before.

**Resolving principle (Luc, 2026-05-17):** the Phase-2 selector reads the structured `native:` block; the flat shared fields (`sun`, `water`, `plant_type`, …) are a coarse convenience layer. When normalization forces a choice (e.g. Calscape `Fern` has no `plant_type` enum), normalize the flat field and preserve the original vocab in `native.plant_type_raw`.

**Dataset-derived citation variant:** pages generated from a structured export cite the export URL in `sources:` plus the dataset meta-page (e.g. `[[sources/calscape]]`), instead of a `raw/` filename — the export artifact (binary .xlsx) lives in gitignored scratch, not `raw/`.

> [!note] The 150 shipped Calscape pages still carry a `# PROPOSED schema block` comment above `native:` — that predates the 2026-05-17 approval and is stale. It gets dropped by the next `build_calscape_plant_pages.py` regeneration (riding the enrichment pass); don't re-litigate the schema because of it.

---

## Operations

### Ingest

When you say "ingest `raw/articles/foo.md`" (or drop a source and ask me to process):

1. Read the source completely.
2. Discuss key takeaways with you before writing — confirm what's worth filing and what's not.
3. Create `sources/<source-id>.md` summarizing the source: who wrote it, when, what claims, what's novel, what overlaps with prior knowledge.
4. Update or create entity/concept pages this source touches. A single source typically touches 5–15 wiki pages.
5. Add cross-references between updated pages (forward and back).
6. Flag contradictions with existing pages explicitly — don't silently overwrite. Add a `> [!warning] Contradicts [[...]]` callout and we discuss.
7. Update `index.md` (add new pages, update entry counts).
8. Append to `log.md` with the format below.

**Source identification:** every wiki claim should be traceable to a source. Each plant page lists `sources:` in frontmatter and cites inline with `(see [[sources/<id>]])` when a specific claim could be challenged.

### Query

When you ask a question:

1. Read `index.md` to find candidate pages.
2. Read those pages, follow wikilinks as needed.
3. Synthesize an answer with citations to wiki pages (`[[plants/california-poppy]]`) and through them to raw sources.
4. **If the answer is a meaningful new artifact** (a comparison, a synthesis, an analysis), offer to file it under `synthesis/` so it doesn't disappear into chat history.
5. Append to `log.md` if the query produced a new wiki page.

### Lint

When you say "lint the wiki":

1. **Orphan pages** — pages with no inbound wikilinks.
2. **Stub pages** — `status: stub` pages that have accumulated enough sources to upgrade.
3. **Contradictions** — flagged callouts that haven't been resolved.
4. **Stale claims** — claims older than recent contradictory sources.
5. **Missing entity pages** — proper-noun mentions across the wiki that don't have their own page.
6. **Index drift** — pages that exist but aren't in `index.md`, or `index.md` entries that don't exist.
7. **Frontmatter violations** — required fields missing or off-schema.

Output a punch list. Don't fix automatically — propose fixes and wait for direction.

---

## Log format

Every operation appends to `log.md` with a consistent prefix so unix tools can parse it:

```
## [2026-05-07] ingest | calscape-california-poppy
Source: raw/articles/calscape-california-poppy.md
Pages touched: plants/eschscholzia-californica (created), regions/bay-area (updated), pollinators/native-bees (updated)
Notes: Calscape entry confirms low water + full sun; bloom period Feb–Sep contradicts older draft (was listed Mar–Aug).
```

Categories: `ingest`, `query`, `lint`, `synthesis`, `refactor`.

---

## Things I won't do without asking

- Modify anything in `raw/`.
- Delete a wiki page (only mark as deprecated unless you confirm).
- Pre-create empty category folders before a source justifies them.
- Overwrite a contradictory claim — I flag it for discussion.
- Pull in external web sources during ingest unless you ask. The vault is what's been curated.

---

## Eventual integration with the app

Plant page frontmatter is the canonical schema. When the Next.js app and Supabase migrations come online, the plant `frontmatter → row` mapping is one-to-one. Wiki body content (care guides, narrative) renders via SSG. Everything in `raw/` stays out of the build — it's research material, not site content.
