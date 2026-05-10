---
type: concept
title: Soil Basics
aliases: ["soil types", "soil texture", "soil pH", "soil testing"]
tags: [soil, plant-selection, plant-care, general-gardening]
status: stub
sources: [raw/articles/flower-gardening-for-beginners.md]
last_updated: 2026-05-07
---

# Soil Basics

Soil determines which plants will thrive in a given spot more reliably than almost any other site factor. The two simplest things to learn about your soil — its **texture** and its **pH** — already narrow plant choices substantially.

The right plant for a soil is more economical than amending the soil for a plant. As Pretty Purple Door puts it: *amend less, choose better*.

## Soil texture (the hand-feel test)

Texture refers to the proportion of sand, silt, and clay in the soil. The simplest field test is to dig down a few inches, grab a moist handful, and squeeze:

- **Sandy / grainy** — falls apart easily, drains fast. Good for plants that need sharp drainage and tolerate dry conditions (many California natives, lavenders, Mediterranean shrubs). Bad for moisture-loving plants unless heavily irrigated.
- **Clay** — clumps into a sticky ball, holds water, drains slowly. Good for moisture-tolerant plants. Bad for plants that rot in wet roots (most CA chaparral natives, lavender, sage).
- **Loam** — crumbles when squeezed but holds its shape briefly. The "ideal" garden soil; balanced drainage and water retention.

A more rigorous version is the **ribbon test** (squeeze a moist sample between thumb and forefinger to extrude a ribbon — length of the ribbon indicates clay percentage), but the squeeze test gets you most of the way for plant-selection purposes.

For California natives specifically, **sharp drainage matters more than richness**. Many native plants evolved on lean, well-drained soils and rot in amended garden beds.

## Soil pH

Soil pH is measured on a 0-14 scale; 7 is neutral, below 7 is acidic, above 7 is alkaline. Most garden plants prefer **6.0-7.0** (slightly acidic to neutral), but plant tolerances vary widely.

Test options:
- **Home pH kit** — quick reading at the bench. Adequate for relative comparisons.
- **Mail-in lab test** — more precise; usually includes nutrient levels (N, P, K) and sometimes texture analysis.
- **Local agricultural extension service** — in California, UC Cooperative Extension county offices may offer testing free or cheap.

Soil pH varies by region and even by yard. California has both naturally acidic (redwood forest understory) and naturally alkaline (parts of inland valley) soils.

## "Amend or choose"

You *can* amend soil to suit a plant — adding compost, sulfur for acidity, lime for alkalinity, gypsum to break up clay, sand for drainage. The author of [[sources/flower-gardening-for-beginners]] argues this is usually more trouble than it's worth, and recommends choosing plants that match existing soil.

For a native pollinator garden specifically, this principle is even stronger:
- Native plants in CA have evolved on the soil that's already there. Heavy amendment can make conditions *worse* for them, not better.
- Compost-rich beds favor non-native cultivars and weedy generalists, which can outcompete natives.
- The classic advice "improve your soil with compost" is from Eastern temperate gardening literature; it doesn't always transfer.

This warrants its own page when better-supported by a CA-native source. For now, treat compost-as-default-improvement skeptically.

## Maps to plant frontmatter

The schema's `soil:` field is a list. Acceptable values aren't yet pinned down — likely candidates:
- `sandy`, `loam`, `clay`
- `well-drained`, `rocky`, `moist`
- `acidic`, `neutral`, `alkaline`

To be normalized when a structured source (Calscape, Las Pilitas) gets ingested.

## Relationship to other concepts

- One axis of the [[concepts/right-plant-right-place]] match.
- Discovered during the [[concepts/site-inventory]] step (as a yard observation, even if not formally tested).
- Texture interacts with watering — sandy soils need more frequent water; see [[concepts/watering]].

## Sources

- [[sources/flower-gardening-for-beginners]] — Amy Fedele (2020). Introduces texture (sandy vs. clay), the squeeze test, and the "choose plants for soil, don't amend" principle.
