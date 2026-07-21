# Label Library (personal → default seed)

Living map of nest labels and exercise analytics vocabulary. Goal: a clear
**best-practice shape** new users can inherit, then customize. Briefs are
product guidance — not extra DB columns (except where a later phase adds a
real field).

**Ordering:** alphabetical within each list. System nulls are called out
separately.

**Doc-only folders:** tag *types* organize thinking. Tags stay flat rows in
`analytics_tags`. Muscle groups are a first-class multiselect (see below).

Related: [`Analytics_Labeling.md`](./Analytics_Labeling.md) (decision rules),
[`Database_Outline.md`](./Database_Outline.md) (schema).

---

## Analytics slots (target shape)

| Slot | UI (More panel) | Cardinality | Job |
|------|-----------------|-------------|-----|
| **Primary group(s)** | Required when tracking on | **1–N** (multi via links) | Chart noun(s) volume accrues to |
| **Muscle groups** | Multiselect when tracking on | 0–N | Anatomy rollups |
| **Tags** | Multiselect today | 0–N | Facets (pattern, plane, grip, discipline, region, …) |
| **Tools** | Multiselect today | ≥1 | Equipment (**None** = No Tool) |

**Complexes:** one prescription can credit **multiple PGs** (e.g. 360-to-Squat
→ `360s` + `Squats`). Per-PG charts intentionally double-count; never sum PG
totals into one “grand total reps.”

---

## Build status

Shipped:

1. **Rest** session label + `is_empty` on session taxonomy (no blocks; notes only).
2. **Multi-select primary groups** + in-product warning about complex double-counting.
3. **Muscle groups** multiselect with the defaults below.
4. **Suggested tags per primary group** (soft picker filter; Show all for full pool).

---

## Session labels

| Label | When to use |
|-------|-------------|
| **Cardio** | Dedicated conditioning day (gait / swim / cycle / row as the focus). |
| **Hybrid** | Mixed strength + conditioning (or multi-modal) in one session. |
| **Martial Arts** | Combat-focused day (drilling, sparring, fight prep). |
| **Mobility** | Mobility / flexibility as the main intent of the day. |
| **Recovery** | Deliberate recovery work (easy movement — not “did nothing”). |
| **Recreation** | Life / outdoor / play days that aren’t dedicated training. |
| **Rest** | Deliberately logged empty day (notes only; `is_empty`). Not unlogged; not `Session`. |
| **Strength** | Strength- or skill-primary lifting / calisthenics day. |

**System null:** `Session` — unclassified / default when no intent chosen yet.

---

## Block labels

| Label | When to use |
|-------|-------------|
| **Challenge** | Named challenge block (e.g. Murph chunk) inside a session. |
| **Class** | Coached / class-style block. |
| **Competition** | Match / tournament block inside a longer day. |
| **Cooldown** | Post-work cool-down structure. |
| **Testing** | Performance testing (e.g. 1RM, time trial). |
| **Warmup** | Pre-work warm-up structure. |
| **Workout** | Main work block. |

**System null:** `Block` — unlabeled block; structural placeholder only.

---

## Sequence labels

| Label | When to use |
|-------|-------------|
| **Circuit** | Rotate exercises for N rounds. |
| **Superset** | Pair / group exercises with shared rounds. |

**System null:** `Sequence` — unlabeled sequence; structural placeholder only.

Nest structure only — not analytics identity.

---

## Primary groups

Long-lived **chart nouns**. Exercise name stays specific; PG stays reusable.

### Strength / skill (examples)

| Primary group | Chart meaning |
|---------------|---------------|
| **360s** | Mace (or similar) 360 family. |
| **Deadhangs** | Deadhang volume / time. |
| **Dips** | Dip family. |
| **Halos** | Halo family. |
| **Lunges** | Lunge family. |
| **Pullups** | Pull-up family. |
| **Pushups** | Push-up family. |
| **Squats** | Squat family. |
| **Swings** | Swing family (KB / mace as tool). |

Add a PG when you want a **years-long chart** for that movement. Prefer
`Lunges` + name `KB Halo Rev. Lunges` over a one-off PG string.

### Cardio families (modality = PG; flavor = tag)

Same pattern for every loco family:

| Primary group | Flavor tags (examples) |
|---------------|------------------------|
| **Gait** | Walk, Run, Sprint, Hike, … |
| **Swim** | *(as needed)* freestyle, drill, … |
| **Cycle** | *(as needed)* road, trainer, … |
| **Row** | *(as needed)* steady, intervals, … |

Do **not** also keep Walk / Run / Sprint as separate PGs.

### Combat (mode = PG; discipline = tag)

| Primary group | Means |
|---------------|--------|
| **Competition Fight** | Match / tournament work. |
| **Drilling** | Technique, positional, pads. |
| **Live Sparring** | Live rounds / rolling / sparring. |

### Wellness (optional)

| Primary group | Means |
|---------------|--------|
| **Cold Exposure** | Cold plunge / shower minutes. |
| **Meditation** | Meditation minutes. |
| **Sauna** | Sauna minutes. |

### Complex example

```text
Name:     Mace 360-to-Squat
PGs:      360s + Squats          ← multi-PG
Muscles:  Quads, …               ← muscle groups field
Tags:     Complex                ← optional flavor
Tools:    Mace
Reps:     300  →  +300 on Squats chart and +300 on 360s chart
```

---

## Muscle groups *(multiselect — defaults)*

First-class anatomy axis (not tags). New-user defaults (seeded via
`ensure_default_muscle_groups`):

