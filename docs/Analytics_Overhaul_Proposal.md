# Analytics Overhaul — Proposal (PG-first query builder)

> **Status:** Canonical product direction (Jul 2026). **Plan / scope only** — no
> implementation ships from the doc edit alone. Supersedes the Hybrid / Simple+Power
> cube proposal archived at
> [`deprecated/Analytics_Overhaul_Proposal_v1_hybrid_cube.md`](./deprecated/Analytics_Overhaul_Proposal_v1_hybrid_cube.md).
>
> **Read alongside:** [`Status.md`](./Status.md),
> [`Analytics_Labeling.md`](./Analytics_Labeling.md),
> [`Template_Builders.md`](./Template_Builders.md),
> [`Database_Outline.md`](./Database_Outline.md),
> [`New_User_Seeds.md`](./New_User_Seeds.md).
>
> **Ground truth today:** `src/lib/insights.ts`, `src/screens/insights/`,
> `sql/greenfield/007_session_logs.sql` (`v_log_set_facts`).
> Phase **1a** (metric-aware dashboard) is **shipped substrate**, not the destination UI.

---

## 1. Executive summary

OttoLog’s **capture layer is excellent** — nested templates denest into one fact
per set, and `v_log_set_facts` already carries reps, time, distance, load, nest
labels, PG, muscles, variations, and tools. The product gap is **not** “we need
more measures.” It’s that Insights still feels like a **dashboard bolted onto a
builder product**.

**New direction (locked):** Insights is a **query builder with builder DNA** — not
a `metric × lens × filter` cube.

1. **Subject first:** user picks **Primary Group(s)** — the chart noun(s).
2. **Shape-driven facets:** for each PG, show **what was actually logged** — reps,
   time, distance, load — from target shape + set facts. Not “pick Tonnage and
   hope.” Derived calcs (tonnage, e1RM) are **optional advanced**, never the default
   language.
3. **Nest scope:** session / block / sequence labels filter **where** the subject
   appeared. Repeating labels across layers is fine — same as logging.
4. **Window + set policy:** date range, Working-only, warmups — tucked chrome.
5. **Save as template:** named **Saved Insights** reopen with **live** data for that
   query definition.
6. **Lock for grammar:** optional lock → clean, paginated outline for screenshot /
   share (reuse Locked Preview *ideas*, not clone builder chrome).

**Category stays** — as **metadata on the PG** (balance / grouping), not a co-equal
“lens” fighting PG for attention. Balance views are **saved queries** or a
secondary strip, not the home screen.

Phase **1a** made numbers honest (multi-metric, `v_log_set_facts`). **Phase 2+**
replaces the IA with this form. Old “Power cube” and “Simple card stack” are
**parked** in favor of **saved query templates**.

---

## 2. Why the dashboard model failed the vibe test

Phase 1a fixed trust (time/distance no longer vanish) but **usability** still
suffers:

| Dashboard pain | Root cause |
|---|---|
| “What am I looking at?” | Measure (metric) chosen before subject (PG) |
| Category feels conflated | Category, lens, balance, tonnage compete as peers |
| Tonnage as headline | Privileges a **calc** over atomic logged fields |
| Auto / one number per bar | Fights multi-metric exercises (Pushups: reps *and* time *and* load) |
| Six lenses | Analyst vocabulary; not builder vocabulary |
| Filters sheet | Right idea, wrong frame — filters should scope a **query**, not decorate a chart |

**Nate’s insight:** exercises are **atomic units with shapes**. Analytics should
**leverage shapes** — show reps, time, load **as they appear** for the PG you
care about. That’s simpler *and* more capable than a metric selector.

---

## 3. Core mental model — the Insight Query

An **Insight** is a **saved (or draft) query** over complete session logs. Mental
madlib (user-facing, not SQL):

```
SHOW   [facets…]              ← reps / time / distance / load / set count (per PG)
FOR    [Primary Group(s)…]  ← required subject
WHERE  [nest labels…]         ← optional scope (session / block / sequence)
AND    [variations / tools / set type…]
IN     [date window]
```

