#!/usr/bin/env python3
"""
One-shot migration: read removal overlay data from src/data/plants.json and
insert a removal: block into the frontmatter of each affected vault/plants/*.md
page.

Idempotent: pages that already contain a removal: key in their frontmatter are
skipped (counted and reported).

Run from the repo root:
    python3 vault/scripts/migrate_removal_to_frontmatter.py
"""

import json
import os
import re
import sys

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PLANTS_JSON = os.path.join(REPO_ROOT, "src", "data", "plants.json")
PLANTS_DIR = os.path.join(REPO_ROOT, "vault", "plants")

EXPECTED_COUNT = 61

# --- helpers -----------------------------------------------------------------

def has_removal_data(plant):
    """True if any of the six fields is non-null / non-empty."""
    if plant.get("removal_method") is not None:
        return True
    if plant.get("removal_timing_window") is not None:
        return True
    if plant.get("requires_followup_years") is not None:
        return True
    if plant.get("safety_flags"):
        return True
    if plant.get("removal_notes"):
        return True
    if plant.get("removal_sources"):
        return True
    return False


def render_removal_block(plant):
    """
    Return the removal: block as a string (no trailing newline) ready to be
    inserted before the closing frontmatter ---.

    Field order: method, timing_window, followup_years, safety_flags, notes,
    sources.

    Value encoding:
    - prose strings: json.dumps (double-quoted — valid YAML scalar, handles
      colons, em-dashes, quotes without escaping headaches)
    - null: bare key with no value (e.g. "  timing_window:")
    - integer: plain integer
    - lists: YAML block list with double-quoted items, or [] when empty
    """
    lines = ["removal:"]

    # method
    method = plant.get("removal_method")
    if method is None:
        lines.append("  method:")
    else:
        lines.append(f"  method: {json.dumps(method, ensure_ascii=False)}")

    # timing_window
    tw = plant.get("removal_timing_window")
    if tw is None:
        lines.append("  timing_window:")
    else:
        lines.append(f"  timing_window: {json.dumps(tw, ensure_ascii=False)}")

    # followup_years
    fy = plant.get("requires_followup_years")
    if fy is None:
        lines.append("  followup_years:")
    else:
        lines.append(f"  followup_years: {fy}")

    # safety_flags
    flags = plant.get("safety_flags") or []
    if not flags:
        lines.append("  safety_flags: []")
    else:
        lines.append("  safety_flags:")
        for f in flags:
            lines.append(f"  - {json.dumps(f, ensure_ascii=False)}")

    # notes
    notes = plant.get("removal_notes") or []
    if not notes:
        lines.append("  notes: []")
    else:
        lines.append("  notes:")
        for n in notes:
            lines.append(f"  - {json.dumps(n, ensure_ascii=False)}")

    # sources
    sources = plant.get("removal_sources") or []
    if not sources:
        lines.append("  sources: []")
    else:
        lines.append("  sources:")
        for s in sources:
            lines.append(f"  - {json.dumps(s, ensure_ascii=False)}")

    return "\n".join(lines)


def insert_removal_block(text, block):
    """
    Find the closing --- of the leading frontmatter and insert the block
    immediately before it, preceded by a blank line.

    Returns (new_text, ok, error_msg).
    """
    # The leading frontmatter starts at position 0 with ---\n (or ---\r\n).
    # We need to find the SECOND occurrence of a line that is exactly ---.
    # We do this by scanning line by line so we never rewrite anything.
    lines = text.splitlines(keepends=True)
    front_open = -1
    front_close = -1
    for i, line in enumerate(lines):
        stripped = line.rstrip("\r\n")
        if stripped == "---":
            if front_open == -1:
                front_open = i
            else:
                front_close = i
                break

    if front_open == -1 or front_close == -1:
        return text, False, "Could not locate frontmatter delimiters"

    # Build new content: everything up to (but not including) the closing ---,
    # then a blank line, then the block, then the closing --- and the rest.
    before = lines[:front_close]
    after = lines[front_close:]  # starts with the closing ---

    # Ensure there's exactly one blank line before the block (insert a blank
    # line only if the last line before the close isn't already blank).
    if before and before[-1].strip():
        before.append("\n")

    block_lines = [l + "\n" for l in block.split("\n")]

    new_lines = before + block_lines + after
    return "".join(new_lines), True, None


# --- main --------------------------------------------------------------------

def main():
    with open(PLANTS_JSON, encoding="utf-8") as f:
        plants = json.load(f)

    # Select records with removal data
    removal_plants = [p for p in plants if has_removal_data(p)]

    if len(removal_plants) != EXPECTED_COUNT:
        slugs = [p["slug"] for p in removal_plants]
        print(
            f"ERROR: expected {EXPECTED_COUNT} plants with removal data, "
            f"found {len(removal_plants)}."
        )
        print("Slugs found:")
        for s in slugs:
            print(f"  {s}")
        sys.exit(1)

    print(f"Found {len(removal_plants)} plants with removal data (expected {EXPECTED_COUNT}). OK.")

    modified = 0
    skipped = 0
    errors = []

    for plant in removal_plants:
        slug = plant["slug"]
        page_path = os.path.join(PLANTS_DIR, f"{slug}.md")

        if not os.path.exists(page_path):
            errors.append(f"MISSING: vault/plants/{slug}.md")
            continue

        text = open(page_path, encoding="utf-8").read()

        # Idempotency guard: if the frontmatter already has a removal: key, skip.
        # We check only within the frontmatter (between the two --- delimiters).
        lines = text.splitlines()
        in_front = False
        front_open_seen = False
        has_removal_key = False
        for line in lines:
            stripped = line.rstrip()
            if stripped == "---":
                if not front_open_seen:
                    front_open_seen = True
                    in_front = True
                else:
                    in_front = False
                    break
            elif in_front:
                # Check for removal: as a top-level key (not indented)
                if re.match(r'^removal\s*:', line):
                    has_removal_key = True
                    break

        if has_removal_key:
            skipped += 1
            print(f"  SKIP   {slug} (removal: already present)")
            continue

        block = render_removal_block(plant)
        new_text, ok, err = insert_removal_block(text, block)

        if not ok:
            errors.append(f"ERROR inserting into {slug}: {err}")
            continue

        with open(page_path, "w", encoding="utf-8") as f:
            f.write(new_text)

        modified += 1
        print(f"  WROTE  {slug}")

    print()
    print(f"Done. Modified: {modified}, Skipped: {skipped}, Errors: {len(errors)}")
    if errors:
        print("Errors:")
        for e in errors:
            print(f"  {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
