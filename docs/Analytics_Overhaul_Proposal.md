# Analytics Overhaul — Proposal (PLAN ONLY)

> **Status:** Proposal / discussion doc. **No app code, no SQL, no migrations
> ship from this chat.** This is the design deliverable for `Status.md` Next
> **#1 (Insights product rethink)** and **#2 (Identity conviction)**. Chat 6
> seeds stay **blocked** until a direction here is accepted.
>
> **Read alongside:** [`Status.md`](./Status.md),
> [`New_User_Seeds.md`](./New_User_Seeds.md),
> [`Analytics_Labeling.md`](./Analytics_Labeling.md),
> [`Label_Library.md`](./Label_Library.md),
> [`Database_Outline.md`](./Database_Outline.md),
> [`Template_Builders.md`](./Template_Builders.md).
> **Ground truth code:** `src/lib/insights.ts`, `src/screens/insights/`,
> `sql/greenfield/005_analytics.sql`, `sql/greenfield/007_session_logs.sql`
> (`v_log_set_facts`).
>
> Glossary of every term this doc uses is in the **Appendix** — read it if a
> word feels ambiguous, so a later chat doesn't invent a synonym.

---

## 1. Executive summary

OttoLog's tracking substrate is genuinely good: a dynamic nest (Session → Block
→ Sequence → Exercise) that denests into one relational fact per set
(`log_sets`), with a fact view (`v_log_set_facts`) that already canonicalizes
time (seconds), distance (meters), tonnage, and effective reps, and carries
every dimension a set belongs to (session/block/sequence label, PG, muscle,
variation, tool). The capture layer can already answer far more than the product
shows.

The **product surface is the weak link, and one flaw dominates: Insights is
reps-first in a multi-metric world.** The headline "Volume" number is *effective
reps*. A timed deadhang, a gait mile, a sparring round, a meditation minute all
produce **zero reps** and therefore vanish from the headline chart. Three of the
eight pressure-test jobs ("gait miles", "time under hang", combat time) are
**structurally unanswerable** in the UI today even though the fact layer holds
the numbers. A fourth ("Pullups volume *over time*") is unanswerable because
Insights is a single-window **snapshot with no trend axis at all**.

The second-order problems compound this:

- **`category` is a hard 10-value CHECK enum on the PG** — a designer ontology
  baked into schema. It contradicts OttoLog's user-vocabulary DNA, forces a
  single balance axis (you can't have Push/Pull *and* Upper/Lower *and*
  Strength/Conditioning), and produces the "empty category buckets" question.
- **Two parallel taxonomies (exercise identity vs nest labels) are flattened
  into six co-equal "lenses,"** which is powerful but muddies the mental model:
  the user can't tell "what I did" axes from "where I did it" axes.
- **Credit rules are internally inconsistent to the user** — PG/category/muscle
  double-count (credit-each), while totals count once. The "never sum" rule
  lives in hint text, not in the model.
- **Variations are filter-only, never a lens**, so "of Live Sparring, how much
  BJJ?" can't be grouped.

This doc audits the whole stack honestly, maps the eight user jobs to concrete
gaps (including the Status smoke findings: multi-metric, balance zeros, filter
chrome, date UX), then proposes **four distinct approaches** spanning
keep → revise → overhaul → hybrid, compares them, and recommends one.

**Recommendation (detail in §6):** a **Hybrid (Approach D)** built from the best
parts of B and C —

1. **Make Insights metric-aware** (reps / time / distance / tonnage / sets),
   reading the existing `v_log_set_facts`. Each PG gets a **natural metric** so
   its headline number never lies. *(No schema change — ships first.)*
2. **Free `category` from a hard enum into seeded-but-editable "PG groups"**
   (balance axes), so balance is user vocabulary and **multi-axis**.
3. **Progressive disclosure**: a curated **Simple mode** answers the top jobs
   with zero config; a **Power mode** exposes a `metric × dimension × time` cube
   for custom questions.

This keeps everything that makes OttoLog OttoLog (chart-noun PGs, anatomy axis,
modifier variations, the infinite nest, credit-each defaults, the fact view),
kills only the reps-only headline and the hard category enum, and **ships in
phases with the highest-value, zero-schema win first** — which is exactly what
unblocks the "does Insights *feel* right" decision that Chat 6 waits on.

---

## 2. Audit — what's strong / weak (honest)

### 2.1 Nest hierarchy (Session → Block → Sequence → Exercise → sets)

**Strong.** The nest is the product's crown jewel: infinite canvas, ordered
children, JSON templates that denest into clean relational log rows. `log_sets`
is a real fact table; `v_log_set_facts` flattens one row per set with all
ancestor labels and all identity arrays already attached. This is a textbook
star-schema grain and it's *already built*. Sequences expand rounds/overrides
into individual performed sets on denest, so circuits and complexes become
first-class facts, not opaque blobs.

**Weak.** Nothing structural. The weakness is that the **product doesn't read
the richest part** (`insights.ts` still hand-joins `log_sets` and ignores
`time_seconds` / `distance_meters` / the structural node durations that the view
computes). The fact layer is ahead of the surface.

### 2.2 Nest labels (session / block / sequence)

**Strong.** Labels are stored on the logged facts
(`session_logs.category_id`, `log_blocks.label_id`, `log_items.label_id` for
clusters), so "all Challenge blocks" or "Circuit vs Superset" are directly
queryable. `Main` (not `Workout`), `Challenge`, `Rest`/`is_empty`, and the
system nulls are sensible. Labels double as Insights grains.

