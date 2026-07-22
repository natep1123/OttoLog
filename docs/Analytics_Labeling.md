# OttoLog Analytics Labeling

Best practices for Primary Groups, variations, tools, and nest labels so
analytics stay open-ended and queryable. Schema contracts live in
`Database_Outline.md`; builder chrome lives in `Template_Builders.md`.

OttoLog is a general-purpose tracking system. Fitness is the first deep use
case, not a hard ceiling. Anything that fits a target shape (Reps, Time,
Distance, …) can be an exercise — meditation, sauna, competitions, camping-day
work blocks — without a schema redesign. What you choose here is **how well
volume rolls up**, not **permission to log**.

## Vocabulary map (do not collapse these)

| Slot | Job | Open-ended? |
|------|-----|-------------|
| **Exercise name** | Display / library identity | Free text |
| **Primary group(s)** | Chart noun(s) when tracking is on (**1–N** for complexes); each has a **category** | User vocabulary |
| **Muscle groups** | Anatomy rollups (multiselect) | Seeded defaults + user edits |
| **Variations** | Modifiers / filters (not anatomy; DB: `analytics_tags`) | User vocabulary |
| **Tool(s)** | Equipment | User + global **No Tool** |
| **Session label** | Day-level kind / intent; also an Insights **grain** (filter + lens) | User + system null **Session**; **Rest** is a normal seeded empty label (`is_empty`) |
| **Block / Sequence labels** | Nest structure **and** an Insights **grain** (filter + lens) — never exercise identity | User + system nulls |
| **Target shape** | Which set input fields appear | Locked atoms |
| **`track_analytics`** | Opt in/out of analytics identity | Boolean |

Primary Group exists so several differently named exercises can share one chart
bucket (complexes may credit **multiple** buckets). Muscle groups answer
tissue questions. Variations answer how / style / discipline facets. Display
name is never the analytics identity.

Seed vocabulary map: [`Label_Library.md`](./Label_Library.md). Full catalog:
[`New_User_Seeds.md`](./New_User_Seeds.md).

## Decision rule

Ask:

> If Insights showed me **one number** for this exercise this month, what noun
> should that number sit under?

That noun is a **Primary Group**. For complexes (e.g. 360-to-Squat), select
every noun that should receive the reps.

Everything that answers *how / with what / which style / which tissue / which
context* is a variation, muscle group, tool, session label, or the display
name — not crammed into a single PG string.

### What belongs where

| Put here | Examples |
|----------|----------|
| **Primary Group** | `Pullups`, `Squats`, `360s`, `Gait`, `Drilling`, `Live Sparring`, `Meditation`, `Competition Fights` |
| **Muscle groups** | Chest, Lats, Quads, Core, … |
| **Variations** | `Wide-Grip`, `Standard`, `BJJ`, `Running` (under Gait), `Complex` |
| **Tool** | `Kettlebell`, `Mace`, `None` |
| **Session label** | `Hybrid`, `Cardio`, `Recovery`, `Martial Arts`, `Recreation`, `Rest` (empty; `is_empty`) |
| **Block / Sequence labels** | `Warmup`, `Main`, `Circuit` — structural; also a valid Insights grain (filter + lens), never exercise identity |
| **Exercise name** | `Weighted Wide-Grip Pullups`, `BJJ Live Rounds`, `Mace 360-to-Squat` |

### What not to put in Primary Group

- Session intent: Hybrid, Recovery, Martial Arts, Recreation (session label)
- Nest structure: Warmup / Main / Circuit (block/sequence labels)
- Equipment (use Tool)
- Anatomy (use muscle groups)
- Grip / stance / named variant details (variations)
- Compound two-axis names: `BJJ Live`, `Strength Pullups` (use PG + variation)
- Combat **disciplines** (variations: `BJJ` / `Muay Thai` / `MMA`)
- Gait **flavors** when using family-as-PG: Walking / Running / Sprinting /
  Hiking are variations under `Gait`

## Strength / hybrid / calisthenics

| Field | Practice |
|-------|----------|
| Primary Group | The movement you progress (`Pullups`, not `Strength`) |
| Muscle groups | Tissue emphasis |
| Variations | Grip / named variant / load (`Wide-Grip`, `Weighted`, `Standard`) |
| Name | Specific prescription (`Weighted Pullups`) |
| Tool | Implement when it matters |

