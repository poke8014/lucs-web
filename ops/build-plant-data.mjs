#!/usr/bin/env node
// Reads vault/plants/*.md frontmatter + adjacent
// vault/raw/assets/inaturalist/<slug>/metadata.json, emits src/data/plants.json
// for the pollinator app to consume at build time.
//
// Run: node ops/build-plant-data.mjs
//
// NOTE: the cleanup-plan removal fields (removal_method, removal_notes,
// removal_sources, removal_timing_window, requires_followup_years,
// safety_flags) are emitted from each page's `removal:` frontmatter block
// (schema in vault/CLAUDE.md); pages without the block get null/empty
// defaults. One run of this script is the complete regeneration — the
// pre-2026-07-06 post-build Python appliers are retired.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PLANTS_DIR = path.join(ROOT, "vault/plants");
const INAT_DIR = path.join(ROOT, "vault/raw/assets/inaturalist");
const OUT = path.join(ROOT, "src/data/plants.json");
const PHOTO_CAP = 3;

function readPhotos(slug) {
  const metaPath = path.join(INAT_DIR, slug, "metadata.json");
  if (!fs.existsSync(metaPath)) return [];
  const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
  return (meta.photos ?? []).slice(0, PHOTO_CAP).map((p) => ({
    url: p.url,
    attribution: p.attribution,
    license: p.license,
    observation_url: p.observation_url,
  }));
}

// Parse a Calscape dimension string ("1 - 3", "0.2", "35 - 66", messy) into
// { raw, min, max } numerics. Defensive by design: a prior rollout hit a
// lone-`.` float-parse crash, and the corpus holds empty strings, decimals,
// and even reversed ranges ("3 - 1.5"). We extract every number token and take
// the min/max, so ordering and stray punctuation never throw.
function parseRange(raw) {
  if (raw == null) return { raw: null, min: null, max: null };
  const s = String(raw).trim();
  if (!s) return { raw: s, min: null, max: null };
  const nums = (s.match(/\d+(?:\.\d+)?/g) ?? [])
    .map(Number)
    .filter((n) => Number.isFinite(n));
  if (nums.length === 0) return { raw: s, min: null, max: null };
  return { raw: s, min: Math.min(...nums), max: Math.max(...nums) };
}

// Emit the native: block only for pages that carry one. Native pages without
// a native: block (e.g. poison-oak, a native hazard plant) get null so the
// selector can filter them out cleanly.
function buildNative(data) {
  const n = data.native;
  if (!n || typeof n !== "object") return null;
  return {
    communities: n.communities ?? [],
    communities_simplified: n.communities_simplified ?? [],
    companions: n.companions ?? [],
    sun_range: n.sun_range ?? null,
    water_range: n.water_range ?? null,
    soil_drainage: n.soil_drainage ?? [],
    ease_of_care: n.ease_of_care ?? null,
    nursery_availability: n.nursery_availability ?? null,
    is_cultivar: n.is_cultivar ?? false,
    butterflies_moths_supported: n.butterflies_moths_supported ?? null,
    attracts_wildlife: n.attracts_wildlife ?? [],
    soil_ph: n.soil_ph ?? null,
    rarity: n.rarity ?? null,
    calscape_url: n.calscape_url ?? null,
  };
}

function buildEntry(file) {
  const slug = path.basename(file, ".md");
  const raw = fs.readFileSync(path.join(PLANTS_DIR, file), "utf8");
  const { data } = matter(raw);
  const inv = data.invasive ?? {};
  return {
    slug,
    scientific_name: data.scientific_name ?? "",
    common_names: data.common_names ?? [],
    aliases: data.aliases ?? [],
    nativity: data.nativity ?? null,
    plant_type: data.plant_type ?? null,
    // Raw dimension strings kept alongside parsed {min,max} numerics.
    height_ft: data.height_ft ?? null,
    width_ft: data.width_ft ?? null,
    height_ft_range: parseRange(data.height_ft),
    width_ft_range: parseRange(data.width_ft),
    water: data.water ?? null,
    sun: data.sun ?? null,
    soil: data.soil ?? [],
    bloom_season: data.bloom_season ?? [],
    pollinators: data.pollinators ?? [],
    sociability: data.sociability ?? null,
    host_plant_for: data.host_plant_for ?? [],
    native: buildNative(data),
    cal_ipc_rating: inv.cal_ipc_rating ?? null,
    cdfa_rating: inv.cdfa_rating ?? null,
    impact_score: inv.impact_score ?? null,
    invasiveness_score: inv.invasiveness_score ?? null,
    distribution_score: inv.distribution_score ?? null,
    spread_mechanisms: inv.spread_mechanisms ?? [],
    habitat_types: inv.habitat_types ?? [],
    jepson_regions: inv.jepson_regions ?? [],
    photos: readPhotos(slug),
    // Removal overlay — sourced from the removal: frontmatter block when present.
    // Defaults match the prior post-build applier output for pages without the block.
    removal_method: data.removal?.method ?? null,
    removal_notes: data.removal?.notes ?? [],
    removal_sources: data.removal?.sources ?? [],
    removal_timing_window: data.removal?.timing_window ?? null,
    requires_followup_years: data.removal?.followup_years ?? null,
    safety_flags: data.removal?.safety_flags ?? [],
  };
}

const files = fs.readdirSync(PLANTS_DIR).filter((f) => f.endsWith(".md"));
const plants = files.map(buildEntry).sort((a, b) =>
  a.scientific_name.localeCompare(b.scientific_name),
);

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(plants, null, 2) + "\n");

const withPhotos = plants.filter((p) => p.photos.length > 0).length;
const natives = plants.filter((p) => p.native).length;
console.log(
  `Wrote ${plants.length} plants → ${path.relative(ROOT, OUT)} (${withPhotos} with photos, ${natives} with native block)`,
);
