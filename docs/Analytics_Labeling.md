# OttoLog Analytics Labeling

Best practices for Primary Groups, tags, tools, and nest labels so analytics
stay open-ended and queryable. Schema contracts live in `Database_Outline.md`;
builder chrome lives in `Template_Builders.md`.

OttoLog is a general-purpose tracking system. Fitness is the first deep use
case, not a hard ceiling. Anything that fits a target shape (Reps, Time,
Distance, …) can be an exercise — meditation, sauna, competitions, camping-day
work blocks — without a schema redesign. What you choose here is **how well
volume rolls up**, not **permission to log**.

## Vocabulary map (do not collapse these)

| Slot | Job | Open-ended? |
|------|-----|-------------|
| **Exercise name** | Display / library identity | Free text |
| **Primary group(s)** | Chart noun(s) when tracking is on (**1–N** for complexes) | User vocabulary |
| **Muscle groups** | Anatomy rollups (multiselect) | Seeded defaults + user edits |
| **Tags** | Facets for filtering (not anatomy once muscles ship) | User vocabulary |
| **Tool(s)** | Equipment | User + global **No Tool** |
| **Session label** | Day-level kind / intent | User + system null **Session**; **Rest** is a normal seeded empty label (`is_empty`) |
| **Block / Sequence labels** | Nest structure (Warmup, Circuit, …) | User + system nulls |
| **Target shape** | Which set input fields appear | Locked atoms |
| **`track_analytics`** | Opt in/out of analytics identity | Boolean |

Primary Group exists so several differently named exercises can share one chart
bucket (complexes may credit **multiple** buckets). Muscle groups answer
tissue questions. Tags answer secondary facets. Display name is never the
analytics identity.

Seed vocabulary map: [`Label_Library.md`](./Label_Library.md).

## Decision rule

Ask:

> If Insights showed me **one number** for this exercise this month, what noun
> should that number sit under?

That noun is a **Primary Group**. For complexes (e.g. 360-to-Squat), select
every noun that should receive the reps.

Everything that answers *how / with what / which style / which tissue / which
context* is a tag, muscle group, tool, session label, or the display name —
not crammed into a single PG string.

### What belongs where

| Put here | Examples |
|----------|----------|
| **Primary Group** | `Pullups`, `Squats`, `360s`, `Gait`, `Drilling`, `Live Sparring`, `Meditation`, `Competition Fights` |
| **Muscle groups** | Chest, Lats, Quads, Core, … |
| **Tags** | `wide-grip`, `standard`, `BJJ`, `Run` (under Gait), `Complex` |
| **Tool** | `Kettlebell`, `Mace`, `None` |
| **Session label** | `Hybrid`, `Cardio`, `Recovery`, `Martial Arts`, `Recreation`, `Rest` (empty; `is_empty`) |
| **Block / Sequence labels** | `Warmup`, `Workout`, `Circuit` — structural, not analytics (for now) |
| **Exercise name** | `Weighted Wide-Grip Pullups`, `BJJ Live Rounds`, `Mace 360-to-Squat` |

### What not to put in Primary Group

- Session intent: Hybrid, Recovery, Martial Arts, Recreation (session label)
- Nest structure: Warmup / Workout / Circuit (block/sequence labels)
- Equipment (use Tool)
- Anatomy (use muscle groups)
- Grip / stance / plane details (tags)
- Compound two-axis names: `BJJ Live`, `Strength Pullups` (use PG + tag)
- Combat **disciplines** (tags: `BJJ` / `Muay Thai` / `MMA`)
- Gait **flavors** when using family-as-PG: Walk / Run / Sprint / Hike are tags under `Gait`

## Strength / hybrid / calisthenics

| Field | Practice |
|-------|----------|
| Primary Group | The movement you progress (`Pullups`, not `Strength`) |
| Muscle groups | Tissue emphasis |
| Tags | Pattern / style / grip (`calisthenics`, `vertical`, `pull`, `standard`) |
| Name | Specific prescription (`Weighted Pullups`) |
| Tool | Implement when it matters |

Variations of the same movement **reuse** the Primary Group. Encode variation
in the name and/or tags. Complexes that truly are two movements use **multiple
PGs** so reps accrue to each chart.

## Gait / swim / cycle / row

Prefer **family as Primary Group**, flavor as tags — same pattern for every
cardio family:

| Family (PG) | Flavor tags (examples) |
|-------------|------------------------|
| `Gait` | `Walk`, `Run`, `Sprint`, `Hike`, `Ruck` |
| `Swim` | stroke / drill tags as needed |
| `Cycle` | `road`, `trainer`, … |
| `Row` | `steady`, `intervals`, … |

**Session label:** dedicated training under `Cardio` / `Hybrid`. Casual outdoor
days usually `Recreation` unless explicitly training-focused.

## Martial arts (two axes)

You have two meaningful axes. This account’s convention (usually **one** mode
PG per exercise; multi-PG is for true complexes):

