# Docs Workspace

Project documentation lives here.

## Planned

- User-facing docs for Scrapaholic
- API documentation
- Architecture diagrams

## Documentation Workflow

After a significant push (new milestone, new API route, schema change, new site section), update documentation before moving on to the next task:

### What to Update

1. **`src/CONTEXT.md`** — If the source tree changed (new files, moved files, removed files), update the layout tree to match.
2. **`CLAUDE.md`** — If a new workspace, site, or top-level folder was added, update the folder structure and relevant sections.
3. **`planning/CONTEXT.md`** — If a new backlog or spec file was added, update the contents table.
4. **`docs/`** — If a user-facing feature shipped or an API endpoint changed, add or update the relevant doc here.

### When to Skip

- Minor bug fixes or styling tweaks that don't change the project structure.
- Work that only touches existing files without adding, removing, or renaming anything.