**Weak / unresolved.**

- **Placement ambiguity.** `Wellness` is a *block* label, but a whole
  sauna/breath day is really a *session* intent — hence the open question of
  block vs session vs both. The model has no clean answer because "kind of day"
  and "kind of block" are different axes stuffed into fixed per-layer lists.
- **Labels-as-lenses conflate structure with identity.** In the UI, "Block
  label" sits next to "Primary Group" as a co-equal lens, but one answers *where*
  and one answers *what*. Users won't intuit which chip answers which job.
- Seeded label lists are effectively a **fixed vocabulary** (via
  `ensure_default_template_labels`), which is fine as *defaults* but is presented
  more rigidly than the "user vocabulary" DNA implies.

### 2.3 Exercise identity slots

Current slots: **Primary Group(s) 1–N** (each with a `category`), **muscle
groups 0–N**, **Variations 0–N** (`analytics_tags`), **Tools ≥1**,
**`track_analytics`** (on/off), **`track_intensity`**, **target shape**.

**Strong.** The four-axis split (PG = chart noun / muscles = anatomy /
variations = modifiers / tools = equipment) is clean and well-documented; each
axis does exactly one job and nothing is double-encoded (equipment is never a
variation, planes/regions were removed because PG+category+muscles cover them).
Multi-PG for complexes is a real, correct idea. Suggested-variations-per-PG is a
nice soft-filter that never constrains stored links.

**Weak.**

- **`category` is a hard enum.** `CHECK (category in ('Push','Pull',…))` — ten
  designer-chosen values, one per PG. This is the single most DNA-violating piece
  of schema in the analytics stack. Consequences:
  - **One balance axis only.** You cannot express Push/Pull *and* Upper/Lower
    *and* Strength/Conditioning; they're three partitions but there's one column.
  - **One category per PG.** `Core Work` is Core, but core is also "trunk" for
    some users; `Jumps` is Power but also plyometric conditioning. No nuance.
  - **Empty buckets.** The chart lists the full enum; categories with no data
    show as zeros (Status open question).
  - **Not user vocabulary.** Users can't rename or re-axis "Push".
- **`track_analytics` is all-or-nothing.** Off → the exercise has no PG and is
  invisible to Insights (session narrative only). There's no "count my minutes
  but I don't care to assign a movement bucket" middle ground.
- **Target shape is decoupled from identity.** A PG like `Gait` will be logged
  as Time & Distance, but nothing links the PG to its expected metric, so
  Insights has no idea that `Gait`'s "real" number is miles, not reps.

### 2.4 Set-row facts (reps / time / distance / load / set_type / intensity / per-side)

**Strong.** The set row is rich and honest: `reps`, `time_duration` (HH:MM:SS),
`distance_value`+`distance_unit`, `load_value`+`load_unit`, `is_per_side`,
`set_type` (Warmup/Working/Drop/Failure/AMRAP/Backoff), `intensity` (0.5–10,
UI 0 → NULL so averages stay honest). The view derives `effective_reps`,
`tonnage`, `time_seconds`, `distance_meters`. NULL discipline is deliberate and
correct (no fake zeros).

**Weak.**

- **The surface uses almost none of it.** Headline volume = effective reps only.
  `time_seconds`, `distance_meters`, and `intensity` are computed and then
  ignored by `insights.ts`.
- **Inconsistent inclusion rules.** "Volume by lens" counts *all* set types
  (warmups included); "working sets × muscle" counts *Working only*; tonnage
  counts all loaded sets. Three cards, three inclusion policies, no single
  switch.
- **Partial facts have no first-class handling.** A set with reps but no load,
  or time but no distance, silently contributes to whichever metric it has and
  zero to the others. That's arguably correct, but there's no notion of "this
  metric is 80% populated in this window," so a half-logged block can quietly
  skew a metric without any signal.

### 2.5 Credit rules (multi-PG / multi-muscle / category / never-sum / balance enum)

**Strong.** The credit-each decision is explicit and documented in code and
docs: per-PG / per-category / per-muscle rollups double-count on purpose; nest
labels and once-totals partition. This is the *right default* for "how much did
each chart get."

**Weak.**

- **The model asks the user to hold two contradictory truths.** Some numbers
  double-count (PG/muscle/category), some don't (sessions/working-sets/tonnage
  total), and the only thing stopping a wrong sum is a hint string. There is no
  UI affordance that makes "these rows credit-each, don't add them" structural.
- **No partition option when the user wants one.** A 300-rep Murph
  360-to-Squat credits both `360s` and `Squats` fully. Some users would rather
  split (150/150) or weight. Credit-each is hard-wired; the "category-partition
  vs credit-each" question (Status) has no per-exercise answer.
- **Balance enum zeros** (see 2.3) are a credit-surface symptom too.

### 2.6 Current Insights MVP (lenses / filters / complete-only / reps-heavy / date UX)

**Strong.** For a v1 it's coherent: one **lens** (group-by grain) + stacked
**filters** (session label, block label, set type, variations, tools, date
window), complete-logs-only, honest header totals (sessions, sessions/week,
working sets, tonnage), O(1) Map joins in a single set-anchored fetch. The
credit rule is enforced consistently in the aggregation.

**Weak.**

- **Reps-first headline** (the dominant flaw — see §1).
- **No trend / time-series.** Insights is a single-window snapshot. "Over time"
  — the #1 job phrasing — is not expressible; there's only one aggregate bar per
  dimension for the whole window.
