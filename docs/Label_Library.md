# Label Library (personal → default seed)

Living map of nest labels and exercise analytics vocabulary. Goal: a clear
**best-practice shape** new users can inherit, then customize. Briefs are
product guidance — not extra DB columns (except where a later phase adds a
real field).

**Ordering:** alphabetical within each list. System nulls are called out
separately.

**Canonical dump:** full PG catalog, seeded variations, and tools live in
[`New_User_Seeds.md`](./New_User_Seeds.md) (rev. 3 locked). This file is the
shorter seed map + rules.

Related: [`Analytics_Labeling.md`](./Analytics_Labeling.md) (decision rules),
[`Database_Outline.md`](./Database_Outline.md) (schema).

---

## Analytics slots (target shape)

| Slot | UI (More panel) | Cardinality | Job |
|------|-----------------|-------------|-----|
| **Primary group(s)** | Required when tracking on | **1–N** (multi via links) | Chart noun(s) volume accrues to; each PG has a **category** |
| **Muscle groups** | Multiselect when tracking on | 0–N | Anatomy rollups |
| **Variations** | Multiselect today | 0–N | Modifiers (grip, angle, named variant, discipline, cardio flavor, …) |
| **Tools** | Multiselect today | ≥1 | Equipment (**None** = No Tool) |

DB table for Variations remains `analytics_tags` until a later SQL rewrite.
Equipment is **never** also a variation.

**Complexes:** one prescription can credit **multiple PGs** (e.g. 360-to-Squat
→ `360s` + `Squats`). Per-PG charts intentionally double-count; never sum PG
totals into one “grand total reps.”

---

## Build status

Shipped:

1. **Rest** session label + `is_empty` on session taxonomy (no blocks; notes only).
2. **Multi-select primary groups** + in-product warning about complex double-counting.
3. **Muscle groups** multiselect with the defaults below.
4. **Suggested variations per primary group** (soft picker filter; Show all for full pool).

Docs synced (rev. 3): Variations product term, block `Main` / `Wellness`,
`Competition Fights` plural, category + lean variation model. Still parked:
New User Seeds SQL content dump, starter templates. Greenfield schema + chat 5
app cutover cover `category`, log variation links, intensity / set type, and
Insights MVP.

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
| **Main** | Main work block (was `Workout`). |
| **Testing** | Performance testing (e.g. 1RM, time trial). |
| **Warmup** | Pre-work warm-up structure. |
| **Wellness** | Sauna / breath / recovery-style block inside a longer day. |

**System null:** `Block` — unlabeled block; structural placeholder only.

---

## Sequence labels

| Label | When to use |
|-------|-------------|
| **Circuit** | Rotate exercises for N rounds. |
| **Superset** | Pair / group exercises with shared rounds. |

**System null:** `Sequence` — unlabeled sequence; structural placeholder only.

Nest structure — and a valid Insights **grain** (filter + lens). Never an
exercise analytics *identity* (that stays PG + category + Variations + muscles +
tools). Block and sequence labels are stored on the logged facts
(`log_blocks.label_id`, `log_items.label_id`), so "all Challenge blocks" or
"Circuit vs Superset" are queryable directly.

---

## Primary groups

Long-lived **chart nouns**. Exercise name stays specific; PG stays reusable.
Each PG carries a **category** (Push / Pull / Lower / Core / Power / Skill /
Cardio / Combat / Mobility / Wellness) for balance analytics — see
[`New_User_Seeds.md`](./New_User_Seeds.md) for the full 43.

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

### Cardio families (modality = PG; flavor = variation)

| Primary group | Flavor variations (examples) |
|---------------|------------------------------|
| **Gait** | Walking, Running, Sprinting, Hiking, Rucking, Trail, … |
| **Swimming** | Freestyle, Drill, Intervals, … |
| **Cycling** | Road, Mountain, Steady, … |
| **Rowing** | Steady, Intervals, Easy, … |

Do **not** also keep Walking / Running / Sprinting as separate PGs.

### Combat (mode = PG; discipline = variation)

| Primary group | Means |
|---------------|--------|
| **Competition Fights** | Match / tournament work. |
| **Drilling** | Technique, positional, pads. |
| **Live Sparring** | Live rounds / rolling / sparring. |

### Wellness (optional)

| Primary group | Means |
|---------------|--------|
| **Breathwork** | Breath practice minutes. |
| **Cold Exposure** | Cold plunge / shower minutes. |
| **Meditation** | Meditation minutes. |
| **Sauna** | Sauna minutes. |

### Complex example

```text
Name:        Mace 360-to-Squat
PGs:         360s + Squats          ← multi-PG
Muscles:     Quads, …               ← muscle groups field
Variations:  Complex                ← optional flavor
Tools:       Mace
Reps:        300  →  +300 on Squats chart and +300 on 360s chart
```

---

## Muscle groups *(multiselect — defaults)*