Named variants of the same movement **reuse** the Primary Group. Encode the
variant in the name and/or variations. Complexes that truly are two movements
use **multiple PGs** so reps accrue to each chart.

## Gait / swimming / cycling / rowing

Prefer **family as Primary Group**, flavor as variations — same pattern for
every cardio family:

| Family (PG) | Flavor variations (examples) |
|-------------|------------------------------|
| `Gait` | `Walking`, `Running`, `Sprinting`, `Hiking`, `Rucking` |
| `Swimming` | stroke / drill variations as needed |
| `Cycling` | `Road`, `Mountain`, … |
| `Rowing` | `Steady`, `Intervals`, … |

**Session label:** dedicated training under `Cardio` / `Hybrid`. Casual outdoor
days usually `Recreation` unless explicitly training-focused.

## Martial arts (two axes)

You have two meaningful axes. This account’s convention (usually **one** mode
PG per exercise; multi-PG is for true complexes):

- **Primary Group = training mode** — effort / intensity bucket you chart first
- **Variations = discipline** — which art(s) that work belonged to
- **Session label = `Martial Arts`** for combat-focused days (not `Cardio`)

| Primary Group | Means |
|---------------|--------|
| `Drilling` | Technique, positional work, pads, reps of moves |
| `Live Sparring` | Sparring / rolling / timed live rounds |
| `Competition Fights` | Match / tournament work |

| Variation | Means |
|-----------|--------|
| `BJJ` | Brazilian jiu-jitsu |
| `Muay Thai` | Muay Thai |
| `MMA` | Mixed martial arts |

| What you did | Name | PG | Variations | Session label |
|--------------|------|----|-------------|----------------|
| BJJ rolling | `BJJ Live Rounds` | `Live Sparring` | `BJJ` | `Martial Arts` |
| BJJ technique | `Guard Retention` | `Drilling` | `BJJ` | `Martial Arts` |
| Muay Thai pads | `Pad Work` | `Drilling` | `Muay Thai` | `Martial Arts` |
| Tournament | `BJJ Tournament Matches` | `Competition Fights` | `BJJ` | `Martial Arts` |

Default Insights questions become “how much **live sparring** / **drilling** /
**competition fight** time?” Discipline is a filter: “of that live time, how
much was **BJJ**?”

Mixed classes: prefer **one exercise per discipline** (or per mode) when you
care about per-art minutes. Both rows can share the same mode PG:

```text
Session [Martial Arts]
  Block [Main]
    Exercise  Name: BJJ Live Rounds   PG: Live Sparring   variations: BJJ
    Exercise  Name: Pad Work          PG: Drilling        variations: Muay Thai
```

One row with multiple arts (`BJJ` + `Muay Thai`) is fine when you only care
about total mode time and not a clean per-art split.

Why mode-as-PG here: combat load is tracked by **effort type** across arts.
Discipline-as-PG is equally valid for accounts that care first about hours per
art — this doc follows the mode-first choice above.

## Wellness and recreation

Same exercise model for wellness. Use a Time (or other) shape and a Primary
Group when you want totals:

| Activity | Primary Group | Variations (examples) |
|----------|---------------|------------------------|
| Meditation | `Meditation` | `Guided`, `Unguided`, `Breath-Focused` |
| Sauna | `Sauna` | `Dry`, `Steam`, `Contrast` |
| Cold | `Cold Exposure` | `Plunge`, `Shower`, `Contrast` |

**Session labels**

- **`Martial Arts`** — combat-focused sessions (see above).
- **`Recreation`** — camping, casual hiking, and other life/outdoor days that
  are not dedicated training. Exercises inside can still use PG `Gait` +
  variation `Hiking` / `Walking` if you want those minutes/miles on charts.
- Dedicated training hikes/runs should stay under training session labels
  (`Cardio`, `Hybrid`, etc.), not `Recreation`.

If you only want something in the session narrative and never in Insights: turn
**`track_analytics` off**. No Primary Group required.

## Rules of thumb

1. **PG = chart noun for years.** Boring, stable, reused.
2. **Variation = filter chip.** Can be experimental and messy.
3. **Don’t encode two axes into one PG.** Use PG + variation.
4. **Don’t invent a new PG for a variant** — name or variation it.
5. **Spell once and reuse** — one row for `BJJ`, not parallel `Bjj` /
   `Brazilian Jiu-Jitsu` variations (or PGs in other conventions).
