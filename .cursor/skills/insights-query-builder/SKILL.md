---
name: insights-query-builder
description: >-
  Build the OttoLog Insights Query builder as a nested form (Query → Section →
  Breakdown → Subject → Measure) that mirrors the log/template builders. Use when
  working on src/components/querybuilder/, InsightsQueryBuilderScreen, the QB
  aggregate engine, or when the user mentions Query builder, QB nest, Measure/op,
  Breakdown, or Insights_Query_Builder.
---

# Insights Query builder

## Read first

1. `docs/Insights_Query_Builder.md` — **the nest contract** (v2). Layer model §3, DNA reuse map §5, defaults §6, decisions §8 (esp. **Decision 12 palette/feel**), slices §9.
2. `docs/Template_Builders.md` — the workout nest DNA the QB forks (collapse / lock → grammar / preview / save-reopen).
3. `docs/references/workout-builder/` — **gold structure/feel shots** — open every `.jpg` with the Read tool (not only the README).
4. `docs/Status.md` — what's shipped vs next (shipped-vs-next wins here; nest shape wins in doc 1).
5. `docs/Database_Outline.md` — fact grain; `docs/Styling.md` — nest `layer` / `override` accents (QB reuses by depth).

## Layer map (product = workout = hidden SQL)

| Query builder | Workout | Hidden SQL | Accent source |
|---|---|---|---|
| **Query** | Session | `FROM logs` + date window | `layer.session` |
| **Section** | Block | `WHERE` scope (one table; exactly one in v1) | `layer.block` |
| **Breakdown** | Sequence | `GROUP BY` one dim (`variation`/`tool`); wraps Subjects, no nesting | `layer.cluster` |
| **Subject** | Exercise | `WHERE pg = …` + soft identity (variations/tools) | `layer.exercise` |
| **Measure** | Set | one aggregate column: op × field | set chip; extras under leaf → `override` |

**Ops (Measure leaf):** `sum · avg · max · min · count` × `reps · time · distance · load · sets`. "Most reps in one set" = `max × reps`.

## DNA shared vs different from the workout builder

- **Shared:** nest depth, rail/chevron/lock/More/`+ Add` geometry, collapse ↔ lock orthogonal, `LockController`, `LockedOutline` / `LockedPreviewModal`, **same nest accent family by depth**.
- **Different:** `src/components/querybuilder/` `Qb*` names (no `cluster=sequence` aliases); Subject = PG picker in name slot; Breakdown = dimension picker; Measure = op×field chip (not set prescription rows). Payload is analytics.

## Code touchpoints

- Screen: `src/screens/insights/InsightsQueryBuilderScreen.tsx`
- Chrome: `src/components/querybuilder/` — `QbLayer`, `QbCoordRow`, `QbAddChildButton`, editors `Qb{Query,Section,Breakdown,Subject}Card` + `QbMeasureRow`
- Model: `querybuilder/types.ts`; Engine: `querybuilder/engine.ts`
- Read: `src/lib/insights.ts` `loadQueryFacts` — **not** the Dashboard's `loadInsightQuery`

## Slice order

Slice 1 nest skeleton = **shipped** (ephemeral; provisional cool `queryLayer`). **Next: 1.5** chrome/feel parity (map to `layer`/`override`, CoordRow DNA) → **2** lock + preview → **3** totals → **4** `saved_queries` (**ask first**) → **5** multi-Section / more dims/ops / seeds.

## Do not

- **No flat rebuild.** The v1 flat Subject-card QB is dead.
- **No separate cool-only look** — Decision 12 overturned; reuse workout nest accents by depth.
- **No "Table" / "Group" names** ("Group" collides with Primary Group).
- **No `saved_queries` / `008` / new fact columns** until Nate asks.
- **No nested Breakdowns**, no multi-Section, no ops/dims beyond the v1 set until their slice.
- Don't merge Dashboard and QB IAs; don't touch the Dashboard here.
