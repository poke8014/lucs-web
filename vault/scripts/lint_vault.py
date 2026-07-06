#!/usr/bin/env python3
"""Read-only vault lint — the punch-list pass vault/CLAUDE.md calls for after
every big ingest. Modifies nothing; prints findings and exits non-zero if any
hard defect (broken index wikilink, frontmatter violation, unresolved
contradiction) is present, so it can gate CI later.

Checks (per vault/CLAUDE.md → Operations → Lint):
  1. Orphans          — strict (0 inbound) and graph-orphans (index.md-only)
  2. Stub pages       — count by category
  3. Index drift      — pages on disk missing from index.md, and index.md
                         wikilinks that resolve to no file
  4. Frontmatter      — required base + plant fields, enum values
  5. Contradictions   — unresolved [!warning]/Contradicts callouts
  6. Removal block    — optional removal: block shape, enum values, source paths

Usage:  python3 vault/scripts/lint_vault.py
"""
import os, re, sys, collections

VAULT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PAGE_DIRS = ["plants", "concepts", "regions", "nurseries", "sources", "synthesis"]
WIKILINK = re.compile(r"\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]")


def parse_frontmatter(text):
    if not text.startswith("---"):
        return {}, text
    end = text.find("\n---", 3)
    if end == -1:
        return {}, text
    fm = {}
    for line in text[3:end].splitlines():
        m = re.match(r"^([a-zA-Z_]\w*):\s*(.*)$", line)
        if m:
            fm[m.group(1)] = m.group(2).strip()
    return fm, text[end + 4:]


def get_fm_text(text):
    """Return the raw frontmatter text (between --- markers), or '' if absent."""
    if not text.startswith("---"):
        return ""
    end = text.find("\n---", 3)
    return text[3:end] if end != -1 else ""


def parse_removal_block(fm_text):
    """Parse the removal: nested block from raw frontmatter text.

    Returns a dict of the six expected keys, or None if the block is absent.
    Values are strings for scalar fields and lists for list fields — types are
    as parsed from raw YAML text (followup_years comes out as a string like
    '3'; callers must check int-parseability themselves).
    """
    lines = fm_text.splitlines()
    start = None
    for i, line in enumerate(lines):
        if re.match(r"^removal\s*:", line):
            start = i
            break
    if start is None:
        return None

    result = {}
    current_key = None
    current_list = None

    for line in lines[start + 1:]:
        # A non-blank line without leading whitespace means a new top-level key
        if line and not line[0].isspace():
            break
        stripped = line.strip()
        if not stripped:
            continue
        # Sub-key at two-space indent: "  key: value"
        m = re.match(r"^  ([a-zA-Z_]\w*)\s*:\s*(.*)$", line)
        if m:
            current_key = m.group(1)
            val = m.group(2).strip()
            if val == "[]":
                result[current_key] = []
                current_list = None
            elif val == "" or val is None:
                # No inline value — YAML null unless list items follow
                current_list = None
                result[current_key] = None
            elif val.startswith("[") and val.endswith("]"):
                # Inline list: [a, b, c]
                items = [x.strip().strip('"\'') for x in val[1:-1].split(",")
                         if x.strip()]
                result[current_key] = items
                current_list = None
            else:
                result[current_key] = val.strip('"\'')
                current_list = None
        elif re.match(r"^  - ", line) and current_key is not None:
            if current_list is None:
                current_list = []
                result[current_key] = current_list
            current_list.append(line[4:].strip().strip('"\''))

    return result


def load_pages():
    pages, title_index = {}, {}
    for d in PAGE_DIRS:
        dpath = os.path.join(VAULT, d)
        if not os.path.isdir(dpath):
            continue
        for fn in sorted(os.listdir(dpath)):
            if not fn.endswith(".md"):
                continue
            slug = f"{d}/{fn[:-3]}"
            text = open(os.path.join(dpath, fn), encoding="utf-8").read()
            fm, body = parse_frontmatter(text)
            pages[slug] = {"fm": fm, "body": body, "text": text}
            if fm.get("title"):
                title_index[fm["title"].lower()] = slug
            title_index.setdefault(fn[:-3].lower(), slug)
            aliases = fm.get("aliases", "")
            if aliases.startswith("["):
                for a in aliases.strip("[]").split(","):
                    if a.strip():
                        title_index.setdefault(a.strip().lower(), slug)
    return pages, title_index


