# Sunshower — Bed Planner: Satellite Underlay (build spec)

> **Status: SPEC'd 2026-07-07 — ⚠️ sign-offs pending (bottom).** Written for future agents, same spec → build-record pattern as [sunshower_bed_planner_spec.md](sunshower_bed_planner_spec.md). This is a follow-on to the shipped bed planner (units A–I, PR #32): it reworks **only the base-map address on-ramp** (unit B's path 1). Nothing else in the planner changes.

**User-facing goal:** type your address and a real bird's-eye photo of your yard appears *under* the drawing surface — then trace your own boundary, house, fences, and tree canopies over it. Luc's direction (2026-07-07): the satellite view should sit under the user's sketch **instead of an auto-outline generator** — "this helps the user draw their own outline instead of our guess work, and also helps the user better visualize." Inspired by ShadeMap's satellite basemap; it pays off twice, because the unit-H sun/shade timelapse already renders above the underlay layer — shadows sweeping across a photo of *your actual yard* is the ShadeMap moment.

---

## Where this sits

**What shipped (unit B, PR #32):** three base-map on-ramps. Path 1 (address) = Nominatim geocode → Overpass building-footprint fetch → an **auto-traced** rough boundary + building obstructions. It shipped *best-effort* because Overpass proved intermittent ([build record](sunshower_bed_planner_spec.md#build-record-all-units-ai-2026-07-0607)).

**The old spec predicted this design.** Its privacy-contract bullet: *"if no zero-cost parcel source proves workable, path 1 can degrade to 'fetch a satellite tile for the address, trace it yourself' (imagery in, no auto-parcel) without changing the privacy contract."* This spec promotes that from degradation path to **the** design — not because parcels failed, but because Luc prefers it: the auto-trace was our guesswork; the imagery is the user's own eyes.

**What doesn't change:**
- Paths 2 (upload screenshot + calibrate) and 3 (rectangle + dimensions) stay first-class and address-free, equal visual weight.
- The boundary/obstruction tracing UI (`BoundaryObstructionLayer`) is untouched — it's now the star of the address path instead of a correction step.
- The privacy contract stays a hard requirement (HANDOFF invariant 9). See §Privacy below for the one clarification it needs.
- The underlay rendering machinery (`imageKey` → IndexedDB `blobs` store → SVG `<image>` bottom layer with opacity slider) is reused as-is.

## Scope decisions (proposed)

1. **The address path becomes fetch-and-trace.** Flow: address → Nominatim geocode (in-session, unchanged) → fetch one satellite raster centered on the geocode → store via the existing `blobStore.putImage()` → patch the plan with `imageKey`, auto-derived `widthFt`/`heightFt`, `northBearingDeg: 0`, `imageOpacity`, `imageAttribution` → user traces. **No auto-boundary, no obstructions written.** The Overpass code is deleted (see §Deletion list).
2. **Auto-scale and north come free.** A fetched tile's ground extent is known exactly from `zoom × latitude` (Web-Mercator meters-per-pixel), so the plan rectangle is set to the image's true footprint and the image spans it edge-to-edge — correct by construction, since the canvas stretches the underlay to fill `widthFt × heightFt` (recon finding: `pxPerFt` is stored but never consumed by any transform; manual calibration remains an upload-path-only affordance). Tiles are north-up, so `northBearingDeg = 0` — *more* accurate than the current `SiteProfile.aspect` seeding, and it feeds unit H's shadow math directly.
3. **Imagery source ladder: Mapbox primary, NAIP keyless fallback, Google never.** Research summary (full comparison in the 2026-07-07 research pass, key sources linked):

   | Source | Tracing | Store snapshot client-side | Key / cost | Resolution @ San Jose |
   |---|---|---|---|---|
   | **Mapbox Satellite** (Static Images API, classic `satellite-v9`) | ✅ permitted non-commercial ([product terms](https://www.mapbox.com/legal/tos)) | ✅ explicit — devices "may cache an unlimited amount of map imagery for offline use"; no proxy/redistribute ([caching docs](https://docs.mapbox.com/help/dive-deeper/api-caching/)) | Token required (browser-safe via [URL restrictions](https://docs.mapbox.com/accounts/guides/tokens/#url-restrictions)); 50k static images/mo free | ~0.3–0.5 m/px, zoom to ~20; CORS open |
   | **USGS NAIP** ([ImageServer `exportImage`](https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer)) | ✅ public domain | ✅ public domain | **No key, free** | 0.6 m/px — boundaries + big trees OK, fence lines blobby |
   | Esri World Imagery | ✅ explicit trace grant | ⚠️ grey area (export layer is separate) | Free tier, token | 0.3 m, sometimes better |
   | Google Maps Static | ❌ **ToS prohibits tracing building outlines** and caching content | ❌ | — | ruled out |
   | Santa Clara County 6″ ortho | *unverified* — public REST endpoint not confirmed | *unverified* | likely none | 0.15 m — would beat everything; verify manually before relying on it |

   Ladder at runtime: `NEXT_PUBLIC_MAPBOX_TOKEN` set → Mapbox; unset or fetch fails → NAIP (with a "photo may be blurry — trace the big shapes" expectation-setter); both fail → the existing friendly fallback to upload/rectangle. The Mapbox token is the app's **first browser-exposed API key** — but Mapbox is already the planned stack addition for the Phase-2 range map ([tech-stack.md](sunshower/tech-stack.md)), so the account/token would exist eventually anyway; this just moves it earlier.
4. **Snapshot persistence: keep-by-default, visibly optional, raster-only.** The fetched image is stored in the `blobs` store exactly like a path-2 upload — because it carries the *same information* as the satellite screenshot the privacy contract already blesses users to upload themselves; the user initiating the fetch by typing their address is the consent moment. A visible toggle at fetch time ("Keep this photo with your plan — or keep only your tracing") lets the privacy-sensitive opt out, in which case the underlay lives for the session and the saved plan carries geometry only. What is **never** persisted, toggle or not: the address, lat/lng, tile coordinates, zoom, or provider URL — raster pixels and an attribution string only. Nothing machine-readable about location touches the saved document.

## Anti-goals

- **No auto-outline of any kind.** The Overpass auto-trace is deleted, not demoted — no "try auto first" residue. (If a future parcel source ever earns its way back, that's a new decision.)
- **No interactive map widget.** No Leaflet/MapLibre, no pan-the-world, no address-less browsing. One raster per address entry; want a different framing → re-enter the address or switch extent and re-fetch, all in-session. Keeps the bundle flat and the privacy surface one request wide.
- **No persisted geo-metadata** — see scope decision 4.
- **No changes to paths 2–3** beyond the shared attribution chip (below).
- **Not the Phase-2 range map.** That's a separate Mapbox use; this feature only shares the token.

## Data contract (diff)

One field on `BaseMap` ([types.ts](../src/app/sunshower/bed-planner/types.ts)):

```ts
interface BaseMap {
  // ...existing fields unchanged...
  imageAttribution?: string   // NEW — e.g. "© Mapbox © OpenStreetMap © Maxar" or
                              // "USGS, USDA — public domain"; rendered whenever the underlay shows
}
```

Set on fetch; also settable (blank) for uploads. No schema version bump needed — the field is optional and old plans read fine. Export/import carries it with the document like `imageKey` already does.

## The fetch module (unit S1)

New `src/app/sunshower/bed-planner/satelliteFetch.ts`, pure parts unit-tested:

- **Extent math:** ground resolution `mPerPx = 156543.03392 × cos(lat) / 2^(z+1)` (Mapbox GL zoom convention, 512px tiles); `widthFt = imagePx × mPerPx × 3.28084`. Default framing ≈ **250–500 ft square** (zoom ~19–20 at 1280×1280@2x) with a small/large-yard toggle; exact zoom choice lands at build time against real South Bay addresses.
- **URL builders** (pure, tested): Mapbox Static Images (`/styles/v1/mapbox/satellite-v9/static/{lng},{lat},{zoom}/{w}x{h}@2x`, `attribution=false` + our own chip, token from env) and NAIP `exportImage` (bbox in Web Mercator, `f=image`, size ≤4000px).
- **Fetch → Blob → `blobStore.putImage()`** — Mapbox CORS is open, NAIP is a plain image response; no canvas round-trip needed. Abort-signal support mirrors `importAddress()`.
- **Cost guard:** one request per explicit user action; no retry loops. At hobby traffic this never approaches the 50k/mo free tier.

## Privacy (contract v2 — one clarification, not a weakening)

- **What the provider sees:** the imagery request goes from the user's browser to Mapbox/USGS with the lat/lng encoded in the URL — the same in-session exposure class as today's Nominatim geocode. Say it in the UI, plainly.
- **Copy update** (replaces the current lines in `BaseMapStep.tsx:306–309` and the card blurb): *"We use your address once to fetch a bird's-eye photo you trace over, then forget it. The photo is saved with your plan only if you keep it — nothing that says where you live (no address, no coordinates) is ever stored."* Footer disclaimer updates from "Outlines come from OpenStreetMap…" to the imagery-attribution + "a photo, not a survey" framing.
- **HANDOFF invariant 9 wording** currently says saved plans carry "de-identified feet-space geometry only" — already in mild tension with the shipped `imageKey` (path-2 uploads). Clarify at ship time to: *no machine-readable location ever persists (address, lat/lng, parcel id, tile coords); raster imagery the user chose to keep is allowed, geo-metadata stripped.* ⚠️ sign-off 2.
- `addressImport.ts`'s enforcement point moves but survives: today `origin` (lat/lng) never leaves `importAddress()`'s scope; the reworked function passes it to the imagery fetch **within the same in-session call chain** and it still never reaches a return value that callers could persist. The module-level PRIVACY CONTRACT comment gets rewritten to match.

## Deletion list (from the 2026-07-07 code recon)

In [addressImport.ts](../src/app/sunshower/bed-planner/addressImport.ts): `fetchBuildingRings()` (L133–161), the Overpass step + failure branches (L81–99), the feet-space projection step (L101–126), `ringArea()` (L163–171), constants `OVERPASS`/`SEARCH_RADIUS_M`/`PAD_FT` (L41–43), and the now-unused `boundingBox`/`latLngRingToFeet` imports. **Keep:** the `importAddress()` shell + abort handling, `NOMINATIM`, the geocode error copy. `AddressImportSuccess` reshapes from `{boundary, widthFt, heightFt, obstructions}` to the fetched-image result (`imageKey`, extent, attribution). `AddressPanel.run()` (`BaseMapStep.tsx:287–294`) writes the new patch. `baseMapMath.ts`'s `latLngRingToFeet`/`boundingBox` stay (tested, harmless, and useful if geo ever returns); their `addressImport` call sites go.

## Unit H synergy (the ShadeMap payoff)

No work required — the layer order is already right: `BaseMapImageLayer` is the bottom layer in both the editor (`BaseMapStep.tsx:149–156`) and the step-5 preview (`CheckStep.tsx:167`), and `SunShadeLayer` draws above it. The moment the underlay is a real photo, the seasonal shadow timelapse plays over the user's actual yard — the thing Luc likes about ShadeMap, for free. (Luc hasn't test-driven unit H yet; this feature is a good excuse for that read.)

## Work breakdown (agent-sized)

| Unit | Scope | Depends on |
|---|---|---|
| **S1** | `satelliteFetch.ts`: extent math + URL builders (pure, unit-tested), fetch→blob, provider ladder (Mapbox token → NAIP → friendly failure), env-token plumbing + `.env.example`/Vercel note | — |
| **S2** | Address-panel rework: geocode → imagery fetch → plan patch (`imageKey`, extent, `northBearingDeg: 0`, `imageAttribution`), keep-photo toggle (scope decision 4), Overpass deletion per §Deletion list, privacy-copy rewrite, `AddressImportSuccess` reshape + test updates | S1 |
| **S3** | Attribution chip on the canvas (renders whenever `imageAttribution` is set — `BaseMapStep` + `CheckStep` preview), NAIP blurry-photo expectation copy, docs closeout: this spec's status line, bed-planner spec pointer, HANDOFF invariant 9 wording, backlog | S2 |

MVP = all three; S1 ∥ nothing, it's the spike-shaped unit — if Mapbox static imagery at zoom 19–20 disappoints over real South Bay addresses, the ladder's NAIP rung and the sign-off table give the fallback posture before S2 commits.

## ⚠️ Sign-offs for Luc

1. **Imagery source + the app's first browser API key.** Recommend: **Mapbox primary** (`NEXT_PUBLIC_MAPBOX_TOKEN`, URL-restricted to the production domain + localhost), **NAIP keyless fallback** so the feature works with zero config. Google is ruled out (ToS). The unverified Santa Clara County 6-inch ortho is a possible future upgrade — worth a manual look at the county GIS REST directory someday, not a blocker.
2. **Snapshot persistence + invariant wording.** Recommend keep-by-default with the visible opt-out toggle (scope decision 4) and the HANDOFF invariant 9 clarification (§Privacy) — the argument is equivalence with the already-blessed path-2 satellite-screenshot upload.
3. **Overpass auto-trace: delete, don't demote.** Recommend full deletion — the auto-outline was the guesswork this feature replaces, and keeping a dead path contradicts "no auto-outline of any kind."

## References

[sunshower_bed_planner_spec.md](sunshower_bed_planner_spec.md) (unit B, privacy contract, build record) · [ops/HANDOFF.md → invariant 9](../ops/HANDOFF.md) · [tech-stack.md](sunshower/tech-stack.md) (planned Mapbox) · code seams: [addressImport.ts](../src/app/sunshower/bed-planner/addressImport.ts) · [BaseMapStep.tsx](../src/app/sunshower/bed-planner/BaseMapStep.tsx) · [blobStore.ts](../src/app/sunshower/bed-planner/blobStore.ts) · [types.ts](../src/app/sunshower/bed-planner/types.ts) · research sources: [Mapbox Static Images API](https://docs.mapbox.com/api/maps/static-images/) · [Mapbox caching terms](https://docs.mapbox.com/help/dive-deeper/api-caching/) · [USGS NAIP ImageServer](https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer) · [ShadeMap](https://shademap.app/about/)