**Order matters:** FOR → SHOW → WHERE → IN. Subject before facets before scope.

### 3.1 Layer 0 — Subject (Primary Groups)

- **Required.** One or many PGs.
- PG is the **privileged chart noun** (unchanged identity conviction).
- Multi-PG = compare or combined panel — UI TBD; credit-each stays under the hood
  for complexes (never sum PG rows blindly).

### 3.2 Layer 1 — Facets (shape-driven, per PG)

For **each selected PG**, expose **facets** derived from:

1. **Target shape** (which fields *can* exist: Reps, Time, Time & Distance, …)
2. **Logged facts** in the window (which fields *did* exist — NULL discipline)

**Default facets (atomic, not derived):**

| Facet | Source | Display |
|---|---|---|
| Reps | `effective_reps` | count |
| Time | `time_seconds` | minutes (or h:m for long) |
| Distance | `distance_meters` | mi / km (user pref later) |
| Load | `load_value` + unit | per-set or summary policy TBD |
| Set count | row count | sets |

**Rules:**

- Show a facet **only if** the PG’s exercises logged it in-window (or shape says
  it’s expected — empty state copy, not fake zero).
- **Multi-facet is normal:** Pushups can show reps + time + load side by side.
- **Never sum unlike facets** into one total (same rule as 1a, structural in UI).
- **Derived** (tonnage, e1RM, intensity averages): **Advanced** chip per PG, off by
  default. Not the primary vocabulary.

**Optional default facet (Phase 2b / taxonomy):** PG **“Counts as”** (`natural_metric`)
= which facet opens **expanded first** — not the only facet. Replaces 1a Auto as
headline default; see §7.

### 3.3 Layer 2 — Scope (nest + identity filters)

**Structure filters** — where the work happened:

- Session label(s)
- Block label(s)
- Sequence label(s)

Repeating the same label name on session *and* block is **OK** — user picks the
layer they mean. This mirrors the nest builders.

**Identity filters** (narrow, not group-by):

- Variations (any-of)
- Tools (any-of)
- Set type (Working default; warmups toggle)

Nest labels are **WHERE**, not rival subjects. No “lens” vocabulary in the UI.

### 3.4 Layer 3 — Window + policy

- Date range (real pickers; default last **7** days inclusive — keep from 1a).
- Complete logs only (unchanged).
- Working-only default + include warmups (unchanged).

### 3.5 Category / balance

- **Category** = property of each PG (today’s enum; later seeded-editable PG
  groups). Used for **balance saved views**, not the main query path.
- Example saved Insight: “Push / Pull / Lower balance — last 28 days” = query with
  group-by category, facets per category bucket — **a template**, not home screen.
- Data-only buckets (hide zeros) — keep from 1a.

---

## 4. Builder parallels (why this feels like OttoLog)

| Template / log builder | Insight query builder |
|---|---|
| Pick exercise + PG | Select Primary Group(s) |
| Target shape → input fields | Shape → **facet** availability |
| Session / Block / Sequence label | Scope filters (WHERE) |
| Variations, tools on exercise | Identity filters |
| Save template | **Save Insight** |
| Review mode + lock → clean outline | **Lock Insight** → paginated grammar / screenshot |
| Add block / sequence / exercise | *(no nesting in results — flat facts)* |

**Not identical UI** — same *mental stack*: identity → fields → placement → save → lock.

Engineers may notice the SQL shape; users see **“what / how / where / when.”**

---

## 5. Saved Insights (templates)

**Concept:** User builds a query in the form → **Save** with a name → Home / Library
lists Saved Insights → tap → **live** aggregate for current logs.

Examples:

- “Murph pull volume — Challenge blocks, last 7 days”
- “Hang time — Deadhangs, all blocks”
- “Gait — distance + time, Main sessions”

**Properties:**

- Saved Insight = serialized **query definition** (JSON), not a frozen screenshot.
- Re-run on open (and pull-to-refresh).
- Optional pin / reorder on Insights home.
- Starter pack: 2–3 seeded Saved Insights for new accounts (after Chat 6) — e.g.
  “This week by PG (reps)” as onboarding, still deletable.

