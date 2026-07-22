---
name: taxonomy-labeling
description: >-
  Choose OttoLog Primary Groups, variations, muscles, tools, and
  session/block/sequence labels without collapsing analytics slots. Use when
  adding taxonomy seeds, labeling exercises, editing Account taxonomy, or the
  user mentions Primary Group, Variations, tags, Label_Library, New_User_Seeds,
  or Analytics_Labeling.
---

# Taxonomy labeling

## Read first

1. `docs/Analytics_Labeling.md` — vocabulary map + decision rule
2. `docs/Label_Library.md` — short seed / example vocabulary
3. `docs/New_User_Seeds.md` — full new-account catalog (when seeding or picking defaults)
4. Schema contracts only if needed: `docs/Database_Outline.md` naming glossary
5. `docs/Status.md` — **identity** (PG + Variations + muscles) is still an open question; do **not** treat Chat 6 seed dumps as approved until that lands. Prefer the three docs above over inventing vocabulary.

## Decision rule

> If Insights showed **one number** for this exercise this month, what noun should it sit under?

That noun is a **Primary Group** (select multiple for complexes). Everything else is variation, muscle, tool, session/block/sequence label, or display name.

## Placement checklist

- [ ] PG = chartable movement/activity noun(s), not session intent or nest structure
- [ ] Muscles = anatomy; variations = how/style/context modifiers
- [ ] Tools = equipment; empty → **No Tool** (exclusive)
- [ ] Session label = day kind; Block/Sequence labels = structure (`Main`, not `Workout`)
- [ ] Target shape = input fields only (locked atoms)
- [ ] Names follow existing glossary — no synonym invention (`Competition Fights` plural)

## Code touchpoints

- Pickers / CRUD: `src/lib/taxonomy.ts`, Account `Taxonomy*` screens
- Exercise analytics UI: `AnalyticsCheckbox`, `TargetsGrid`, exercise editor
- Seeds / dumps (optional): `docs/New_User_Seeds.md`
