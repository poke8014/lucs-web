# References

## Examples of good work

### Primary visual reference — Persepolis (Getty)

**URL:** [persepolis.getty.edu](https://persepolis.getty.edu/) · captured 2026-05-11

This is the closest match to the experience Sunshower should deliver. What it does:

- **Cinematic intro before the journey.** Three short framing statements ("Twenty-five hundred years ago…" / "Built by powerful kings…" / "Today, we know it as Persepolis.") scaffold the user into the experience before any UI appears.
- **Single-canvas, scroll-driven WebGL.** The whole experience is one route. No page transitions, no remount, no jank between sections.
- **"Scroll to continue" / "Click enter to continue."** Natural progression cues — no buttons fighting for attention against the scene.
- **Chapter overlay for direct jumps.** A `?toc-variant-a=` query parameter surfaces a table-of-contents UI. Users who don't want to scroll linearly can pick a chapter and the experience jumps to it.
- **Multilingual** (en, fr, es, fa) — top-level affordance via `?locale=` query parameters.
- **Loading orchestration** — explicit progress (0 → 50 → …) before the scene becomes interactive.

**What Sunshower borrows:**

1. **Cinematic intro** — short framing copy before the user sees stepping stones (e.g. "This hillside used to grow thirteen native species. Today it grows three. There is more we could grow. Welcome to sunshower.").
2. **Single persistent `<Canvas>`** at the route layout. Each phase is a chapter the camera tweens to, not a page load.
3. **Scroll OR enter to continue** as the linear progression cue.
4. **Chapter overlay** (e.g. `?step=cleanup`) so users can jump straight to Phase 1 / 2 / 3 / 4 without scrolling through the intro.
5. **Loading orchestration** — set expectations during the model + texture load.

**What Sunshower does NOT borrow:**

- Persepolis is primarily *informational* (a story to be told). Sunshower is *actionable* — each phase has tools (weed list → plan, plant database, layout planner), not just narrative. The visual metaphor carries; the interaction model adapts.

### Secondary navigation references

Surveyed 2026-05-10. Each fits the "visible path with numbered stops" pattern in some way. The Awwwards links point to inspiration pages, not always the live production site — click through to verify the live experience.

- **Mailchimp Annual / Small Business Guide** — chapter-style nav with smooth section transitions. [awwwards.com](https://www.awwwards.com/inspiration/chapters-navigation-2025-small-business-guide)
- **Pixelynx Musicverse** — three.js camera-scroll along a 3D path with discrete chapter stops. [awwwards.com](https://www.awwwards.com/inspiration/3d-camera-scroll-submission-6364dde2a2f86187118961)
- **Penzgidromash** — scroll-driven nav with animated 3D models; chapter markers double as jump links. [awwwards.com](https://www.awwwards.com/inspiration/scroll-navigation-with-animated-3d-models)
- **LVMH Virtual Apartment** — 3D space where each "room" is a stop on a guided tour. [awwwards.com](https://www.awwwards.com/inspiration/3d-scroll)
- **Pilot.Auto** — 3D nav with persistent camera waypoints + chapter switching. [awwwards.com](https://www.awwwards.com/inspiration/3d-navigation-scrolling)
- **Mastercard Business Outcomes** — interactive 3D scroll segmented into discrete content stops. [awwwards.com](https://www.awwwards.com/inspiration/interactive-3d-scroll-mastercard-business-outcomes)
- **Bruno Simon portfolio** — canonical first-person waypoint-by-exploration reference. [bruno-simon.com](https://bruno-simon.com)
- **Codrops — scroll-reactive 3D gallery with three.js** — tutorial-grade implementation reference for the persistent-canvas + scroll-driven pattern. [tympanus.net/codrops](https://tympanus.net/codrops/2026/03/09/building-a-scroll-reactive-3d-gallery-with-three-js-velocity-and-mood-based-backgrounds/)

## Relevant links

### Project thesis & concepts (vault)

- **Right plant, right place (thesis)** — [vault/concepts/right-plant-right-place.md](../../vault/concepts/right-plant-right-place.md). Ecological reading: native plants supporting native pollinators.
- **Site inventory** — [vault/concepts/site-inventory.md](../../vault/concepts/site-inventory.md). Always step 1.
- **Bubble drawing** — [vault/concepts/bubble-drawing.md](../../vault/concepts/bubble-drawing.md). Cheap iteration over committed layouts.
- **Plant life cycles** — [vault/concepts/plant-life-cycles.md](../../vault/concepts/plant-life-cycles.md). Why CA natives favor perennials.
- **Sun requirements** — [vault/concepts/sun-requirements.md](../../vault/concepts/sun-requirements.md). Hours-and-when, not just hours-per-day.
- **Plant spacing** — [vault/concepts/plant-spacing.md](../../vault/concepts/plant-spacing.md).
- **Soil basics** — [vault/concepts/soil-basics.md](../../vault/concepts/soil-basics.md). CA-native overrides on the generic "amend with compost" advice.

### Wiki + source catalog

- **Vault schema** — [vault/CLAUDE.md](../../vault/CLAUDE.md). Read this before any wiki work.
- **Wiki index** — [vault/index.md](../../vault/index.md). Current pages, auto-maintained.
- **Wiki log** — [vault/log.md](../../vault/log.md). Ingest/query/lint history.
- **Phase-by-phase source catalog** — [resources.md](resources.md).

## Notes

### Key planning principles

These rules of thumb should pervade Sunshower's recommendations:

1. **Do a site inventory first** — sun exposure, shade patterns, slope, soil type, wind.
2. **Map paths and structures** before placing plants.
3. **Plan for year-round bloom** — at least one plant flowering in every season.
4. **Use native perennials** — less maintenance, come back every year.
5. **Leave some bare soil** — many native bees nest in the ground.
6. **Avoid pesticides** — especially neonicotinoids.
7. **Start small** — one bed or corner, then expand.
8. **Best CA planting time** — mid-September to November (ground still warm, plants in active growth with winter rains coming).

### Planting frameworks

Useful design patterns surfaced from ingested sources. Will become wiki concept pages as sources solidify:

- **3x3x3 System** — 3 native species blooming in each of 3 seasons (spring, summer, fall) = 9 species × 3 plants each = 27 plants, covering ~8×4 ft. Beginner-friendly.
- **Plant in drifts** — group 3+ of the same species so pollinators notice them. Single isolated plants are less effective forage.
- **Layered design** — trees/large shrubs in back → medium shrubs → low perennials/groundcovers in front. Creates depth and habitat variety.

### Working conventions

- **The wiki is the research layer, the app is the consumption layer.** Sunshower reads from structured data derived from wiki pages (plant frontmatter → Supabase). It does not render raw wiki markdown directly.
- **iNaturalist is a tool, not a source.** We use iNat for in-yard plant ID (offline workflow for the MVP) and for licensed photos (programmatic fetch). We don't ingest iNat blog content into the wiki.
- **Cal-IPC PAFs omit management info.** WRIC has short-term/long-term removal guidance and complements Cal-IPC for Phase 1 management content.
- **California planting window** — mid-September to November is the canonical window. Phase 1 cleanup timing recommendations must respect this.
- **Personal yard notes are blog material**, not wiki content. Luc's user-zero observations are future blog drafts.
