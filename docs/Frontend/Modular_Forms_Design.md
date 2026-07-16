# OttoLog — Modular Forms Design (v1)

Product + interaction design for the React Native editors. Domain language matches
`Backend/Database_Design.md`. Visual system: `Frontend/Styling.md`. App shell:
`Frontend/UI_Design.md`.

---

## Product alignment (locked)

**Yes — the session log form is a modified session template builder.**

Same nesting, same node editors, same compass, same collapse patterns. Different:

- Entry path and document type (`session_templates` vs `session_logs`)
- Header fields and note semantics
- Set grid intent (prescribe vs perform)
- Primary save target (JSONB template vs denested relational log)
- Which ⋯ snapshot actions are offered

One **component kit**. Two **document shells**.

---

## Information architecture

```
Landing
├── Build templates
│     ├── Session template builder     → session_templates
│     ├── Block template builder       → block_templates
│     ├── Cluster template builder     → cluster_templates
│     └── Exercise template builder    → exercise_templates
│
└── Log a session
      └── Session log builder          → session_logs (+ children)
            (optional: start from a session template)
```

### Landing

Two CTAs (same spirit as the standalone landing):

| CTA | Hint | Destination |
|-----|------|-------------|
| **Build templates** | Design reusable blueprints | Template hub → choose layer |
| **Log a session** | Capture what you trained | Session log builder (blank or from template) |

### Template hub

After “Build templates,” user picks which library object to create/edit:

| Builder | Saves to | Contains |
|---------|----------|----------|
| Session | `session_templates` | Full tree: blocks → items → nested exercises |
| Block | `block_templates` | One block subtree |
| Cluster | `cluster_templates` | One cluster + its exercises |
| Exercise | `exercise_templates` | Single exercise + default targets |

Each builder is **individually reachable** (deep link / hub tile). Internally they
compose the same leaf editors (e.g. session builder embeds block → cluster → exercise).

---

## Shared principles

1. **Array order is source of truth** — coordinates (`X.Y.Z`) are derived; compass mutates arrays.
2. **Library snapshots are copies** — ⋯ “Save as … template” copies the subtree; no live link back.
3. **Collapse the canvas** — coordinatable nodes support condensed (collapsed) vs expanded edit.
4. **⋯ is the settings menu** — notes, duration, analytics (exercises), delete, and snapshot-to-library.
5. **Tools / categories / units** — locked atoms + user `tools` / `session_categories` (always include **No Tool** and **Uncategorized**).
6. **Analytics is opt-in** — primary group + tags only when `track_analytics` is on.

---

## Node anatomy (every coordinatable thing)

Anything with a coordinate (block `X`, item `X.Y`, nested exercise `X.Y.Z`) shares:

| Piece | Role |
|-------|------|
| **Coord chip** | Shows derived address; opens **Address Compass** |
| **Collapsed summary** | Name + kind cues (tool, sets, cluster type); tap to expand |
| **Expanded body** | Full mini-form for that layer |
| **⋯ menu** | Layer settings + snapshot + delete |
| **Chevron / collapse** | Blocks & clusters collapse body (exercises densify via collapse summary) |

### Expanded vs collapsed

| State | Shows |
|-------|--------|
| **Collapsed** | Coord, title, compact meta (e.g. `3 sets · KB`, `Circuit · 4 exercises`) |
| **Expanded** | All fields for that layer; children list visible for block/cluster |

v1: collapsed ↔ expanded only. Optional “locked / non-editable” can come later for logging over prescriptions.

---

## Layer field specs

### Session (template builder)

| Field | Required | Notes |
|-------|----------|--------|
| `name` | ✓ | Template name |
| `category_id` | ✓ | FK → `session_categories`; default **Uncategorized** (system seed). Search/create for more. |
| `notes` | | **Coaching / programming notes** |
| `track_duration` / `duration` | | Optional structural duration (`hh:mm:ss`) |
| `blocks[]` | | Ordered list of blocks |

**Primary CTA:** Save session template.  
**⋯ / actions:** Add block; (library) open existing.

No `session_date` on templates.

### Session (log builder) — modified shell

Same tree editors as session template, with:

| Field | Required | Notes |
|-------|----------|--------|
| `name` | ✓ | Session name |
| `category_id` | ✓ | Same categories as templates; default **Uncategorized** |
| `session_date` | ✓ | Default today |
| `notes` | | **Athlete / session notes** (not coach copy) |
| `template_id?` | | Set when started from a session template |
| `status` | | `draft` \| `complete` |
| `track_duration` / `duration` | | Optional wall-clock for the session |
| `blocks[]` | | Same structure; set cells are **performed** values (may prefill from template) |

**Primary CTA:** Save draft / Complete session → denest RPC.  
**Secondary:** Save entire session as a new session template (end of flow).  
**⋯ on nodes:** Prefer **no** mid-tree “save as block/cluster template” in v1 while logging (keeps focus on capture). Optional later.

### Block

