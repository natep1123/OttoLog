# OttoLog — Database Design (v1)

Canonical schema for the React Native + Supabase app. Aligns with
`Frontend/Modular_Forms_Design.md` and `Frontend/UI_Design.md`.

## Philosophy

OttoLog is an **infinite workout canvas** — no fixed exercise list, no fixed equipment
list, no fixed grouping system. Only the *shape* of tracking is fixed (composition
categories, load units, distance units, cluster types). Everything a user tracks
*with* — tools, session categories, exercises, groupings — is theirs to define,
rename, and archive.

**Signup seeds only two structural defaults** (not starter content libraries):

1. **No Tool** — so unequipped work always has a non-null `tool_id`  
2. **Uncategorized** — so every session/template always has a non-null `category_id`  

No exercises, analytics groups, tags, or extra tools/categories are seeded.

Every user-owned table carries `user_id` and is RLS-scoped to `auth.uid()` (except
`public.users`, keyed by `id = auth.uid()`).

**Array order is the source of truth** in the live editor. Persisted
`block_order` / `item_order` / `sub_item_order` / `set_number` on log rows are
denormalized for querying and renest; coordinates (`1.2.3`), `cluster_key`, and
`sub_item_key` are **derived** and not stored as source-of-truth columns.

---

## Auth profile — `public.users`

One row = one user’s profile (not a separate `profiles` table).

| Table | Fields | Notes |
|---|---|---|
| `public.users` | `id` (PK = `auth.uid()`), `username` (unique), `created_at`, `updated_at` | Email/password live in `auth.users`. App reads username from here. Extend later (avatar, prefs) on this same row. |

On signup: insert `public.users`, then seed No Tool + Uncategorized for that `user_id`.

---

## Locked atoms (system-fixed, no `user_id`)

| Table | Fields | Notes |
|---|---|---|
| `composition_categories` | `id, name` | Fixed 5: **Reps, Time, Time & Distance, Time & Reps, Distance**. |
| `load_units` | `id, name` | Fixed v1: **`lbs`, `kg`, `BW` only**. |
| `distance_units` | `id, name` | Fixed v1: **`mi`, `km`, `m`**. |

---

## User taxonomy (user-owned)

| Table | Fields | Notes |
|---|---|---|
| `tools` | `id, user_id, name, is_system_default, archived_at?` | User equipment vocabulary. Signup seeds **No Tool** (`is_system_default = true`). |
| `session_categories` | `id, user_id, name, is_system_default, archived_at?` | User session/template labels. Signup seeds **Uncategorized** (`is_system_default = true`). Additional categories are user-created. |
| `analytics_primary_groups` | `id, user_id, name, archived_at?` | Analytics aggregation bucket. Required only when exercise `track_analytics` is on. |
| `analytics_tags` | `id, user_id, name, archived_at?` | Free-form many-per-exercise filters. |
| `analytics_tag_links` | `id, exercise_template_id, tag_id` | M2M exercise templates ↔ tags. |

### Structural seeds (No Tool + Uncategorized)

These are **null-bucket stand-ins**, not a starter library:

| Seed | Table | Why |
|------|--------|-----|
| **No Tool** | `tools` | `tool_id` is never null on exercises; bodyweight / unequipped work points here. |
| **Uncategorized** | `session_categories` | `category_id` is never null on session templates/logs; default when the user hasn’t filed the session elsewhere. |

Both: `is_system_default = true`, cannot be archived or deleted. UI may label the tool picker “None” while storing No Tool’s id; category picker shows **Uncategorized** as the default option. Users can create as many other tools/categories as they want.

### Delete / archive rules (v1)

Non-default tools, session categories, primary groups, and tags may be **archived**
(`archived_at`). Hard-delete is **RESTRICT**ed while referenced. System defaults
(No Tool, Uncategorized) cannot be removed.

### `session_categories` — user labels (+ Uncategorized)

- Not a fixed Strength/Cardio/… enum.  
- Always at least **Uncategorized** after signup.  
- `session_templates.category_id` and `session_logs.category_id` FK here — **never null**.  
- Renaming user categories updates labels; ids stay stable. Do not rename away the system Uncategorized row’s role (keep `is_system_default`).

Do not confuse with **composition categories** (Reps / Time / …) on exercises.

### `analytics_primary_groups` is a reporting bucket, not an exercise name

- **Exercise name ≠ Analytics identity.** The name on an exercise (template or log)
  is free text.
