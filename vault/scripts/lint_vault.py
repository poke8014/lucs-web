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

    print(f"\n{'=' * 68}\nHARD DEFECTS: {hard_defects}")
    return 1 if hard_defects else 0


if __name__ == "__main__":
    sys.exit(main())
