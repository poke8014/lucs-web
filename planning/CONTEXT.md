# Planning Workspace

Specs, architecture decisions, and roadmaps live here.

## Contents

| File | Purpose |
|------|---------|
| ROADMAP.md | 7-week MVP sprint plan for Scrapaholic (April 2026) |
| scrapaholic_backlog.md | Task-level backlog with milestones, acceptance criteria, and verify steps |

## Conventions

- Specs: `feature-name_spec.md`
- Decision records: `YYYY-MM-DD-decision-title.md`
- Backlog tasks use checkbox format with `**Verify:**` acceptance criteria
- Post-MVP items are grouped by feature under the "Post-MVP" section

## Backlog Workflow

How to add or refine tasks in the backlog:

### 1. Locate the Right Backlog

- Each product has its own backlog file (e.g. `scrapaholic_backlog.md`).
- Cross-reference `ROADMAP.md` to understand which milestone the work falls under.

### 2. Draft the Task

- Follow the existing format: `- [ ] **X.Y** Description`
- Every task must include a `**Verify:**` line with concrete acceptance criteria — what to run, what output to expect.
- Place the task in the correct milestone section and in sequential order relative to its dependencies.

### 3. Scope Check

- One task = one reviewable unit of work. If a task requires changes across multiple systems (DB + API + UI), split it.
- Check for dependencies on earlier unchecked items. If a prerequisite is missing, add it first.
- Post-MVP items go under the "Post-MVP" section, grouped by feature.

### 4. Spec Larger Features

- If a task is too complex to describe in a single backlog line, write a separate spec file (`feature-name_spec.md`) and link to it from the backlog item.
- Decision records (`YYYY-MM-DD-decision-title.md`) capture architectural choices and trade-offs that inform future tasks.
