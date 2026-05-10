# Raw Sources

The immutable source tier. Drop curated source material here for Claude to ingest. Claude reads from this folder but never modifies its contents.

## Subfolders

| Folder | Contents |
|---|---|
| `articles/` | Clipped web articles as markdown (Obsidian Web Clipper output, manual saves). One file per article. |
| `pdfs/` | Research papers, agency design guides (USDA NRCS, FWS), data exports. Reference them from notes in `articles/` or directly during ingest. |
| `assets/` | Downloaded images. Obsidian's "Download attachments for current file" hotkey saves images here when you set Settings → Files and Links → Attachment folder path to `raw/assets`. |

## Filename conventions

- Articles: `<source>-<topic-kebab>.md` — e.g., `calscape-california-poppy.md`, `fws-pollinator-garden-guide.md`
- PDFs: keep original filename when reasonable, otherwise `<agency>-<topic>.pdf`
- Images: keep meaningful names — Claude references them by filename

## What goes where

- A web article you clipped → `articles/`
- A PDF you downloaded → `pdfs/`
- An image embedded in an article → `assets/`
- Your own raw notes → `articles/notes-<date>-<topic>.md` (or skip raw/ entirely and just talk to Claude — your verbal notes can be filed straight to a wiki page)

After dropping a file here, tell Claude: *"Ingest raw/articles/foo.md"* (or just *"ingest the new source"*). Claude follows the ingest workflow in [../CLAUDE.md](../CLAUDE.md).
