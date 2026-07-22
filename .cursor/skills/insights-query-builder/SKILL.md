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

1. `docs/Insights_Query_Builder.md` — **the nest contract** (v2). Layer model §3, DNA reuse map §5, defaults §6, decisions §8, slices §9. Authoritative for nest shape.
2. `docs/Template_Builders.md` — the workout nest DNA the QB forks (collapse / lock → grammar / preview / save-reopen).
3. `docs/Status.md` — what's shipped vs next (shipped-vs-next wins here; nest shape wins in doc 1).
4. `docs/Database_Outline.md` — fact grain (`v_log_set_facts`); `docs/Styling.md` — the cool `queryLayer` palette.

## Layer map (product = workout = hidden SQL)

| Query builder | Workout | Hidden SQL |
|---|---|---|
| **Query** | Session | `FROM logs` + date window |
| **Section** | Block | `WHERE` scope (one table; exactly one in v1) |
| **Breakdown** | Sequence | `GROUP BY` one dim (`variation`/`tool`); wraps Subjects, no nesting |
| **Subject** | Exercise | `WHERE pg = …` + soft identity (variations/tools) |
| **Measure** | Set | one aggregate column: op × field |

**Ops (Measure leaf):** `sum · avg · max · min · count` × `reps · time · distance · load · sets`. "Most reps in one set" = `max × reps`.

## DNA shared vs different from the workout builder

- **Shared:** nest depth (5 layers), rail/chevron/lock geometry, collapse ↔ lock as orthogonal axes, `+ Add …` controls, `LockController` ancestor-forcing, `LockedOutline` / `LockedPreviewModal` share.
- **Different:** own namespace `src/components/querybuilder/` with `Qb*` names (no `cluster=sequence` aliases); own **cool `queryLayer`** ramp + `measureChip` in `tokens.ts`; Subject uses a PG picker in the name slot; Breakdown uses a dimension picker; Measure is a chip, not a rail.

## Code touchpoints

- Screen: `src/screens/insights/InsightsQueryBuilderScreen.tsx`
- Chrome: `src/components/querybuilder/` — `QbLayer`, `QbCoordRow`, `QbAddChildButton`, editors `Qb{Query,Section,Breakdown,Subject}Card` + `QbMeasureRow`
- Model: `querybuilder/types.ts` (`QueryDraft`, `defaultQueryDraft`); Engine: `querybuilder/engine.ts` (`applyMeasure`, `evaluateSection`, `measureToken`)
- Read: `src/lib/insights.ts` `loadQueryFacts` (raw scoped facts) — **not** the Dashboard's `loadInsightQuery`

## Slice order (capability first; ask before each new capability's migration)

Slice 1 nest skeleton = **shipped** (ephemeral). Next: **2** lock + preview (`LockController` full tree → grammar; `LockedOutline`/`LockedPreviewModal`) → **3** Breakdown totals polish → **4** save/reopen (`saved_queries` — **ask first**) → **5** multi-Section + more dims/ops + seeds.

## Do not

- **No flat rebuild.** The v1 flat Subject-card + one "Group" QB is dead ("Dashboard in builder skin"). Build the nest.
- **No workout palette.** Never reuse the warm Session/Block/Sequence/Exercise rails — use `queryLayer`.
- **No "Table" / "Group" names** ("Group" collides with Primary Group).
- **No `saved_queries` / `008` / new fact columns** until Nate asks — aggregate client-side over `v_log_set_facts`.
- **No nested Breakdowns**, no multi-Section, no ops/dims beyond the v1 set until their slice.
- Don't merge Dashboard and QB IAs; don't touch the Dashboard here.
