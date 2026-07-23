---
name: insights-query-builder
description: >-
  Build the OttoLog Insights Query builder: madlib author compose + nest AST /
  locked outline readout (Query → Section → Breakdown → Subject → Measure). Use
  when working on src/components/querybuilder/, InsightsQueryBuilderScreen, the
  QB aggregate engine, or when the user mentions Query builder, QB nest, madlib,
  Measure/op, Breakdown, or Insights_Query_Builder.
---

# Insights Query builder

## Read first

1. `docs/Insights_Query_Builder.md` — **the contract** (v2). Author/read split §2,
   layer AST §3, DNA reuse §5, defaults §6, decisions §8 (esp. **12 palette**,
   **16 author/read**, **17 nest-shell parked**), slices §9.
2. `docs/Template_Builders.md` — workout nest DNA for the **read** surface
   (collapse / lock → grammar / preview / save-reopen).
3. `docs/references/workout-builder/` — workout nest gold — open every `.jpg`.
4. `docs/references/query-builder/` — QB after-gallery (locked outline, preview,
   unlocked Subject — protect read look).
5. `docs/Status.md` — what's shipped vs next (shipped-vs-next wins here; contract
   wins in doc 1).
6. `docs/Database_Outline.md` — fact grain; `docs/Styling.md` — nest `layer` /
   `override` accents (QB reuses by depth via `qbTokens`).

## Author vs read

| Surface | Model |
|---|---|
| **Author (unlocked)** | Madlib: Query frame (IN / WHERE) + Subject clause-blocks (FOR / WITH / SHOW / optional SPLIT) |
| **Read (locked)** | Nest LockedOutline + maximize → preview (workout chrome family) |
| **Definition / engine** | Nest AST + client aggregate over `v_log_set_facts` |

Section collapsed in author UI until multi-Section. Breakdown = SPLIT chip author /
purple rail read. Whole-ask lock for v1 madlib. Nest-shell-only authoring **parked**.

## Layer map (AST = workout = hidden SQL)

| Query builder | Workout | Hidden SQL | Accent source |
|---|---|---|---|
| **Query** | Session | `FROM logs` + date window | `layer.session` |
| **Section** | Block | `WHERE` scope (one table; exactly one in v1) | `layer.block` |
| **Breakdown** | Sequence | `GROUP BY` one dim (`variation`/`tool`); wraps Subjects, no nesting | `layer.cluster` |
| **Subject** | Exercise | `WHERE pg = …` + soft identity (variations/tools) | `layer.exercise` |
| **Measure** | Set | one aggregate column: op × field | set chip; extras under leaf → `override` |

**Ops (Measure leaf):** `sum · avg · max · min · count` × `reps · time · distance · load · sets`. "Most reps in one set" = `max × reps`.

## DNA shared vs different from the workout builder

- **Shared (read):** nest depth, rail/chevron/lock look/More/`+ Add` geometry,
  `LockedOutline` / `LockedPreviewModal`, **same nest accent family by depth**
  (`qbTokens` → `QB_TO_FORM`).
- **Different (author):** madlib / clause compose — not Session edit shells.
  `Qb*` names; Subject = PG; Breakdown = dim / SPLIT; Measure = op×field.
  Payload is analytics.

## Code touchpoints

- Screen: `src/screens/insights/InsightsQueryBuilderScreen.tsx`
- Chrome: `src/components/querybuilder/` — `QbLayer`, `QbCoordRow`, editors,
  `qbOutline.ts`, accents via `qbTokens.ts`
- Model: `querybuilder/types.ts`; Engine: `querybuilder/engine.ts`
- Read: `src/lib/insights.ts` `loadQueryFacts` — **not** the Dashboard's
  `loadInsightQuery`

## Slice order

1 → **1.5** → 2 → **2.5 madlib spike** → 3 → 4 → 5.

- **Slice 1 nest skeleton** = **shipped** (ephemeral).
- **Slice 1.5 chrome/feel parity** = **shipped** (ephemeral). Decision 12 warm
  accents.
- **Slice 2 lock grammar + preview** = **shipped** (ephemeral). Protect this read
  surface.
- **Next: 2.5** madlib authoring spike (ephemeral) → **3** totals → **4**
  `saved_queries` (**ask first**) → **5** multi-Section / more dims/ops / seeds.

Prefer `docs/references/query-builder/` + `workout-builder/` in kickoffs. Archive
under `docs/references/archive/` is optional history.

## Do not

- **No flat rebuild.** The v1 flat Subject-card QB is dead.
- **No nest-shell-only authoring as the main bet** — parked; madlib is next.
- **No separate cool-only look** — Decision 12 overturned; reuse workout nest
  accents by depth.
- **No "Table" / "Group" names** ("Group" collides with Primary Group).
- **No `saved_queries` / `008` / new fact columns** until Nate asks.
- **No nested Breakdowns**, no multi-Section, no ops/dims beyond the v1 set until
  their slice.
- Don't merge Dashboard and QB IAs; don't touch the Dashboard here.
