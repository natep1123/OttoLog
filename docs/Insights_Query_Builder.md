# Insights Query Builder — nesting design (v2)

> **Status:** Design contract — **layer model v2 signed off (Jul 22).** This
> **replaces** the v1 flat-subject model (flat Subject cards + one optional Group).
> v1 is dead: it read as "Dashboard in builder skin" because the old §8 mandated
> flat subjects and argued *against* the 4-level tree. We are overturning that.
>
> **New direction:** the Query builder mirrors the **log / template builders** —
> same nest depth, same chrome, same collapse / lock → grammar / preview /
> save-reopen DNA — with a real **SQL meaning at every layer, hidden** behind
> friendly nodes. **Slice 1 nest + 1.5 chrome/feel parity shipped**
> (ephemeral; lock toggle without grammar/preview). No `saved_queries`
> migration from this doc alone — ask at the save slice. Nate owns the go
> and the commit gate.
>
> **Read alongside:** [`Analytics_Overhaul_Proposal.md`](./Analytics_Overhaul_Proposal.md)
> (product direction: hub = Dashboard + Query builder), [`Template_Builders.md`](./Template_Builders.md)
> (the builder chrome this now clones), [`Database_Outline.md`](./Database_Outline.md)
> (fact grain), [`Styling.md`](./Styling.md) (form chrome — QB reuses the same
> nest `layer` / `override` accents by depth), [`Status.md`](./Status.md) (Next #1),
> and **UI gold shots** under [`references/`](./references/)
> (`workout-builder/` + `query-builder/` — open the `.jpg` files).
>
> **Ground truth today:** `src/lib/insights.ts` — `loadInsightQuery` +
> `v_log_set_facts` (Dashboard read) **and** `loadQueryFacts` (raw scoped facts for
> the QB); `src/screens/insights/InsightsDashboardScreen.tsx` (the *fast unsaved*
> look — **not** the Query builder target IA); `src/screens/insights/InsightsQueryBuilderScreen.tsx`
> (**slice 1 + 1.5 — shipped, ephemeral**); `src/components/querybuilder/`
> — the live `Qb*` nest chrome (`QbLayer`, `QbCoordRow`, `QbAddChildButton`,
> `Qb{Query,Section,Breakdown,Subject}Card`, `QbMeasureRow`), `types.ts` draft
> model, `engine.ts` client-side aggregate, `qbTokens.ts` (`QB_TO_FORM`).
> **Palette (Decision 12 overturned):** reuse workout `layer` / `override` /
> set-chip by depth (Query=Session … Measure=Set) — provisional cool
> `queryLayer` removed. Forked from `src/components/forms/` (`NestedLayer`,
> `CoordRow`, `LockController`, `ExpansionController`, `LockedOutline`,
> `LockedPreviewModal`, `Disclosure`, `MorePanel`, `SearchableSelect`) —
> DNA for structure/feel parity; grammar outline + preview = slice 2.
> Gold: [`references/workout-builder/`](./references/workout-builder/) +
> [`references/query-builder/`](./references/query-builder/); open-state history:
> [`references/archive/query-open-history/`](./references/archive/query-open-history/).

---

## 1. Status / non-goals

**In scope (this doc):** how the Query builder nests — the layers, what each one
*means in SQL* (hidden), what collapses, what locks to grammar, what is scoped
where, and how it forks the template/log builder chrome.

**Non-goals / guardrails:**

- **Dashboard is out of scope.** `InsightsDashboardScreen` stays the fast, unsaved
  PG facet look. The Query builder is the *second* tool in the hub — a full nested
  builder, not a Dashboard variant. **Do not borrow the Dashboard readout layout.**
- **No new fact schema.** Reuse `v_log_set_facts` and the `insights.ts`
  aggregation. One `log_sets` row = one fact. Grouping + aggregate ops are computed
  **client-side** over the existing view for capability-first. **No migration**
  (no `saved_queries`, no `008`) until Nate asks at the save slice.
- **No derived facets by default.** Tonnage / e1RM stay advanced, off the critical
  path (same rule as Dashboard).
- Coach-plain voice. SQL is *taught by structure*, never shown by default; a
  "Show as SQL" reveal is a later optional stretch (§7), not v1.

---

## 2. Core principle — a query IS a nest (hide the SQL)

A SELECT statement nests almost 1:1 with the workout builder. That is the unlock:
we don't back off SQL, we **hide** it. Building a Query feels exactly like building
a Session; underneath, each layer is a SQL clause.

| Workout builder | Query builder | SQL it (secretly) is |
|---|---|---|
| **Session** (the day) | **Query** (the report) | `FROM your logs` + date window |
| **Block** (a section) | **Section** (a result table) | `SELECT … WHERE` scope |
| **Sequence** (loops rounds) | **Breakdown** (“For each…”) | `GROUP BY` — the loop |
| **Exercise** (a movement) | **Subject** (a Primary Group) | `WHERE primary_group = …` + identity |
| **Set** (reps × load) | **Measure** (op × field) | `SELECT MAX(reps)` — one column |

Same depth (5 layers). Same chrome (rails, collapse chevron, lock → grammar, meta
chips, `+ Add …` controls). The depth is **earned** — every layer carries genuine
SQL meaning, so nothing is ceremony.

**Naming is deliberately disjoint from the workout family** so a query **Section**
never collides with a workout **Block**, and **Breakdown** never collides with
**Primary Group** ("Group" is banned for this reason). Code lives in its own
namespace (`src/components/querybuilder/`, `Qb*`) with **no** legacy aliases like
`cluster = sequence`.

---

## 3. Layer model (top-down: Query → Section → Breakdown → Subject → Measure)

```
Query        the report      FROM logs · date window · name/notes · lock/preview
  Section    a result table  WHERE scope (nest labels · set policy)      [exactly ONE in v1]
    Breakdown  "For each …"   GROUP BY one dimension · wraps subjects     [optional · no nesting]
      Subject  a Primary Group  WHERE pg = · identity any-of (variations/tools)
        Measure  op × field     SELECT sum|avg|max|min|count (reps|time|distance|load|sets)
```

Read it as a workout would read: a **Query** is the day, a **Section** is a block
of it, a **Breakdown** loops like a sequence, a **Subject** is the movement, a
**Measure** is one set-target. Subjects can sit directly in the Section (ungrouped)
or inside a Breakdown (grouped) — exactly like exercises sit directly in a block or
inside a sequence.

### Query (root · = Session)

The whole report. Opening it feels like opening a Session card.

- **Holds:** the data source (your complete session logs), the **date window**
  (rolling preset `last 7 / 28 / this week`, or pinned `from`/`to`), and
  **name + notes** (via `MorePanel` DNA). One Section beneath it.
- **SQL:** `FROM training_log WHERE session_date IN window` (+ complete-only).
- **Collapses to:** name + window + Section summary grammar line.
- **Locks to:** the paginated grammar outline root (`LockedPreviewModal` family)
  for screenshot/share.

### Section (= Block) — **exactly one in v1**

One result **table**. Auto-created inside every new Query; the user does not add or
remove it in v1. Multi-Section (a mini-report with several tables) is **later**.

- **Holds:** the **scope WHERE** for this table — nest labels (session / block /
  sequence any-of) and **set policy** (set types + Working/warmups). Its children:
  an ordered list of Subjects and/or Breakdowns.
- **SQL:** one `SELECT … WHERE <scope> GROUP BY <breakdowns>` statement.
- **v1 note:** because there is exactly one Section, its scope reads as the
  query-global WHERE. When multi-Section lands, each table gets its own scope.
- **Collapses to:** scope grammar + child summary.
- **Locks to:** the outline header line (window + scope).

### Breakdown (“For each …” · = Sequence) — optional, **no nesting**

The looping mechanism. A Breakdown is `GROUP BY`: it wraps 1+ Subjects and fans
each one out into per-group rows plus a **totals line**. This is the workout
builder's sequence → rounds → performed-sets denest, made structural.

- **Holds:** one **dimension** to group by, and the Subjects grouped under it.
- **v1 dimensions:** **`variation` · `tool`** (reuse the existing per-PG data;
  credit-each safe). `date bucket` (day/week/month) and `nest label` are the first
  **later** additions (see Open decisions). **PG is never a Breakdown dimension** —
  Subjects already *are* the PG axis.
- **Depth cap:** **no Breakdown inside a Breakdown** in v1 — sequences don't nest
  sequences, so we don't invent deeper nesting than the workout builder. (Multi-key
  `GROUP BY a, b` is deferred with multi-Section.)