def main():
    pages, title_index = load_pages()

    def resolve(target):
        t = target.strip().lower().removesuffix(".md")
        if t in pages:
            return t
        if t in title_index:
            return title_index[t]
        return title_index.get(t.split("/")[-1])

    inbound = collections.defaultdict(set)
    for slug, p in pages.items():
        for m in WIKILINK.finditer(p["body"]):
            tgt = resolve(m.group(1))
            if tgt and tgt != slug:
                inbound[tgt].add(slug)

    index_text = open(os.path.join(VAULT, "index.md"), encoding="utf-8").read()
    index_targets, broken_index_links = set(), []
    for m in WIKILINK.finditer(index_text):
        tgt = resolve(m.group(1))
        if tgt:
            index_targets.add(tgt)
            inbound[tgt].add("index.md")
        else:
            broken_index_links.append(m.group(1))

    hard_defects = 0
    print("=" * 68)
    print(f"VAULT LINT — {len(pages)} wiki pages "
          f"({', '.join(PAGE_DIRS)})")
    print("=" * 68)

    # 1. Orphans
    strict = sorted(s for s in pages if not inbound[s])
    graph = sorted(s for s in pages if inbound[s] == {"index.md"})
    print(f"\n## 1. ORPHANS")
    print(f"Strict (0 inbound, incl. index.md): {len(strict)}")
    for s in strict:
        print(f"  - {s}")
    print(f"Graph-orphans (index.md-only, no peer link in): {len(graph)} "
          f"{dict(collections.Counter(s.split('/')[0] for s in graph))}")

    # 2. Stubs
    stubs = [s for s in pages if pages[s]["fm"].get("status") == "stub"]
    print(f"\n## 2. STUB PAGES: {len(stubs)} "
          f"{dict(collections.Counter(s.split('/')[0] for s in stubs))}")

    # 3. Index drift
    missing = sorted(set(pages) - index_targets)
    print(f"\n## 3. INDEX DRIFT")
    print(f"On disk but not wikilinked in index.md: {len(missing)}")
    for s in missing:
        print(f"  - {s}")
    print(f"index.md wikilinks resolving to no file: {len(broken_index_links)}")
    for b in sorted(set(broken_index_links)):
        print(f"  - [[{b}]]")
        hard_defects += 1

    # 4. Frontmatter
    REQUIRED = ["type", "title", "status", "last_updated"]
    PLANT_REQ = ["scientific_name", "plant_type", "nativity", "water", "sun"]
    ENUM = {"status": {"stub", "draft", "review", "stable"},
            "nativity": {"native", "non_native_safe", "invasive"}}
    viol = collections.Counter()
    for s, p in pages.items():
        fm = p["fm"]
        for r in REQUIRED:
            if not fm.get(r):
                viol[f"missing {r}"] += 1
        if fm.get("type") == "plant":
            for r in PLANT_REQ:
                if r not in fm:
                    viol[f"plant missing {r}"] += 1
        for k, allowed in ENUM.items():
            if k in fm and fm[k] not in allowed:
                viol[f"{k} off-enum"] += 1
    print(f"\n## 4. FRONTMATTER VIOLATIONS: {sum(viol.values())}")
    for k, n in viol.most_common():
        print(f"  {k}: {n}")
        hard_defects += n

    # 5. Contradictions
    contra = sorted(s for s, p in pages.items()
                    if "Contradicts" in p["text"] or "[!warning]" in p["text"])
    print(f"\n## 5. UNRESOLVED CONTRADICTION CALLOUTS: {len(contra)}")
    for s in contra:
        print(f"  - {s}")
        hard_defects += 1

    # 6. Removal block — optional on plant pages; validated when present.
    REMOVAL_REQUIRED_KEYS = {
        "method", "timing_window", "followup_years",
        "safety_flags", "notes", "sources",
    }
    REMOVAL_METHOD_ENUM = {
        "hand_pull", "dig_taproot", "dig_rhizome_complete",
        "dig_bulb_complete", "cut_stump_herbicide", "mow_before_seed",
        "pull_vine_dig_crown", "cane_cut_dig_crown",
        "prune_host_below_attachment", "sheet_mulch_smother",
    }
    REMOVAL_SAFETY_ENUM = {
        "fragment_spreader", "spines_thorns", "do_not_burn",
        "do_not_mow", "irritant_sap", "allergenic_pollen", "toxic_handling",
    }
    RAW_ARTICLES = os.path.join(VAULT, "raw", "articles")
    STRAY_REMOVAL_KEYS = re.compile(
        r"^(removal_[a-zA-Z_]\w*|requires_followup_years)\s*:", re.MULTILINE
    )

    rviol = []  # list of (slug, message) pairs for per-page detail

    for s, p in pages.items():
        fm_text = get_fm_text(p["text"])

        # Check for stray top-level keys from the old flat JSON naming scheme
        for m in STRAY_REMOVAL_KEYS.finditer(fm_text):
            rviol.append((s, f"stray top-level key '{m.group(1)}'"))

        removal = parse_removal_block(fm_text)
        if removal is None:
            continue  # block absent — perfectly valid

        # 6a. Key set: must be exactly the six required keys
        present = set(removal.keys())
        for missing_key in sorted(REMOVAL_REQUIRED_KEYS - present):
            rviol.append((s, f"removal: missing key '{missing_key}'"))
        for extra_key in sorted(present - REMOVAL_REQUIRED_KEYS):
            rviol.append((s, f"removal: unknown key '{extra_key}'"))

        # 6b. method — non-null, on-enum
        method = removal.get("method")
        if not method:
            rviol.append((s, "removal.method: null or missing"))
        elif method not in REMOVAL_METHOD_ENUM:
            rviol.append((s, f"removal.method off-enum: '{method}'"))

        # 6c. timing_window — string or null (any value accepted)
        # No constraint beyond presence (already covered by 6a).

        # 6d. followup_years — integer or null (not float, not bare string)
        fy = removal.get("followup_years")
        if fy is not None and fy != "":
            # After YAML text parsing, fy is a string; valid if it parses as int
            try:
                parsed = int(fy)
                # Reject if the original text looked like a float
                if "." in str(fy):
                    rviol.append((s, f"removal.followup_years must be int, got: '{fy}'"))
            except (ValueError, TypeError):
                rviol.append((s, f"removal.followup_years must be int or null, got: '{fy}'"))

        # 6e. safety_flags — list; each item on-enum
        sflags = removal.get("safety_flags")
        if not isinstance(sflags, list):
            rviol.append((s, "removal.safety_flags must be a list"))
        else:
            for item in sflags:
                if item not in REMOVAL_SAFETY_ENUM:
                    rviol.append((s, f"removal.safety_flags off-enum: '{item}'"))

        # 6f. notes — non-empty list of strings
        notes = removal.get("notes")
        if not isinstance(notes, list):
            rviol.append((s, "removal.notes must be a list"))
        elif len(notes) == 0:
            rviol.append((s, "removal.notes must not be empty"))

        # 6g. sources — list; each item resolves to vault/raw/articles/<item>.md
        sources = removal.get("sources")
        if not isinstance(sources, list):
            rviol.append((s, "removal.sources must be a list"))
        else:
            for item in sources:
                candidate = os.path.join(RAW_ARTICLES, item + ".md")
                if not os.path.isfile(candidate):
                    rviol.append((s, f"removal.sources unresolvable: '{item}'"))

    print(f"\n## 6. REMOVAL BLOCK VIOLATIONS: {len(rviol)}")
    for slug, msg in sorted(rviol):
        print(f"  {slug}: {msg}")
        hard_defects += 1

    print(f"\n{'=' * 68}\nHARD DEFECTS: {hard_defects}")
    return 1 if hard_defects else 0


if __name__ == "__main__":
    sys.exit(main())