First-class anatomy axis (not variations). New-user defaults (seeded via
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

**Keep out of variations:** don’t also create Chest/Back-style anatomy rows
once this field exists. Coarse region / pattern / plane facets are **not** in
the default seed — PG **category** + muscles cover them.

---

## Variations (modifiers)

Flat rows in `analytics_tags`. Product UI: **Variations**. Org folders below
are for humans/agents only.

Seed ~60 **shared / high-reuse** names; PG-specific names (`Goblet`, `Pendlay`,
`Nordic`, …) are suggestion-only until first use. Full lists:
[`New_User_Seeds.md`](./New_User_Seeds.md).

### Grip / stance

| Variation | Means |
|-----------|--------|
| **Close-Grip** | Closer than standard. |
| **Narrow-Grip** | Narrower than standard. |
| **Neutral-Grip** | Palms facing. |
| **Reverse-Grip** | Supinated / underhand relative to the movement’s default. |
| **Standard** | Default grip/stance for that movement. |
| **Underhand** | Underhand emphasis (e.g. rows). |
| **Wide-Grip** | Wider than standard. |

Use one grip family variation; don’t stack contradictory grips.

### Side / limb · angle · execution · load *(examples)*

`Single-Arm`, `Single-Leg`, `Alternating`, `Offset` · `Flat`, `Incline`,
`Decline`, `Seated`, `Standing`, `Paused` · `Explosive`, `Archer`, `Kipping`,
`Strict`, `Hold` · `Weighted`, `Assisted`, `Banded`, `Bodyweight`.

### Gait / cardio flavor *(PG = Gait / Swimming / …)*

| Variation | Means |
|-----------|--------|
| **Hiking** | Hiking flavor under Gait. |
| **Running** | Running flavor under Gait. |
| **Sprinting** | Sprint flavor under Gait. |
| **Walking** | Walking flavor under Gait. |
| **Easy** / **Intervals** / **Steady** | Cardio intensity chips. |

### Combat discipline *(PG = mode)*

| Variation | Means |
|-----------|--------|
| **BJJ** | Brazilian jiu-jitsu. |
| **Boxing** | Boxing. |
| **MMA** | Mixed martial arts. |
| **Muay Thai** | Muay Thai. |
| *(also)* | Judo, Kickboxing, Wrestling, … |

### Context

| Variation | Means |
|-----------|--------|
| **Complex** | Multi-movement prescription (flavor; multi-PG does the credit). |
| **Yoga** | Practice flavor under Mobility / Stretching. |

### Not in the default seed

| Dropped | Why |
|---------|-----|
| `Push` / `Pull` / `Hinge`, planes, `Full Body` / `Legs` / `Upper Body` | Encoded by PG **category** + muscles. |
| `Calisthenics` | Implied by `No Tool`. |
| `Murph Challenge` | Use block label **Challenge**. |
| Equipment names (`Barbell`, `Dumbbell`, …) | **Tools** only. |

---

## Canonical examples

```text
Exercise name:   Weighted Pullups
Primary group:   Pullups (category Pull)
Muscles:         Lats, Biceps, Forearms
Variations:      Wide-Grip · Weighted
Tool(s):         Straight Bar (+ Weighted Vest)
Session label:   Strength or Hybrid
Block label:     Main
```

```text
Exercise name:   Easy Trail Run
Primary group:   Gait
Muscles:         — (optional)
Variations:      Running · Easy · Trail
Tool(s):         None
Session label:   Cardio
Block label:     Main
```

```text
Exercise name:   BJJ Live Rounds
Primary group:   Live Sparring
Muscles:         — (optional)
Variations:      BJJ
Tool(s):         None
Session label:   Martial Arts
Block label:     Main or Class
```

```text
Exercise name:   Mace 360-to-Squat
Primary groups:  360s + Squats               ← multi-PG
Muscles:         Quads, Core, …
Variations:      Complex
Tool(s):         Mace
```

---

## Working rules

1. **PG = chart noun** (one today; many for complexes). Name = prescription.
2. **Muscle = anatomy.** Variations ≠ muscle list.
3. **Cardio family = PG**; Walking/Running/Sprinting/Hiking = variations under
   `Gait` (same idea for Swimming/Cycling/Rowing).
4. **Combat mode = PG**; BJJ / Muay Thai / MMA = variations.
5. **Session label = day intent.** Block/sequence = structure. All three are
   also Insights grains (filter + lens) — but never exercise identity.
6. **Spell once** — one `BJJ`, one `Standard`, etc.
7. **Users may customize everything**; defaults should still teach this shape.
8. **Suggested variations per PG** (soft) keep the exercise picker focused; they
   never replace the global pool or constrain stored links.
9. **Equipment = Tools only** — never dual-encode as a variation.

---

## Migration notes (this account)

Fresh templates/logs — rebuild vocabulary to match this doc:

| Change | Action |
|--------|--------|
| Walk / Run / Sprint / Run+Walk as PGs | Prefer **Gait** PG + flavor variations |
| Gait as a variation | Remove; Gait is a PG |
| Anatomy-ish tags | Move intent to **muscle groups** (shipped) |
| Prescription PGs (`KB Halo Rev. Lunges`) | Name only; PGs = `Halos` + `Lunges` (multi-PG) |
| Rest | Empty-session label (`is_empty`; shipped) |
| Suggested variations | Per-PG soft filter in Account → Taxonomy → Primary groups |
| Block `Workout` | Prefer **Main** |
| `Competition Fight` (singular) | Prefer **Competition Fights** |