- **SQL:** `GROUP BY <dimension>` with a rollup/totals row.
- **Collapses to:** `For each <dimension>` + a member chip row.
- **Locks to:** grammar; locked+expanded renders the grouped sub-rows + totals as a
  `LockedOutline`-style block.

### Subject (= Exercise) — one Primary Group

The chart noun. The PG sits in the **name slot** (where the exercise-name typeahead
lives); identity pickers sit where the exercise's do.

- **Holds:** **one PG** (never multi-PG-in-one-card — complexes credit-each under
  the hood), **identity any-of** (variations, tools — soft `suggestedIds`, **never
  enforced**, no `008`), and its **Measures**.
- **SQL:** `WHERE primary_group = :pg [AND variation IN … AND tool IN …]`.
- **Collapses to:** `Pullups · max 24 reps · avg 20 lb` (PG + its measure tokens).
- **Locks to:** grammar; unlocked = editable body (PG swap, identity pickers, its
  Measures). Inside a Breakdown, its Measures render per-group sub-rows + totals.

### Measure (leaf · = Set) — operation × field

The smallest unit and the home of **operations**. A Measure is one aggregate
column: an **op** applied to a **field**.

- **Ops (v1):** **`sum · avg · max · min · count`.** `latest` / `count of distinct`
  are later. No other ops in v1.
