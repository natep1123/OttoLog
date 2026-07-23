# Insights Query Builder — nesting design (v2)

> **Status:** Design contract — **layer AST + read chrome signed off (Jul 22);**
> **author/read split decided (Jul 22 evening).** Replaces the v1 flat-subject
> model (dead). Slices **1 nest + 1.5 warm chrome + 2 lock grammar/preview**
> shipped (ephemeral). **Next:** madlib authoring spike (ephemeral) before
> totals (3) / save (4). Nest-shell-only authoring is **parked** — do not keep
> forcing five edit shells. No `saved_queries` / `008` from this doc alone —
> ask at the save slice. Nate owns the go and the commit gate.
>
> **Author vs read:** unlocked = condensed madlib / clause compose; locked =
> nest LockedOutline + maximize preview (workout chrome family). Definition +
> engine stay nest-shaped. Full split: §2.
>
> **Read alongside:** [`Analytics_Overhaul_Proposal.md`](./Analytics_Overhaul_Proposal.md)
> (product direction: hub = Dashboard + Query builder), [`Template_Builders.md`](./Template_Builders.md)
> (builder chrome DNA for the **read** surface), [`Database_Outline.md`](./Database_Outline.md)
> (fact grain), [`Styling.md`](./Styling.md) (nest `layer` / `override` accents),
> [`Status.md`](./Status.md) (Next #1), and **UI gold** under [`references/`](./references/)
> (`workout-builder/` + `query-builder/` — open the `.jpg` files).
>
> **Ground truth today:** `src/lib/insights.ts` (`loadInsightQuery` Dashboard;
> `loadQueryFacts` QB); `InsightsQueryBuilderScreen` + `src/components/querybuilder/`
> (`Qb*` nest chrome, `types.ts`, `engine.ts`, `qbOutline.ts`, `qbTokens.ts`).
> Slice 2 read surface is the gold to protect. Madlib author UI **not shipped yet**.
> Gold: [`references/workout-builder/`](./references/workout-builder/) +
> [`references/query-builder/`](./references/query-builder/); open-state history:
> [`references/archive/query-open-history/`](./references/archive/query-open-history/).

---

## 1. Status / non-goals

**In scope (this doc):** the Query builder **definition** (nest AST + SQL meaning
per layer), the **read surface** (locked outline / preview chrome), and the
**author surface** (madlib / clause compose → same AST). Also: what locks, what
scopes where, and how chrome forks the template/log builders.

**Non-goals / guardrails:**

- **Dashboard is out of scope.** `InsightsDashboardScreen` stays the fast, unsaved
  PG facet look. The Query builder is the *second* tool in the hub — not a
  Dashboard variant. **Do not borrow the Dashboard readout layout.**
- **No new fact schema.** Reuse `v_log_set_facts` and the `insights.ts`
  aggregation. One `log_sets` row = one fact. Grouping + aggregate ops are computed
  **client-side** over the existing view for capability-first. **No migration**
  (no `saved_queries`, no `008`) until Nate asks at the save slice.
- **No derived facets by default.** Tonnage / e1RM stay advanced, off the critical
  path (same rule as Dashboard).
- Coach-plain voice. SQL is *taught by structure / grammar*, never shown by
  default; a "Show as SQL" reveal is a later optional stretch (§7), not v1.
- **Do not force five nest shells as the only edit path.** Nest-shell authoring
  is parked; madlib compose is the next bet.

---

## 2. Core principle — author madlib, read nest (hide the SQL)

A SELECT still maps layer-for-layer onto the workout nest **in the definition and
on the locked readout**. That is the unlock for *capability* and *share grammar*.
It is **not** the unlock for *authoring*: coaches should not open a fake Session
of shells to write an ask.

| Surface | Job |
|---|---|
| **Author (unlocked)** | Condensed **madlib / clause** compose — Query frame + repeatable Subject clause-blocks |
| **Read (locked)** | Existing **LockedOutline** nest grammar + maximize → preview (workout chrome family) |
| **Definition / engine** | Nest AST (`QueryDraft` / future `saved_queries` JSON) + client aggregate |

| Workout builder | Query builder (AST + read) | SQL it (secretly) is |
|---|---|---|
| **Session** (the day) | **Query** (the report) | `FROM your logs` + date window |
| **Block** (a section) | **Section** (a result table) | `SELECT … WHERE` scope |
| **Sequence** (loops rounds) | **Breakdown** (“For each…”) | `GROUP BY` — the loop |
| **Exercise** (a movement) | **Subject** (a Primary Group) | `WHERE primary_group = …` + identity |
| **Set** (reps × load) | **Measure** (op × field) | `SELECT MAX(reps)` — one column |

**Read chrome stays:** rails, chevron, lock look, More, maximize → preview, warm
`layer` accents by depth, dusk totals. **Authoring does not clone Session edit.**

**Naming is deliberately disjoint from the workout family** so a query **Section**
never collides with a workout **Block**, and **Breakdown** never collides with
**Primary Group** ("Group" is banned for this reason). Code lives in its own
namespace (`src/components/querybuilder/`, `Qb*`) with **no** legacy aliases like
`cluster = sequence`.

### 2.1 Author surface — clause vocabulary (sketch)

```
Query frame
  IN     [last 7 | last 28 | this week | pinned range]
  WHERE  [nest labels…] · [Working | +warmups]     ← Query-level until multi-Section

Subject clause-block  (repeat; Murph = three)
  FOR    [Primary Group]
  WITH   [variations…] · [tools…]                  ← soft identity
  SHOW   [op × field]…                             ← multi-measure OK
  SPLIT  [for each variation | tool]               ← optional; later date bucket
```

Unlock = madlib. Lock = outline (not both always-on). Whole-ask lock for v1 madlib
(chrome *looks* like workout lock); per-layer lock later if needed.

---

## 3. Layer model (AST + read — Query → Section → Breakdown → Subject → Measure)

```
Query        the report      FROM logs · date window · name/notes · lock/preview
  Section    a result table  WHERE scope (nest labels · set policy)      [exactly ONE in v1]
    Breakdown  "For each …"   GROUP BY one dimension · wraps subjects     [optional · no nesting]
      Subject  a Primary Group  WHERE pg = · identity any-of (variations/tools)
        Measure  op × field     SELECT sum|avg|max|min|count (reps|time|distance|load|sets)
```

**UI until multi-Section:** collapse **Section** into the Query frame (scope chips).
Keep Section in the definition for later multi-table reports — do not make coaches
open a fake Block just for WHERE.

**Breakdown:** author as a **SPLIT chip/clause** on the Subject block; paint the
purple Breakdown rail on the **read** surface only (lock/preview).

Subjects sit ungrouped under the Section (no SPLIT) or wrapped by a Breakdown
(SPLIT set) — same AST as today.

### Query (root · = Session)

The whole report. **Author:** Query frame (window + scope chips + name/notes).
**Read:** outline root with warm Query rail (Session accent).

- **Holds:** complete-logs source, **date window** (rolling `last 7 / 28 / this
  week`, or pinned `from`/`to`), **name + notes** (`MorePanel` DNA), and (in AST)
  exactly one Section until multi-Section.
- **SQL:** `FROM training_log WHERE session_date IN window` (+ complete-only).
- **Locks to:** paginated grammar outline root (`LockedPreviewModal` family).

### Section (= Block) — **exactly one in AST (v1); collapsed in author UI**

One result **table** in the definition. Auto-created; user does not add/remove in
v1. **Author UI:** fold scope into the Query frame — no fake Block shell.
Multi-Section (mini-report with several tables) is **later** and may re-expose
Section as an author slot.

- **Holds (AST):** **scope WHERE** — nest labels + **set policy**; children =
  Subjects and/or Breakdowns.
- **SQL:** one `SELECT … WHERE <scope> GROUP BY <breakdowns>` statement.
- **Read:** scope grammar on the outline header line (window + scope).

### Breakdown (“For each …” · = Sequence) — optional, **no nesting**

`GROUP BY`: wraps 1+ Subjects → per-group rows + **totals line**.

- **Author:** **SPLIT** chip/clause on a Subject block (`for each variation|tool`).
  Not a separate unlockable Breakdown card in the madlib path.
- **Read:** purple Breakdown rail + grouped sub-rows + dusk totals (`LockedOutline`).
- **v1 dimensions:** **`variation` · `tool`**. `date bucket` / `nest label` later.
  **PG is never a Breakdown dimension.**
- **Depth cap:** **no Breakdown inside a Breakdown** in v1. Multi-key `GROUP BY`
  deferred (don’t redesign authoring around it yet).
- **SQL:** `GROUP BY <dimension>` with a rollup/totals row.

### Subject (= Exercise) — one Primary Group

The chart noun. **Author:** one repeatable clause-block (`FOR` / `WITH` / `SHOW` /
optional `SPLIT`). **Read:** gold Subject rail + measure tokens.

- **Holds:** **one PG**, **identity any-of** (variations, tools — soft, **never
  enforced**, no `008`), and its **Measures**. Soft filter is enough for v1
  (“Pullups · variations: Weighted”); first-class “Weighted Pullups” noun = later
  display sugar, not a new identity model.
- **SQL:** `WHERE primary_group = :pg [AND variation IN … AND tool IN …]`.
- **Read:** `Pullups · max 24 reps · avg 20 lb`; inside a Breakdown, per-group
  sub-rows + totals.

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

| Layer | Author (madlib) | Read (locked outline) | Scope it owns |
|---|---|---|---|
| **Query** | frame: IN window · WHERE scope · name/notes | outline root (paginated) | date window (global) |
| **Section** | **collapsed into Query frame** until multi-Section | outline header (scope line) | `WHERE` scope (one table in AST) |
| **Breakdown** | **SPLIT chip** on Subject clause | purple rail + groups + dusk totals | `GROUP BY` dimension |
| **Subject** | clause-block: FOR / WITH / SHOW [/ SPLIT] | gold rail + measure tokens | `WHERE pg =` + identity |
| **Measure** | SHOW chips (op × field) | value token | the aggregate column |

**Lock (v1 madlib):** **whole-ask** compose ↔ grammar readout — chrome that *looks*
like workout lock (rail, icon, maximize → preview). Do **not** force five per-layer
locks on the sentence editor. Per-layer lock (full `LockController` tree) stays
available later if needed; today’s nest UI may still use it until the madlib spike
lands. Collapse and lock stay orthogonal on the **read** surface.

---

## 5. Builder DNA reuse map + definition shape

Fork the chrome, don't reinvent it. Code under `src/components/querybuilder/` with
`Qb*` names. **Read surface ≈ workout nest** (rails, chevron, lock look, More,
maximize → preview, warm `layer` accents by depth). **Author surface = madlib**
(clause chips / Subject blocks) — not a pixel-1:1 Session edit clone. Content is
always analytics (PG / dims / ops × fields).

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

## 6. Defaults — madlib path (not five empty shells)

Opening a fresh Query should feel like one short ask, not a nest of empty cards:

```
Query frame   IN last 7 · WHERE (none — all complete) · unnamed
  Subject block   FOR ▢ · WITH (all) · SHOW ▢          ← one empty clause
```

AST still has the auto Section + empty Subject + empty Measure under the hood.
No SPLIT/Breakdown by default. User picks PG + field (op smart-defaults) and has
a result. Add Subject blocks, SHOW chips, or SPLIT as needed — not
`+ Add Breakdown` as a separate shell on the author path.

*(Shipped nest UI still opens Query → Section → Subject → Measure shells until
the madlib spike replaces that edit path.)*

---

## 7. Worked examples

### A — Murph weighted work (three subjects, no breakdown)

Authored (unlocked madlib):

```
IN last 7 · WHERE Challenge · Working
FOR Pullups · WITH Weighted · SHOW sum reps · avg load
FOR Pushups · SHOW sum reps
FOR Squats · SHOW sum reps · avg load
```

Locked grammar (nest readout — protect this look):

```
Murph — weighted work
Challenge · last 7 days · Working
  Pullups   450 reps · avg 20 lb (12 sets)
  Pushups   900 reps
  Squats    600 reps · avg 45 lb
```

No total across Pullups/Pushups/Squats — unlike measures, credit-each.
`WITH Weighted` = soft identity filter (not a new noun type).

### B — Breakdown via SPLIT — Pullups by variation, with a max

Authored:

```
IN last 28
FOR Pullups · SHOW max reps · avg load · SPLIT for each variation
```

Locked grammar (purple Breakdown rail + dusk totals):

```
Pullup PRs
last 28 days
  For each variation — Pullups
    ├ Weighted    max 12 reps · avg 35 lb
    ├ Strict      max 18 reps
    └ total       max 18 reps
```

`max × reps` = "most reps in one set." One Subject clause → many computed rows.

Secret SQL (never shown by default; "Show as SQL" later stretch):
`SELECT variation, MAX(reps), AVG(load) FROM facts WHERE pg='Pullups' AND date>=… GROUP BY variation`.

---

## 8. Decisions (v2 — signed off Jul 22; author/read split Jul 22 evening)

Supersedes the v1 §8 table. Build to these.

| # | Decision | Ruling |
|---|---|---|
| 1 | Layers (AST + read) | **Query → Section → Breakdown → Subject → Measure.** SQL meaning per layer unchanged. |
| 2 | Sections | **Exactly one Section in AST**, auto-created. **Author UI:** collapse into Query-level scope until multi-Section is real. |
| 3 | Breakdown | **AST wraps Subjects; no nested Breakdowns.** **Author:** SPLIT chip on Subject. **Read:** purple rail + totals. |
| 4 | Breakdown dims | **`variation` + `tool`** for v1. `date bucket` / `nest label` later. **PG is never a dim.** |
| 5 | Ops (Measure) | **`sum · avg · max · min · count`** only. `latest` / `count-distinct` later. |
| 6 | Fields | `reps · time · distance · load · sets` (existing `InsightFacetId`). NULL discipline. |
| 7 | One PG per Subject | **Confirmed.** Complexes credit-each; never multi-PG-in-one-card. Soft identity enough for “weighted” v1. |
| 8 | Identity scope | Per-Subject variations/tools, **soft/never enforced** (no `008`). |
| 9 | Set policy + nest scope | **Section-level in AST.** Author/read as **Query-level WHERE** while one Section. |
| 10 | Lock granularity | **Whole-ask** compose ↔ grammar for v1 madlib (workout lock *look*). Per-layer tree lock later if needed. |
| 11 | Naming / code | Product: Query/Section/Breakdown/Subject/Measure. Code: `Qb*`, **no** legacy aliases. Saved artifact = **Query**. |
| 12 | Palette / feel | **Warm nest accents by depth** (`qbTokens` → `layer`/`override`/set-chip). Keep `Qb*` nouns. Cool `queryLayer` dead. |
| 13 | Defaults | New Query: **madlib** Query frame + one empty Subject clause (AST still has Section/Subject/Measure). No SPLIT by default. |
| 14 | Engine | **Client-side** group/aggregate over `v_log_set_facts`. **No migration** until Nate asks. |
| 15 | SQL teaching | English-SELECT **locked grammar** is enough. **"Show as SQL"** later optional. |
| 16 | Author vs read | **Madlib author / nest readout.** Unlock = clauses; lock = outline (+ preview). Not both always-on. |
| 17 | Nest-shell authoring | **Parked** as the main edit bet. Softened-nest (hide Section only) is fallback if madlib spike fails — not the default plan. |

---

## 9. Phased build slices (capability first)

Each slice leaves the Dashboard untouched. No commit without Nate. The v1 flat
shell is **scrapped**. Nest-shell-only authoring is **parked** after the
author/read decision.

- **Slice 0 — this doc (v2 layer model).** Contract + definition shape. **Done.**
- **Slice 1 — nest skeleton (no persistence). ✅ Shipped (ephemeral).**
- **Slice 1.5 — chrome / feel parity. ✅ Shipped (ephemeral).** Warm `layer` by depth.
- **Slice 2 — lock + preview. ✅ Shipped (ephemeral).** `qbOutline` → LockedOutline;
  maximize → LockedPreviewModal. **Protect this read surface.**
- **Slice 2.5 — madlib authoring spike (ephemeral). ← Next.** Unlocked Query frame +
  Subject clause-blocks; lock maps clauses → existing `QueryDraft` → existing
  outline/preview. No save, no migration. Dogfood Murph asks A–C. If win: amend
  UI; if fail: softened nest fallback (collapse Section shell only).
- **Slice 3 — Breakdown depth + totals polish.** After 2.5 feels right (or in
  parallel on read-only polish). Grouped sub-rows + totals (credit-each safe).
- **Slice 4 — save / reopen.** `saved_queries` (**ask first**); persist nest JSON
  (madlib = view over same definition); reopen → OPEN + locked; rolling vs pinned.
- **Slice 5 — multi-Section + more dims/ops + seeds.** May re-expose Section in
  author UI; `date bucket` / `nest label` SPLIT dims; `latest` / `count-distinct`;
  seeded Queries (with Chat 6).

Coach-labeled clause power first (filters, multi-measure, date bucket). Multi-key
GROUP BY / compare windows later — don’t redesign authoring around them.

---

## 10. Open decisions

- **Madlib chrome density:** single Query card with clause rows vs short chip
  “sentence” rails — spike decides.
- **Empty Subject block:** placeholder `FOR ▢ · SHOW ▢` vs hide until PG picked.
- **SPLIT + one Subject:** locked outline always purple “For each…”, or flatten
  when trivial?
- **Save definition:** confirm nest JSON as canonical (madlib = view) before
  `saved_queries`.
- **Breakdown dimensions beyond variation/tool:** `date bucket` next capability
  gap (slice 5 or sooner once authoring lands).
- **Multi-key GROUP BY / compare windows:** deferred — don’t block madlib.
- **Empty Measure display** on author SHOW chips before op×field chosen.
