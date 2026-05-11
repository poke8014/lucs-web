# Sunshower Vault

Knowledge base for Sunshower (native California pollinator garden app), structured as an LLM-maintained wiki ([Karpathy's LLM Wiki pattern](./llm-wiki.md)).

## How this works

- **You** drop raw sources (clipped articles, PDFs, images) into `raw/`.
- **Claude** reads them, writes/updates wiki pages, and maintains cross-references.
- **Obsidian** is the read interface — open this folder as a vault to browse, search, and follow links.

## Quick start

1. Open Obsidian → "Open folder as vault" → pick `vault/`.
2. Drop a source into `raw/articles/`, `raw/pdfs/`, or `raw/assets/`.
3. Ask Claude: *"Ingest `raw/articles/foo.md`."* Claude reads it, summarizes, files it, and updates the rest of the wiki.
4. Browse the result in Obsidian. Use the graph view to see what got linked.
5. Ask questions. Good answers get filed back under `synthesis/`.

## Files

- **[CLAUDE.md](./CLAUDE.md)** — the schema. Conventions, file naming, frontmatter, ingest/query/lint workflows. Read this if you want to understand or change how the wiki is maintained.
- **[index.md](./index.md)** — catalog of every page in the wiki. Updated on every ingest.
- **[log.md](./log.md)** — chronological record of ingests, queries, and lint passes.
- **[llm-wiki.md](./llm-wiki.md)** — Andrej Karpathy's pattern doc (reference, do not modify).

## Folders

- **`raw/`** — immutable source tier. Articles, PDFs, images. Claude reads but never modifies.
  - `raw/articles/` — clipped web articles (markdown)
  - `raw/pdfs/` — research papers, design guides
  - `raw/assets/` — downloaded images
- **Wiki folders** (created as sources arrive — see [CLAUDE.md](./CLAUDE.md)).
