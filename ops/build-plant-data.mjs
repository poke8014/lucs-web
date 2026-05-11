#!/usr/bin/env node
// Reads vault/plants/*.md frontmatter + adjacent
// vault/raw/assets/inaturalist/<slug>/metadata.json, emits src/data/plants.json
// for the pollinator app to consume at build time.
//
// Run: node ops/build-plant-data.mjs

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
    height_ft: data.height_ft ?? null,
    width_ft: data.width_ft ?? null,
    water: data.water ?? null,
    sun: data.sun ?? null,
    cal_ipc_rating: inv.cal_ipc_rating ?? null,
    cdfa_rating: inv.cdfa_rating ?? null,
    impact_score: inv.impact_score ?? null,
    invasiveness_score: inv.invasiveness_score ?? null,
    distribution_score: inv.distribution_score ?? null,
    spread_mechanisms: inv.spread_mechanisms ?? [],
    habitat_types: inv.habitat_types ?? [],
    jepson_regions: inv.jepson_regions ?? [],
    photos: readPhotos(slug),
  };
}

const files = fs.readdirSync(PLANTS_DIR).filter((f) => f.endsWith(".md"));
const plants = files.map(buildEntry).sort((a, b) =>
  a.scientific_name.localeCompare(b.scientific_name),
);

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(plants, null, 2) + "\n");

const withPhotos = plants.filter((p) => p.photos.length > 0).length;
console.log(
  `Wrote ${plants.length} plants → ${path.relative(ROOT, OUT)} (${withPhotos} with photos)`,
);