- **Primary Group = training mode** — effort / intensity bucket you chart first
- **Tags = discipline** — which art(s) that work belonged to
- **Session label = `Martial Arts`** for combat-focused days (not `Cardio`)

| Primary Group | Means |
|---------------|--------|
| `Drilling` | Technique, positional work, pads, reps of moves |
| `Live Sparring` | Sparring / rolling / timed live rounds |
| `Competition Fights` | Match / tournament work |

| Tag | Means |
|-----|--------|
| `BJJ` | Brazilian jiu-jitsu |
| `Muay Thai` | Muay Thai |
| `MMA` | Mixed martial arts |

| What you did | Name | PG | Tags | Session label |
|--------------|------|----|------|----------------|
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
  Block [Workout]
    Exercise  Name: BJJ Live Rounds   PG: Live Sparring   tags: BJJ
    Exercise  Name: Pad Work          PG: Drilling        tags: Muay Thai
```

One row tagged with multiple arts (`BJJ` + `Muay Thai`) is fine when you only
care about total mode time and not a clean per-art split.

Why mode-as-PG here: combat load is tracked by **effort type** across arts.
Discipline-as-PG is equally valid for accounts that care first about hours per
art — this doc follows the mode-first choice above.

## Wellness and recreation

Same exercise model for wellness. Use a Time (or other) shape and a Primary
Group when you want totals:

| Activity | Primary Group | Tags (examples) |
|----------|---------------|-----------------|
| Meditation | `Meditation` | `morning`, `guided`, `breathwork` |
| Sauna | `Sauna` | `hot`, `contrast` |
| Cold | `Cold Exposure` | `cold`, `plunge`, `shower` |

**Session labels**

- **`Martial Arts`** — combat-focused sessions (see above).
- **`Recreation`** — camping, casual hiking, and other life/outdoor days that
  are not dedicated training. Exercises inside can still use PGs like `Hike`
  or `Walk` if you want those minutes/miles on charts.
- Dedicated training hikes/runs should stay under training session labels (`Cardio`,
  `Hybrid`, etc.), not `Recreation`.

If you only want something in the session narrative and never in Insights: turn
**`track_analytics` off**. No Primary Group required.

## Rules of thumb

1. **PG = chart noun for years.** Boring, stable, reused.
2. **Tag = filter chip.** Can be experimental and messy.
3. **Don’t encode two axes into one PG.** Use PG + tag.
4. **Don’t invent a new PG for a variation** — name or tag it.
5. **Spell once and reuse** — one row for `BJJ`, not parallel `Bjj` /
   `Brazilian Jiu-Jitsu` tags (or PGs in other conventions).
6. **Archive + create** if a PG’s meaning changes; don’t silently rename history.
7. **Insights will love Primary Group first** (log rows carry `primary_group_id`
   plus PG link tables for complexes). Treat tags as the flexible overlay you
   enrich over time. Optional **suggested tags per PG** soft-filter the picker;
   they never constrain stored links.

## Starter kit (personal / test account)

Canonical lists live in [`Label_Library.md`](./Label_Library.md). Summary:

### Primary Groups

- Strength / skill: `Pullups`, `Pushups`, `Squats`, `Lunges`, `Halos`, `360s`, …
- Cardio families: `Gait`, `Swim`, `Cycle`, `Row` (flavors as tags)
- Combat modes: `Drilling`, `Live Sparring`, `Competition Fight`
- Wellness (if tracking minutes): `Meditation`, `Sauna`, `Cold Exposure`

### Muscle groups (seeded defaults)

Chest, Lats, Spinal Chain, Rear Delts, Shoulders, Biceps, Triceps, Traps,
Quads, Hamstrings/Glutes, Calves, Core, Forearms, Neck

### Shared tags

- Pattern / plane / grip: `pull`, `push`, `vertical`, `standard`, `wide-grip`, …
- Region (coarse): `legs`, `upper body`, `full body`
- Gait flavors under PG `Gait`: `Walk`, `Run`, `Sprint`, `Hike`, …
- Combat discipline: `BJJ`, `Muay Thai`, `MMA`
- Style: `calisthenics`, `complex`, …

### Session labels

`Session` (null), `Hybrid`, `Cardio`, `Strength`, `Recovery`, `Mobility`,
`Martial Arts`, `Recreation`, `Rest` (empty; notes only).

### Block / Sequence labels

Structural only: `Warmup` / `Workout` / `Cooldown` / `Challenge` / … ;
`Circuit` / `Superset` / `Sequence`.

## Related docs

| Doc | Role |
|-----|------|
| `docs/Label_Library.md` | Seed map: labels, PGs, muscles, tags by type; next-phase notes |
| `docs/Database_Outline.md` | Tables, FKs, `track_analytics` / group / tag contracts |
| `docs/Template_Builders.md` | Exercise More panel: analytics on → required PG + optional tags |
| `docs/Project_Structure.md` | Where taxonomy CRUD and types live |
