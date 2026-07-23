# Insights Query Builder — nesting design (v2)

> **Status:** Design contract — **layer AST + read chrome signed off (Jul 22);**
> **author/read split decided (Jul 22 evening).** Replaces the v1 flat-subject
> model (dead). Slices **1 nest + 1.5 warm chrome + 2 lock grammar/preview**
> shipped (ephemeral). **Madlib author (2.5) + polish + WITH/SPLIT B+C** in tree.
> **§11 (Jul 23, revised Jul 23):** author nest-chrome — **locks recorded and
> promoted to build spike** (Query→WHERE→FOR ≈ Session→Block→Exercise; dusk
> **Insight** cards hold WITH+SHOW under gold FOR; SPLIT≈Sequence; SPLIT mode
> **C** + one-shot seed; `Subject.asks[]` AST lean; credit-each across
> overlapping Insights). **Build spike implemented** (`QbWhereCard` /
> `QbForCard` / `QbInsightCard` / `QbSplitWrapperCard`; ephemeral, **uncommitted
> — awaiting Nate's dogfood/commit**). Nest-shell-only authoring remains
> **parked**; §11 is a middle path, not an un-park. SHOW dropdown polish stays
> parallel/follow-on.
> **§12 (Jul 23, post-§11 dogfood ideation):** five follow-on locks sequenced
> into two slices — **A** (WITH facet-split any/all + WHERE nested date
> window) and **B** (per-layer lock/pills at WHERE+FOR + Insight
> summary-row/editor) — **both implemented** (ephemeral, uncommitted).
> Multi-WHERE side-by-side date-slice compare **deferred to Slice 5**, not
> pulled forward. See §12. **Next** outside §12: SHOW dropdown polish →
> totals (3) → `saved_queries` (ask first).
> No `saved_queries` / `008` from this doc alone — ask at the save slice. Nate
> owns the go and the commit gate.
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

**Decided by slice 2.5 madlib spike (Jul 23):**
- **Madlib chrome density:** single Query card with **clause rows** (`FOR` / `WITH` / `SHOW` / `SPLIT` as leading words) — not chip-sentence rails.
- **SPLIT + one Subject:** locked outline **always** purple “For each…” — no flatten-when-trivial.
- **IN presets:** Last 7 / Last 28 / This week / Custom as UI over `{fromDate, toDate}` — no new AST field.

**Decided by madlib author UX polish (Jul 23, post-2.5) — supersedes the two
2.5 picks below:**
- **Empty Subject block:** **progressive disclosure.** Show `FOR` only until a
  Primary Group is picked; `WITH` / `SHOW` (and the `SPLIT` affordance) reveal
  once `pgId` is set. *(Supersedes the 2.5 pick of always-showing all four
  rows — that read as a full empty form, not a short ask.)*
- **Empty Measure display:** a dashed **`+ Pick a measure`** chip (seeds the
  first available field + its smart-default op). *(Resolves the “still open”
  item from the 2.5 spike.)*
- **SHOW grammar:** one Measure = one **chip sentence** (`sum reps`), not a
  Field/Op grid. Tap the op word to cycle op, the field word to cycle field;
  `count` ⇄ `field:'sets'` stay one state (`count · sets`). `+ Add Measure`
  still adds another chip.
- **WITH:** collapses to a summary chip (`all` / `Weighted` / …) that expands
  to the existing variations/tools pickers on tap — not two always-open
  `SearchableSelect` rows.
- **Live SPLIT groups while authoring:** hidden by default under a small
  “Live preview · for each …” disclosure on the Subject clause (tap to
  expand); the locked outline / preview stay the canonical readout.
- **Locked outline “Section” label:** soft-hidden — the outline shows scope
  meta only (e.g. `Working`) since v1 AST is always exactly one Section. Same
  `LockedOutline` component; renders the title line only when `node.title` is
  non-empty (`qbOutline.outlineSection` now emits `title: ''`).
- **Query header date pill:** hidden while unlocked **and** expanded (the `IN`
  row already shows it there); still shown unlocked+collapsed (summary) and
  always shown locked (the outline root hides its own `meta` via
  `hideRootTitle`).

**Decided by WITH any/all + sibling SPLIT (Jul 23) — Options B+C:**
- **Subject `identityMatch`:** `'any' | 'all'` (default `'any'`). `'all'` =
  intersection on selected variations/tools (WITH).
- **SPLIT with non-empty WITH:** sibling co-tags — group keys **exclude** the
  Subject’s WITH ids for that dimension; locked title `For each … · among
  <identity>`. Empty WITH → today’s full peer credit-each SPLIT.
- Credit-each / multi-tag facts unchanged. No schema. Venn dashboards later.
- **Per-Subject lock:** parked — whole-ask Query lock for v1.

**Still open:**
- **SHOW chip interaction:** keep `op | field` look; prefer **dropdowns** on
  each half instead of tap-to-cycle; fix truncation; wire `availableFields`.
  *(Working tree may already hold a dropdown + `availableFields` polish —
  confirm on dogfood / Status before treating as shipped.)*
- **Save definition:** confirm nest JSON as canonical (madlib = view) before
  `saved_queries`.
- **Breakdown dimensions beyond variation/tool:** `date bucket` next capability
  gap (slice 5 or sooner once authoring lands).
- **Multi-key GROUP BY / compare windows:** deferred — don’t block madlib.
- **Measure field availability:** `QbMeasureRow`’s `availableFields` prop
  (shape-driven fields the Subject actually logged) is still unwired from the
  Subject clause — cycling currently walks the full 5-field set regardless of
  what's logged in-window. *(Same caveat as SHOW chip interaction above.)*
- **Author nest chrome (Insight / WHERE / SPLIT) — build spike:** see **§11**.
  Naming (**Insight**), AST lean (`Subject.asks[]`), SPLIT mode (**C** +
  one-shot seed), and credit-each are locked; Nate promoted to Status Next.
  SHOW dropdown polish stays parallel/follow-on.

---

## 11. Author nest chrome (Jul 23, revised Jul 23) — **locks recorded · build spike**

> **Status:** Product ideation revised after Nate’s review pass, then **promoted
> to a build spike**. The **naming** (product noun **Insight**), the **AST lean**
> (`Subject.asks[]`), the **SPLIT mode** (**C** + optional one-shot seed), and
> **credit-each across overlapping Insights** are **locked**. This is **not** a
> signed §8 decision yet and does **not** un-park nest-shell-only authoring or
> imply a migration. SHOW dropdown polish (§10) stays parallel/follow-on and
> unblocked. Read alongside [`Template_Builders.md`](./Template_Builders.md) and
> [`Styling.md`](./Styling.md) `layer` / `override` for the chrome DNA this forks.
>
> **Lingo:** SQL-ish / technical nouns stay for agent clarity (form→SQL). A later
> product-copy pass will clarify coach-facing labels once behavior is settled —
> don’t invent a full glossary rename mid-spike.

**Glossary — Insight:** a dusk-chrome card that holds one **WITH** identity
combo (variations/tools, any/all) + one or more **SHOW** measures, nested
under a gold **FOR** (one Primary Group). Product noun, parallel in *nest
depth* to workout **Set** — many Insights can stack under one FOR the same
way many Sets stack under one Exercise/round. That parallel is **structural
only**: an Insight keeps **dusk** chrome (the workout-override family), not
the amber set-chip look, and it does not touch the shipped §3 “Measure
(leaf · = Set)” mapping — **Measure** (op × field) still lives *inside* an
Insight and is still the node that plays the Set role in the SQL-per-layer
table. UI copy never says “pink” or “override” for this card; **override**
stays a workout-only term (round exceptions on Sequences —
`Template_Builders.md` / `Styling.md`).

### 11.1 Nate’s priority (what he wants)

1. **Force a little of the old hierarchy in the Insights author UI** so analytics
   feels **near-identical in structure** to workout chrome, while showing
   **different info** — same layer / color language, different nouns/payload.
2. **Direct color ↔ meaning map** at each depth. A coach who knows Session /
   Block / Sequence / Exercise / override dusk should recognize the same rails
   in Query builder without learning a second chrome dialect.
3. **Spine he is converging on:**
   - **Query → WHERE → FOR** ≈ **Session → Block → Exercise**
   - **FOR is the only Exercise-matched level** (Primary Group only on gold)
   - **SPLIT ≈ Sequence** (violet)
   - Inside each **FOR**, dusk **Insight** cards hold **WITH + SHOW**
     (identity combo + ops). User picks PG, then adds one Insight per unique
     variation/tool combo and calc they care about (e.g. Gait → Insight
     “Running · sum time”; Insight “Walking · sum distance”).
4. **WHERE acts like Blocks:** both **filter** (nest labels / set policy) and
   **org tool** (container that holds FORs / SPLITs) — not a flat chip row only.
5. **Transferability bar:** the **dusk chrome family** (workout: round
   overrides) and **violet** (Sequence) should remain **reasonably
   transferable** to the query author surface; Query↔Session and WHERE↔Block
   should feel the same kind of similar. The product **term** “override”
   stays **workout-only** — Insights borrows the *chrome*, not the *word*.

### 11.2 Proposed UI spine (sketch)

```
Query          (session rail)   — report / day: IN window, name, notes, lock
  WHERE        (block rail)     — scope chips + container for children
    [SPLIT?]   (violet / seq)   — optional “for each <dim>” loop wrapper
      FOR      (gold / exercise)— one Primary Group only
        Insight (dusk)          — each card = WITH combo + SHOW measures
        Insight (dusk)
    —or no SPLIT—
      FOR …
        Insight …
  + Add FOR → WHERE
```

Madlib **words** (`FOR` / `WITH` / `SHOW` / `SPLIT`) can stay as body copy
inside the right-colored cards — the ideation is **re-wrapping** into nest
geometry, not throwing away coach-plain clause vocabulary. UI never labels a
card “pink” or “override” — say **Insight** (or leave it wordless, letting
the dusk rail carry the meaning the way workout overrides do today).

### 11.3 Color / layer transfer map

| Workout chrome | Token family | Insights author (proposed) | Payload |
|---|---|---|---|
| **Session** | `layer.session` | **Query** | Window, name/notes, whole-ask lock |
| **Block** | `layer.block` | **WHERE** (Section) | Nest labels + set policy; **holds** FORs / SPLITs |
| **Sequence** | `layer.cluster` | **SPLIT** (Breakdown) | `GROUP BY` dim (`variation` / `tool`); wraps FORs |
| **Exercise** | `layer.exercise` | **FOR** (Subject) | **PG only** — identity/measures move off gold |
| **Override** (workout term, dusk chrome) | `override` dusk | **Insight** card under FOR | One **WITH** identity combo + **SHOW** ops |
| **Set** | set / amber chip | Measure chips inside an Insight | `op × field` (dropdown halves — separate polish) |

**Primary goal for reviewers:** every rail color should mean the **same job
class** as in workout builders (day / section+org / loop / noun / exception rx /
leaf values) — only the content differs. The **word** “override” is not
reused; **Insight** is the Query-builder-native noun for that dusk depth.

### 11.4 Insight semantics (WITH + SHOW under FOR)

- Gold **FOR** = “which Primary Group” (Gait, Pullups, …).
- Each dusk **Insight** = one ask-slice: soft identity (`WITH` variations/tools,
  any/all) + one or more **SHOW** measure chips.
- Example under `FOR Gait`:
  - Insight A — `WITH Running` — `SHOW sum time · avg load`
  - Insight B — `WITH Walking` — `SHOW sum distance`
  - Insight C — `WITH Running + Weighted` (all) — `SHOW max load`
  - Insight D — `WITH (all)` — `SHOW count sets` (catch-all under PG)
- Visual win Nate called out: **see Gait as a stack of Insight cards** for
  each unique combo/calc the user wants, instead of one soft WITH + cycling
  measures on a flat Subject clause.
- Closest workout cousin: same exercise, multiple override / rx cards — not a
  second Exercise layer. (Chrome cousin only — the product word stays
  **Insight**, never “override,” on this surface.)

**AST lean — locked (Nate, Jul 23):** `Subject.asks[]`. Each ask **is** an
Insight — one identity combo (WITH any/all) + its SHOW measures — nested
under **one** gold FOR (Subject). This is **not** N Subjects sharing a
`pgId`; the PG lives once on the Subject, and Insights are children that
only carry identity + measures. Ideation sketch (not the canonical §5
shape — §5 stays as-is until this is promoted):

```
SubjectNode (ideation — not the shipped §5 shape)
  pgId
  asks: Array<InsightNode>        // was: variationIds / toolIds / measures directly on Subject
    InsightNode
      identityMatch: 'any' | 'all'
      variationIds[], toolIds[]
      measures: MeasureNode[]
```

**Credit-each — locked (Nate, Jul 23):** overlapping Insights (e.g. `WITH
Running` and `WITH Running + Weighted` on the same FOR) **credit-each** —
each Insight computes its own aggregate over whatever facts match its own
WITH filter; a set that qualifies for two Insights counts in both, same as
Subjects credit-each today (§8 #7, §7 Example A). Coach-plain copy for this:
**“asks can overlap”** — a set can answer more than one ask, and each ask’s
numbers are independent, so don’t expect an Insight’s siblings to sum to the
FOR’s total. SPLIT auto-groups keep today’s sibling / peer rules (Option B+C
in §10) — unaffected by this lock.

### 11.5 How SPLIT fits (Sequence)

Today SPLIT is a chip on the Subject clause; locked outline paints violet
“For each…”. In this ideation, **SPLIT is the violet Sequence card** between
WHERE and FOR (or wrapping FORs):

- **Off:** FORs (with hand-authored Insights) hang under WHERE like
  standalone exercises under a Block.
- **On:** violet wrapper = “for each variation | tool”; Insights under FOR
  are the per-iteration / per-group ask-slices.

**SPLIT mode — locked (Nate, Jul 23): Mode C.** Hand-authored Insights *or*
auto partition are **two distinct controls, never both live** on the same
FOR at once — this is what resolves the “double metaphor” risk below.
Optional one-shot **`+ Split into Insights`**: SPLIT auto-partitions by the
chosen dimension (today’s peer/sibling rules, unchanged) and **seeds** one
editable Insight card per resulting group (WITH prefilled from the partition
value). After that seed fires, the seeded cards are **plain hand-authored
Insights** — SPLIT is not left “live”-wired to them; the user can then edit,
delete, or add Insights freely. Mode **A** (auto-explode, from the original
three-way fork) survives only as this one-shot seed action, not as an
always-on auto-explode control. Mode **B** (wrapper-only, no seed) is
rejected as too weak an author job for the Sequence parallel.

Empty WITH + SPLIT → seeds Insights for every peer tag (today’s full peer
partition). Non-empty WITH + SPLIT → seeds sibling co-tags among filtered
sets (shipped B+C). Both are one-shot seeds under Mode C, not a live binding.

Depth cap unchanged: **no SPLIT inside SPLIT** (no nested Breakdowns).

### 11.6 What stays / what moves (vs shipped madlib)

| Keep | Move / rethink |
|---|---|
| Nest AST + client engine over `v_log_set_facts` | Author chrome: clause rows → nested cards by depth |
| Locked outline / preview as read surface | WHERE as real Block-shell container (not only Query-frame chips) |
| Whole-ask Query lock (v1) | WITH+SHOW off gold onto dusk **Insight** children under FOR |
| Soft identity + B+C sibling SPLIT semantics | SPLIT as violet Sequence card (author) + one-shot `+ Split into Insights` seed, not only lock paint |
| No `008` / no Dashboard merge | Progressive empty: FOR first; then `+ Add Insight` / `+ Split into Insights` |

**Protect from shipped madlib (do not regress while ideating):** progressive
FOR disclosure, SHOW chip grammar, WITH any/all + sibling SPLIT (B+C),
whole-ask Query lock/outline, nest-shell-only-authoring **parked**. §11 is
additive on top of these, not a rewrite of them.

This is **not** “bring back five empty Session-edit shells.” It is **nest-shaped
author with madlib fields in the right-colored cards** — a middle path between
parked nest-shell-only authoring and today’s flat Subject clause.

### 11.7 Friction / risks for the reviewing agent

- **Card weight:** Murph (3 PGs) × several Insights gets tall; need
  progressive disclosure and cheap add (`+ Add Insight` under FOR).
- **Double metaphor — resolved by Mode C:** hand Insights and SPLIT auto
  partition are never both live on the same FOR, so WITH does not have to
  live on both gold and dusk at once. The one-shot seed hands the user a
  starting set of Insights; ownership moves fully to the hand-authored cards
  once seeded.
- **AST shape — resolved:** `Subject.asks[]` (§11.4). Each Insight is a
  child of Subject sharing the Subject’s `pgId`, not a second `pgId`-bearing
  node.
- **Override DNA purity:** workout overrides are round exceptions; Insights
  here are identity-scoped measure bundles. Transfer is **chrome +
  “exception/variant under the noun,”** not round numbers, and not the word
  “override” — that stays workout-only.
- **Do not block** SHOW dropdown polish / slice 3 totals / save on this
  ideation. §11 stays ideation; spike sequencing (if Nate promotes it) comes
  **after** SHOW dropdown polish, not instead of it.

### 11.8 Review checklist (for the other agent)

- [x] Does Query→WHERE→FOR↔Session→Block→Exercise hold under real Murph asks?
      — Holds per Nate’s stated priority (§11.1); not yet dogfooded in UI
      (no build yet).
- [x] SPLIT mode — **C** (+ one-shot `+ Split into Insights` seed), decided
      (§11.5). A survives only as the seed action; B rejected.
- [x] AST: Insight = new node — **`Subject.asks[]`**, decided (§11.4). Not
      multi-Subject with shared PG.
- [x] Credit-each vs partition across hand Insights — **credit-each**,
      decided (§11.4). “Asks can overlap” is the coach-plain copy.
- [ ] Is dusk **Insight** chrome honest enough for coaches who know round
      overrides, or does it need its own accent distinct from `override`?
      Still open — reusing dusk without reusing the word is the current
      lean, not yet stress-tested against a real screenshot.
- [ ] What to protect from current madlib (progressive FOR, SHOW chip
      grammar, B+C sibling SPLIT, lock outline, whole-ask Query lock,
      nest-shell-only parked) — recorded (§11.6/§11.7); still needs to hold
      up once someone actually spikes the chrome.
- [ ] Promote to §8 / Status Next, park, or keep revising — **Nate decides**;
      not automatic even with the locks above. Sequencing: **after** SHOW
      dropdown polish, per Nate.

---

## 12. Post-§11 ideation locks (Jul 23) — facet-split WITH, nested date window, per-layer chrome

> **Status:** Ideated after dogfooding the §11 build spike against
> `references/query-builder/08-author-where-for-insight.jpg` and the workout
> Override chrome (`references/workout-builder/08`/`09`). **Five decisions
> locked.** **Slice A + Slice B both implemented** (ephemeral, uncommitted).
> Does not un-park nest-shell-only authoring; does not touch schema/`008`.
> Follow-on outside this section: SHOW dropdown polish → totals → save.

| # | Decision | Ruling | Slice |
|---|---|---|---|
| 1 | WITH match logic | `InsightNode.identityMatch` (one shared any/all) **splits into independent `variationMatch` + `toolMatch`** (each `'any'\|'all'`). Still lives on the Insight (§11.4 already moved identity there) — this only decouples the two facets, it is **not** full nested AND/OR condition groups (that idea was raised and explicitly rejected as more than needed; multiple Insights already cover the OR-of-asks case via credit-each). | A |
| 2 | Nested date window | `SectionNode` (WHERE) gains an **optional date sub-window** that must **clamp inside** the Query's outer window (unset = inherit Query's window unchanged — must not regress today's behavior). Date filters stop at WHERE — **FOR and Insight stay identity-only, no date knob**, so a "document" doesn't grow five independent notions of "when." | A |
| 3 | Multi-WHERE / side-by-side compare | **Deferred to Slice 5** (multi-Section), not pulled forward now. The motivating case ("one Query, 4 WHEREs = 4 weeks of a month, side by side") is real but out of scope until Slice 5. When it lands: prefer a **`+ Duplicate WHERE`** clone action (copy the FOR/Insight tree, just change the date sub-window) over rebuilding per WHERE, and default rendering to a **vertical stack** (report-read order) — true horizontal/tabbed comparison is the separate, already-parked Phase 5 "Compare mode" idea in `Analytics_Overhaul_Proposal.md`, not this doc's job. | — (Slice 5, later) |
| 4 | Per-layer lock + pills | **Reverses** the v1 "whole-ask Query lock only" call (§8 #10, §10 "Per-Subject lock: parked"). **WHERE and FOR each become independently lockable nodes** (own `useNodeLock` id, same ancestor-cascade rules as workout Block/Exercise). Each also gets a **collapsed child-summary pill-scroller row** (WHERE → its FOR PG names; FOR → its Insight summaries), matching Session/Block chrome. **Insight itself stays without its own lock toggle** — it remains a child governed by its FOR, same as Measure/Set never getting an independent lock today. | B |
| 5 | Insight interaction model | `QbInsightCard`'s always-expanded inline form becomes a **two-state component**: a compact **summary row** (WITH+SHOW value line + edit pencil + Remove, styled like the workout Overrides list item, `workout-builder/08`) and a separate **editor panel** opened by the edit tap (WITH pickers + SHOW measures + Save/Cancel, styled like `workout-builder/09`). Locked outline / preview grammar (`qbOutline.ts`, `LockedOutline`) is unaffected — this only changes the unlocked author interaction. | B |

**Slice A** (facet-split match + WHERE date nesting) — **done in tree.**
**Slice B** (per-layer lock/pills + Insight summary-row/editor) — **done in
tree.** Follow-on: SHOW dropdown polish → totals (3) → `saved_queries`.

**Supersedes:** §10 "Decided by WITH any/all + sibling SPLIT" (single
`identityMatch` → split into `variationMatch`/`toolMatch`, decision 1 above);
§8 #10 and §10 "Per-Subject lock: parked" (decision 4 above — WHERE/FOR now
planned to be independently lockable). §11.4/§11.6's description of Insight as
an always-open card is superseded by decision 5 above.

