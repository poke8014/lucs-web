---
type: concept
title: Plant Sociability
aliases: ["sociability", "levels of sociability", "sociability rating", "clumping vs spreading"]
tags: [design-principle, plant-selection, layout, planting-design]
status: draft
sources: [raw/pdfs/books/planting-in-a-post-wild-world.txt]
last_updated: 2026-07-03
---

# Plant Sociability

**Sociability** describes how strongly a plant naturally groups: does it grow as a solitary specimen, in small clusters, or in sweeping colonies? It's a design axis for deciding *how many* of a species to plant together and *how* to arrange them in a [[concepts/designed-plant-communities|designed plant community]]. Rainer & West's [[sources/planting-in-a-post-wild-world|*Planting in a Post-Wild World*]] present a **1–5 scale** adapted from the German plantsmen Richard Hansen and Friedrich Stahl (1997).

This is the rating Sunshower's backlog flagged as a data gap on 2026-07-03 (experienced gardeners sort their planting spreadsheets by it; no vault frontmatter field carried it). This source supplies the **scale and vocabulary**; it does not supply per-species values for California natives (its examples are Eastern-US/European). See "Schema status" below.

## The 1–5 scale

| Level | Grouping | Typical use | Book's example genera |
|---|---|---|---|
| **1** | Individual plants or small groups | Solitary specimens, structural accents | *Aruncus, Eryngium yuccifolium, Panicum virgatum, Vernonia* |
| **2** | Small groups of 3–10 | Drifts of feature perennials | *Echinacea purpurea, Liatris spicata, Monarda fistulosa, Deschampsia* |
| **3** | Larger groups of 10–20 | Broad masses | *Achillea millefolium, Aquilegia canadensis, Bouteloua curtipendula, Rudbeckia fulgida* |
| **4** | Expansive groups | Colonies, matrix-forming | *Allium cernuum, Carex plantaginea, Mertensia virginica, Onoclea sensibilis* |
| **5** | Primarily large areas | Ground-covering carpets | *Carex pensylvanica, Geum fragarioides, Packera aurea, Tiarella cordifolia* |

Low numbers = plant alone or in tight small groups (they read as individuals). High numbers = plant in large sweeps or as continuous ground cover (they *want* to run and carpet).

## Why it matters for design

Sociability is one of the three inputs to plant **spacing and quantity** (alongside mature size and vigor) — see [[concepts/plant-spacing]]. It also maps loosely onto the [[concepts/planting-layers|layer system]]:

- **Low sociability (1–2)** plants tend to be structural or feature seasonal-theme plants — placed deliberately, few in number.
- **High sociability (4–5)** plants tend to be the ground-cover / functional layer — placed as populations, meant to spread and close gaps.

It's closely related to but distinct from [[concepts/vegetative-spread]]: vegetative spread is the *mechanism* (stolons, rhizomes, fragments) and is tracked mainly for invasives because it makes removal harder; sociability is the *design intent* (how strongly to group), and for desirable plants a high rating is a feature, not a warning. A native that spreads clonally is a liability as a weed and an asset as a ground cover — same trait, opposite framing depending on whether you want it.

## Why it matters doubly for Sunshower's density styles

Sociability is where the two planned density styles diverge most:

- A **landscaped** (more formal) style leans on lower-sociability plants in controlled, legible groupings.
- A **naturalistic** style leans on higher-sociability spreaders that intermingle and self-arrange into a matrix.

So the same native palette can produce either look depending on how sociability is used — which is exactly why the app needs this as a first-class field. Full mapping in [[synthesis/post-wild-world-and-sunshower]].

## Schema status

A `sociability` field (integer 1–5) is defined in the plant frontmatter schema in [vault/CLAUDE.md](../CLAUDE.md) as of this ingest, but **left unset on existing plant pages** — this source gives the scale, not CA-native values. Populating it needs a source that rates California natives (or careful inference from growth-habit data, deferred as lower-confidence). Tracked in the backlog.

## Related concepts

- [[concepts/designed-plant-communities]] — sociability is a selection/arrangement input.
- [[concepts/planting-layers]] — sociability correlates with which layer a plant fills.
- [[concepts/plant-spacing]] — one of the three inputs to spacing & quantity.
- [[concepts/vegetative-spread]] — the mechanistic cousin (spread as a management liability vs. sociability as a design asset).
- [[concepts/plant-strategies-csr]] — high-sociability spreaders are often Kühn "area expansion" (Type 6) types.

## Sources

- [[sources/planting-in-a-post-wild-world]] — Rainer & West (2015), Ch. 3, "Levels of Sociability" (after Hansen & Stahl, 1997). Example genera are the book's (Eastern-US/European); the density-style mapping is Sunshower synthesis.
