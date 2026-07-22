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
> **Ground truth today:** `src/lib/insights.ts`, `src/screens/insights/`
> (`InsightsHubScreen`, `InsightsDashboardScreen`, `InsightsQueryBuilderScreen`),
> `sql/greenfield/007_session_logs.sql` (`v_log_set_facts`).
> Phase **1a** was interim substrate. Phases **2–3a** shipped the **Dashboard**
> (PG-first facets + per-PG scope cards). **Query builder** (nested, savable,
> lockable) is the live product bet — placeholder in app, design next.
>
> **Jul 22 reframe (supersedes framing below where they conflict):** Insights is a
> **card hub** (like Library / Create) with **two tools**:
> 1. **Dashboard** — the PG-first facet readout built in Phases 2–3a (per-PG scope
>    cards, shape-driven facets). A **fast, unsaved** look. **No saving here.**
> 2. **Query builder** — the real product bet: a **nested query form** that mirrors
>    the log/template builders. Collapsing dropdowns per layer, **lock per layer**
>    to a grammar-condensed line (expand to edit), a **preview modal** for the
>    expanded locked outline, and **savable/reusable** asks (save like a template;
>    reopen to the OPEN + locked clean view; re-run live). Each exercise query
>    subdivides into modifiers / loads / variations across the data, then a totals
>    line. **Capability first**, then friendliness.
>
> So "Saved Insights + lock" is **not** a light add-on to the draft form — it is a
> separate, builder-grade nested screen. The per-PG card work is the Dashboard.

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
5. **Save as template:** named **Saved Insights** (name + notes) reopen with
   **live** data; date config can be rolling or pinned historic.
6. **Lock for grammar:** optional lock → clean, paginated outline for screenshot /
   share — same family as Locked Preview (*chef’s kiss* contract). Per-PG cards
   collapse to ask grammar (override-row analogy) while editing.

**Category stays** — as **metadata on the PG** (balance / grouping), not a co-equal
“lens” fighting PG for attention. Balance views are **saved queries** or a
secondary strip, not the home screen.

Phase **1a** made numbers honest (multi-metric, `v_log_set_facts`). **Phases 2–3a**
shipped the **Dashboard** (draft form → per-PG scope cards). **Phase 3b+** is the
**nested Query builder** (save + lock) — a separate builder-grade screen, not an
add-on to the Dashboard. Old “Power cube” and “Simple card stack” are **parked**.

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

**Concept (Phase 3 — builder parity):** A Saved Insight is a **named query
template** in the same product family as session logs / templates — not a
dashboard bookmark.

User builds → **Save** (name + notes) → Insights home / picker lists Saved
Insights → tap → **autopopulates** the query form (or opens locked) and
**re-runs** against current facts.

Examples:

- “Murph pull volume — Challenge blocks, last 7 days” (**dynamic** window)
- “Pullups week of June 13” (**static / historic** pinned range)
- “Hang time — Deadhangs, all blocks”
- “Gait — distance + time, Main sessions”

**Properties:**

- Saved Insight = serialized **query definition** (JSON), not a frozen screenshot.
- Re-run on open (and pull-to-refresh).
- **Name + notes** (More-panel DNA from builders).
- **Date mode** in the definition: rolling preset (e.g. last 7) vs fixed
  `from`/`to` — so “last 7 days” stays live and “week of June 13” stays
  historic.
- Optional pin / reorder; elegant **picker / form-card list** to open a saved
  ask (Library-like), not a secondary analytics mode.
- Starter pack: 2–3 seeded Saved Insights for new accounts (after Chat 6) — e.g.
  “This week by PG (reps)” as onboarding, still deletable.

**Per-PG scope (Jul 2026 feel — Phase 3 target):**

Selecting Primary Groups **spawns one card/row per PG** (sequence-**override**
analogy: open to edit, collapse to grammar). Identity filters (variations,
tools, …) attach **to that PG**, not as a single global bag. Shared nest labels
+ window + set policy can remain query-level. Collapsed row = readable ask
grammar (same *idea* as override chips — exact chip syntax TBD / will track
builder override overhaul).

Mental model: **autoformatter in front of the fact engine** — author a clean
ask; `v_log_set_facts` answers with shape-driven facets.

**Schema (app, Phase 3):** new table e.g. `saved_insights`
(`user_id`, `name`, `notes`, `definition jsonb`, `sort_order`, `created_at`).
No change to log facts. **Ask before migrating.**

---

## 6. Lock — clean grammar for share / screenshot

Reuse **Locked Preview** product pattern (`LockedPreviewModal`, outline
pagination) — Nate: locked builder UI is *chef’s kiss*; Insights lock should
feel like the **same family**.

- **Unlock:** full query form editable (per-PG cards + global scope/dates).
- **Lock:** read-only **converted grammar** — compact lines per PG (ask + facet
  totals), optional per-exercise breakdown, paginated for screenshots.
- Collapse of a per-PG card while unlocked can preview the same grammar row
  the lock outline will use.

Not a pixel clone of SessionEditor nest trees — same **lock = presentation
mode** contract and visual language.

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

**Phase 1a chrome:** retired. Date pickers / filter patterns / `v_log_set_facts`
loader live on in Phase 2.

---

## 9. Phased scope

### Phase 0 — Docs (this chat)

- Archive v1 proposal → `docs/deprecated/`
- This doc + `Status.md` sync
- **Decision:** PG-first query builder is canonical; v1 Hybrid cube is historical

### Phase 1 — Shipped substrate (done)