- **Fields (shape-driven, atomic):** `reps · time · distance · load · sets` — the
  existing `InsightFacetId` set in `insights.ts`. A field appears only when the
  Subject's exercises *logged* it in-window (NULL discipline — empty-state copy,
  never a fake zero).
- **Smart default op** when a Measure is added: `load → avg`; `reps/time/distance →
  sum`; `sets → count` (matches Dashboard / `buildPanel`). User can change the op.
- **`count`** is `COUNT(*)` = number of matching sets (field selector moot; show as
  `count · sets`). `count of distinct sessions` is the *later* count-distinct op.
- **Never mix units in one Measure** — a Measure is exactly one field, so reps + time
  can never collapse into one number. This is structural, not a lint.
- **Your example:** "most reps in one set" = **`max` × `reps`**.
- **Collapses / locks to:** a value token (`max 24 reps`, `avg 20 lb`). It *is*
  grammar already — the cleanest carryover from the set-row → prescription-chip.

---

## 4. What collapses / locks / scopes — quick matrix

| Layer | Collapses to | Locks to | Editable when unlocked | Scope it owns |
|---|---|---|---|---|
| **Query** | name + window + section grammar | outline root (paginated) | window, name, notes | date window (global) |
| **Section** | scope grammar + child summary | outline header line | nest labels, set policy | `WHERE` scope (one table) |
| **Breakdown** | `For each <dim>` + member chips | grammar (+ grouped sub-rows/totals if expanded) | dimension, members | `GROUP BY` dimension |
| **Subject** | PG + measure tokens | grammar (+ per-group breakdown if inside one) | PG, identity pickers, measures | `WHERE pg =` + identity |
| **Measure** | a value token | same token | op + field | the aggregate column |

Lock granularity = **full tree** (Query / Section / Breakdown / Subject / Measure),
reusing `LockController` ancestor-forcing + unlock-own-locks-children, with a new
`query` root id. Collapse and lock stay orthogonal axes, same as the workout family.

---

## 5. Builder DNA reuse map + definition shape

Fork the chrome, don't reinvent it. New code under `src/components/querybuilder/`
with `Qb*` names. **Structure and feel ≈ workout nest** (rails, chevron, lock,
More, pills, `+ Add → parent`, locked outline / preview). **Content inside nodes
differs** (PG / dims / ops × fields — not sets / tools / shapes). Not a pixel-1:1
clone of Session copy — same chrome family, analytics payload.

| Builder chrome (`src/components/forms/`) | Query builder (`src/components/querybuilder/`) | Notes / departure |
|---|---|---|
| `NestedLayer` + `CoordRow` | `QbLayer` + `QbCoordRow` geometry | Same shell (rail, chevron, lock toggle, `metaChips`, trailing IconButtons, title/label). Subject = **PG picker** in the name slot; Breakdown = **dimension picker**. **Palette by depth = workout `layer`** (Query→session, Section→block, Breakdown→cluster, Subject→exercise); Measure / extras under leaf use set-chip / `override` dusk as appropriate. |
| `LockController` / `useNodeLock` / `LOCK_ROOT` | whole-Query + per-layer lock | Ephemeral UI state, ancestor-forcing, unlock-own-locks-children — carry over unchanged. Add a `query` root id. |
| `ExpansionController` + `EditorTools` tray | “Collapse all” / “Unlock & Expand All” | Same tray above the form. |
| `LockedOutline` | Breakdown sub-rows + totals; Subject/Measure grammar when locked+expanded | New outline builder (`outlineQuery` / `outlineSection` / `outlineSubject`) emitting measure/breakdown lines instead of set prescriptions. Same thin-left-spine geometry + notes rendering. |
| `LockedPreviewModal` + `lockedPreviewPages` | screenshot/share of the locked Query | Same paginated, swipeable modal. The share payoff Insights should match. |
| `Disclosure` | Section scope + set policy | Same as the Dashboard's Scope disclosure today. |
| `MorePanel` | Query name + notes | Name/Brief lane + notes; keeps the header clean. |
| `SearchableSelect` (`suggestedIds`) | PG picker, per-Subject variations/tools, Breakdown dimension | Soft suggestions reused as-is. |
| `insights.ts` `loadInsightQuery` + `v_log_set_facts` | `insights.ts` `loadQueryFacts` + `querybuilder/engine.ts` | **Shipped:** `loadQueryFacts` returns raw scoped facts (reusing `passesScope`-style scope + `passesPgIdentity` + credit-each); `engine.ts` (`applyMeasure`/`evaluateSection`) does client-side `GROUP BY` + the five ops. No new fact columns. |