- When `track_analytics = true`, the exercise maps to **exactly one**
  `analytics_primary_groups` row via `primary_group_id`.
- When `track_analytics = false`, `primary_group_id` is **null** and tag links are
  empty — matching the editor prototype (analytics is opt-in).
- Multiple differently-named exercises can share one primary group so volume rolls up
  together.

Example:

```
Exercises (display names):
  - Pull-Ups
  - Wide-Grip Pull-Ups
  - Archer Pull-Ups
  - Neutral-Grip Pull-Ups
        │
        ▼  (all four set primary_group_id →)
Primary Analytics Group:
  - Pull-Ups
```

**Renaming behavior:** renaming a primary group (or tool, or tag) changes its
display label everywhere immediately. Historical aggregation keys off stable `id`s.
No snapshot/versioned naming in v1.

### How Exercise Templates, Primary Groups, and Analytics Tags work together

```
Exercise (display name):   "Wide-Grip Pull-Ups"   ← what the user sees in the editor
Primary Analytics Group:   "Pull-Ups"              ← required only if track_analytics
Analytics Tags:            "Back", "Calisthenics" ← optional many-to-many filters
```

Legacy editor JSON used `master_exercise_name` / `group_tags` for these concepts.
Canonical names going forward: **`primary_group_id`** / **`analytics_tag_ids`**
(see [Canonical JSON tree](#canonical-json-tree-editor--template-content)).

---

## Templates (presets — reusable building blocks)

| Table | Fields | Notes |
|---|---|---|
| `exercise_templates` | `id, user_id, name, tool_id, track_analytics, primary_group_id?, comp_category_id, default_target_shape (jsonb), track_duration, duration?, notes?, created_at, updated_at` | Personal preset dictionary for autocomplete / inject. `tool_id` always set (No Tool ok). `primary_group_id` **required iff** `track_analytics = true`, else null. `default_target_shape` mirrors `targets[]`. |
| `cluster_templates` | `id, user_id, name, cluster_type, content (jsonb), created_at, updated_at` | Reusable cluster blob. `cluster_type` ∈ **`superset` \| `circuit`** only (v1). Fully standalone. |
| `block_templates` | `id, user_id, name, content (jsonb), created_at, updated_at` | Reusable block blob, fully standalone. |
| `session_templates` | `id, user_id, name, category_id (fk → session_categories, never null), notes, track_duration, duration?, content (jsonb), created_at, updated_at` | Full session blueprint. Default category = **Uncategorized**. `content` is the complete blocks/items tree. |

### Templates are fully independent (v1)

`session_templates`, `block_templates`, and `cluster_templates` do **not** reference
each other. Inserting a saved block/cluster into a session template **copies JSON
wholesale**. Editing a library row later does not propagate. Accepted tradeoff for
v1; real references later would be additive and would not touch `session_logs`.

---

## Logs (fully relational — analytics fact layer)

Mirrors X.Y.Z: `log_blocks` = X, `log_items` = Y, `log_sub_items` = Z (only when an
exercise is nested inside a cluster).

| Table | Fields | Notes |
|---|---|---|
| `session_logs` | `id, user_id, template_id? (fk → session_templates), name, category_id (fk → session_categories, never null), session_date, notes, track_duration, duration?, status ('draft' \| 'complete'), created_at, updated_at` | Header. Default category = **Uncategorized**. `status` supports drafts. |
| `log_blocks` | `id, session_log_id, block_order, name, notes, track_duration, duration?` | `block_order` = X. |
| `log_items` | `id, log_block_id, item_order, kind ('exercise' \| 'cluster'), name, notes, track_duration, duration?, cluster_type? (cluster only: `superset` \| `circuit`), tool_id? (exercise only), track_analytics? (exercise only), primary_group_id? (exercise only), comp_category_id? (exercise only)` | `item_order` = Y. See CHECKs below. |
| `log_sub_items` | `id, log_item_id (fk → cluster-kind log_items), sub_item_order, name, notes, tool_id, track_analytics, primary_group_id?, comp_category_id, track_duration, duration?` | Nested exercise only. `sub_item_order` = Z. Always has `name` (and optional `notes`). `tool_id` + `comp_category_id` always set; `primary_group_id` required iff `track_analytics`. |
| `log_sets` | `id, log_item_id?, log_sub_item_id?, set_number, reps, is_per_side, time_duration, distance_value, distance_unit, load_value, load_unit, track_analytics` | One row per performed (or prescribed-at-log-time) set. **CHECK: exactly one of `log_item_id` / `log_sub_item_id` is non-null.** |

### CHECK constraints (log_items)

- `kind = 'exercise'` → `tool_id` and `comp_category_id` NOT NULL; `cluster_type` NULL; `primary_group_id` NOT NULL iff `track_analytics = true`.
- `kind = 'cluster'` → `cluster_type` NOT NULL and ∈ (`superset`, `circuit`); exercise-only FKs / `track_analytics` NULL.

### Reference, not snapshot

`tool_id` and `primary_group_id` are live FKs. Renames update display labels; ids keep
historical aggregation correct. Soft-archive + RESTRICT prevents broken history.

---

## Relationships at a glance

```
auth.users (Supabase Auth)
  └── public.users (1:1 profile row: username, …)

tools, session_categories, analytics_primary_groups, analytics_tags
  └── owned by public.users.id / user_id
  └── No Tool + Uncategorized seeded per user
  └── referenced by session_templates / session_logs (categories)
      and by exercise_templates / log_items / log_sub_items (tools, groups, tags)

exercise_templates ──(analytics_tag_links)── analytics_tags

block_templates, cluster_templates ──(JSON copied into)── session_templates.content
  (no FK; independent library rows)

session_logs
  └── log_blocks
        └── log_items (exercise OR cluster)
              └── log_sub_items (only if parent item is a cluster)
              └── log_sets (on exercise-kind log_items)
        └── log_sets (on log_sub_items for nested exercises)
```

---

## Prototype → canonical field rename map

| Legacy editor JSON | Canonical |
|---|---|
| `template_name` | `name` |
| `block_name` | `name` (on block) |
| `coaching_notes` | `notes` (exercise; mode lens chooses coach vs athlete copy) |
| `tool` (string / `""`) | `tool_id` (empty → No Tool) |
| string session `category` | `category_id` (missing → Uncategorized) |
| `type` (cluster) | `cluster_type` (`superset` \| `circuit` only) |
| `master_exercise_name` | `primary_group_id` (null if `track_analytics` false) |
| `group_tags` (string[]) | `analytics_tag_ids` (uuid[]) |
| `distance_mi` | `distance_value` + `distance_unit` (`mi` \| `km` \| `m`) |
| `coordinate`, `cluster_key`, `sub_item_key`, `block_order`, `item_order`, `sub_item_order` | Derived from array order / renest; optional in API responses |

Inside a cluster, ignore legacy duplicate `item_order` on nested exercises — **Z is
`sub_item_order` (or array index).**

---

## Canonical JSON tree (editor ↔ template `content`)

This is the contract the RN editor holds in memory, what `session_templates.content`
stores, and what `fn_denest_session_log` accepts (session variant adds
`session_date`, optional `template_id`, and `status`).

Orders / coordinates shown in API dumps may be included for readability but are
**not** the source of truth — array position is.

```json
{
  "name": "Example Template",
  "category_id": "<uncategorized-or-user-category-uuid>",
  "notes": "Coach / programming notes (template) or athlete notes (session).",
  "track_duration": true,
  "duration": "01:00:00",
  "blocks": [
    {
      "name": "Warmup",
      "notes": "",
      "track_duration": false,
      "duration": null,
      "items": [
        {
          "kind": "exercise",
          "name": "Incline Walking",
          "tool_id": "<no-tool-uuid>",
          "comp_category_id": "<time-distance-uuid>",
          "prescribed_sets": 1,
          "notes": "Treadmill — Incline = 5.0 & speed = 3.0",
          "track_duration": false,
          "duration": null,
          "track_analytics": false,
          "primary_group_id": null,
          "analytics_tag_ids": [],
          "targets": [
            {
              "set": 1,
              "reps": null,
              "is_per_side": false,
              "time_duration": "00:30:00",
              "distance_value": 1.5,
              "distance_unit": "mi",
              "load_value": null,
              "load_unit": "BW",
              "track_analytics": null
            }
          ]
        },
        {
          "kind": "exercise",
          "name": "KB Halo Reverse Lunges",
          "tool_id": "<kettlebell-uuid>",
          "comp_category_id": "<reps-uuid>",
          "prescribed_sets": 3,
          "notes": "",
          "track_duration": false,
          "duration": null,
          "track_analytics": false,
          "primary_group_id": null,
          "analytics_tag_ids": [],
          "targets": []
        }
      ]
    },
    {
      "name": "Workout",
      "notes": "",
      "track_duration": false,
      "duration": null,
      "items": [
        {
          "kind": "cluster",
          "name": "Main Work Circuit - 3 rounds",
          "cluster_type": "circuit",
          "notes": "",
          "track_duration": false,
          "duration": null,
          "items": [
            {
              "kind": "exercise",
              "name": "Pullups",
              "tool_id": "<straight-bar-uuid>",
              "comp_category_id": "<reps-uuid>",
              "prescribed_sets": 3,
              "notes": "",
              "track_duration": false,
              "duration": null,
              "track_analytics": true,
              "primary_group_id": "<pullups-group-uuid>",
              "analytics_tag_ids": ["<calisthenics-tag-uuid>"],
              "targets": []
            }
          ]
        },
        {
          "kind": "cluster",
          "name": "Optional pairing example",
          "cluster_type": "superset",
          "notes": "",
          "track_duration": false,
          "duration": null,
          "items": []
        },
        {
          "kind": "exercise",
          "name": "Deadhangs",
          "tool_id": "<no-tool-uuid>",
          "comp_category_id": "<time-uuid>",
          "prescribed_sets": 3,
          "notes": "",
          "track_duration": false,
          "duration": null,
          "track_analytics": true,
          "primary_group_id": "<deadhangs-group-uuid>",
          "analytics_tag_ids": ["<calisthenics-tag-uuid>"],
          "targets": []
        }
      ]
    }
  ]
}
```

### Session document extras (same tree)

```json
{
  "session_date": "2026-07-15",
  "template_id": "<optional-session-template-uuid>",
  "status": "draft"
}
```

Notes field semantics follow document kind (coach vs athlete). Category is always
`category_id` (never null; default **Uncategorized**).

### Denest walk (this tree → rows)

```
session header          → session_logs
blocks[]                → log_blocks (block_order from index)
  items[] kind=exercise → log_items + log_sets (from targets[])
  items[] kind=cluster  → log_items (cluster_type, name, notes, duration…)
    items[] (exercises) → log_sub_items + log_sets
```

---

## Denest / renest (the two directions)

The RN app's live editor state is this tree. The database is rows. Two Postgres
functions handle the boundary — never hand-rolled recursively from the client:

- **`fn_denest_session_log(user_id, tree jsonb) → uuid`** — inserts `session_logs`,
  then walks `blocks[] → items[] → (nested items[] if cluster) → targets[]`, writing
  `log_blocks` / `log_items` / `log_sub_items` / `log_sets` in one transaction.
  Resolve stringy legacy fields at the edge if needed; prefer ids in canonical JSON.
- **`fn_renest_session_log(log_id) → jsonb`** — rebuilds the canonical tree ordered by
  `block_order` / `item_order` / `sub_item_order` / `set_number`. Used for export,
  integrity checks, and load-into-editor when the client does not already have the
  tree. Mid-session editing keeps the tree client-side; denest runs on save.

**Save as template from a log:** if the editor already holds the tree, write
`session_templates.content` directly — no renest required on that path.

Templates never go through denest for analytics — they stay JSONB end-to-end.

### Future extensibility

The same denest pattern could later support template/program analytics without
changing how templates are authored. Until there is a concrete need, JSONB templates
remain the simplest design.

---

## Indexes (v1 minimum)

- `session_logs (user_id, session_date DESC)`
- `session_logs (user_id, status)` for draft lists
- `log_items (log_block_id, item_order)`
- `log_sub_items (log_item_id, sub_item_order)`
- `log_sets (log_item_id)`, `log_sets (log_sub_item_id)`
- `log_items (primary_group_id)`, `log_sub_items (primary_group_id)` where not null

---

## Open items for later (not v1)

- Whether `analytics_tags` need a log-instance join table (tag a logged set/exercise
  differently from its template defaults) — revisit after blank-canvas usage data.
- Whether draft denest is every autosave or only on `status = complete`.
- Soft propagation / linked block templates (explicitly out of scope; copy-on-insert
  stays).
- Additional load units (`% 1RM`, etc.) and cluster types beyond `superset` / `circuit`.
- Seeding exercise libraries or extra default categories/tools beyond **Uncategorized** / **No Tool**.