**Schema (app, Phase 2):** new table e.g. `insight_views` or `saved_insights`
(`user_id`, `name`, `definition jsonb`, `sort_order`, `created_at`). No change to
log facts. Ask before migrating.

---

## 6. Lock — clean grammar for share / screenshot

Reuse **Locked Preview** product pattern (`LockedPreviewModal`, outline pagination):

- **Unlock:** full query form editable (like template builder).
- **Lock:** read-only **result grammar** — compact lines per PG + facet totals,
  optional per-exercise breakdown, paginated for screenshots.

Not a pixel clone of SessionEditor — same **lock = presentation mode** contract.

---

## 7. Taxonomy touchpoints (PG settings, simplified)

Complexity on the **vocabulary row**, not every log (Rest / `is_empty` pattern):

| PG field | Job in new model |
|---|---|
| **Category** | Balance / grouping (keep; later multi-axis PG groups) |
| **Counts as** (`natural_metric`) | **Default expanded facet** in Saved Insights — *not* the only facet |
| Muscles / variations / tools | Unchanged |

Chat 6 seeds teach category + Counts as; Insights reads Counts as for **default
facet order**, not for hiding other logged facets.

**Carry forward from v1 proposal:** additive `natural_metric` on
`analytics_primary_groups` — still Phase 2b, ask before `008`.

---

## 8. What we keep vs kill

| Keep | Kill / park |
|---|---|
| PG as chart noun (1–N) | Metric-first home screen |
| `v_log_set_facts` as read source | Six co-equal lenses as primary IA |
| Shape / atomic facets (reps, time, distance, load) | Tonnage as default card |
| Nest labels as scope (WHERE) | Category as peer “lens” on home |
| Category on PG for balance views | Simple mode card stack + Power cube (v1 D) |
| Credit-each under the hood | Auto heuristic as the long-term model |
| Complete logs only | Summing mixed facets/units |
| Saved templates pattern from builders | Dashboard-only Insights |

**Phase 1a app:** keep running until query builder ships; may reuse date pickers,
filter components, and fact loader internals.

---

## 9. Phased scope

### Phase 0 — Docs (this chat)

- Archive v1 proposal → `docs/deprecated/`
- This doc + `Status.md` sync
- **Decision:** PG-first query builder is canonical; v1 Hybrid cube is historical

### Phase 1 — Shipped substrate (done)

- `v_log_set_facts`, multi-metric honesty, last-7, filters sheet, Working default
- **Treat as throwaway IA** — logic migrates, layout does not

### Phase 2 — Query builder MVP

**Goal:** “Pick Pullups → see reps, time, load if logged” feels right on Murph.

- [ ] Insights screen → **Query form** layout (PG multiselect first)
- [ ] Per-PG **facet panel** (shape + logged presence)
- [ ] Scope row: session / block / sequence labels + variations / tools / set type
- [ ] Date window control (reuse `SessionDateControl`)
- [ ] Read still from `v_log_set_facts`; facet aggregation in `insights.ts`
- [ ] **No Saved Insights yet** — single draft query only
- [ ] Category / balance → remove from default path (or one link “Balance view…”)

**Out of scope:** lock mode, saved templates table, trends/time buckets, derived calcs UI

### Phase 3 — Saved Insights + lock

- [ ] `saved_insights` (or equivalent) persistence
- [ ] Save / rename / delete / list on Insights home
- [ ] Lock → paginated result outline (screenshot grammar)
- [ ] 1–2 default Saved Insights for new users (optional, with Chat 6)

### Phase 4 — Taxonomy + seeds

- [ ] PG **Counts as** column + Account edit UI (default facet)
- [ ] Chat 6: New User Seeds with category + Counts as
- [ ] Balance as **saved template** using category rollup

### Phase 5 — Later

- Trend axis (week / month buckets) per Saved Insight
- Derived facets (tonnage, e1RM) as advanced toggles
- PG-groups multi-axis (replace hard category enum)
- Compare mode (multi-PG tabs vs stacked panels)