| Field | Notes |
|-------|--------|
| `name` | e.g. Warmup, Workout |
| `notes` | Coach notes in template builders; session notes in log builder |
| `track_duration` / `duration` | Optional |
| `items[]` | Mix of exercises and clusters (any order) |

**Actions:** + Add exercise, + Add cluster, Delete block.  
**⋯ snapshot (template contexts):** “Save as block template…” → confirm sheet.

### Cluster

| Field | Notes |
|-------|--------|
| `name` | Optional display name |
| `cluster_type` | **`superset` \| `circuit` only** (v1) |
| `notes` | Mode-appropriate |
| `track_duration` / `duration` | Optional |
| `items[]` | **Exercises only** (no nested clusters) |

**Type meaning (v1):**

- **Superset** — paired/grouped exercises performed back-to-back (rest between sets of the group, not between every exercise in the pair)  
- **Circuit** — rounds through the list; rest between exercises and/or rounds as programmed  

No `standard` / `sequence` options in v1.

**Actions:** + Add exercise, Delete cluster.  
**⋯ snapshot:** “Save as cluster template…” → confirm sheet.

### Exercise

| Field | Notes |
|-------|--------|
| `name` | Free-text display name |
| `tool_id` | Always set; UI “None” → **No Tool** |
| `comp_category_id` | Reps \| Time \| Time & Distance \| Time & Reps \| Distance |
| `prescribed_sets` | Controls `targets[]` length (grow/trim, preserve existing rows) |
| `notes` | Template: coaching cues · Log: how it felt / execution |
| `track_duration` / `duration` | Optional structural duration for the exercise as a whole |
| `track_analytics` | Opt-in; reveals primary group + tags |
| `primary_group_id` | Required **iff** analytics on; else null |
| `analytics_tag_ids` | Zero or more; only when analytics on |
| `targets[]` | Set rows (prescribe in templates; perform in logs) |

**⋯ snapshot:** “Save as exercise template…” → confirm sheet (solo builder: primary Save).

---

## Optional duration tracking

Available at **session, block, cluster, and exercise** (structural clock). Independent of set-level `time_duration`.

**UX (from prototype, keep):**

1. In ⋯ / more panel: toggle **Track duration**  
2. When on: `hh:mm:ss` picker (hours / minutes / seconds; arrow keys adjust on web — stepper on RN)  
3. When off: `duration = null`; hide picker  

**Not the same as** Time-category set metrics (`targets[].time_duration` for holds, intervals, etc.).

---

## Optional analytics (exercise + sets)

### Exercise level

1. Toggle **Track analytics** in ⋯ panel (default off).  
2. When **off:** hide primary group + tags; persist `primary_group_id: null`, `analytics_tag_ids: []`; set-level analytics checkboxes hidden / null.  
3. When **on:**

| Control | Behavior |
|---------|----------|
| **Primary analytics group** | Search combobox over `analytics_primary_groups`. Type to filter; Enter / “Create …” upserts a new group for this user. Exactly one. Required to save while analytics is on. |
| **Analytics tags** | Multi select / chip input over `analytics_tags`. Search existing; create on confirm. Many allowed. |

This replaces prototype free-text “Master exercise name” / comma “Group tags” with real taxonomy CRUD at the field.

### Set level

When exercise `track_analytics` is on, each target/set row can include `track_analytics` (bool) — include/exclude that set from rollups (prototype checkbox column). When exercise analytics is off, set flags are null/ignored.

---

## Targets / sets table

Driven by `comp_category_id` (same rules as standalone):

| Category | Volume columns | Always |
|----------|----------------|--------|
| Reps | reps (+ per-side toggle) | load_value, load_unit |
| Time | time_duration (`hh:mm:ss`) | load |
| Time & Distance | time_duration, distance_value + distance_unit | load |
| Time & Reps | time_duration, reps (+ per-side) | load |
| Distance | distance_value + distance_unit | load |

- `load_unit` from locked `load_units` — **v1: `lbs` \| `kg` \| `BW` only**.  
- `distance_unit` from locked `distance_units` — **v1: `mi` \| `km` \| `m`**.  
- Changing `prescribed_sets` grows/trims `targets[]` and keeps prior row values where possible.  
- **Template builders:** cells = prescription.  
- **Log builder:** cells = what was done (prefill from template targets when starting from a template).

---

## Address compass

Click **coord chip** → popover/sheet with dials **Block (X) · Item (Y) · In cluster (Z)**.

- ▲ = earlier (toward top of list); ▼ = later (toward bottom).  
- Enablement matrix and move rules: as implemented in the session templator compass (block swap on X; append-to-other-block for items; cluster-hop on Y for nested exercises; Z enter/exit adjacent clusters; empty clusters pruned).  
- Instant apply; live `from ➔ to` preview; Esc / outside closes.

Solo exercise/block/cluster builders: compass X/Y/Z only where that document’s nesting exists (e.g. pure exercise builder has no compass — or hide coord entirely).

