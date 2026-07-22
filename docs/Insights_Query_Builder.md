# Insights Query Builder — nesting design

> **Status:** Design contract — **§8 decisions signed off (Jul 22).** Cleared for
> **slice 1** (builder shell, no persistence). Still no app / SQL work from this doc
> alone; slice 4 `saved_insights` migration needs a fresh ask. Nate owns the go and
> the commit gate.
>
> **Read alongside:** [`Analytics_Overhaul_Proposal.md`](./Analytics_Overhaul_Proposal.md)
> (product direction: hub = Dashboard + Query builder), [`Template_Builders.md`](./Template_Builders.md)
> (the builder chrome to learn from), [`Database_Outline.md`](./Database_Outline.md)
> (fact grain + Insights query contract), [`Styling.md`](./Styling.md) (form chrome),
> and [`Status.md`](./Status.md) (Next #1).
>
> **Ground truth today:** `src/lib/insights.ts` (`InsightQuery`, `loadInsightQuery`,
> `v_log_set_facts` read + facet aggregation), `src/screens/insights/InsightsDashboardScreen.tsx`
> (per-PG scope cards — the *feel*, not the target IA),
> `src/screens/insights/InsightsQueryBuilderScreen.tsx` (placeholder), builder chrome
> under `src/components/forms/` (`NestedLayer`, `CoordRow`, `LockController`,
> `ExpansionController`, `LockedOutline`, `LockedPreviewModal`, `Disclosure`,
> `MorePanel`, `SearchableSelect`).

---

## 1. Status / non-goals

**In scope (this doc):** how the Query builder nests — what layers exist, what
collapses, what locks to grammar, what is per-subject vs query-global, and where
it reuses vs departs from the template/log builders.

**Non-goals / guardrails:**

- **Dashboard is out of scope.** `InsightsDashboardScreen` stays the fast, unsaved
  PG facet look. Do not redesign it here. The Query builder is the *second* tool in
  the hub, not a Dashboard rewrite.
- **No new fact schema.** Reuse `v_log_set_facts` and the existing `insights.ts`
  aggregation ideas. One `log_sets` row = one fact; nothing about the grain changes.
- **No `008` group→movement taxonomy.** Soft modifier scoping only (variations /
  tools as any-of filters, never enforced). This design does not depend on a
  Group→Movement drill-down.
- **No `saved_insights` migration yet.** Persistence is a real slice, but the table
  gets authored only after Nate approves the shape. Ask before migrating.
- **No derived facets by default.** Tonnage / e1RM stay advanced, off the critical
  path (same rule as Dashboard).
- Coach-plain voice in any copy sketch below. Grammar strings are illustrative;
  exact chip syntax tracks the builder override-notation overhaul.

---

## 2. The core departure — Insights nests differently than a workout

The template/log builders nest **Session → Block → Sequence → Exercise → Sets**
because that is the *authoring shape of a workout*. It is a structural tree: a set
belongs to exactly one exercise, in exactly one sequence/block, in one session.

An Insights ask is **not** a workout. Its spine is the **thing you want to measure**
(the Primary Group), and the workout structure (session / block / sequence labels)
is *scope you filter by*, applied sideways — the same PG can be filtered by any
label at any level at once. So cloning the four-level structural tree would be
wrong: it would force depth and hierarchy the question doesn't have.

Two structural facts flip between the two products:

| | Template / log builder | Insights Query builder |
|---|---|---|
| Spine | Structural nest (Session→…→Set) | **Subject** (Primary Group) |
| Nest labels | *Are* the spine (each node owns one) | *Filters* applied across subjects (WHERE) |
| Authoring direction | Nests **up** (build a tree) | Denests **down** (one subject → many result rows via split) |
| Leaf | A prescribed set (`3×10 @ BW`) | A **facet selection** (show reps, summarized) |
| Depth | Fixed 4 levels, always | Shallow (2), with **one optional** semantic group level |

So nesting *is* wanted — collapse, lock-to-grammar, preview, save/reopen all carry
over — but the **tree shape** does not. The Query builder keeps the builder *DNA*
and drops the builder *skeleton*.

---

## 3. Bottom-up layer model (the meat)

Built the way OttoLog was built: start at the atom and climb.

```
L4  Ask                 name + notes, lock/preview, save/reopen        (top chrome)
L3  Query-global        window (rolling|pinned) · nest scope · set policy
L2  Ask body            flat list of Subject cards  (+ optional Group level)
L1  Subject card        PG + per-subject identity scope + facet set + split
L0  Facet atom          one measure (reps|time|distance|load|sets) + summary op
```

Read it upward: a **facet** is what one logged set contributes; a **subject** owns
its facets and identity; the **body** stacks subjects (optionally grouped);
**query-global** chrome scopes them all; the **ask** wraps it with save/lock.

### L0 — Facet atom (the leaf; the "set/target" analog)

The smallest unit of an ask is **not** a set you type — it's a **facet**: which
measure to show for a subject, and how to summarize it.

- **Measures (shape-driven, atomic):** `reps · time · distance · load · sets` —
  exactly the `InsightFacetId` set already in `insights.ts`. A measure appears only
  when the subject's exercises *logged* it in-window (NULL discipline), or the
  target shape says it's expected (empty-state copy, not a fake zero).
- **Summary op (per facet):** `sum` default; `load` = `avg` (matches Dashboard,
  `buildPanel`); `sets` = count. `max / min / latest / per-session avg` are later
  ops, not v1.
- **Never sum unlike measures.** Reps + time never collapse into one number. This
  is structural in the UI, not a lint (same rule as Phase 1a).
- **Counts-as (later):** PG `natural_metric` decides which facet opens *expanded
  first*, not the only facet. Phase 4 / needs the taxonomy column — off the critical
  path here.

**Collapses to:** a token inside the subject's grammar line, e.g. `450 reps`,
`avg 20 lb (12 sets)`. Reuses `formatFacetDisplay` verbatim.

**Locks to:** the same token — a facet has no "editable when unlocked" body of its
own beyond its toggle + op; it *is* grammar already. This is the cleanest carryover
from the set row → prescription chip pattern.

**Per-subject vs global:** facets are **per-subject** (Pushups can show reps+time+load;
Deadhangs only time). There is no global facet bar — that was a Dashboard-era idea
already retired.

### L1 — Subject card (the real nestable unit; the "Exercise card" analog)

This is where builder DNA lands hardest. A **Subject card** is one Primary Group and
everything about *how* to read it. It behaves like an `ExerciseEditor` card:
collapsible, lockable, grammar when closed.

A subject card holds:

1. **Subject = one PG** (the chart noun). One PG per card. Complexes that credit
   multiple PGs are handled by **credit-each under the hood** (pick the PG you want;
   never sum PG cards). Multi-PG-in-one-card is *not* a v1 shape — stacked single-PG
   cards read cleaner and match the fact model.
2. **Per-subject identity scope (soft):** variations (any-of) and tools (any-of).
   This is exactly today's `variationIdsByPg` / `toolIdsByPg` — the Dashboard already
   scopes these per PG. Soft suggestions via `listPrimaryGroupSuggestedTagIds`
   (`suggestedIds` on `SearchableSelect`). **Never enforced** (no `008`). **Set type /
   warmups are global-only (L3) in v1 — not a per-subject override.** Intensity / load
   bands are later, also not v1.
3. **Facet set (L0 children):** which measures + ops to show for this PG.
4. **Split by (optional):** expand this one subject into result sub-rows plus a
   **totals line** — by `variation | tool | load bucket | nest label | date bucket`.
   This is the "per-exercise breakdown: modifiers / loads / variations, then a
   totals line" from Status/proposal. It is the Insights analog of a **sequence
   expanding rounds/overrides into performed sets**: one authored row denests into
   many result rows. v1 splits = variation + tool (reuse per-PG data); load/date
   buckets later.

**Collapses to:** one grammar line (subject + facet totals), e.g.
`Pullups · 450 reps · avg 20 lb`. Same idea as an exercise card's prescription
chips; exact syntax tracks the override-notation overhaul.

**Locks to:** grammar. Unlocked = full editable body (PG swap, identity pickers,
facet toggles, split control). Locked = read-only grammar line, and when
locked+expanded, the split breakdown renders as a `LockedOutline`-style block
(sub-rows + totals) instead of the editors.

**Per-subject vs global:** identity scope + facets + split are **per-subject**.
Nest-label scope and window default are **global** (L3) but a subject *may* override
nest scope locally (deferred — see Open decisions).

### L2 — Ask body (flat subject list + one optional group level)

Default body = a **flat, ordered list of subject cards** (stacked panels, same
readout as the Dashboard, now in builder chrome). No forced Block/Sequence wrapper.
Add-control vocabulary is `+ Add Primary Group`, not `+ Add block`.

**The one place real nesting is allowed — an optional `Group` container:**

- A Group wraps 2+ subject cards for a *semantic* reason, not a structural one:
  **compare** (side-by-side panels) or **balance rollup** (credit-each combined,
  e.g. Push/Pull/Lower). It carries a rollup mode, a label, and its own collapse/lock.
- Depth cap: **one** group level. No group-in-group. Nesting earns its keep only
  when the user asks two subjects to be read together.
- Ungrouped subjects and groups coexist in the same ordered body list.

This is the deliberate departure: nesting exists, but it is **opt-in and semantic**,
capped at one level, never the 4-deep structural clone.

**Collapses / locks:** a Group behaves like a `NestedLayer` parent — collapse hides
its subjects to a summary chip row; lock forces its subjects locked (reuse
`LockController` ancestor-forcing exactly).

### L3 — Query-global chrome (not a nest node)

Everything that scopes the whole ask. This is *chrome*, not a top-of-tree node — it
does not add depth.

- **Window:** date range with a **mode** in the definition — `rolling` preset
  (last 7 / 28 / this week) vs `pinned` (`from`/`to`). Reuse `SessionDateControl`.
  "Pullups last 7 days" stays live; "Pullups week of June 13" stays historic.
- **Nest scope (WHERE):** session / block / sequence label any-of, global default
  for all subjects. Reuse `sessionCategoryIds` / `blockLabelIds` / `sequenceLabelIds`
  and `passesScope` unchanged.
- **Set policy:** Working-only default + warmups toggle + set-type filter (existing
  `setTypes` / `includeWarmups` / `effectiveSetTypes`).

Presented as `Disclosure` sections (like the Dashboard's Scope) plus the date row.
When the ask is locked, this collapses into the **outline header line** (window +
scope grammar), not a separate node.

### L4 — Ask top (save / reopen / lock / preview)

- **Name + notes:** first-class, via `MorePanel` DNA (name typeahead lane + notes).
  A Saved Insight is a named query template, same family as session logs/templates.
- **Lock (whole ask):** the ask root locks to a clean, paginated grammar outline for
  screenshot/share — `LockedPreviewModal` family. Per-subject and per-group locks are
  the same `LockController` tree beneath it.
- **Save / list / rename / delete:** `saved_insights` (definition JSON), Library-like
  picker to reopen. **Reopen → dropdowns OPEN + lock=TRUE clean view**, re-run live
  (or historic if the window is pinned). Ask before the migration.

---

## 4. What collapses / locks / scopes — quick matrix

| Layer | Collapses to | Locks to | Editable when unlocked | Per-subject or global |
|---|---|---|---|---|
| L0 Facet | a value token | same token | measure toggle + summary op | **per-subject** |
| L1 Subject | one grammar line | grammar (+ outline breakdown if expanded) | PG, identity pickers, facets, split | **per-subject** |
| L2 Group *(opt)* | summary chip row | forces children locked | label, members, rollup mode | groups subjects |
| L3 Query-global | into outline header line | header grammar | window, nest scope, set policy | **global** |
| L4 Ask | (root) | full paginated outline | name, notes | ask |

---

## 5. Builder DNA reuse map

What to lift from `src/components/forms/`, and how it maps.

| Builder chrome | Reuse in Query builder | Notes / departure |
|---|---|---|
| `NestedLayer` + `CoordRow` | Subject cards and Group cards | Same card shell (rail, collapse chevron, lock toggle, `metaChips`, `trailing`, `label`/`title`). Subject uses a **PG picker** where Exercise uses a name search; Group uses a label. No 4-layer token spine — pick one Insights accent (subject) + a group accent; do **not** import Session/Block/Sequence red/blue/violet, which encode structural roles this product doesn't have. |
| `LockController` / `useNodeLock` / `LOCK_ROOT` | Whole-ask + per-group + per-subject lock | Ephemeral UI state, ancestor-forcing, unlock-own-locks-children — all carry over unchanged. Add an `insight` root id. |
| `ExpansionController` + `EditorTools` tray | "Collapse subjects" / "Unlock & Expand All" | Same tray pattern above the form. |
| `LockedOutline` | Subject split breakdown + group rollup when locked+expanded | New outline builder (`outlineInsightSubject` / `outlineInsightAsk`) emitting facet/split lines instead of set prescriptions. Same thin-left-spine geometry + notes rendering. |
| `LockedPreviewModal` + `lockedPreviewPages` | Screenshot/share of the locked ask | Same paginated, swipeable modal. The "chef's kiss" contract Nate wants Insights to share. |
| `Disclosure` | Query-global scope + set policy | Same as Dashboard's Scope disclosure today. |
| `MorePanel` | Ask name + notes (and per-subject notes later) | Name/Brief + notes lane; keeps the card header clean. |
| `SearchableSelect` (`suggestedIds`) | PG picker, per-subject variations/tools | Already used on the Dashboard per-PG cards; soft suggestions reused as-is. |
| `insights.ts` `InsightQuery` + `loadInsightQuery` + `v_log_set_facts` | The read + aggregation engine | Extend the *definition* (below); keep the fact read + `passesScope` / `passesPgIdentity` / `buildPanel` shape. Split-by adds grouping *within* a PG's facts; still credit-each safe. |

**Definition shape (superset of `InsightQuery`, for the saved ask):**

```
SavedInsightDefinition
  window:   { mode: 'rolling', preset } | { mode: 'pinned', fromDate, toDate }
  scope:    { sessionCategoryIds, blockLabelIds, sequenceLabelIds }   // global WHERE
  setPolicy:{ setTypes, includeWarmups }
  body:     Array< SubjectNode | GroupNode >                          // ordered
    SubjectNode { pgId, variationIds[], toolIds[], facets:[{ id, op }], splitBy? }
    GroupNode   { label, rollup:'compare'|'combined', subjects: SubjectNode[] }
  meta:     { name, notes }
```

`variationIds` / `toolIds` per subject = today's `variationIdsByPg` /
`toolIdsByPg`, hoisted onto the node so a subject owns its own scope. Nothing here
requires new fact columns.

---

## 6. Where template nesting maps cleanly vs must differ

**Maps cleanly (keep):**

- Card chrome, collapse/lock as independent axes, ancestor-forced lock, unlock →
  own-lock children collapsed. (`NestedLayer` + `LockController`.)
- Lock = **presentation mode** → paginated grammar outline for share.
  (`LockedOutline` + `LockedPreviewModal`.)
- Name + notes in a `MorePanel`; save as a named template; reopen live.
- Soft, suggestion-driven pickers (`SearchableSelect` + `suggestedIds`).
- "One authored row expands into many performed rows" — the **sequence rounds/
  overrides → performed sets** idea becomes **subject → split sub-rows → totals**.

**Must differ (and why):**

- **No fixed 4-level tree.** Depth is 2 (subject → facet) + one optional Group.
  Insights questions are shallow; forcing Block/Sequence wrappers adds ceremony
  with no meaning.
- **Nest labels are filters, not spine.** Session/block/sequence labels are global
  WHERE (L3), optionally per-subject override — not a node each set belongs to.
- **Leaf is a selection, not a value.** You pick "show reps (sum)"; you don't type
  `3×10 @ BW`. Facets read the data; targets prescribe it.
- **Direction reverses.** Templates nest up (author a tree); asks denest down (a
  subject fans out into result rows). The visible "nesting" in results is *computed*,
  not authored.
- **No structural color spine.** The red/blue/violet/gold layer tokens encode
  Session/Block/Sequence/Exercise roles. Insights has no such roles — use one subject
  accent, don't smuggle in the workout palette.

---

## 7. Murph example asks (nested outlines)

### Query A — Murph weighted work (Pullups / Pushups / Squats)

Authored (unlocked body):

```
Ask  "Murph — weighted work"
  Window   rolling · last 7 days
  Scope    Block = Challenge          (global WHERE)
  Set      Working only
  Subjects
    ▸ Pullups   facets: reps (sum), load (avg)
    ▸ Pushups   facets: reps (sum)
    ▸ Squats    facets: reps (sum), load (avg)
```

Locked grammar (what `LockedPreviewModal` would page):

```
Murph — weighted work
last 7 days · Block: Challenge · Working
  Pullups   450 reps · avg 20 lb (12 sets)
  Pushups   900 reps
  Squats    600 reps · avg 45 lb
```

Note: no combined total across Pullups/Pushups/Squats — unlike measures, credit-each.

### Query B — Cardio + hangs (Gait + Deadhangs), with a split

Authored:

```
Ask  "Cardio + hangs"
  Window   rolling · last 7 days
  Subjects
    ▸ Gait       facets: distance (sum), time (sum)   split by: variation
    ▸ Deadhangs  facets: time (sum)
```

Locked grammar (Gait's split denests into sub-rows + a totals line):

```
Cardio + hangs
last 7 days
  Gait                       split: variation
    ├ Ruck     2.0 mi · 34 min
    ├ Run      1.0 mi · 9 min
    └ total    3.0 mi · 43 min
  Deadhangs   6:30 hang time
```

Deadhangs shows only time (no fake distance); Gait keeps distance and time separate
(no fake combined metric). The split is the sequence-expansion analog: one authored
subject, many computed rows.

### Optional — balance as a Group (the one nesting level)

```
Ask  "Push / Pull balance"  (saved, not the home screen)
  Window   rolling · last 28 days
  Group  "Push"  rollup: combined     → Pushups, Dips, Overhead Press   (credit-each)
  Group  "Pull"  rollup: combined     → Pullups, Rows, Deadhangs
```

Groups are where deliberate nesting pays off — compare/rollup, capped at one level.

---

## 8. Decisions (signed off — Jul 22)

All resolved by Nate. Build to these; reopen only if a slice surfaces a real
conflict.

| # | Decision | Ruling (v1) |
|---|---|---|
| 1 | Depth cap | **Flat subjects + one optional Group.** No group-in-group. |
| 2 | Split-by dims | **`variation` + `tool` only.** Load / date buckets later. |
| 3 | Nest scope | **Global-only.** Per-subject override deferred. |
| 4 | Summary ops | **`sum` / load `avg` / sets `count` only** (match Dashboard). No ops picker yet. |
| 5 | `saved_insights` | JSON shape in §5 approved. **Author the migration only at slice 4**, after shell + lock + split feel right — **ask again then.** No `008`. |
| 6 | Reopen / home | **Saved-list first → opens OPEN + locked.** Blank draft via a **"New ask"** entry. |
| 7 | Group rollup | **Credit-each for v1 `combined`.** Partition = later toggle on the Group node. |
| 8 | One PG per card | **Confirmed.** Multi-PG = stacked cards, never multi-PG-in-one-card. |
| 9 | Lock granularity | **Full tree** (ask / group / subject). Reuse `LockController`. |
| 10 | Set policy scope | **Set type + warmups stay global-only (L3).** No per-subject set-type override on L1 in v1. |

**Build order (locked):** slices **1 → 2 → 3** before any save. **Groups stay
slice 5** — balance nesting must not delay the shell.

---

## 9. Phased build slices (capability first)

Each slice is small and leaves the Dashboard untouched. No commit without Nate.

- **Slice 0 — design (this doc).** Nesting contract + definition shape. No code.
- **Slice 1 — builder shell (no persistence).** Replace the placeholder with a real
  form: flat Subject cards in `NestedLayer` chrome, per-subject facets + identity
  scope (reuse `loadInsightQuery` as-is), global window/scope/set-policy disclosures,
  collapse per card. Ephemeral only. This is "Dashboard readout in builder skin."
- **Slice 2 — lock + preview.** Wire `LockController` (ask/subject) → grammar line;
  `LockedOutline` for expanded-locked subjects; `LockedPreviewModal` for share.
  Ephemeral, still no save.
- **Slice 3 — per-subject split + totals.** Extend `insights.ts` aggregation to group
  a PG's facts by variation/tool with a totals line (credit-each safe). Render the
  breakdown in-card and in the locked outline.
- **Slice 4 — save / reopen.** `saved_insights` (ask first), name+notes via
  `MorePanel`, Library-like list/picker, rolling-vs-pinned window in the definition,
  reopen → OPEN + locked, re-run live.
- **Slice 5 — groups + seeds.** Optional Group/compare level + balance rollup;
  1–2 seeded default asks for new accounts (with Chat 6).

Polish (madlib phrasing, chip grammar) rides on top once the nested form + save/lock
hold.
