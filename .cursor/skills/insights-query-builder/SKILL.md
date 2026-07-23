---
name: insights-query-builder
description: >-
  Build the OttoLog Insights Query builder: nest AST + locked outline readout,
  author nest chrome (WHERE → FOR → Insight / SPLIT). Use when working on
  src/components/querybuilder/, InsightsQueryBuilderScreen, the QB aggregate
  engine, or when the user mentions Query builder, QB nest, Insight card,
  madlib, Measure/op, Breakdown, SPLIT, or Insights_Query_Builder.
---

# Insights Query builder

## Read first

1. `docs/Insights_Query_Builder.md` — **the contract** (v2). §2 author/read, §3
   AST, §11–§12 author nest chrome + follow-ons, §8 decisions, §9 slices, §10.
2. `docs/Status.md` — shipped vs next (**Status wins** for ops; contract wins for
   product rules). Feel may be **unsigned-off** even when code is in tree.
3. `docs/Template_Builders.md` — workout nest DNA (read + override dusk chrome).
4. `docs/references/workout-builder/` — open every `.jpg` (esp. `08`/`09` for
   Insight dusk DNA).
5. `docs/references/query-builder/` — open every `.jpg` (esp. `01` lock, `08`
   WHERE→FOR→Insight author).
6. `docs/Database_Outline.md` — fact grain; `docs/Styling.md` — `layer` /
   `override` via `qbTokens`.

## Author vs read (current)

| Surface | Model |
|---|---|
| **Author (unlocked)** | Nest-shaped madlib fields: **Query** (IN) → **WHERE** (Block-like) → **FOR** (gold PG) → dusk **Insight** cards (WITH + SHOW). Optional violet **SPLIT** wrapper (mode C + one-shot seed). |
| **Read (locked)** | Nest `LockedOutline` + maximize → preview (workout chrome family). Protect slice 2. |
| **Definition / engine** | Nest AST + client aggregate over `v_log_set_facts` |

**Not** five Session-edit shells (parked). **Not** the old flat Subject
clause-only author (`QbMadlibSubjectClause` deleted). **Not** signed-off feel —
Nate is rethinking author UX; prefer Plan / discussion before large chrome
rewrites.

## Layer map (AST = workout = hidden SQL)

| Query builder | Workout | Hidden SQL | Accent |
|---|---|---|---|
| **Query** | Session | `FROM logs` + date window | `layer.session` |
| **Section / WHERE** | Block | `WHERE` scope (+ optional section `dateWindow`) | `layer.block` |
| **Breakdown / SPLIT** | Sequence | `GROUP BY` variation/tool | `layer.cluster` |
| **Subject / FOR** | Exercise | `WHERE pg = …` | `layer.exercise` |
| **Insight** (`asks[]`) | Set-depth cousin (dusk) | identity filter + measures | `override` dusk chrome — **never** call it “override” in UI |
| **Measure** | Set leaf | `op × field` | set chip |

**Ops:** `sum · avg · max · min · count` × `reps · time · distance · load · sets`.

**Identity:** per-Insight `variationMatch` / `toolMatch` (`any`|`all`). SPLIT with
non-empty WITH → sibling co-tags (exclude WITH ids); empty WITH → peer SPLIT.

## Code touchpoints

- Screen: `InsightsQueryBuilderScreen.tsx`
- Author cards: `QbWhereCard`, `QbForCard`, `QbInsightCard`, `QbSplitWrapperCard`,
  `QbQueryCard`, `QbMeasureRow`, `QbAddChildButton`
- Model/engine: `types.ts` (`SubjectNode.asks` / `InsightNode`), `engine.ts`,
  `qbOutline.ts`, `qbTokens.ts`, `qbLockIds.ts`
- Facts: `insights.ts` `loadQueryFacts` — **not** Dashboard `loadInsightQuery`

## Slice order (ops)

1 → 1.5 → 2 → 2.5 madlib → polish → WITH/SPLIT B+C → **§11 nest chrome** →
**§12 A/B** → *(feel rethink — Nate)* → SHOW dropdown polish → **3** totals →
**4** `saved_queries` (**ask first**) → **5**.

Protect **read** chrome. Do not pile author chrome slices until Nate clarifies
what’s wrong with current WHERE/FOR/Insight feel.

## Lingo

SQL-ish nouns (WITH, SPLIT, FOR, Insight, asks[]) stay for agent clarity
(form→SQL). Coach-facing copy pass later. UI: never “pink”; never “override”
for Insight cards (workout-only word).

## Do not

- Rebuild v1 flat Subject-card QB.
- Un-park nest-shell-only authoring as the main bet.
- Invent cool-only palette (Decision 12: warm `layer` by depth).
- Name layers “Table” / “Group”.
- Add `saved_queries` / `008` / new fact columns until Nate asks.
- Nested Breakdowns / multi-Section until their slice (multi-WHERE compare → 5).
- Merge Dashboard and QB IAs.
- Ship Chat 6 seeds from QB chats.