**Definition shape (the saved Query — client-side model, no table yet):**

```
SavedQueryDefinition
  window:  { mode:'rolling', preset } | { mode:'pinned', fromDate, toDate }
  name, notes
  section: {                                  // exactly ONE in v1 (auto-created)
    scope:     { sessionCategoryIds, blockLabelIds, sequenceLabelIds }
    setPolicy: { setTypes, includeWarmups }
    children:  Array< SubjectNode | BreakdownNode >     // ordered
  }
  SubjectNode   { pgId, variationIds[], toolIds[], measures: MeasureNode[] }
  BreakdownNode { dimension: 'variation' | 'tool', subjects: SubjectNode[] }   // no nested breakdowns
  MeasureNode   { op: 'sum'|'avg'|'max'|'min'|'count', field: 'reps'|'time'|'distance'|'load'|'sets' }
```

`variationIds` / `toolIds` per Subject = today's `variationIdsByPg` /
`toolIdsByPg`, hoisted onto the node. Nothing here needs new fact columns. When the
save slice comes, this JSON becomes the `saved_queries` definition — **ask before
that migration.**

---

## 6. Defaults — a new Query is never five empty shells

Opening a fresh Query pre-seeds the common path so simple asks are one or two taps:

```
Query  (rolling · last 7 days, unnamed)
  Section  (no scope — all complete sessions)
    Subject  (empty PG — pick one)
      Measure (empty — pick op × field, smart default once field known)
```

