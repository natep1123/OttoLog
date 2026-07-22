---
name: taxonomy-labeling
description: >-
  Choose OttoLog Primary Groups, tags, muscles, tools, and session/block/sequence
  labels without collapsing analytics slots. Use when adding taxonomy seeds,
  labeling exercises, editing Account taxonomy, or the user mentions Primary
  Group, tags, Label_Library, or Analytics_Labeling.
---

# Taxonomy labeling

## Read first

1. `docs/Analytics_Labeling.md` — vocabulary map + decision rule
2. `docs/Label_Library.md` — seed / example vocabulary
3. Schema contracts only if needed: `docs/Database_Outline.md` naming glossary

## Decision rule

> If Insights showed **one number** for this exercise this month, what noun should it sit under?

That noun is a **Primary Group** (select multiple for complexes). Everything else is tag, muscle, tool, session/block/sequence label, or display name.

## Placement checklist

- [ ] PG = chartable movement/activity noun(s), not session intent or nest structure
- [ ] Muscles = anatomy; tags = how/style/context facets
- [ ] Tools = equipment; empty → **No Tool** (exclusive)
- [ ] Session label = day kind; Block/Sequence labels = structure
- [ ] Target shape = input fields only (locked atoms)
- [ ] Names follow existing glossary — no synonym invention

## Code touchpoints

- Pickers / CRUD: `src/lib/taxonomy.ts`, Account `Taxonomy*` screens
- Exercise analytics UI: `AnalyticsCheckbox`, `TargetsGrid`, exercise editor
- Seeds / dumps (optional): `docs/default-user-taxonomy/Official_Default_Taxonomy.md`