- `v_log_set_facts`, multi-metric honesty, last-7, filters sheet, Working default
- **Treat as throwaway IA** — logic migrates, layout does not

### Phase 2 — Query builder MVP — **done**

**Goal:** “Pick Pullups → see reps, time, load if logged” feels right on Murph.

- [x] Insights screen → **Query form** layout (PG multiselect first)
- [x] Per-PG **facet panel** (shape + logged presence; stacked multi-PG)
- [x] Scope disclosure: session / block / **sequence** labels + variations / tools / set type
- [x] Date window control (reuse `SessionDateControl`; last 7; Working + warmups)
- [x] Read still from `v_log_set_facts`; facet aggregation in `insights.ts` (incl. load avg, not tonnage)
- [x] **No Saved Insights yet** — single draft query only
- [x] Category / balance → removed from default path

**Out of scope (still):** lock mode, saved templates table, trends/time buckets, derived calcs UI

### Phase 3 — Insights hub + nested Query builder (Jul 22 reframe)

**Goal:** Insights is a card hub. **Dashboard** is the fast unsaved look
(Phases 2–3a, done). The **Query builder** is a builder-grade **nested query
form** — the same product family as the log/template builders — with save + lock.

**3a — Dashboard (done):** hub + per-PG scope cards (variations/tools scoped per
PG, soft suggestions), shape-driven facets. Lives behind the Dashboard card.
**No saving on the Dashboard.**

**3b — Query builder (in progress):**

> **Nesting design contract:** [`Insights_Query_Builder.md`](./Insights_Query_Builder.md)
> — the bottom-up layer model (facet → subject → body/groups → query-global → ask),
> builder DNA reuse map, and phased slices. Read it before any Query builder UI work.
> Key departure: keep builder *DNA* (collapse / lock → grammar / preview / save),
> drop the 4-level structural tree — Insights nests by **subject**, with nest labels
> as filters and one optional Group level.

- [x] Insights card hub (`InsightsHubScreen`) → Dashboard + Query builder; routing in `HomeScreen`
- [ ] Query builder screen: **nested collapsing dropdowns** per layer (subject → facets → scope → window), madlib-style operation selectors
- [ ] **Lock per layer** → grammar-condensed line; expand to edit (mirror builder lock/dropdown grammar)
- [ ] **Preview modal** for the expanded locked outline (Locked Preview family)
- [ ] `saved_insights` persistence (`name`, `notes`, `definition jsonb`, …) — **ask before migrating**
- [ ] Save / rename / delete / list + elegant picker (Library-like); reopen → dropdown=OPEN + lock=TRUE clean view, re-run live
- [ ] Per-exercise-query breakdown: modifiers / loads / variations across the data, then a totals line
- [ ] Dynamic (rolling) vs static (pinned) date windows in definition
- [ ] 1–2 default saved asks for new users (optional, with Chat 6)

Capability first; friendliness (madlib polish) once the nested form + save/lock hold.

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

## 11. Open decisions (Nate)

### Phase 2 lean locks (shipped)

| # | Topic | Decision (Jul 2026) |
|---|--------|---------------------|
| 1 | Multi-PG layout | **Stacked panels** first (one panel per PG). Tabs only if stacked gets too tall. |
| 2 | Load facet | Show facet when any set has load; v1 summary = avg load — **not** tonnage. |
| 3 | Insights home (Phase 2) | **Draft query form** as home (pre-hub). **Superseded Jul 22:** Insights home = **card hub**; draft form lives under **Dashboard**. |
| 4 | Category enum | **Keep** through Phase 2; PG-groups multi-axis stays Phase 5. |
| 5 | 1a screen | **Replace in place** when Phase 2 ships (no long dual-UI / feature flag). |
| 6 | Wellness / nest labels | Does **not** block Phase 2; resolve with Chat 6 / New User Seeds. |

### Phase 3 ideation locks (Jul 22 — Dashboard vs Query builder)

| # | Topic | Direction |
|---|--------|-----------|
| 7 | Insights = two tools | **Dashboard** = fast unsaved look (done). **Query builder** = nested savable/lockable builder (in progress). |
| 8 | Per-PG filters (Dashboard) | **Shipped on Dashboard:** one card per PG; variations/tools per PG (soft suggestions). |
| 9 | Query builder lock | Lock **per layer** → grammar-condensed line; preview modal = Locked Preview family |
| 10 | Date saves | Support **dynamic** (rolling) and **static** (pinned range) in saved definitions |
| 11 | Name + notes | First-class on saved asks (builder More DNA) |
| 12 | Query builder home | Saved-list / picker / blank draft — TBD in Query builder design pass |

Still open: credit-each vs partition on balance saved views; Query builder nest depth / madlib ops; builder lock/pills mirror on nest editors.

---

## 12. Implications for other docs / code

- **`Insights_Query_Builder.md`:** the Query builder **nesting design contract** (layer model, DNA reuse, `SavedInsightDefinition` shape, slices). §5–6 + §9 Phase 3b defer to it.
- **`Status.md`:** Next = nested Query builder (3b); Dashboard (2–3a) = shipped; Insights = hub
- **`Analytics_Labeling.md`:** PG-first decision rule unchanged; de-emphasize “lens”
  language in UI copy when touched
- **`Database_Outline.md`:** Insights query contract + `InsightQuery` (incl. per-PG maps) — keep in sync
- **`.cursor/rules/insights.mdc`:** hub + Dashboard shipped; Query builder direction
- **Chat 6:** still blocked until Counts as shape accepted (Phase 4)

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
