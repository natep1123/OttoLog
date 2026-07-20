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
| **Primary group** | **One** analytics rollup key when tracking is on | User vocabulary |
| **Tags** | Many optional facets for filtering / slicing | User vocabulary |
| **Tool** | Equipment | User + global **No Tool** |
| **Session label** | Day-level kind / intent | User + system null **Session** |
| **Block / Sequence labels** | Nest structure (Warmup, Circuit, …) | User + system nulls |
| **Target shape** | Which set input fields appear | Locked atoms |
| **`track_analytics`** | Opt in/out of analytics identity | Boolean |

Primary Group exists so several differently named exercises can share one chart
bucket. Tags exist so you can ask secondary questions without splitting that
bucket. Display name is never the analytics identity.

## Decision rule

Ask:

> If Insights showed me **one number** for this exercise this month, what noun
> should that number sit under?

That noun is the **Primary Group**.

Everything that answers *how / with what / which style / which context* is a
tag, a tool, a session label, or the display name — not the Primary Group.

### What belongs where

| Put here | Examples |
|----------|----------|
| **Primary Group** | `Pullups`, `Run`, `Walk`, `Hike`, `Sprint`, `Drilling`, `Live Sparring`, `Competition Fight`, `Meditation`, `Sauna` |
| **Tags** | `wide-grip`, `standard`, `BJJ`, `Muay Thai`, `MMA` |
| **Tool** | `Kettlebell`, `Mace`, `None` |
| **Session label** | `Hybrid`, `Cardio`, `Recovery`, `Martial Arts`, `Recreation` |
| **Block / Sequence labels** | `Warmup`, `Workout`, `Circuit` — structural, not analytics |
| **Exercise name** | `Weighted Pullups`, `BJJ Live Rounds`, `KB Halo Rev. Lunges` |

### What not to put in Primary Group

- Modality buckets: Strength, Cardio, Wellness, Gait
- Equipment (use Tool)
- Grip / stance / variation details (tags or name)
- Session intent: Hybrid, Recovery, Martial Arts, Recreation (session label)
- Nest structure: Warmup / Workout / Circuit (block/sequence labels)
- Compound two-axis names: `BJJ Live`, `Strength Pullups` (use PG + tag instead)
- Combat **disciplines** when using the mode-as-PG convention below (put `BJJ` /
  `Muay Thai` / `MMA` on tags)

## Strength / hybrid / calisthenics

| Field | Practice |
|-------|----------|
| Primary Group | The movement you progress (`Pullups`, not `Strength`) |
| Tags | Pattern / style / focus (`calisthenics`, `vertical`, `pull`, `standard`, `wide-grip`) |
| Name | Specific prescription identity (`Weighted Pullups`) |
| Tool | Implement when it matters for equipment rollups |

Variations of the same movement should **reuse** the Primary Group. Encode the
variation in the name and/or tags.

## Gait (run / walk / hike / sprint)

Prefer **concrete activities as Primary Groups**, not an abstract parent like
`Gait`:

| Flavor | Primary Group | Tags (examples) |
|--------|---------------|-----------------|
| Easy run | `Run` | `easy`, `road` / `trail` |
| Sprint work | `Sprint` *or* `Run` + tag `sprint` | `intervals`, `track` |
| Run/walk | `Run` *or* dedicated `Run+Walk` if you want separate totals | `intervals`, `walk-break` |
| Long walk | `Walk` | `long`, `recovery` |
| Hike | `Hike` | `loaded`, `trail` |

**Separate Primary Groups only when you want separate default charts.** If
sprint volume should always live inside Run, keep PG = `Run` and tag `sprint`.

Interval structure can live in the nest (sequence of Run / Walk items) or in
one Time & Distance exercise — labels do not have to encode the intervals.

**Session label:** dedicated training runs/hikes can stay under `Cardio` /
`Hybrid`. Casual camping, hiking, and similar outdoor days usually use
`Recreation` unless that day is explicitly training-focused.

## Martial arts (two axes)

You have two meaningful axes and **only one Primary Group**. This account’s
convention:

- **Primary Group = training mode** — effort / intensity bucket you chart first
- **Tags = discipline** — which art(s) that work belonged to
- **Session label = `Martial Arts`** for combat-focused days (not `Cardio`)

| Primary Group | Means |
|---------------|--------|
| `Drilling` | Technique, positional work, pads, reps of moves |
| `Live Sparring` | Sparring / rolling / timed live rounds |
| `Competition Fight` | Match / tournament work |

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
| Tournament | `Match` | `Competition Fight` | `BJJ` | `Martial Arts` |

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
| Cold | `Cold Exposure` | `plunge`, `shower` |

**Session labels**

- **`Martial Arts`** — combat-focused sessions (see above).
- **`Recreation`** — camping, casual hiking, and other life/outdoor days that
  are not dedicated training. Exercises inside can still use PGs like `Hike`
  or `Walk` if you want those minutes on charts.
- Dedicated training hikes/runs stay under training session labels (`Cardio`,
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
7. **Insights will love Primary Group first** (log rows carry `primary_group_id`).
   Treat tags as the flexible overlay you enrich over time.

## Starter kit (personal / test account)

Optional seed vocabulary while dogfooding. Users start empty; optional
populate-from-preset is a future product surface.

### Primary Groups

- Strength / skill: `Pullups`, `Pushups`, `Squats`, plus each hybrid/mace/KB
  family you actually chart
- Gait: `Run`, `Walk`, `Hike`, `Sprint`
- Combat modes: `Drilling`, `Live Sparring`, `Competition Fight`
- Wellness (if tracking minutes): `Meditation`, `Sauna`, `Cold Exposure`

### Shared tags

- Movement: `calisthenics`, `vertical`, `pull`, `push`, `standard`, `wide-grip`, …
- Gait: `easy`, `intervals`, `trail`, `road`, `loaded`, `walk-break`
- Combat discipline: `BJJ`, `Muay Thai`, `MMA`
- Wellness: `morning`, `guided`, `contrast`, …

### Session labels

Keep few: `Session` (default), `Hybrid`, `Cardio`, `Recovery`, `Martial Arts`,
`Recreation`.

### Block / Sequence labels

Prefer seeded structural words (`Warmup` / `Workout` / `Cooldown`, `Circuit` /
`Superset` / `Sequence`). Do not overload them with analytics meaning.

## Related docs

| Doc | Role |
|-----|------|
| `docs/Database_Outline.md` | Tables, FKs, `track_analytics` / group / tag contracts |
| `docs/Template_Builders.md` | Exercise More panel: analytics on → required PG + optional tags |
| `docs/Project_Structure.md` | Where taxonomy CRUD and types live |