6. **Archive + create** if a PG’s meaning changes; don’t silently rename history.
7. **Insights will love Primary Group first** (log rows carry `primary_group_id`
   plus PG link tables for complexes). Treat variations as the flexible overlay
   you enrich over time. Optional **suggested variations per PG** soft-filter
   the picker; they never constrain stored links.

## Starter kit (personal / test account)

Canonical lists live in [`Label_Library.md`](./Label_Library.md). Summary:

### Primary Groups

- Strength / skill: `Pullups`, `Pushups`, `Squats`, `Lunges`, `Halos`, `360s`, …
- Cardio families: `Gait`, `Swimming`, `Cycling`, `Rowing` (flavors as variations)
- Combat modes: `Drilling`, `Live Sparring`, `Competition Fights`
- Wellness (if tracking minutes): `Meditation`, `Sauna`, `Cold Exposure`,
  `Breathwork`

### Muscle groups (seeded defaults)

Chest, Lats, Spinal Chain, Rear Delts, Shoulders, Biceps, Triceps, Traps,
Quads, Hamstrings/Glutes, Calves, Core, Forearms, Neck

### Shared variations

- Grip / stance / load: `Standard`, `Wide-Grip`, `Weighted`, `Assisted`, …
- Gait flavors under PG `Gait`: `Walking`, `Running`, `Sprinting`, `Hiking`, …
- Combat discipline: `BJJ`, `Muay Thai`, `MMA`, …
- Context: `Complex`, `Yoga`, …

Pattern / plane / coarse region facets are **not** in the default seed (PG
**category** + muscles cover them). Equipment names are **Tools**, never
variations.

### Session labels

`Session` (null), `Hybrid`, `Cardio`, `Strength`, `Recovery`, `Mobility`,
`Martial Arts`, `Recreation`, `Rest` (empty; notes only).

### Block / Sequence labels

Structural only: `Warmup` / `Main` / `Cooldown` / `Challenge` / `Wellness` /
… ; `Circuit` / `Superset` / `Sequence`.

## Proposed (under review): grouped taxonomy — Group → Movement → Modifier

> **Status: PROPOSAL, not current contract.** Everything above this section is the
> shipped model. This block is Nate's Jul 22 idea, captured for a second agent to
> review. Do **not** implement or reseed from this yet. If adopted it is a real
> `008`+ migration + seed rewrite, not a doc tweak.

### The idea in one line

Make the taxonomy an explicit three-tier drill-down —
**Group → Movement → Modifier** — where modifiers are **scoped to their movement**
instead of living in one global pool.

```text
[Group]        →  [Movement]        →  [Modifier(s)] (scoped to the movement)
Pull              Pullups              Wide-Grip · Archer · Chest-to-Bar
Push              Pushups              Wide-Grip · Archer · Standard
Gait              Running              LSD · Intervals · Trail
Combat/BJJ        Guard Passing        (discipline-specific modifiers)
```

### Why (the pain it targets)

- **Overlap across labels.** Today `PG: Pullups` + `Name: Weighted Pullups` +
  `Variation: Weighted` encode nearly the same thing in three places.
- **Global variation pool is muddy.** `Wide-Grip` is not structurally tied to
  `Pullups`; the only link today is the *soft* "suggested variations per PG."
- **Selecting a group should narrow the world.** Pick `Pull` → only pull movements
  appear; pick `Pullups` → only its modifiers appear.

### Key realization

OttoLog **already has these three tiers** — this is mostly a promotion + a tightening,
not a from-scratch redesign:

| Tier | Today | Proposed name | Change |
|------|-------|---------------|--------|
| 1 broad bucket | `category` (passive metadata) | **Group** (Family/Discipline) | Promote to first-class, navigable; drives suggestions + balance |
| 2 chart noun | `Primary Group` (`Pullups`, `Gait`) | **Movement** | Mostly rename |
| 3 modifier | `Variations` (flat global `analytics_tags`) | **Modifier** | **Scope to the movement** (biggest real change) |
| (display) | Exercise name (`Weighted Pullups`) | derived display | Compose from Movement + Modifiers; stop being a third parallel identity |

### Open decisions for the reviewer