---

## Snapshot confirm sheet

Triggered from ⋯ **Save as {block\|cluster\|exercise} template…** (and primary Save on solo builders).

| Field | Notes |
|-------|--------|
| Name | Required; prefilled from node name when present |
| Summary | Optional short description for library list |
| Preview | Read-only condensation (type, child count, category/tool if exercise) |

On confirm: deep-copy subtree → matching `*_templates` table with **new ids**. No update propagation to other sessions.

---

## ⋯ menu contents (by context)

### Template session / block / cluster / exercise (in-tree or solo)

Typical items:

- Track duration (+ picker when on)  
- Notes field  
- Track analytics + primary group + tags (**exercise only**)  
- **Save as … template** (when nested inside a larger builder)  
- Delete  

### Log session tree

Typical items:

- Track duration  
- Athlete/session notes  
- Track analytics + group/tags if user wants logging to count  
- Delete  
- (v1) omit mid-tree library snapshot  

Footer: Save draft / Complete; optional “Save as session template.”

---

## Add / remove / focus

From prototype, keep:

- Block: + Exercise, + Cluster  
- Cluster: + Exercise only  
- New nodes start **expanded**; focus name field  
- Delete via ⋯; if last exercise leaves a cluster empty → prune cluster (compass already does this on moves)

---

## Session log = modified session template builder (detail)

| Concern | Session template | Session log |
|---------|------------------|-------------|
| Shell component | `SessionTemplateScreen` | `SessionLogScreen` |
| Tree | `SessionEditor` | Same `SessionEditor` |
| Nodes | `BlockEditor` / `ClusterEditor` / `ExerciseEditor` | Same, `documentKind: 'log'` |
| Notes labels | Coaching / programming | Athlete / session |
| Date | Hidden | Required |
| Sets | Prescribe | Perform (prefill optional) |
| Save | Upsert JSONB `session_templates` | Denest to `session_logs`… |
| Start from library | Open template | Hydrate copy from template; set `template_id` |
| Snapshots | ⋯ save block/cluster/exercise | Session-level “save as template” only (v1) |

`documentKind` (or equivalent) drives copy, validation (primary group required when analytics on), and save adapter — not forked UI trees.

---

## Session categories (user-owned + Uncategorized)

Same pattern as **tools / No Tool**:

- Signup seeds **Uncategorized** (`is_system_default`) — the null-bucket for sessions/templates.  
- `category_id` is **never null**; new sessions/templates default to Uncategorized.  
- User creates more categories via search combobox + create.  
- Editable / archivable (except Uncategorized) like other user taxonomy.  
- Not a fixed Strength/Cardio enum. Composition categories (Reps / Time / …) stay system-locked.

## Tools & taxonomy pickers

| Picker | Source | UX |
|--------|--------|-----|
| Tool | `tools` for user | Dropdown; “None” → **No Tool** id |
| Session category | `session_categories` | Default **Uncategorized**; search + create more |
| Composition category | Locked 5 | Fixed select |
| Cluster type | Locked 2 | **`superset` \| `circuit`** |
| Primary group | `analytics_primary_groups` | Search + create |
| Tags | `analytics_tags` | Search + create chips |
| Load units | Locked | **`lbs` \| `kg` \| `BW`** |
| Distance units | Locked | **`mi` \| `km` \| `m`** |

Archive (not hard-delete) when removing from pickers if referenced — see DB design. System defaults (No Tool, Uncategorized) cannot be removed.

---

## Build ladder (implementation)

**Components:** exercise → cluster → block → session shell.  
**First vertical slice:** Landing → Log or Session template → one block → one exercise → save.

| Phase | Ship |
|-------|------|
| A | `ExerciseEditor` + targets + duration + analytics comboboxes + save exercise template |
| B | `ClusterEditor` / `BlockEditor` + collapse + ⋯ snapshot confirm |
| C | `SessionTemplateScreen` + compass + multi-block |
| D | `SessionLogScreen` (date, athlete notes, draft/complete, denest) |
| E | Template hub tiles + start-log-from-template |

---

## Explicit non-goals (v1)

- Live-linked templates (editing a library block updates sessions that used it)  
- Dual-mode single screen (Template | Log toggle) — replaced by two entry paths  
- Mid-log “save this block to library” (defer)  
- Locked/read-only prescription overlay (defer)  
- Prototype string fields as persisted API (`master_exercise_name`, `group_tags`, `distance_mi`)  
- Fixed session category enums — replaced by user `session_categories` + system **Uncategorized**  
- Cluster types beyond `superset` / `circuit`  
- Load units beyond `lbs` / `kg` / `BW`  
- Distance units beyond `mi` / `km` / `m`  

---

## References

| Doc | Role |
|-----|------|
| `Backend/Database_Design.md` | Tables, canonical JSON, denest |
| `Frontend/Styling.md` | Tokens, nesting rails, type |
| `Frontend/UI_Design.md` | App shell, Library, auth |