No Breakdown by default (it's optional, like a sequence). The user picks a PG in the
Subject, picks a field for the Measure (op smart-defaults), and already has a
result. Adding a Breakdown, more Subjects, or more Measures scales up from there via
`+ Add Breakdown` / `+ Add Subject` / `+ Add Measure` — mirroring the workout
add-buttons.

---

## 7. Worked examples

### A — Murph weighted work (three subjects, no breakdown)

Authored (unlocked):

```
Query  "Murph — weighted work"    rolling · last 7 days
  Section   scope: Block = Challenge · Working only
    Subject  Pullups   measures: sum reps · avg load
    Subject  Pushups   measures: sum reps
    Subject  Squats    measures: sum reps · avg load
```

Locked grammar (reads like an English SELECT):

```
Murph — weighted work
Challenge · last 7 days · Working
  Pullups   450 reps · avg 20 lb (12 sets)
  Pushups   900 reps
  Squats    600 reps · avg 45 lb
```

No total across Pullups/Pushups/Squats — unlike measures, credit-each.

### B — A Breakdown (the loop) — Pullups by variation, with a max

Authored:

```
Query  "Pullup PRs"    rolling · last 28 days
  Section   (all sessions)
    Breakdown  "For each variation"
      Subject  Pullups   measures: max reps · avg load
```

Locked grammar (per-group sub-rows + totals):

```
Pullup PRs
last 28 days
  For each variation — Pullups
    ├ Weighted    max 12 reps · avg 35 lb
    ├ Strict      max 18 reps
    └ total       max 18 reps
```

`max × reps` is the "most reps in one set" ask. The Breakdown is the sequence-
expansion analog: one authored Subject, many computed rows + a totals line.

Secret SQL (never shown by default; the "Show as SQL" later stretch):
`SELECT variation, MAX(reps), AVG(load) FROM facts WHERE pg='Pullups' AND date>=… GROUP BY variation`.

---

## 8. Decisions (v2 — signed off Jul 22)

Supersedes the v1 §8 table. Build to these.

| # | Decision | Ruling (v1 of the new model) |
|---|---|---|
| 1 | Layers | **Query → Section → Breakdown → Subject → Measure.** Mirror the workout nest depth. |
| 2 | Sections | **Exactly one Section**, auto-created under Query. Multi-Section later. |
| 3 | Breakdown | **Wraps Subjects. No nested Breakdowns** (don't out-nest the workout builder). |
| 4 | Breakdown dims | **`variation` + `tool`** for v1. `date bucket` / `nest label` later. **PG is never a dim.** |
| 5 | Ops (Measure) | **`sum · avg · max · min · count`** only. `latest` / `count-distinct` later. |
| 6 | Fields | `reps · time · distance · load · sets` (existing `InsightFacetId`). NULL discipline. |
| 7 | One PG per Subject | **Confirmed.** Complexes credit-each under the hood; never multi-PG-in-one-card. |
| 8 | Identity scope | Per-Subject variations/tools, **soft/never enforced** (no `008`). |
| 9 | Set policy + nest scope | **Section-level (WHERE).** With one Section this reads query-global. |
| 10 | Lock granularity | **Full tree** (Query / Section / Breakdown / Subject / Measure) via `LockController`. |
| 11 | Naming / code | Product: Query/Section/Breakdown/Subject/Measure. Code: `src/components/querybuilder/`, `Qb*`, **no** legacy aliases. Saved artifact = **Query**. |
| 12 | Palette / feel | **Overturned Jul 22 evening; landed in slice 1.5.** Reuse workout nest accents by depth (`layer` + `override` + set chip via `qbTokens`) so structure/feel match Session→…→Set. Keep `Qb*` nouns. Content inside nodes stays analytics — not a Session clone. Gold shots: `docs/references/workout-builder/`. |
| 13 | Defaults | New Query opens **Query → Section → empty Subject → empty Measure** (no Breakdown). |
| 14 | Engine | **Client-side group/aggregate** over `v_log_set_facts`. **No migration** until Nate asks. |
| 15 | SQL teaching | English-SELECT grammar is enough. **"Show as SQL" is a later optional stretch.** |

---

## 9. Phased build slices (capability first)

Each slice is small and leaves the Dashboard untouched. No commit without Nate. The
v1 flat shell has been **scrapped** and replaced by the nest skeleton below.

- **Slice 0 — this doc (v2 layer model).** Contract + definition shape. No code. **Done.**
- **Slice 1 — nest skeleton (no persistence). ✅ Shipped in tree (ephemeral).**
  Real nest + engine; shipped with provisional cool `queryLayer` (removed in 1.5).
- **Slice 1.5 — chrome / feel parity. ✅ Shipped in tree (ephemeral).** Warm `layer`
  accents by depth via `qbTokens.ts` (`QB_TO_FORM`); CoordRow lock toggle + Query
  More. Open history: `docs/references/archive/query-open-history/`.
- **Slice 2 — lock + preview. ✅ Shipped in tree (ephemeral).** `qbOutline.ts` →
  `LockedOutline` when locked+expanded; maximize → `LockedPreviewModal`; Tools
  **Unlock & Expand All**. Gold: `docs/references/query-builder/`. Still no
  `saved_queries` / `008`.
- **Slice 3 — Breakdown depth + totals polish.** Firm up the grouped sub-rows +
  totals rendering in-card and in the locked outline (credit-each safe).
- **Slice 4 — save / reopen.** `saved_queries` (**ask first**), name + notes via
  `MorePanel`, Library-like list/picker, rolling-vs-pinned window persisted, reopen
  → OPEN + locked, re-run live (or historic if pinned).
- **Slice 5 — multi-Section + more dims/ops + seeds.** Multiple Sections (mini-
  report), `date bucket` / `nest label` breakdown dims, `latest` / `count-distinct`
  ops, 1–2 seeded default Queries for new accounts (with Chat 6).

Polish (madlib phrasing, chip grammar, "Show as SQL") rides on top once the nested
form + save/lock hold.

---

## 10. Open decisions (not blocking slice 2)

- **Breakdown dimensions beyond variation/tool:** `date bucket` (day/week/month) is
  the obvious next and unlocks trend asks — promote in slice 5 or sooner?
- **Multi-key GROUP BY:** deferred with multi-Section; revisit only if a real ask
  needs two grouping keys at once.
- **Where "add Subject/Measure" affordances live** when locked vs unlocked — follow
  the workout builder's resolution once chrome parity + lock are on device.
- **Date-bucket Breakdown dim:** promote after lock (+ ideally save); first major
  capability gap after the builder feels lockable (see Status / ideation).
- **Empty Measure display:** how an unfilled Measure reads before op×field is chosen
  (placeholder token vs hidden until valid).
