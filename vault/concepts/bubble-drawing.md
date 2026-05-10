---
type: concept
title: Bubble Drawing
aliases: ["bubble diagram", "bubble plan", "thumbnail layout"]
tags: [layout, general-design, planning-process]
status: stub
sources: [raw/articles/design-a-garden-layout.md]
last_updated: 2026-05-07
---

# Bubble Drawing

A **bubble drawing** is a low-fidelity, iterative sketch in which each functional zone of a yard — patio, garden bed, lawn, water feature, dining area — is drawn as a roughly-sized bubble laid over a [[concepts/site-inventory]] base plan.

It is not a final layout. It is a *thinking tool* for trying many configurations cheaply.

## Why it matters

The author of [[sources/design-a-garden-layout]] reports making **5 to 20 bubble drawings for a single project**, with best ideas often arriving after 5+ iterations. The implication for any garden-planning workflow:

> Cheap iteration beats getting it right the first time.

This argues directly *against* committing to a single layout in a planning tool, and *for* a UI that makes it trivial to duplicate, modify, and discard layouts. A pollinator garden planner that requires the user to "finalize" a layout before they can experiment will produce worse outcomes than one that encourages 10 quick variations.

## How to draw one

1. Start from a copy of your [[concepts/site-inventory]].
2. Draw bubbles roughly the real-world size of each zone. Don't worry about exact shapes.
3. Mark feature/focal-point candidates with an "F" (water features sometimes "W" — author's convention, not canon).
4. Layer in must-haves (patios, dining, play areas) like Tetris pieces — most-important first.
5. Fill remaining negative space with beds, lawn, hardscape (see [[concepts/softscape-hardscape-ratio]]).
6. Add path arrows to verify every zone is reachable. No dead ends.
7. **Throw it away and draw another.** Then another.

## What it isn't

- It's not a measured drawing — that's what the [[concepts/site-inventory]] base plan is for.
- It's not a planting plan — plant selection happens *after* the layout is settled.
- It's not a single artifact — a plan that took one sketch is a plan that wasn't iterated.

## Implications for the pollinator garden app

- Layout creation should be lightweight: drag bubbles, name them, resize them, duplicate the whole canvas to fork an idea.
- Saving 10 named drafts ("v3 — moved patio south") should feel as natural as saving one.
- Path/flow validation (arrows, dead-end detection) is a useful late-stage check.
- The site-inventory layer should remain visible underneath all bubble drafts — design decisions are downstream of conditions.

## Sources

- [[sources/design-a-garden-layout]] — Pretty Purple Door, Amy Fedele (2023)
