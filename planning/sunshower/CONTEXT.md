# Current Project — Sunshower

## What we are building

Sunshower is a guide-and-tool for new gardeners to plan, prepare, plant, and maintain a native California pollinator garden. Audience: **any starting yard state** (overgrown weedy lot, bare dirt, existing-but-tired garden) and **any experience level** (first-time gardeners through experienced ones new to natives). The thesis is "right plant, right place" interpreted ecologically — native plants supporting the native pollinators that co-evolved with them ([vault/concepts/right-plant-right-place.md](../../vault/concepts/right-plant-right-place.md)).

**User-zero:** Luc, gardening on his own yard in the San Jose foothills (Santa Clara County, near the Santa Cruz Mountains). The wiki and the app must immediately help his real journey, with other users joining in as the knowledge base grows.

**Scope (v1):** Native pollinator garden only. Fruits, vegetables, pest/disease ID, watering trackers, and community features come later.

## What good looks like

A successful Sunshower experience:

- A user lands on `/sunshower` and **sees the journey** — a literal trail (stepping stones / waypoint markers) across Cleanup → Selection → Planning → Care, all inside one persistent three.js scene.
- They can **traverse linearly** (the obvious flow for first-timers) **or jump straight to a step** (advanced users skipping ahead).
- The reference experience is [persepolis.getty.edu](https://persepolis.getty.edu/) — single-canvas, scroll-driven WebGL with a chapter overlay for direct jumps. See [REFERENCES.md](REFERENCES.md) for the full breakdown.
- Each phase reads as **content-rich and trustworthy**, sourced from authoritative CA-native references (Cal-IPC, Calscape, UC ANR, WRIC), with citations back to wiki pages.
- Recommendations are **regional, not generic** — Bay Area zone 9b should not get the same advice as Sacramento Valley.

## Phases (one-line summary)

The app is organized around the sequence a gardener actually moves through, not by feature taxonomy. Detailed phase content lives in [phases.md](phases.md).

| Phase | Goal | Status |
|---|---|---|
| **1. Cleanup & prep** | Identify what's in the yard, decide keep/remove, prep beds for planting. | **Active** — sourcing now. |
| **2. Plant selection & sourcing** | Choose natives for the user's site; find them at nurseries. | Foundations in place. |
| **3. Garden planning tools** | Lay out beds, place plants, design for bloom succession. | Concept work started. |
| **4. Ongoing care** | Seasonal calendar, lifecycle care, alerts. | Future. |

Phases overlap in research and content — but the **content order and UX entry point** mirror this sequence.

## Tech stack (one-line summary)

Next.js (App Router) + Tailwind + Vercel; Obsidian-managed markdown vault (`vault/`) feeds Supabase (Postgres) on build; three.js + react-three-fiber drives the `/sunshower` scene with a persistent canvas at the route layout. Detail in [tech-stack.md](tech-stack.md).

## What to avoid

- **Generic gardening advice that fails for CA natives.** "Amend with compost" and "1 inch of water per week" are dangerously wrong for drought-adapted natives. Default to CA-native sources over generic horticulture sources.
- **Coarse regionalization.** "California native" is a 12-ecoregion oversimplification. Surface ecoregion-level when the data supports it (Central West, Sierra Nevada foothills, etc.).
- **Forcing finalized layouts.** Phase 3's UX should encourage iteration — "5 to 20 bubble drawings" not "one committed layout" ([vault/concepts/bubble-drawing.md](../../vault/concepts/bubble-drawing.md)).
- **Locking the journey to one direction.** Some users land mid-flow. Always provide a jump-to-step affordance alongside linear traversal — the Persepolis chapter overlay is the model.
- **Pre-creating empty taxonomy in `vault/`** — folders appear as sources justify them, not preemptively.
- **Pre-emptive multi-state generalization.** v1 is CA-only; resist data-model decisions made "for other states later." Detail in [tech-stack.md](tech-stack.md).
- **Personal yard observations in `vault/`** — those are future blog content. Luc's user-zero notes go elsewhere.

## Ideas surfaced from beginner-gardening ingest (2026-05-15)

Sourced from four beginner-gardening articles ingested 2026-05-15 (Little Terraced House design guide, BBC Gardeners' World tips + soil pH, Summerwinds sun-mapping). Expansion vectors, not yet committed scope.

- **Phase routing at the homepage.** ✅ **Shipped — PR #16, 2026-05-16** (Agent C). `/sunshower` now leads with a *"How's your yard looking today?"* dropdown (4 options, idle cycling label) that routes overgrown/partially-planted → cleanup-plan (`?yard=`, selective-cleanup framing for partial), mostly-bare → a new `/sunshower/site-inventory` interstitial, established → a new `/sunshower/care` interstitial. Yard state is now the app's front door rather than a cleanup-tool input. The site-inventory/care interstitial pages give the in-app site-inventory walkthrough and the Phase 4 (Care) content gap (both still backlog items below) a real landing surface. Per-agent detail in [../sunshower_gui_mvp.md → Agent C](../sunshower_gui_mvp.md).
- **Parallel tracks: passive mapping + active removal.** A user can map their landscape with us while actively working in the yard removing weeds. The two are complementary — one is desk-or-window work, the other is gloves-on. The app should keep both kinds of tasks live at once rather than forcing strict phase serialization. Cleanup tasks and site-inventory tasks can coexist as a checklist that spans indoors and out.
- **Friendly-to-natives, not aggressive-to-weeds.** Lean the tone toward *supporting native plants and pollinators* rather than *destroying invasives*. The plant-classification distinction — Cal-IPC invasive vs. harmless residential weed vs. native — is the lever: a common weed that isn't ecologically harmful doesn't need the same urgency-language as a Cal-IPC High invasive. Tone change affects copy in [/sunshower/cleanup-plan](../../src/app/sunshower/cleanup-plan/page.tsx) and the landing page.
- **Soil/pH lives in yard-prep, not as its own tool.** Exposed during cleanup/prep when the user is already mapping the yard. pH indicator plants (rhodos/camellias → acidic, lavender/honeysuckle → alkaline) make this a low-friction observational input rather than a "go buy a test kit" step.
- **Phase 4 (Care) is the biggest content gap.** Watering technique (rootball weekly, not leaves daily), feeding cadence, pruning, pest tolerance, mulch timing — all covered by ingested beginner sources but missing from the app. Homepage phase-routing will surface this fast: a user with an established yard has no destination today.
- **Site-inventory walkthrough belongs in the app.** The wiki has the concept ([../../vault/concepts/site-inventory.md](../../vault/concepts/site-inventory.md)) but the app doesn't expose it. Lives between cleanup and selection, and is reusable from any phase route since selection and care both depend on it.

## Open questions

- Primary plant-info backbone: Calscape, Calflora, iNaturalist, USDA PLANTS, or a combination?
- Regional filtering granularity: city, ZIP, or ecoregion?
- Should the layout planner integrate with satellite/map view of the user's yard?
- When two authoritative sources disagree on whether a plant is native to a region, how does the app present the conflict?
- Boundary cases — a Bay Area user straddling oak woodland and coastal sage scrub: how is that surfaced?
- Cultivar vs species page handling — when natives come in, cultivars often have reduced pollinator value.
- Microclimate tagging within ecoregions — frontmatter field, sub-region pages, or body prose?

## Related documents

- [CLAUDE.md](CLAUDE.md) — identity and rules
- [REFERENCES.md](REFERENCES.md) — vision, inspiration, principles
- [phases.md](phases.md) — Phase 1–4 detail
- [tech-stack.md](tech-stack.md) — stack, navigation pattern, database, multi-state scaling
- [resources.md](resources.md) — phase-by-phase source catalog
- [../sunshower_backlog.md](../sunshower_backlog.md) — current task tracker
- [../sunshower_gui_mvp.md](../sunshower_gui_mvp.md) — Phase 1 GUI MVP backlog

---

*Last updated: 2026-05-16*
