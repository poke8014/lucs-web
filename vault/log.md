# Wiki Log

Append-only chronological record of operations on the wiki. Format defined in [CLAUDE.md](./CLAUDE.md).

Categories: `ingest`, `query`, `lint`, `synthesis`, `refactor`.

## [2026-05-11] ingest | WRIC weed reports — full archive (274 PDFs)
Source: UC Davis Weed Research and Information Center, *Weed Control in Natural Areas in the Western United States* (DiTomaso et al. 2013), distributed as per-genus PDFs on the Box archive (linked from `raw/pdfs/wric/_index.md`).
Pages touched: sources/wric (created), synthesis/invasive-removal-methods (sources section rewritten to cite WRIC + drop hedge), index.md (added wric dataset pointer; calipc dataset entry updated to remove "WRIC management notes" from its deferred list).
Adjacent code: src/app/sunshower/cleanup-plan/types.ts (`removal_sources: string[]` added to Plant), src/data/plants.json (36 plants annotated with WRIC citation slugs, 1 with congener citation, 1 with no source — stinknet, post-dates 2013 book), vault/scripts/scrape_wric.py (firecrawl scrape harness), vault/scripts/backfill_removal_sources.py (slug → WRIC PDF mapping).
Method: Box viewer URLs return JS-app HTML; the working pattern is `https://ucdavis.box.com/index.php?rm=box_download_shared_file&shared_name=<share>&file_id=f_<id>` which 302s to a short-lived public.boxcloud.com PDF URL. firecrawl-scrape parses these cleanly at ~1 credit each. Total cost: ~274 credits; ~5 minutes wall time at concurrency=4. Output: vault/raw/articles/wric/*.md (274 files).
Notes: The 7 PDFs already locally downloaded on 2026-05-08 (Cytisus, Foeniculum, Genista, Hedera, Rubus, Spartium, Ulex) carry a ✓ marker in `_index.md` which the parser initially skipped; regex fixed and re-run. Per-plant rewrites of `removal_notes[]` against canonical WRIC text are deferred to a follow-up — this entry ships the citation infrastructure (scrape, source page, schema field, backfilled slugs) without rewriting the synthesized v0 notes.

## [2026-05-11] synthesis | invasive removal methods vocabulary
Pages touched: synthesis/invasive-removal-methods (created), index.md (updated).
Adjacent code: src/app/sunshower/cleanup-plan/types.ts (`RemovalMethod` union added), src/data/plants.json (38 plants annotated with `removal_method` + `removal_notes`), vault/scripts/apply_removal_methods.py (migration script).
Method distribution across the annotated 38: cut_stump_herbicide ×8, dig_taproot ×8, dig_rhizome_complete ×5, mow_before_seed ×5, pull_vine_dig_crown ×4, hand_pull ×4, sheet_mulch_smother ×2, cane_cut_dig_crown ×1, dig_bulb_complete ×1. `solarize_summer` reserved in vocabulary, no primary assignments (referenced as follow-up in iceplant/Bermuda-grass notes).
Source attribution: synthesized from UC IPM + WRIC + Cal-IPC consensus. WRIC PDFs downloaded but not text-ingested (AES-encrypted per 2026-05-08 entry); upgrade `removal_notes` against canonical WRIC text when those PDFs are processed.

## [2026-05-08] lint | full vault sweep
Pages touched: vault/CLAUDE.md (schema relaxed — `bloom_season` now omitted for invasives), concepts/sun-requirements (status stub→draft), concepts/site-inventory (status stub→draft).
Findings: ghost file `Amy Fedele.md` deleted (Obsidian artifact from raw-article frontmatter wikilink). No orphans, no contradictions, no index drift. Cal-IPC plant stubs all missing `bloom_season` — resolved by schema relaxation rather than backfill (not needed for invasive-only vault tier). Hub-page candidates noted for future: Jepson, UC Davis WRIC.

## [2026-05-08] refactor | scrape WRIC weed reports — regional-invasive first pass
Source: UC Davis Weed Research and Information Center, Box archive at https://ucdavis.box.com/s/t266vkfh1ym7bb7j57k5ufkrv9vrby3v (linked from https://wric.ucdavis.edu/weed-management-notes). Legacy `wric.ucdavis.edu/information/natural areas/...` URLs Cal-IPC pages link to all 302 to the new Box-pointer landing page now.
Downloaded 7 PDFs to raw/pdfs/wric/ — covering Cytisus (broom), Foeniculum (fennel), Genista (French broom), Hedera (ivy), Rubus (blackberry), Spartium (Spanish broom), Ulex (gorse). Filename mapping in raw/pdfs/wric/_index.md.
Scope: regional foothill invasives that already have Cal-IPC profiles in the vault. Retama (bridal broom) checked, no WRIC report exists.
Full archive (274 PDFs, A–Z minus K/Q/Y) catalogued in raw/pdfs/wric/_index.md with Box file IDs and a download recipe for future passes.
Notes: PDFs are AES-encrypted (open-without-password) — viewable but ingestion will need a PDF-aware reader. WRIC files are organized per-genus (with multi-species filenames when congeners share notes), so e.g. Cytisus.pdf covers both C. scoparius and C. striatus. No wiki pages created yet — awaiting explicit ingest call (a `sources/wric.md` meta-page per the dataset-source exception will land then).

Quick check on recent activity:
```bash
grep "^## \[" vault/log.md | tail -10
```

---

## [2026-05-07] refactor | vault scaffold
Initialized vault on the LLM Wiki pattern. Created CLAUDE.md (schema), README.md, index.md, log.md, and raw/{articles,pdfs,assets}/. No sources ingested yet.

## [2026-05-07] ingest | design-a-garden-layout
Source: raw/articles/design-a-garden-layout.md (Pretty Purple Door, Amy Fedele, 2023)
Pages touched: sources/design-a-garden-layout (created), concepts/site-inventory (created), concepts/bubble-drawing (created), concepts/softscape-hardscape-ratio (created)
Assets: 10 images downloaded to raw/assets/design-a-garden-layout/
Notes: First content ingest. Generic landscape design article — no plant/pollinator/region content. Filed three process concepts tagged `general-design`. Author's 9-step framework preserved in source summary, not promoted to concept (single-source). Softscape ratio (~1/3) flagged as possibly inapplicable to pollinator gardens — revisit when pollinator-specific source addresses ratio. 4 outbound articles triaged as ingest candidates (arrange-plants-in-garden, gardening-on-a-slope, privacy-from-second-story-neighbors, flower-gardening-for-beginners).

## [2026-05-08] refactor | calipc photo asset download
Downloaded 540 plant images from Cal-IPC profile pages (parsed from markdown image tags pointing to www.cal-ipc.org/wp-content/uploads/) → vault/raw/assets/calipc/<slug>/<original-filename>. 137 plant subfolders, 140 MB total. Filenames preserved from source URLs (carry photographer attribution like "Acacia-dealbata_flowers_copyright_2008_NealKramer.jpeg"). 0 failures, 0 empty folders. Plant pages not yet updated to reference local paths — that's a follow-up task pairing with WRIC ingest for full Identify-section content. Tooling: .firecrawl/build-image-jobs.sh and .firecrawl/run-image-download.sh.

## [2026-05-08] ingest | calipc-top-tier (bulk: 136 plants + synthesis)
Sources: 272 raw markdown files in raw/articles/calipc/ (136 plants × profile + PAF, excluding the hand-curated arctotheca-prostrata pilot)
Pages touched: 136 plants/<scientific-name>.md (created — script-generated stubs with full frontmatter), synthesis/calipc-top-tier-overview.md (created — patterns across all 137 plants), index.md (updated — Plants section now lists 137 invasive entries grouped by Cal-IPC rating; Synthesis section linked)
Tooling: .firecrawl/build-plant-pages.py (parser + page generator) and .firecrawl/aggregate-stats.py (cross-plant statistics)
Notes: Script-assisted bulk ingest. Each generated plant page has fully-populated invasive frontmatter (cal_ipc_rating, cdfa_rating, impact/invasiveness/distribution scores, spread_mechanisms, habitat_types, jepson_regions, evaluated_on) extracted from PAF Table 2, Worksheet A, Worksheet C, and "Infested Jepson Regions". Body content is intentionally thin — description paragraph + "Why it's a problem" + Cal-IPC scoring table — because Cal-IPC PAFs by design omit management info. Identify / Remove / Prevent sections are stubs awaiting UC Davis WRIC ingest. Photos pending separate scrape pass. All pages tagged status: stub except the curated arctotheca-prostrata (status: draft).
Spot-checked outputs: cytisus-scoparius (Scotch broom), genista-monspessulana (French broom), hedera-helix (English ivy), foeniculum-vulgare (fennel), rubus-armeniacus (Himalayan blackberry), arundo-donax (giant reed), aegilops-triuncialis (barb goatgrass) — all of Luc's known foothills weeds present and correctly classified.
Edge cases handled in parser: comma-separated common names (vs semicolon), `dd-Mon-yy` evaluation date format, CDFA ratings with markdown-escaped asterisks ("C\\*" → "C*"), `<br>` HTML in PAF table cells, multi-`<br>` Total Score lines, Worksheet A "rhizomes" appearing as example-text (false positive previously fixed by gating on Yes-answers only). One URL artifact handled manually: triadica-sebifera-plant filename retained at raw/ but plant page renamed to triadica-sebifera.md to drop the "-plant" URL stem suffix.
Synthesis page surfaces: 86 foothills-relevant plants (Central West + inland habitats); 9 A/A/A worst-of-worst plants; 73% of inventory resprouts after cutting; 25% explicitly cite horticultural pathway introduction (see [[concepts/horticultural-introduction-pathway]]); top genera Centaurea (7 species), Tamarix (4), Bromus (3).

## [2026-05-08] ingest | calipc-arctotheca-prostrata (pilot)
Sources: raw/articles/calipc/arctotheca-prostrata-profile.md, raw/articles/calipc/arctotheca-prostrata-paf.md
Pages touched: plants/arctotheca-prostrata (created — first plant page in the wiki), regions/central-west (created), concepts/cal-ipc-scoring (created), concepts/vegetative-spread (created), concepts/horticultural-introduction-pathway (created), sources/calipc (created — dataset meta-page)
Schema changes: CLAUDE.md updated with the dataset-source-meta-page exception (one meta-page per structured dataset, instead of per-record summaries); applies to Cal-IPC, future Calscape/USDA/etc. ingests.
Notes: Pilot to lock the template for the 137-plant top-tier ingest. Plant page body restructured around user-facing intent (Identify / Remove / Prevent) per Luc's call — the user-facing app shows photos + management, not Cal-IPC scoring; scoring lives in frontmatter and a secondary section. Three cross-cutting concepts promoted to standalone pages now (scoring vocabulary, vegetative spread, horticultural pathway) — well-supported by Cal-IPC content directly. Phase-1 cleanup concepts (removal-techniques, reinfestation-prevention, toxicity-handling) deferred until UC Davis WRIC management notes are scraped (Cal-IPC PAFs explicitly do not include management info; Arctotheca's profile says "No Weed RIC Management Notes available"). Photos also deferred — current scrapes are markdown-only; profile pages reference images by URL only. Both deferred items will be follow-up scrape passes.

## [2026-05-08] refactor | sources/<source-slug>.md exception for dataset-style sources
CLAUDE.md updated to clarify: per-source summaries (sources/<id>.md) remain the rule for unique authored articles, but for structured datasets (per-record entries from the same database — Cal-IPC, Calscape, USDA, etc.), one meta-page per dataset replaces per-record summaries. Rationale: 274 individual Cal-IPC source pages would be busywork with near-identical content; the raw files are themselves the primary records, referenced from each plant page's `sources:` frontmatter.

## [2026-05-08] refactor | bulk scrape Cal-IPC top-tier raw sources
Scraped 137 High + Moderate Cal-IPC inventory plants × 2 pages (profile + PAF) into raw/articles/calipc/. 274 raw markdown files total (~274 firecrawl credits). Source: https://www.cal-ipc.org/plants/inventory/. One non-standard URL fixed manually (spartina-alterniflora-x-spartina-foliosa hybrid). No wiki pages created yet — these are raw sources awaiting ingest. Deferred: Limited (89 PAFs), Watch (105 PREs), and Cal-IPC species ID cards.

## [2026-05-08] refactor | plant frontmatter — invasive: namespace
Extended the plant frontmatter schema in CLAUDE.md with an `invasive:` block (cal_ipc_rating, cdfa_rating, impact/invasiveness/distribution scores, spread_mechanisms, habitat_types, jepson_regions, evaluated_on). Asymmetric grouping per Luc's call: native-specific fields (pollinators, host_plant_for) stay flat at top level; only invasive-specific fields are namespaced. Block is omitted entirely for non-invasive plants. Maps to a future `invasive_assessments` table joined on plant_id when Supabase lands. No existing plant pages to migrate.

## [2026-05-08] refactor | raw/articles/<source-slug>/ subfolder convention
Documented per-source subfolder convention in CLAUDE.md for bulk-scraped raw articles (individually-clipped articles still flat at raw/articles/). Updated source-id rule: subfolder sources prefix the slug (e.g. sources/calipc-arctotheca-prostrata-profile.md). Created raw/articles/calipc/ and landed the first two test scrapes (arctotheca-prostrata profile + PAF) from Cal-IPC. No wiki pages created yet — these are raw sources awaiting ingest.

## [2026-05-07] ingest | flower-gardening-for-beginners
Source: raw/articles/flower-gardening-for-beginners.md (Pretty Purple Door, Amy Fedele, 2020)
Pages touched: sources/flower-gardening-for-beginners (created), concepts/right-plant-right-place (created — promoted to project-thesis page per Luc), concepts/usda-hardiness-zones (created), concepts/plant-life-cycles (created), concepts/sun-requirements (created), concepts/soil-basics (created), concepts/plant-spacing (created), concepts/watering (created), concepts/frost-and-cold-protection (created), concepts/site-inventory (updated — linked to sun-requirements, RPRP, soil-basics, frost-and-cold-protection, USDA zones; replaced inline sun thresholds with link).
Assets: 9 images downloaded to raw/assets/flower-gardening-for-beginners/
Notes: Major foundational ingest. RPRP elevated from passing motto to the project's thesis page — extends the source's horticultural reading with the project's ecological reading (native plants for native pollinators); thesis framing is project synthesis, not from source. Sun thresholds (≥6h / 3-6h / ≤3h) corroborated across both PPD sources; site-inventory now points to sun-requirements as plant-side counterpart. Two source claims explicitly flagged as **likely incorrect for CA natives**: (a) the 1"/week watering rule kills established drought-adapted natives; (b) the "amend with compost" guidance can harm native plantings. Both noted on the relevant concept pages with caveats; revisit when CA-native-specific sources land. Skipped fertilizing as a concept (source content was mostly product/affiliate links). Biennials sectioned but stubbed since the source named them without development. 6 outbound articles triaged as ingest candidates (notably self-sowing-annuals — relevant to native CA wildflowers — and types-of-flowers-plants).

## [2026-05-08] ingest | inaturalist photo fetch (137 Cal-IPC invasives)
Tooling: vault/scripts/fetch_inaturalist_photos.py. License filter cc0,cc-by; image size large; cap PER_PLANT=5 with one-photo-per-photographer for diversity; synonym resolution via iNat `matched_term` with parent-species fallback when current taxon has no qualifying CC observations.
Output: vault/raw/assets/inaturalist/<slug>/{NN.jpg, metadata.json}. Each metadata.json carries license, attribution, observer, observation URL, taxon ID, and `photos_from_parent_species` flag.
Counts: 137 plants attempted, 137 with photos, 626 photos total, ~275 MB. Coverage: 118 full (5/5) / 19 partial (1–4/5, genuine CC photographer scarcity) / 1 parent-species fallback (centaurea-jacea-ssp-pratensis → Centaurea jacea).
Pages touched: none — raw asset fetch only, no wiki pages updated. Page wiring landed 2026-05-09 (`vault/scripts/wire_photos_into_plant_pages.py` inserts a `## Photos` section before `## Sources` in every plant page; idempotent). Partial-coverage top-up also landed 2026-05-09 — `--allow-duplicate-users` flag added to the fetcher; all 19 partials reached 5/5 (137/137 plants now full coverage).
Notes: Synonym resolution verified by spot-check (2026-05-09) on 6 reclassified/fallback taxa — all confirmed correct (Fallopia japonica → Reynoutria japonica, Pennisetum setaceum → Cenchrus setaceus, Eichhornia crassipes → Pontederia crassipes, Polygonum sachalinense → Reynoutria sachalinensis, Brassica nigra → Mutarda nigra, Centaurea jacea ssp. pratensis fallback). Side finding: pre-patch fetcher runs left `photos_taxon_id`/`photos_from_parent_species` as `None` for ~14 plants that resolved via the second-pass synonym retry — not blocking, but a normalization re-run would tidy the schema.