- **Variation is filter-only, not a lens.** Can't group-by discipline / grip /
  cardio-flavor.
- **Six co-equal lenses blur what-vs-where** (see 2.2).
- **Balance shows the full enum incl. zeros** (Status open q).
- **Filter chrome is always-on clutter** (Status #3) and **dates are raw
  `YYYY-MM-DD` text fields** (Status #4).
- **Default window mismatch:** code defaults to last 28 days; Status #4 wants
  last 7 (today + prior 6). Needs reconciliation.
- Charts are single-color bar lists; fine for MVP, thin for "product feel."

### 2.7 Dynamic variety (Murph, gait, hangs, complexes, Rest/empty, incomplete)

**Strong.** The nest + set model *captures* all of it correctly. Murph denests
into a Warmup block, a Challenge block (a mile Gait + a rounds circuit of
pullups/pushups/squats + a mile Gait), and a Cooldown deadhang — every piece
lands as real facts with the right labels and metrics.

**Weak.** *Reading it back is where variety breaks:*

- **Murph** reports pullups/pushups/squats reps but the **two run miles are
  invisible** to the headline (distance metric), so "how big was Murph" is
  understated.
- **Gait** volume = 0 reps → gait effectively doesn't exist in Insights.
- **Timed hangs / isometrics** = 0 reps → invisible.
- **Combat** (rounds/time) = 0 reps → invisible; discipline can't be grouped.
- **Complexes** double-count with no partition option.
- **Rest / empty sessions** are correctly excluded from set aggregates but there's
  no "consistency / streak / did-I-move" surface where a logged Rest day is
  meaningful.
- **Incomplete metrics** contribute silently with no populated-ness signal.

**Net:** capture is A-grade; the product's *read* layer is reps-shaped and
single-window, so most of OttoLog's dynamic range is invisible in Insights.

---

## 3. User-job map vs current gaps

Legend: **✅** works today · **◑** partially / awkward · **❌** structurally
unsupported in the product surface (may exist in the fact layer).

| User job | Today | Where it breaks | Fact layer has it? |
|---|---|---|---|
| **Pullups volume over time** | ◑ | PG lens gives a single-window total, **no trend axis** ("over time" impossible) | reps ✅ / time-bucket ❌ |
| **Challenge / Murph blocks** | ◑ | Block-label lens/filter works, but only in **reps** — Murph's run miles missing | labels ✅ / distance ✅ unused |
| **Push vs Pull balance** | ◑ | Category lens works but **fixed enum**, single axis, **shows zeros**, reps-only | category ✅ (rigid) |
| **Working sets per muscle** | ✅ | Best-supported job (dedicated card, Working-only, credit-each) | ✅ |
| **Hybrid days** | ✅ | Session-label lens/filter | ✅ |
| **Of Live Sparring, how much BJJ?** | ◑ | Filter by variation `BJJ`, but **variation is not a lens** — can't group-by discipline; and combat is **time/rounds not reps** | variation ✅ (filter only) / time ✅ unused |
| **Gait miles** | ❌ | Distance never surfaces; gait = 0 reps in headline | `distance_meters` ✅ **unused** |
| **Time under hang** | ❌ | Time never surfaces; hang = 0 reps in headline | `time_seconds` ✅ **unused** |

### Status smoke findings folded in

- **Multi-metric / partial facts** (Status #1, open q): the reps-only headline is
  the core lie; time/distance are computed but unshown; partial population has no
  signal. **→ addressed by metric-aware Insights (all approaches except pure A
  keep-as-is).**
- **Balance category zeros** (Status open q): full-enum display. **→ addressed by
  data-only rendering (A) and/or editable PG-groups (B/C/D).**
- **Filter chrome clutter** (Status #3): move filters into a sheet/modal, keep
  lens chips. **→ Phase-1 UX in the recommendation.**
- **Date UX** (Status #4): real date pickers, reconcile default window. **→
  Phase-1 UX.**
- **Wellness placement** (Status open q): block vs session vs both. **→ resolved
  by treating structure labels as a dimension family (D) — cheap to allow both.**
- **Credit-each vs partition** (Status open q): **→ B/D add an optional
  per-exercise partition/weight; credit-each stays the default.**

---

## 4. Approaches

Each approach is scored the same way in §5. All four assume the Phase-1 UX
cleanups (filters-in-sheet, real date pickers, trend axis) unless noted, because
those are orthogonal to the identity model.

---

### Approach A — Keep / tighten the current model

**Core mental model (unchanged).** "Every exercise has a Primary Group (a chart
noun) with a category; muscles are anatomy; variations are modifiers; tools are
equipment. Insights = pick a lens, narrow with filters." Fix gaps only; change no
concepts.

**Fixes applied:**

1. **Metric selector on the headline** — reps / time / distance / tonnage / sets
   — reading the columns `v_log_set_facts` already computes. The lens still
   chooses the group-by; the metric chooses the measure. (Small surface change,
   no schema.)
2. **Variation as a lens**, not just a filter (group-by discipline/grip/flavor).
3. **Trend axis** — bucket the window by day/week/month for a real over-time
   line.
4. **Balance renders data-only** (drop empty enum buckets); keep the fixed
   `category` enum as-is.
5. **One inclusion switch** (Working-only default, toggle to include all set
   types) applied uniformly across metric cards.
6. **"Never sum" made structural** — credited lenses never render a grand-total
   row; a small "credits each" badge replaces the hint sentence.

**Nest labels vs identity.** Unchanged — still six co-equal lenses; the
what-vs-where blur remains (mitigated only by grouping the lens chips into
"Identity" vs "Structure" sub-rows).

**Mixed metrics.** Handled by *never mixing* — the user explicitly picks one
metric; reps and miles are never added. Honest, but the user must know to switch
metrics to see gait/hang/combat.

**Credit / double-count.** Credit-each unchanged; no partition option.

**Fit for examples.** Murph ◑ (miles visible only if user switches to Distance
metric); Gait ✅ (Distance metric); Hang ✅ (Time metric); Combat ◑ (Time metric,
still can't lens by discipline unless #2 lands); Wellness ◑ (Time metric works;
placement question unresolved).

**Schema impact.** **Additive → near-zero.** Point Insights at `v_log_set_facts`;
add metric/trend/lens options in `insights.ts` + screen. No migration.

**Insights UX day one.** Same screen with: a Metric chip row above the Lens row;
a trend line under the headline; filters moved into a sheet; date pickers.

**Pros.** Cheapest; preserves all locked vocabulary; unblocks Chat 6 fastest;
lowest risk; delivers the biggest single win (metric-aware) with no schema.

**Cons / failure modes.** Keeps the hard `category` enum (DNA violation, single
balance axis, per-PG-single-category). Keeps the six-lens what-vs-where blur.
Metric×lens becomes a combinatorial grid the user must drive manually ("why is
gait empty? oh, I'm on reps"). Doesn't resolve credit-partition or Wellness
placement. It's a polish pass, not a rethink — and Status #1/#2 explicitly asked
whether the *model* is right.

**Migration cost vs clarity.** Lowest cost, medium clarity gain. Good as a
*floor*, weak as a *destination*.

---

### Approach B — Revise the slots

**Core mental model.** Same shape as A ("PG is my chart noun"), but the
**supporting axes are re-cut** so they're user vocabulary and multi-dimensional:

1. **Kill the `category` CHECK enum; introduce user-editable "PG groups"**
   (a.k.a. balance axes). A PG can belong to **N groups across M axis families**:
   e.g. `Bench Press` ∈ {Push, Upper, Strength}; `Gait` ∈ {Conditioning,
   Lower-ish}. Balance charts pick an **axis family** (Push/Pull, Upper/Lower,
   Strength/Conditioning) instead of the one hard enum. Seeded defaults reproduce
   today's 10 categories as *one* editable family so nothing is lost.
2. **Give each PG a `natural_metric`** (reps / time / distance / rounds / none)
   so the headline number defaults to the truth for that movement (Gait→distance,
   Deadhangs→time, Pullups→reps, Live Sparring→time). Metric selector still lets
   you override.
3. **Optional per-exercise credit weights** on multi-PG links (default 100/100 =
   credit-each; user may set 50/50 partition). Resolves the credit open question
   without changing the default.
4. Keep muscles, variations, tools as-is (they already work); **variation
   becomes a lens** too.

**Nest labels vs identity.** Cleanly separated in the UI into **Identity axes**
(PG, PG-group/balance, muscle, variation, tool) vs **Structure axes** (session /
block / sequence label). Same data, honest framing.

**Mixed metrics.** Natural-metric-per-PG means the headline "top movements" card
can show each movement in *its own* metric side by side (Pullups 420 reps · Gait
12.4 mi · Deadhangs 6:30) without ever summing — the honest multi-metric view.

**Credit.** Credit-each default, optional weights (see 3).

**Fit for examples.** Murph ✅ (runs show as miles, circuit as reps, all in
natural metric; Challenge block lens ties it together). Gait ✅. Hang ✅. Combat
✅ (Live Sparring natural=time; lens/filter by BJJ). Wellness ✅ (natural=time;
placement solved by structure-axis flexibility). Push/Pull ✅ and now *also*
Upper/Lower, Strength/Conditioning.

**Schema impact.** **Moderate, additive-ish.** `category` column → a
`primary_group_groups` join (PG ↔ group) + a small `analytics_pg_group_axes`
table (or reuse the tag pattern). Add `natural_metric` to `analytics_primary_groups`.
Add nullable `credit_weight` to PG link tables. All migratable from the current
10 enum values as seeded defaults. No rewrite of the log tree or fact view (the
view already emits `primary_group_ids[]`; grouping happens at read time).

**Insights UX day one.** A Metric row (default = natural), an "Axis" selector for
balance (Push/Pull ▸ Upper/Lower ▸ Strength/Conditioning ▸ …), Identity vs
Structure lens groups, trend line, filters-in-sheet.

**Pros.** Restores user-vocabulary DNA where it was most violated (category);
multi-axis balance; natural-metric kills the reps-only lie; resolves the
credit + Wellness + zeros open questions; keeps the friendly "PG = chart noun"
onboarding.

**Cons / failure modes.** More schema than A. Balance now depends on PG-group
setup — defaults must teach it or new users see a thin balance chart. Risk of
"axis sprawl" if users make too many families. Still fundamentally the same IA,
so if the deeper worry is "is PG-centrism right at all?", B doesn't test that.

**Migration cost vs clarity.** Medium cost, high clarity gain. Strong candidate.

---

### Approach C — Overhaul to a metric-first / dimensional (cube) ontology

**Core mental model.** The user thinks **"what did I measure, and how do I want
to slice it?"** There is no privileged Primary Group. Every set is an
**observation** carrying one or more **measures** (reps, seconds, meters, load,
rounds, custom) and any number of **dimension tags** grouped into **families**:
*movement* (what PG used to be), *anatomy* (muscles), *modifier* (variations),
*equipment* (tools), *structure* (session/block/sequence labels), *balance*
(push/pull/…), and anything the user invents. Insights becomes a small OLAP
cube: **pick a measure + a dimension family to group by + filters + a time
bucket.** "Volume", "balance", "muscle sets", "gait miles" are all the same
operation with different measure/dimension picks.

**Nest labels vs identity.** They stop being special: structure is just one
dimension family, identity is a few others. One uniform grammar. Wellness-as-day
vs Wellness-as-block is a non-issue — both are just `structure` tags on the fact.

**Mixed metrics.** Native and honest: you *always* choose a measure, so nothing
is ever added across metrics. A "session summary" can list each measure that has
data (reps, minutes, miles, rounds) as separate lines.

**Credit.** Many-to-many is the native semantics of a cube; credit-each is just
"a fact with two movement tags appears under both." Grand totals are only ever
computed within one measure × one dimension value, so the cube structurally
prevents the illegal cross-dimension sum. Optional per-tag weights possible.

**Fit for examples.** All ✅ and uniformly so — Murph, gait, hang, combat,
wellness, complexes are all just facts with tags and measures. This is the most
*expressive* model by a wide margin.

**Schema impact.** **Largest — a conceptual rewrite of the taxonomy layer**,
though it can sit on top of the existing log tree. Collapse
`analytics_primary_groups` / `analytics_muscle_groups` / `analytics_tags` /
labels into a unified `dimensions` table with a `family` column (+ per-family
rules), and the link tables into a generic `log_set_dimension_links` (or keep
per-family links). Measures already exist on `log_sets`. `v_log_set_facts`
generalizes to emit `dimensions[]` by family. Big blast radius across builders,
`taxonomy.ts`, `sessionLogs.ts`, and every doc that names the four axes.

**Insights UX day one.** A query-builder: Measure ▸ Group by (family) ▸ Filters
▸ Time bucket, plus saved views. Extremely powerful.

**Pros.** Maximum honesty for multi-metric + general-purpose DNA ("anything with
a target shape can be an exercise" becomes literally true at the analytics
layer). Infinitely extensible (new activity, new metric, new axis = new tag
family, no schema change). One coherent mental model replaces six lenses + four
slots.

**Cons / failure modes.** **Kills the opinionated simplicity that makes
onboarding work.** "What's my main number?" has no default answer — the app
becomes a generic spreadsheet/cube, which is the *opposite* of fitness-first
polish. Highest migration cost and risk; touches locked vocabulary the whole
project has standardized on (PG, Variations, muscles). Tag-family soup is a real
risk without heavy curation. Analysis-paralysis for casual users. Sub-variants
considered and rejected: **pure tags-only** (no families) → loses balance/anatomy
structure; **graph/relationship model** → massive overkill for set aggregation;
**external fixed movement taxonomy** (e.g. an ontology of exercises) →
directly violates user-vocabulary DNA.

**Migration cost vs clarity.** Highest cost; clarity is *high for power users,
low for newcomers.* Best mined for ideas (the cube read-model) rather than
adopted wholesale.

---

### Approach D — Hybrid / progressive disclosure (RECOMMENDED shape)

**Core mental model.** Two layers over one engine.

- **Simple mode (default):** a curated, zero-config set of **Insight cards** that
  answer the top jobs in plain language and each metric's *natural* unit:
  *This period* (sessions, sessions/week, streak incl. logged Rest); *Top
  movements* (each PG in its natural metric, side by side, never summed);
  *Balance* (default axis Push/Pull/Lower/… with an axis switcher); *Working sets
  × muscle*; *Trend* of a pinned movement over time; *Highlights* (biggest
  Challenge block, longest hang, weekly miles). No lens/filter grid to learn.
- **Power mode:** the **`measure × dimension × time` cube** from C, exposed only
  when asked for, with **saved views**. This is where "of Live Sparring how much
  BJJ, as minutes, by week" lives.

**One engine underneath** = **B's identity model**: PG stays the privileged
friendly **chart noun** with a **natural metric**; `category` becomes
**seeded-editable PG groups / balance axes** (multi-axis); muscles / variations /
tools unchanged; nest labels are a **structure dimension family**. Power mode
reads the same facts as a cube where PG/muscle/variation/tool/labels are just
dimension families — so C's expressiveness is available without forcing its
mental model on everyone.

**Nest labels vs identity.** Simple mode uses structure labels *implicitly*
(the "Challenge/Murph" and "Hybrid day" cards are pre-wired to block/session
labels); Power mode exposes them as a dimension family. Users never have to
reason about "is this lens what or where."

**Mixed metrics.** Natural-metric-per-PG in Simple mode; explicit measure pick in
Power mode. Never summed across metrics anywhere.

**Credit.** Credit-each default; optional per-exercise weights (B's mechanism)
surfaced only in Power mode / advanced exercise settings.

**Fit for examples.** All ✅. Murph: Simple mode's "Highlights" shows the
Challenge block with reps *and* miles; Power mode can dissect it. Gait/hang/combat
show in their natural metric in "Top movements"; combat discipline splits in
Power mode. Wellness: works as either a session or block label because structure
is a dimension.

**Schema impact.** **Phased: additive first, moderate later.**

- Phase 1 (Simple mode + metric-aware) rides the **current schema + existing
  view** — *zero migration.*
- Phase 2 adds `natural_metric` + PG-groups/axes + optional credit weights (B's
  additive changes).
- The cube read-model reuses `v_log_set_facts`.

**Insights UX day one.** Simple mode is the default tab: a scannable stack of
answer-cards, each with a natural-unit number and a trend sparkline; an "Explore"
affordance opens Power mode. Filters live in a sheet; dates use real pickers.

**Pros.** Preserves onboarding simplicity **and** unlocks power. Honors DNA
(opinionated defaults + "customize everything"). Fixes the reps-only lie, the
category enum, the what-vs-where blur, and the open questions (zeros, credit,
Wellness, multi-metric). **Ships the highest-value piece first with no schema**,
so Nate can *feel* the direction before committing to Phase-2 migrations —
exactly what Status #1/#2 need.

**Cons / failure modes.** Two surfaces to design and maintain. "Natural metric"
needs a sensible default + override (some PGs are legitimately multi-metric, e.g.
Gait = distance *and* time). Requires the most product design thought of the
four. If Simple mode's curated cards miss a user's job, they must discover Power
mode.

**Migration cost vs clarity.** Cost is *staged* (cheap first, moderate later);
clarity is highest of all four for both casual and power users.

---

## 5. Comparison matrix

Scoring: ●●● strong · ●● partial · ● weak. "Cost" and "Risk": more ● = *more*
cost/risk (worse).

| Dimension | A · Keep/tighten | B · Revise slots | C · Overhaul (cube) | D · Hybrid |
|---|---|---|---|---|
| Onboarding simplicity | ●●● | ●●● | ● | ●●● |
| Multi-metric honesty | ●● | ●●● | ●●● | ●●● |
| DNA fit (user vocabulary) | ● | ●●● | ●●● | ●●● |
| Balance flexibility (multi-axis) | ● | ●●● | ●●● | ●●● |
| What-vs-where clarity | ● | ●● | ●●● | ●●● |
| Complex / credit handling | ● | ●●● | ●●● | ●●● |
| "Over time" / trend | ●●● | ●●● | ●●● | ●●● |
| Power-user expressiveness | ● | ●● | ●●● | ●●● |
| Extensibility (new activity/metric) | ● | ●● | ●●● | ●●● |
| Resolves Status open questions | ● | ●●● | ●● | ●●● |
| **Schema/migration cost** (more=worse) | ● | ●● | ●●● | ●● (staged) |
| **Migration risk** (more=worse) | ● | ●● | ●●● | ● first / ●● later |
| Time-to-first-value | ●●● | ●● | ● | ●●● |

**Reading it:** A is the cheapest floor but leaves the model's core criticisms
unanswered. C is the most expressive ceiling but sacrifices the opinionated
fitness-first feel and carries the most risk. B fixes the real identity flaws at
moderate cost. **D dominates because it *is* B's engine delivered through a
C-inspired power surface, with a Phase-1 that captures A's cheap wins first** —
best clarity for everyone, staged cost, lowest first-step risk.

---

## 6. Recommended approach + phased plan

### 6.1 Recommendation

Adopt **Approach D (Hybrid)**, built on **Approach B's identity engine** and a
**metric-first read model** (the honest core of C), surfaced through
**progressive disclosure**:

- **PG stays the privileged chart noun**, now with a **natural metric**.
- **`category` enum → seeded-editable PG groups / balance axes** (multi-axis).
- **Insights is metric-aware** (reps / time / distance / tonnage / sets), reading
  the existing `v_log_set_facts`.
- **Simple mode** (curated answer-cards) is the default; **Power mode** (the
  `measure × dimension × time` cube + saved views) is opt-in.
- **Credit-each stays the default**; optional per-exercise weights are advanced.

**Why it wins for OttoLog specifically.** OttoLog's DNA is *opinionated defaults
that a user can fully customize*, an *infinite canvas*, and *fitness-first but
general*. A gives up the rethink; C gives up the opinionated simplicity. Only D
keeps the friendly "here's your main number" onboarding **and** makes "anything
with a target shape is an exercise" literally true in analytics — because the
same fact powers both a curated card and a general cube. It also fixes the one
flaw that most undermines trust in the numbers today (reps-only headline) **on
the current schema**, so the "does this feel right" call in Status #1/#2 can be
made from a real, working surface before any migration.

### 6.2 What we keep vs kill

| Keep (unchanged or lightly extended) | Kill / change |
|---|---|
| PG as the chart noun (1–N, complexes) | Hard `category` CHECK enum → seeded-editable **PG groups** (multi-axis) |
| Muscle groups as the anatomy axis | Reps-only headline → **metric-aware** (natural metric per PG) |
| Variations (`analytics_tags`) as modifiers | Variation as filter-only → **also a lens/dimension** |
| Tools + `No Tool` sentinel | Single-window snapshot → **add trend/time bucketing** |
| Nest labels (session/block/sequence) | Balance shows full enum incl. zeros → **data-only + axis switch** |
| Credit-each default + "never sum" | Six co-equal lenses → **Identity vs Structure** grouping (Simple hides it) |
| `v_log_set_facts`, `ol_hms_to_seconds`, `ol_distance_to_meters` | Filter clutter (Status #3) + raw date text (Status #4) |
| Complete-logs-only aggregation | All-or-nothing credit → **optional per-exercise weight** (advanced) |
| `track_analytics` / `track_intensity` opt-in | — |

### 6.3 Phased path (docs → schema → Insights UI → Chat 6)

> Still **no implementation in this chat.** This is the sequencing contract.

- **Phase 0 — Docs / decision (this chat).** This proposal + Nate's answers to
  §6.4. Status #1/#2 pointed here.
- **Phase 1 — Insights UI on the *current* schema (zero migration).** Point
  Insights at `v_log_set_facts`; add **metric selector** (reps/time/distance/
  tonnage/sets), **trend axis**, **variation lens**, **data-only balance**;
  ship **Simple mode** answer-cards; move filters into a **sheet**; add **real
  date pickers** + reconcile the default window (Status #3/#4). *This is the
  "does it feel right" deliverable.*
- **Phase 2 — Identity schema (additive migration, greenfield `008`+).** Add
  `natural_metric` to PGs; add **PG-groups / balance-axis** tables (migrate the
  10 enum values in as one seeded default axis); add optional `credit_weight` on
  PG link tables. Update balance to read axes; wire natural metric into Simple
  mode.
- **Phase 3 — Chat 6 seeds (unblocked only after Phase 1 feel + Phase 2 shape
  are accepted).** Fill `ensure_default_*` with PGs (each with category-axis
  memberships + natural metric), the ~60 variations, tools, and nest labels per
  `New_User_Seeds.md`. Land the Wellness placement decision (§6.4) in the same
  pass.
- **Phase 4 — Power mode + later math (deferred).** Cube query-builder + saved
  views; then e1RM / ACWR / session-load / intensity-weighted views.

### 6.4 Open decisions still needing Nate

1. **PG privilege:** confirm PG stays the privileged chart noun (D/B), rather
   than demoting it to just-another-dimension (pure C).
2. **Natural metric cardinality:** one metric per PG, or allow multi-metric PGs
   (Gait = distance *and* time shown together)?
3. **Balance axes:** migrate today's 10 categories in as **one** seeded default
   axis? Ship additional default axes (Upper/Lower, Strength/Conditioning) or let
   users build them? Allow a PG in multiple groups within one axis?
4. **Credit weights:** ship the optional per-exercise partition/weight in Phase
   2, or keep credit-each-only and revisit later?
5. **Trend defaults:** default bucket (week vs month) and default window — Status
   #4 wants last-7 for the date control, but Insights defaults to 28; pick one
   reconciled default. **→ Phase 1a locked: last 7 days inclusive.**
6. **Wellness placement:** with structure as a dimension family, recommend
   **allow both** (session intent *and* block) — confirm, or keep block-only.
7. **Simple vs current UI:** does Simple mode *replace* the lens/filter screen as
   default (Power mode behind "Explore"), or sit beside it? **→ Phase 1a: keep
   lens + metric on screen; filters in a sheet (not full Simple card stack).**
8. **Set-type inclusion default:** Working-only default with an "include warmups"
   toggle applied uniformly — confirm. **→ Phase 1a locked: Working-only + toggle.**

---

## PG Counts as (Phase 1b)

> **Contract for Nate / Chat 6 / taxonomy UI.** Phase **1a** ships Auto via the
> distance → time → reps **heuristic** only. This section is the long-term
> usability path (Status Next: PG analytics settings). **No migration in 1a.**

### Product rule

Complexity lives on the **vocabulary row** (Primary Group), not on every log —
same pattern as Rest / `is_empty`. The user teaches OttoLog once how a movement
**counts**; Insights **Auto** (and Simple “Top movements”) read that setting.

### Settings surface (Account → Taxonomy → Primary Group edit)

Per PG, in addition to today’s name + category:

| Field | Values | Job |
|---|---|---|
| **Counts as** (`natural_metric`) | `reps` \| `time` \| `distance` \| `sets` | Headline measure when Insights metric = Auto |
| **Balance group** | today’s category enum → later seeded-editable PG groups | Balance chart membership |

Mock (copy tone):

```
Primary Group          Pullups
Category               Pull
Counts as              ● Reps   ○ Time   ○ Distance   ○ Sets
```

Seeds teach defaults (no blank Counts as on day one):

| PG examples | Counts as |
|---|---|
| Pullups, Pushups, Squats, … | reps |
| Deadhangs, Meditation, Sauna, Live Sparring, … | time |
| Gait | distance |
| (rare) round-based PGs | sets |

Multi-metric PGs (e.g. Gait logged with time *and* distance): **Counts as** is the
*headline*; the other measure stays queryable via the metric selector. Never sum
across metrics.

### Schema sketch (Phase 1b / greenfield `008`+)

Additive only — ask before shipping:

```sql
-- sketch only; not applied in Phase 1a
alter table public.analytics_primary_groups
  add column natural_metric text not null default 'reps'
  check (natural_metric in ('reps', 'time', 'distance', 'sets'));
```

- App: Account PG create/edit + `createPrimaryGroup` / update helpers.
- Insights Auto: resolve metric from PG setting when lens is Primary Group;
  fall back to 1a heuristic when unset / non-PG lens.
- Chat 6: `ensure_default_primary_groups` writes Counts as (+ balance group) per
  [`New_User_Seeds.md`](./New_User_Seeds.md).

### Explicitly out of 1b scope

Credit weights, Power cube, full multi-axis PG-groups replacement (can land with
or after Counts as), override grammar, auth restyle.

---

## 7. Implications for Chat 6 / New_User_Seeds

**Chat 6 stays blocked until Phase 1 (feel) and the §6.4 identity decisions are
accepted** — seeding vocabulary before the identity model is locked would bake in
choices (the hard category enum, reps-only assumptions) we're proposing to
change. Concretely, the recommendation changes what the seeds must carry:

- **PGs must seed a `natural_metric`** (Gait→distance, Deadhangs/Meditation/
  Sauna→time, Live Sparring/Drilling→time, Pullups/Squats→reps, etc.). Today's
  catalog implies this but doesn't record it.
- **PG `category` seeds become PG-group memberships** on a seeded default axis
  (the current 10 values), leaving room for extra axes later. The
  `ensure_default_primary_groups` stub in `sql/greenfield/005` should populate
  group links, not a scalar enum.
- **Variations** (~60 shared) seed unchanged; they gain lens/dimension status for
  free (no seed change), so "how much BJJ" needs no new vocabulary.
- **Nest labels** seed unchanged, but the **Wellness** decision (§6.4 #6) lands
  here: if "both," `Wellness` seeds as *both* a session label and a block label.
- **No renaming `analytics_tags`** in SQL (explicitly out of scope; product term
  stays "Variations").
- The existing `v_log_set_facts` + `ol_*` helpers are the seed's analytics
  target — the Murph personal seed already proves the fact shape end to end.

Net: the seed catalog in `New_User_Seeds.md` is **~90% reusable**; the deltas are
(a) record a natural metric per PG, and (b) express category as group-links on a
default balance axis instead of a scalar. Neither expands the vocabulary a user
must learn.

---

## 8. Appendix — glossary (so we don't invent synonyms later)

| Term | Meaning in this proposal |
|---|---|
| **Fact** | One `log_sets` row (one performed set), the analytics grain. Flattened by `v_log_set_facts`. |
| **Measure / Metric** | A numeric quantity on a fact: reps, `effective_reps`, `time_seconds`, `distance_meters`, `tonnage`, load, `intensity`, "sets" (count), or "rounds". "Metric" = the user-facing pick; "measure" = its numeric column. |
| **Natural metric** | The default measure a Primary Group's headline number should use (Gait→distance, Deadhangs→time, Pullups→reps). Proposed new PG attribute; overridable. |
| **Dimension** | Something a fact can be grouped/filtered by: PG, muscle, variation, tool, session/block/sequence label, balance group. |
| **Dimension family** | A named set of dimensions of one kind: *movement* (PG), *anatomy* (muscle), *modifier* (variation), *equipment* (tool), *structure* (nest labels), *balance* (PG groups). |
| **Primary Group (PG)** | `analytics_primary_groups`. The chart noun volume accrues to; 1–N per exercise (complexes). Stays privileged in the recommendation. |
| **PG group / Balance axis** | Proposed replacement for the `category` enum: user-editable groupings of PGs into axis families (Push/Pull, Upper/Lower, Strength/Conditioning). Multi-axis, multi-membership. |
| **Category (legacy)** | Today's hard 10-value CHECK enum on a PG (`Push`…`Wellness`). Proposed to become a seeded default balance axis. |
| **Variation** | Product term for `analytics_tags` — modifiers (grip, angle, discipline, cardio flavor, `Complex`). DB name unchanged. |
| **Muscle group** | `analytics_muscle_groups` — anatomy axis, 0–N. |
| **Tool** | `tools` — equipment, ≥1 (global `No Tool` sentinel). |
| **Nest label** | Session / block / sequence label (`category_id` / `label_id`). Structure, not identity. A *structure* dimension family. |
| **Target shape** | `target_shapes` — which set-input fields appear (Reps / Time / Time & Distance / Time & Reps / Distance). Determines which measures a set can carry. |
| **Grain** | The level a query counts at. Base grain = one fact (set). |
| **Lens** | Today's term for the group-by dimension in Insights. Generalizes to "group by dimension family" in Power mode. |
| **Filter** | A predicate narrowing the fact set, independent of the group-by. |
| **Credit-each** | Multi-value dimension rollups (PG/muscle/balance) count a fact under *every* value it carries; **never sum** those rows into one total. Default. |
| **Partition** | Each fact counts under exactly **one** value (nest labels, once-totals). Also the proposed optional per-exercise credit-weight behavior. |
| **Credit weight** | Proposed optional split of a multi-PG fact's credit (e.g. 50/50) instead of credit-each (100/100). Advanced, off by default. |
| **Once-total** | An honest total computed at the set grain exactly once (session count, working-set count, session tonnage). Never derived by summing a credited dimension. |
| **Effective reps** | `reps × (2 if per-side else 1)`; 0 when reps ≤ 0 or null. |
| **Tonnage** | `load_value × effective_reps` when load is lbs/kg; else 0. |
| **Working set** | A `log_sets` row with `set_type = 'Working'`. |
| **Snapshot vs Trend** | Snapshot = one aggregate per dimension for the whole window (today's behavior). Trend = the same measure bucketed over time (day/week/month) — proposed. |
| **Simple mode / Power mode** | Progressive-disclosure surfaces: curated answer-cards (default) vs the `measure × dimension × time` cube (opt-in). |
| **`v_log_set_facts`** | Greenfield `007` view: one row per set with canonical measures + all dimension arrays. The analytics read source. |
| **`track_analytics` / `track_intensity`** | Per-exercise opt-ins gating PG identity and the intensity column. |