1. **Top-tier axis consistency.** Nate's examples mix axes: movement pattern
   (`Pull/Push/Legs/Full-body`), modality (`Gait`), and discipline (`BJJ/Muay Thai`).
   That is the "two axes in one slot" trap this doc warns against, and today's
   `category` list already lives with the same compromise (`Push/Pull/Lower` beside
   `Cardio/Combat/Wellness`). Two ways to keep it clean:
   - **Option A (lean):** Group = **domain/family** (Strength, Gait, Combat,
     Wellness). Movement pattern (pull/push/legs) becomes a **secondary tag** on the
     movement for balance. Less to build; probably enough.
   - **Option B (powerful):** **two group axes** — a `pattern` axis
     (pull/push/legs/full-body) *and* a `domain` axis
     (strength/cardio/combat/wellness). This is the "PG-groups multi-axis" idea
     already parked in `Status.md`. More capable, more to build.
2. **Modifier scoping strength.**
   - **Enforced:** a modifier belongs to one movement (clean, rigid).
   - **Soft-suggested:** scoped picker, but any modifier can still attach if you dig
     (keeps the open-ended "log anything" promise). Today's model is soft.
3. **Complexes / full-body.** Under scoping, a complex = pick multiple movements,
   each with its own modifier selectors, crediting each — the existing multi-PG
   credit-each model, just per-movement scoped.

### Fit with Insights Phase 3

This dovetails with the Phase 3 per-PG card idea: select a Group → its movements
appear → each selected movement spawns its own card exposing **only its modifiers**
(the override-row analogy). See `Analytics_Overhaul_Proposal.md` §5.

### Ripple / cost if adopted

Touches the **exercise data model** (exercise → PG links), the **Murph seed**,
`New_User_Seeds.md`, `Label_Library.md`, `Database_Outline.md`, and this doc — plus
an `008`+ migration. Not analytics-only. Sequence it deliberately.

### Second-agent review (Jul 22 — ideation only)

> Verdict snapshot. Full argument lives in the chat that wrote this; do not treat
> as adopted.

**1. Better vs rename:** ~60% rename/promotion, ~40% real change. Promoting
`category` → navigable Group and tightening modifier pickers is real UX. The
**only hard schema win** is scoped modifiers. The “Weighted Pullups in three
places” pain is mostly **name discipline**, not hierarchy — Group→Movement alone
does not fix name ↔ modifier overlap. The example tree also **quietly changes
chart nouns** (see cardio / combat below) — that is not a rename.

**2. Open decisions:** Prefer **Option A** (domain/family Group + pattern as
secondary tag / keep today’s Push–Pull–Lower on the Movement). Prefer **soft
scoping** (scoped picker + Show all), not enforced ownership. Enforced breaks
shared modifiers (`Wide-Grip` on Pullups *and* Pushups) unless you duplicate
rows or invent M2M — which is today’s suggestion table with harder UX.

**3. Edge cases:** Complexes/credit-each survive. Martial arts example
`Combat/BJJ → Guard Passing` **inverts** today’s mode-as-PG / discipline-as-
variation. Cardio example `Gait → Running → LSD` **demotes Gait** from chart
noun to Group — Insights “one number” flips from family to flavor. Wellness
maps cleanly. Don’t mix pattern / modality / discipline in one Group slot.

**4. Cost / sequence:** Real `008`+ + seed rewrite + Account + Insights subject
wording. **Do not block Insights Phase 3** — Phase 3 per-movement cards work on
today’s PG + soft suggestions. Half-step without migration: browse-by-category
in pickers + stronger suggested-variations UX. Full adoption only **after**
Phase 3 feel, **before** Chat 6 (so seeds hit the winning model). Option B =
parked Phase 5 multi-axis, not this proposal’s MVP.

---

## Related docs

| Doc | Role |
|-----|------|
| `docs/Label_Library.md` | Seed map: labels, PGs, muscles, variations; next-phase notes |
| `docs/New_User_Seeds.md` | Locked full catalog for new-account seeds (rev. 3) |
| `docs/Database_Outline.md` | Tables, FKs, `track_analytics` / group / tag contracts |
| `docs/Template_Builders.md` | Exercise More panel: analytics on → required PG + optional variations |
| `docs/Project_Structure.md` | Where taxonomy CRUD and types live |