| Muscle group | Notes |
|--------------|--------|
| **Biceps** | |
| **Calves** | |
| **Chest** | |
| **Core** | |
| **Forearms** | |
| **Hamstrings/Glutes** | Combined posterior chain lower. |
| **Lats** | |
| **Neck** | |
| **Quads** | |
| **Rear Delts** | |
| **Shoulders** | Delts broadly; use Rear Delts when you care about that split. |
| **Spinal Chain** | Erectors / spinal stability work. |
| **Traps** | |
| **Triceps** | |

Multiselect on an exercise (e.g. Dips → Chest + Triceps + Shoulders).

**Keep out of tags:** don’t also create Chest/Back-style anatomy tags once this
field exists. Coarse **region** tags (`Legs`, `Upper Body`, `Full Body`) may
remain as quick filters.

---

## Analytics tags (by type — organization only)

Flat in the DB. Types are folders for humans/agents only.

### Movement pattern

| Tag | Means |
|-----|--------|
| **Pull** | Pull-dominant pattern. |
| **Push** | Push-dominant pattern. |

### Plane / direction

| Tag | Means |
|-----|--------|
| **Horizontal** | Horizontal plane. |
| **Transverse** | Rotational / transverse plane. |
| **Vertical** | Vertical plane. |

### Grip / stance

| Tag | Means |
|-----|--------|
| **Narrow-Grip** | Narrower than standard. |
| **Standard** | Default grip/stance for that movement. |
| **Wide-Grip** | Wider than standard. |
| **Bilateral** | Both sides together. |
| **Unilateral** | One side / alternating. |

Use one grip family tag; don’t stack contradictory grips.

### Region *(coarse — optional beside muscle field)*

| Tag | Means |
|-----|--------|
| **Full Body** | Whole-body emphasis. |
| **Legs** | Lower-body emphasis. |
| **Upper Body** | Upper-body emphasis. |

### Modality / style

| Tag | Means |
|-----|--------|
| **Calisthenics** | Bodyweight / calisthenics context. |
| **Complex** | Multi-movement prescription (flavor; multi-PG does the credit). |

### Gait / cardio flavor *(PG = Gait / Swim / …)*

| Tag | Means |
|-----|--------|
| **Hike** | Hiking flavor under Gait. |
| **Run** | Running flavor under Gait. |
| **Sprint** | Sprint flavor under Gait. |
| **Walk** | Walking flavor under Gait. |

Add as needed: `easy`, `intervals`, `trail`, `road`, `loaded`, `walk-break`.

### Combat discipline *(PG = mode)*

| Tag | Means |
|-----|--------|
| **BJJ** | Brazilian jiu-jitsu. |
| **MMA** | Mixed martial arts. |
| **Muay Thai** | Muay Thai. |

### Event / context

| Tag | Means |
|-----|--------|
| **Murph Challenge** | Murph / Murph-prep filter across sessions. |

Prefer block label **Challenge** for nest structure; keep the tag for filtering.

### Other useful types (create when needed)

| Type | Example tags |
|------|----------------|
| **Load / assistance** | Weighted, Band-Assist, Tempo |
| **Wellness** | Morning, Guided, Contrast |
| **Environment** | Indoor, Outdoor, Home, Gym |

---

## Canonical examples

```text
Exercise name:   Weighted Pullups
Primary group:   Pullups
Muscles:         Lats, Biceps, Forearms
Tags:            Calisthenics · Vertical · Pull · Standard
Tool(s):         Straight Bar (+ Weighted Vest)
Session label:   Strength or Hybrid
Block label:     Workout
```

```text
Exercise name:   Easy Trail Run
Primary group:   Gait
Muscles:         — (optional)
Tags:            Run · easy · trail          ← flavor under Gait
Tool(s):         None
Session label:   Cardio
Block label:     Workout
```

```text
Exercise name:   BJJ Live Rounds
Primary group:   Live Sparring
Muscles:         — (optional)
Tags:            BJJ
Tool(s):         None
Session label:   Martial Arts
Block label:     Workout or Class
```

```text
Exercise name:   Mace 360-to-Squat
Primary groups:  360s + Squats               ← multi-PG
Muscles:         Quads, Core, …
Tags:            Complex
Tool(s):         Mace
```

---

## Working rules

1. **PG = chart noun** (one today; many for complexes later). Name = prescription.
2. **Muscle = anatomy.** Tags ≠ muscle list.
3. **Cardio family = PG**; Walk/Run/Sprint/Hike = tags under `Gait` (same idea for Swim/Cycle/Row).
4. **Combat mode = PG**; BJJ / Muay Thai / MMA = tags.
5. **Session label = day intent.** Block/sequence = structure only.
6. **Spell once** — one `BJJ`, one `Standard`, etc.
7. **Users may customize everything**; defaults should still teach this shape.
8. **Suggested tags per PG** (soft) keep the exercise tag picker focused; they never
   replace the global tag pool or constrain stored links.

---

## Migration notes (this account)

Fresh templates/logs — rebuild vocabulary to match this doc:

| Change | Action |
|--------|--------|
| Walk / Run / Sprint / Run+Walk as PGs | Prefer **Gait** PG + flavor tags |
| Gait as a tag | Remove; Gait is a PG |
| Anatomy-ish tags | Move intent to **muscle groups** (shipped) |
| Prescription PGs (`KB Halo Rev. Lunges`) | Name only; PGs = `Halos` + `Lunges` (multi-PG) |
| Rest | Empty-session label (`is_empty`; shipped) |
| Suggested tags | Per-PG soft filter in Account → Taxonomy → Primary groups |