---

## 10. Murph walkthrough (acceptance sketch)

**Query A — Murph weighted work**

- FOR: Pullups, Pushups, Squats
- SHOW: Reps (+ Load if tracked)
- WHERE: Block = Challenge (or sequence/exercise names if unlabeled)
- IN: last 7 days

**Expect:** rep totals per PG; load visible on weighted sets; no time/distance
unless logged on those exercises.

**Query B — Cardio + hangs**

- FOR: Gait, Deadhangs
- SHOW: Distance + Time (Gait); Time (Deadhangs)
- IN: last 7 days

**Expect:** miles + minutes for Gait; hang seconds/minutes for Deadhangs; **no**
fake combined total.

**Query C — Balance (saved, not home)**

- Saved Insight “Category balance”
- FOR: all tracked PGs
- GROUP BY: category (rollup)
- SHOW: default facet per category bucket (Counts as when seeded)

---

## 11. Open decisions (Nate) — lean locks for Phase 2

| # | Topic | Decision (Jul 2026) |
|---|--------|---------------------|
| 1 | Multi-PG layout | **Stacked panels** first (one panel per PG). Tabs only if stacked gets too tall. |
| 2 | Load facet | Show facet when any set has load; v1 summary = simple presence / last-or-avg load — **not** tonnage. |
| 3 | Insights home (Phase 2) | **Draft query form** as home. Saved list lands in Phase 3. |
| 4 | Category enum | **Keep** through Phase 2; PG-groups multi-axis stays Phase 5. |
| 5 | 1a screen | **Replace in place** when Phase 2 ships (no long dual-UI / feature flag). |
| 6 | Wellness / nest labels | Does **not** block Phase 2; resolve with Chat 6 / New User Seeds. |

Still open for later: credit-each vs partition on balance saved views; builder lock/pills mirror.

---

## 12. Implications for other docs / code

- **`Status.md`:** Next = Insights query builder MVP (Phase 2); 1a = substrate
- **`Analytics_Labeling.md`:** PG-first decision rule unchanged; de-emphasize “lens”
  language in UI copy when touched
- **`Database_Outline.md`:** Insights contract section should eventually describe
  query definition + facets — **defer edit** until Phase 2 starts (or add stub pointer)
- **`.cursor/rules/insights.mdc`:** point at this doc; “dashboard Phase 1a” is interim
- **Chat 6:** still blocked until Phase 2 feel + Counts as shape accepted (Phase 4)

---

## 13. Appendix — glossary

| Term | Meaning |
|---|---|
| **Insight / Saved Insight** | A query definition (+ optional saved name). Saved = persisted template with live results. |
| **Query form** | The builder-shaped UI for drafting an Insight. |
| **Subject** | Primary Group(s) — required FOR clause. |
| **Facet** | An atomic measure toggled per PG: reps, time, distance, load, set count. |
| **Derived facet** | Computed measure (tonnage, e1RM) — advanced, off by default. |
| **Scope** | Nest label + identity filters (WHERE). |
| **Counts as** | PG default facet (`natural_metric`); not the only visible facet. |
| **Category** | PG balance metadata; surfaced via saved balance views, not main path. |
| **Lock** | Presentation mode — paginated result grammar for share/screenshot. |
| **Fact** | One `log_sets` row; `v_log_set_facts` flattening unchanged. |
| **Credit-each** | Multi-PG / multi-muscle rollups credit every tag; never sum blindly. |

---

## 14. Superseded doc

Full audit, four approaches (A–D), Hybrid / Simple+Power recommendation, and
Phase 1a/1b cube sequencing:

→ [`deprecated/Analytics_Overhaul_Proposal_v1_hybrid_cube.md`](./deprecated/Analytics_Overhaul_Proposal_v1_hybrid_cube.md)

**Salvage from v1:** fact-layer audit (§2), user-job map (§3), glossary overlap,
PG Counts as sketch (now default **facet**, not sole metric), category → PG-groups
long-term, Chat 6 implications (§7).
