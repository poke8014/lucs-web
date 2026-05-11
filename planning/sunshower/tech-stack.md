# Tech Stack

## Frontend & hosting

- **Framework:** Next.js (App Router)
- **Hosting:** Vercel (existing domain, auto-deploys from `main`)
- **Styling:** Tailwind CSS
- **3D:** three.js + react-three-fiber for the `/sunshower` scene

## Navigation pattern (planned)

Sunshower is organized as a step-by-step journey (Cleanup → Selection → Planning → Care). The `/sunshower` entry surfaces this journey as a **visible path with numbered stops** inside the three.js scene — a literal trail of stepping stones / waypoint markers. Users can traverse linearly *or* jump straight to any step. The path *shows* the journey, not just enables it, which fits the garden-improvement metaphor.

Reference experience: **[persepolis.getty.edu](https://persepolis.getty.edu/)** — single-canvas, scroll-driven WebGL with a `?toc-variant-a=` chapter overlay for direct jumps. See [REFERENCES.md → Persepolis](REFERENCES.md#primary-visual-reference--persepolis-getty) for the full breakdown of what Sunshower borrows and what it adapts.

### Implementation notes

- **Single persistent `<Canvas>`** mounted at the route layout (not per page), so the camera tweens between stones rather than the scene remounting on navigation.
- **URL pathname (or `?step=` query) is the source of truth** for which stop is "active"; deep links land users at the right stone with the camera already positioned.
- **HUD breadcrumb overlay** so users who deep-link or change their mind can jump anywhere without re-learning the metaphor — Persepolis-style chapter list.
- **Cinematic intro** before the user sees stepping stones (3 short framing statements, Persepolis-style scaffolding).
- **Loading orchestration** — explicit progress UI before the scene becomes interactive, since textures + GLTF models will dominate the LCP budget.

Inspiration sites and the surveyed nav patterns are in [REFERENCES.md → Secondary navigation references](REFERENCES.md#secondary-navigation-references).

## Content & data flow

- **Obsidian** as the CMS for narrative content — plant notes, nursery info, concept pages, source summaries — all written as markdown in [vault/](../../vault/).
- Vault is stored in this GitHub repo.
- Vercel pulls from GitHub on push → auto-redeploy.
- Markdown parsed at build time using **Next.js static site generation (SSG)**.
- **Supabase (Postgres)** for structured plant/region/pollinator data — see Database Architecture below.

```
Obsidian Vault (markdown)            Plant frontmatter (YAML)
        ↓  git push                          ↓  ETL on build
    GitHub Repo                       Supabase (Postgres)
        ↓  auto-deploy                       ↓
       Vercel  ←—————————— reads both ——————┘
        ↓
    Web App
```

### Why this approach

- Obsidian stays as the working research/note-taking tool.
- Narrative content (concept pages, source summaries) renders via SSG from markdown.
- Structured queries ("plants that bloom in spring AND attract bees AND need low water") go through Supabase, fed from plant-page frontmatter.
- No separate CMS to manage; changes go live with `git push`.

## Database architecture

### Hybrid: Obsidian for narrative, Supabase for structured queries

| Tool | Role |
|------|------|
| **Obsidian (`vault/`)** | Research vault — concept pages, source summaries, plant pages with rich narrative. The working space. |
| **Supabase (Postgres)** | Structured database powering the app — clean, queryable plant records, regions, junction tables. |

**Workflow:** research and write plant pages in Obsidian; their frontmatter is the source of truth for Supabase rows. Build-time ETL syncs.

### Vault structure (current)

The canonical schema is defined in [vault/CLAUDE.md](../../vault/CLAUDE.md). Layout:

```
vault/
  CLAUDE.md          # the wiki schema
  README.md
  index.md           # content catalog (auto-maintained)
  log.md             # operations log (auto-maintained)
  llm-wiki.md        # Karpathy's pattern doc (reference)
  raw/               # IMMUTABLE source tier — raw clippings/PDFs/assets
    articles/        # cleaned web clippings
    pdfs/            # research papers, agency PDFs
    assets/          # downloaded images
  concepts/          # design principles, frameworks, ecological concepts
  plants/            # one page per plant species
  pollinators/       # bees, butterflies, hummingbirds, etc.
  regions/           # geographic entities (state, ecoregion, county, city)
  nurseries/         # local nurseries and online suppliers
  sources/           # one summary page per ingested source
  synthesis/         # cross-cutting analyses, comparisons
```

Folders are created the first time content lands in them — no preemptive empty taxonomy.

### Plant page frontmatter (the bridge to Supabase)

The full schema lives in [vault/CLAUDE.md](../../vault/CLAUDE.md). Excerpt:

```yaml
---
type: plant
scientific_name:
common_names: []
plant_type:        # perennial | annual | shrub | tree | groundcover | grass | vine
nativity:          # native | non_native_safe | invasive
pollinators: []    # bees, butterflies, hummingbirds, moths, beetles, flies
water:             # low | moderate | high
sun:               # full | part | shade
soil: []
bloom_season: []   # winter, spring, summer, fall
height_ft:
width_ft:
regions: []
host_plant_for: [] # specific butterflies/moths
---
```

### Plant-to-region relationship (many-to-many)

```
plants table          plant_regions table       regions table
-----------           -------------------       -------------
plant_id              plant_id (FK)             region_id
name                  region_id (FK)            name
water_needs                                     state
sun_needs                                       ecoregion
...                                             zip_codes
```

### Region hierarchy

Regions are nested rather than flat:

```
State → Ecoregion → County → City/Zip
```

A user searching at city level inherits plants tagged at the ecoregion or state level above — no need to manually tag every plant at every level.

### Data sources for seeding the database

- **USDA PLANTS Database** — public domain, downloadable, good national baseline.
- **Calflora** — California-specific, has data-access options.
- **iNaturalist API** — public API with species data.
- **Calscape** — richest CA native data; no public API. Investigate data export or partnership.
- **Manual enrichment** — care guides, seasonal info, and pollinator details will likely need to be added by hand from authoritative sources.

### Global plant-distribution databases

For the native range map and broader context:

- **GBIF (Global Biodiversity Information Facility)** — [gbif.org](https://www.gbif.org). Billions of specimen records, public API. Best for occurrence-by-region.
- **Plants of the World Online (POWO) by Kew Gardens** — [powo.science.kew.org](https://powo.science.kew.org). 1.4M+ plant names, native range data, public API. Best for descriptions and range polygons.
- **GIFT (Global Inventory of Floras and Traits)** — covers ~2,900 regions, 80% of known plant species. R package for access.
- **GlobalTreeSearch** — 60,065 tree species with country-level distribution.
- **World Checklist of Vascular Plants (WCVP)** — Kew Gardens, taxonomically curated.

> 💡 GBIF + POWO together cover the most ground — GBIF for occurrence/region data, POWO for descriptions and range polygons. Both free and open.

## Multi-state scaling

The app is built with future expansion to other states in mind. Rather than separate databases per state, the recommended approach is a **single database with a `region` field** on every plant record.

**How it works:**

- User selects state (and optionally city/ecoregion) on onboarding.
- App filters all queries by that region automatically.
- New states are added by importing more plant records — no new infrastructure needed.

**Data sources per state:** each state has its own native plant societies and databases (Calflora for CA, Texas Native Plant Society, Florida Native Plant Society, etc.). USDA PLANTS Database is a 50-state baseline.

**Future consideration:** an `ecoregion` field (more specific than state) would be more accurate — many natives are regional within a state. CA itself has ~12 EPA Level III ecoregions; "California native" is a coarse instrument compared to "Central Coast native" or "Sierra Nevada foothills native."

**Important:** v1 is CA-only. Resist data-model decisions made "for other states later" — push back and keep it CA-shaped until v1 ships.
