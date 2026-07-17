# OttoLog Database Outline

Official high-level map of OttoLog’s Supabase / Postgres structure.

This document is the project outline for what exists and what we intend to build. Detailed field contracts, JSON tree shapes, and denest/renest behavior live in the original concept docs and will be promoted into official project docs as each layer ships.

When outline, concept docs, and live SQL disagree, use this order:

1. Applied SQL in `sql/`
2. This document (status + intended shape)
3. `docs/original-concept/Backend/Database_Design.md`

---

## Current Status

**Live today** *(applied in Supabase)*

| Layer | Objects |
|-------|---------|
| Auth | `auth.users` (Supabase Auth: email / password) |
| Profile | `public.users` (`id = auth.uid()`, unique `username`) |
| RPCs | `delete_own_account()` |
| Locked atoms | `target_shapes`, `load_units`, `distance_units` |
| Taxonomy | `tools`, `session_categories` + global No Tool / Uncategorized |
| Analytics taxonomy | `analytics_primary_groups`, `analytics_tags` |
| Exercise templates | `exercise_templates`, `analytics_tag_links` |
| Cluster templates | `cluster_templates` |

**App slice live**

- **Home**: dashboard with quick actions, recent exercise templates, local week preview
- **Create** → Template hub → Exercise builder (`ExerciseEditor`) or Cluster builder (`ClusterEditor` + nested exercises); save to Supabase
- **Library** → Templates → Exercises / Clusters: browse, search, edit, delete
- Searchable create-comboboxes for tools, primary groups, and tags in the exercise builder
- **Account** → Taxonomy: tools, primary groups, tags (create, rename, archive, hard-delete when unused)
- **Account** → Settings → Danger zone: delete account
- Name search in the exercise builder can copy another template's fields into the current draft without switching which template you are editing
- Active exercise and cluster template names are unique per user, case-insensitive (`sql/007`, `sql/008`)
- Cluster delete prefers soft archive; hard delete only when unreferenced (v1: always allowed — no FK references yet)

**Not live yet**

- Block / session templates
- Log / relational session tables
- Denest / renest functions

Applied migrations:

- `sql/001_users.sql`
- `sql/002_delete_own_account.sql`
- `sql/003_locked_atoms.sql`
- `sql/004_taxonomy.sql`
- `sql/005_analytics_taxonomy.sql`
- `sql/006_exercise_templates.sql`
- `sql/007_template_name_uniqueness.sql`
- `sql/008_cluster_templates.sql`

---

## Philosophy

OttoLog is an infinite workout canvas:

- No fixed global exercise catalog
- No fixed equipment list beyond structural defaults
- No fixed session category list beyond structural defaults
- Only the *shape* of tracking is shared (target shapes, load units, distance units, cluster types)

**Structural defaults are global sentinels, not per-user copies:**

1. **No Tool**: one global row in `tools`
2. **Uncategorized**: one global row in `session_categories`

They are null-buckets (so FKs never need to be null), immutable, and shared by every account. They are **not** seeded on signup.

User-created tools, session categories, `analytics_primary_groups`, `analytics_tags`, templates, and logs remain per-user and RLS-scoped to `auth.uid()` (except `public.users`, keyed by `id = auth.uid()`).

Array order in the editor is the source of truth. Persisted `*_order` / `set_number` columns on log rows are denormalized for query and renest. Coordinates like `1.2.3` are derived, not stored as source of truth.

---

## Design Decision: Global Sentinels (locked)

**Decision:** **No Tool** and **Uncategorized** are single global rows with **known fixed UUID primary keys** and **`user_id IS NULL`**.

This deliberately diverges from `docs/original-concept/Backend/Database_Design.md`, which seeded a copy of each default per user. Official project docs win.

### Why global nulls (not per-user copies)

- These rows are structural system shape, not personal vocabulary.
- Avoids N identical copies for N users.
- Signup does not need to seed them.
- Cannot be “accidentally different” per account.

### Why fixed UUIDs (not “look up by name”)

- App and SQL can use stable constants (`NO_TOOL_ID`, `UNCATEGORIZED_ID`).
- Migrations stay idempotent (`INSERT … ON CONFLICT (id) DO NOTHING`).
- FKs and client defaults never depend on a name string lookup.
- Better DX than resolving “the No Tool row” at runtime.

### Why `user_id IS NULL` (not a fake system-user UUID)

Multi-tenant / RLS guidance generally prefers:

- Real tenant/user rows with a real owner id
- Shared/global rows modeled **explicitly**, not as a magic tenant

A synthetic “system user” UUID is a footgun (looks like a real account, complicates deletes and audits). Nullable `user_id` plus an explicit `is_system_default` flag is clearer:

| Signal | Meaning |
|--------|---------|
| `user_id IS NULL` + `is_system_default = true` | Global sentinel |
| `user_id = auth.uid()` + `is_system_default = false` | Normal user vocabulary |

### Intended row shape

```text
tools
  id              uuid PK   -- FIXED known UUID for No Tool
  user_id         uuid NULL -- NULL only for the global sentinel
  name            text      -- 'No Tool' for the sentinel
  is_system_default boolean -- true for the sentinel
  archived_at     timestamptz NULL  -- always null for sentinel

session_categories
  id              uuid PK   -- FIXED known UUID for Uncategorized
  user_id         uuid NULL
  name            text      -- 'Uncategorized'
  is_system_default boolean
  archived_at     timestamptz NULL
```

Fixed UUIDs (locked; must match `sql/003_locked_atoms.sql`, `sql/004_taxonomy.sql`, and `src/constants/`):

| Constant | UUID | Row |
|----------|------|-----|
| `NO_TOOL_ID` | `40000000-0000-4000-8000-000000000001` | tools → No Tool |
| `UNCATEGORIZED_ID` | `40000000-0000-4000-8000-000000000002` | session_categories → Uncategorized |

Locked-atom IDs are listed at the top of `sql/003_locked_atoms.sql` and in `src/constants/lockedAtoms.ts`.

### RLS implications

```text
SELECT:  user_id = auth.uid()  OR  is_system_default = true
INSERT:  user_id = auth.uid()  AND  is_system_default = false
UPDATE:  user_id = auth.uid()  AND  is_system_default = false
DELETE / archive: same as update; never on system defaults
```

Policies must use explicit `is_system_default` / `user_id IS NULL` checks. Do not rely on `user_id = auth.uid()` alone for SELECT, or globals vanish (NULL never equals `auth.uid()`).

### What signup does *not* do

Signup creates `auth.users` + `public.users` only. It does **not** insert No Tool or Uncategorized. Those rows exist once for the whole project.

---

## Naming Glossary (locked)

Use these names consistently in SQL, app code, and docs. Do not invent synonyms.

| Concept | Table | FK / field | Notes |
|---------|--------|------------|--------|
| Tool | `tools` | `tool_id` | Equipment. Global sentinel: **No Tool**. |
| Session category | `session_categories` | `category_id` | Session/template label. Global sentinel: **Uncategorized**. Not a target shape. |
| Target shape | `target_shapes` | `target_shape_id` | Which **set/target input fields** an exercise uses (Reps, Time, Time & Distance, Time & Reps, Distance). Locked atom. Not tree `kind`. Not session category. |
| Primary analytics group | `analytics_primary_groups` | `primary_group_id` | **One** optional reporting bucket per exercise when `track_analytics = true`. Not the exercise display name. |
| Analytics tag | `analytics_tags` | via `analytics_tag_links.tag_id` | Many optional filters per exercise template. |
| Tag link | `analytics_tag_links` | `exercise_template_id`, `tag_id` | M2M join only. No “groups” join table. |

**Target shape (important)**

- An exercise in the nest (template or log) points at one `target_shape_id`.
- That row decides which columns appear on each set/target: reps, time, distance (and combinations).
- It does **not** mean the structural role of the node (`kind = exercise | cluster`).
- It does **not** mean session labeling (`category_id` / Uncategorized).
- `default_target_shape` (jsonb on exercise templates) is the **prescribed targets array payload**, not the shape enum. The enum is `target_shape_id`; the jsonb holds the actual target rows for that shape.
- Legacy / concept-doc name `composition_categories` / `comp_category_id` is **retired** in official project docs and SQL. Original-concept files may still say composition; this outline wins.

**Groups vs tags**

- **Group** = `analytics_primary_groups` / `primary_group_id`: singular aggregation identity.
- **Tag** = `analytics_tags` / `analytics_tag_links`: plural free-form labels.
- Editor JSON may carry `analytics_tag_ids: uuid[]`; that array is expanded into `analytics_tag_links` rows for templates, not stored as a column named `analytics_tag_ids` on the template table.
- Legacy prototype names `master_exercise_name` / `group_tags` are **not** used.

---

## Layer Overview

```
auth.users
  └── public.users                         ← LIVE

locked atoms (global, no user_id)          ← LIVE
  target_shapes
  load_units
  distance_units

taxonomy
  tools                                    ← LIVE
    ├── global: No Tool (fixed UUID, user_id NULL)
    └── user rows (user_id = owner)
  session_categories                       ← LIVE
    ├── global: Uncategorized (fixed UUID, user_id NULL)
    └── user rows (user_id = owner)
  analytics_primary_groups                 ← LIVE (user only)
  analytics_tags                           ← LIVE (user only)
  analytics_tag_links                      ← LIVE (via exercise_templates)

templates (library / blueprints)
  exercise_templates                       ← LIVE
  cluster_templates             (jsonb content)  ← LIVE
  block_templates               (jsonb content)  ← planned
  session_templates             (jsonb content)  ← planned

logs (relational facts)                    ← planned
  session_logs
    └── log_blocks              (X)
          └── log_items         (Y: exercise | cluster)
                ├── log_sub_items (Z, cluster children only)
                └── log_sets
```

---

## 1. Auth + Profile

### `auth.users` (Supabase-managed)

Email, password hash, session/auth metadata. The app does not write this table directly except through Auth APIs (`signUp`, `signInWithPassword`, etc.).

### `public.users`

| Field | Notes |
|-------|--------|
| `id` | PK = `auth.uid()` |
| `username` | Unique, required |
| `created_at`, `updated_at` | Timestamps |

One row per account. Email lives in Auth; app identity fields live here.

On signup (intended full flow):

1. Create `auth.users`
2. Insert / trigger-create `public.users`

No Tool and Uncategorized are **not** created here. They are global sentinels (see Design Decision).

---

## 2. Locked Atoms (system-fixed)

Shared by all users. No `user_id`. Seeded once for the project.

| Table | v1 values | Meaning |
|-------|-----------|---------|
| `target_shapes` | Reps, Time, Time & Distance, Time & Reps, Distance | Which set/target **inputs** an exercise uses |
| `load_units` | `lbs`, `kg`, `BW` | Load unit options on a target |
| `distance_units` | `mi`, `km`, `m` | Distance unit options on a target |

### `target_shapes` in plain language

OttoLog’s smallest nest unit (above sets) is an **exercise**. Each exercise picks one **target shape** so the editor knows which fields to show per set (for example Reps vs Time & Distance).

```
Exercise "Pull-Ups"
  target_shape_id → Reps
  → each target row shows: reps, per-side, load…

Exercise "Incline Walk"
  target_shape_id → Time & Distance
  → each target row shows: time, distance, distance unit, load…
```

Do not confuse:

| Term | Table / field | Means |
|------|---------------|--------|
| Target shape | `target_shapes` / `target_shape_id` | Set input field pattern |
| Session category | `session_categories` / `category_id` | How the user labels a session/template (e.g. Uncategorized) |
| Tree kind | `kind` on items | `exercise` vs `cluster` in the nest |
| Default targets payload | `default_target_shape` jsonb | The actual prescribed target rows for an exercise template |

---

## 3. Taxonomy (`tools`, `session_categories`, analytics)

Mixed ownership on tools / session categories; analytics tables are user-only.

| Table | Ownership | Purpose |
|-------|-----------|---------|
| `tools` | Global sentinel + user rows | Equipment vocabulary. Global **No Tool**; users add their own tools. |
| `session_categories` | Global sentinel + user rows | Session / template labels. Global **Uncategorized**; users add their own. |
| `analytics_primary_groups` | User only | Reporting buckets. Referenced by `primary_group_id`. |
| `analytics_tags` | User only | Free-form filters. Referenced by `analytics_tag_links.tag_id`. |
| `analytics_tag_links` | User only (via owning exercise template) | M2M: `exercise_template_id` ↔ `tag_id`. |

### Structural sentinels (global)

| Sentinel | Table | Rules |
|----------|--------|-------|
| **No Tool** | `tools` | Fixed UUID PK, `user_id IS NULL`, `is_system_default = true`. Exercises always have a non-null `tool_id`; unequipped work points here. UI may show “None”. |
| **Uncategorized** | `session_categories` | Fixed UUID PK, `user_id IS NULL`, `is_system_default = true`. Sessions/templates always have a non-null `category_id`. |

Sentinels cannot be renamed, archived, or deleted. User taxonomy rows may be soft-archived (`archived_at`). Hard delete is restricted while referenced.

**App behavior**

- Pickers (`listTools` / `listPrimaryGroups` / `listAnalyticsTags`) return **active** rows only.
- Account → Taxonomy lists can include archived rows; prefer archive over hard delete.
- Existing templates keep FKs to archived rows; editors resolve those labels via id lookup so reopen still shows the name.
- Hard delete is offered in UI only when usage count is zero (templates for tools/groups; tag links for tags).

### Analytics identity vs exercise name

- Exercise **display `name`** is free text and is not the analytics identity.
- If `track_analytics = true`, the exercise has exactly one `primary_group_id` → `analytics_primary_groups`.
- If `track_analytics = false`, `primary_group_id` is null and there are no `analytics_tag_links` (editor `analytics_tag_ids` is `[]`).
- Multiple differently named exercises can share one `analytics_primary_groups` row so volume rolls up together.
- Tags (`analytics_tags`) are optional many-to-many filters and never replace `primary_group_id`.

---

## 4. Templates (reusable blueprints)

Personal library objects for Create → Build templates.

| Table | Storage style | Notes |
|-------|---------------|--------|
| `exercise_templates` | Columns + `default_target_shape` jsonb | Presets. Always `tool_id` + `target_shape_id`. Optional `track_analytics` + `primary_group_id` (required iff tracking). Tags via `analytics_tag_links`, not a column on this table. `default_target_shape` holds the targets[] payload for that shape. Active names are unique per user (case-insensitive), enforced app-side and by a partial unique index (`sql/007`). |
| `cluster_templates` | Columns + `content` jsonb | Standalone cluster blob. `cluster_type` ∈ `superset` \| `circuit`. `name` + `cluster_type` are columns; `content` holds `{ notes, track_duration, duration, items[] }` with nested exercise leaves (`targets`, taxonomy FKs, analytics). Active names unique per user (`sql/008`). Soft-archive preferred; hard delete when unreferenced. |
| `block_templates` | `content` jsonb | Standalone block blob. |
| `session_templates` | `content` jsonb + `category_id` | Full session tree. `category_id` never null; default = global Uncategorized. |

### Independence rule (v1)

`session_templates`, `block_templates`, and `cluster_templates` do **not** FK each other. Inserting a saved block/cluster into a session **copies JSON**. Editing a library row later does not propagate. Accepted v1 tradeoff.

`exercise_templates` are the first real save path and the recommended vertical slice after taxonomy exists.

**Naming + copy-from-template**

- Active template names are unique per user, per layer (case-insensitive). Archiving frees the name. Log session names may repeat later.
- In the exercise builder, picking a name from search copies that template's editable fields into the current draft. It does not open that template for editing. Save under a new name if you are creating a copy.
- Cluster templates: soft archive removes them from library lists and frees the name; hard delete is available when unreferenced.

---

## 5. Logs (relational fact layer)

Logged sessions are fully relational so analytics can query sets.

| Table | Role |
|-------|------|
| `session_logs` | Session header (`status`: `draft` \| `complete`, optional `template_id`, required `category_id`) |
| `log_blocks` | Block level (X) via `block_order` |
| `log_items` | Item level (Y): `kind = 'exercise'` or `'cluster'` |
| `log_sub_items` | Nested exercise inside a cluster (Z) |
| `log_sets` | One row per set; exactly one of `log_item_id` / `log_sub_item_id` is set |

### `log_items` rules

- `kind = 'exercise'` → `tool_id` + `target_shape_id` required; `cluster_type` null; `primary_group_id` required iff `track_analytics`
- `kind = 'cluster'` → `cluster_type` required (`superset` \| `circuit`); exercise-only FKs null

### Tree → rows (denest)

```
session header          → session_logs
blocks[]                → log_blocks
  items[] exercise      → log_items + log_sets
  items[] cluster       → log_items
    nested exercises    → log_sub_items + log_sets
```

Intended Postgres boundary functions (not built yet):

- `fn_denest_session_log(user_id, tree jsonb) → uuid`
- `fn_renest_session_log(log_id) → jsonb`

Templates stay JSONB end-to-end and do not denest for analytics in v1.

---

## Relationships At a Glance

```
auth.users
  └── public.users

tools / session_categories
  ├── global sentinels (No Tool, Uncategorized)
  └── user-owned rows
  └── session_templates.category_id / session_logs.category_id → session_categories
  └── exercise tool_id → tools (No Tool allowed)

analytics_primary_groups
  └── exercise_templates.primary_group_id
  └── log_items.primary_group_id / log_sub_items.primary_group_id

analytics_tags
  └── analytics_tag_links.tag_id
        └── analytics_tag_links.exercise_template_id → exercise_templates

block_templates / cluster_templates
  └── copied as JSON into session_templates.content (no FK)

session_logs
  └── log_blocks
        └── log_items (exercise | cluster)
              ├── log_sub_items (if cluster)
              └── log_sets
```

---

## RLS Pattern (intended)

| Object | Access |
|--------|--------|
| `public.users` | Own row; username availability checks as needed |
| `tools` / `session_categories` | SELECT own **or** system defaults; INSERT/UPDATE/archive only own non-default rows |
| Other user-owned tables | `user_id = auth.uid()` for select / insert / update; archive rules for delete |
| Locked atoms | Readable by authenticated users; not user-writable |
| RPCs | Explicit grants (e.g. `delete_own_account` → `authenticated`) |

---

## Recommended Build Order

Do not create the full graph in one migration. Ship in dependency order:

| Step | Ship | Unlocks |
|------|------|---------|
| 0 | `public.users` + delete RPC | Auth shell *(done)* |
| 1 | Locked atoms (`target_shapes`, load/distance units) | Exercise set-input patterns *(done)* |
| 2 | `tools` + `session_categories` **including global No Tool / Uncategorized** | Valid FKs for templates/logs *(done)* |
| 3 | `analytics_primary_groups`, `analytics_tags`, `analytics_tag_links` | Optional exercise analytics *(done)* |
| 4 | `exercise_templates` | First Create → save → Library path *(done)* |
| 5 | `cluster_templates` | Cluster Create → save → Library *(done)* |
| 5b | `block_templates` / `session_templates` | Full template library |
| 6 | Log tables + denest/renest | Session logging + analytics facts |

---

## Indexes (v1 minimum, when logs exist)

- `session_logs (user_id, session_date DESC)`
- `session_logs (user_id, status)`
- `log_items (log_block_id, item_order)`
- `log_sub_items (log_item_id, sub_item_order)`
- `log_sets (log_item_id)`, `log_sets (log_sub_item_id)`
- `log_items (primary_group_id)`, `log_sub_items (primary_group_id)` where not null
- Partial unique: at most one `is_system_default` row per taxonomy table that uses sentinels

---

## Out of Scope for v1

- Live-linked templates (editing a library block updates old sessions)
- Seeded exercise libraries or extra default categories/tools beyond the two global sentinels
- Extra load units (`% 1RM`, etc.) or cluster types beyond `superset` / `circuit`
- Soft propagation between template layers
- Log-instance tag join tables beyond template defaults (revisit later)
- Per-user copies of No Tool / Uncategorized (rejected; see Design Decision: Global Sentinels)

---

## Related Docs

| Doc | Role |
|-----|------|
| `docs/Styling.md` | Official visual system |
| `docs/original-concept/Backend/Database_Design.md` | Concept schema + JSON tree. **Note:** may still say `composition_categories` / `comp_category_id`; official name is `target_shapes` / `target_shape_id` |
| `docs/original-concept/Frontend/Modular_Forms_Design.md` | Editor behavior that the schema supports |
| `docs/original-concept/Frontend/UI_Design.md` | App shell / auth / tab structure |
| `sql/` | Applied and pending migrations |

---

## How To Use This File

- Use this outline when planning the next backend chat or migration.
- Mark sections Live / Planned as SQL lands.
- Keep field-level SQL in `sql/*.sql`, not duplicated here.
- After each migration ships, update **Current Status** and the relevant layer notes.
- Prefer this document over original-concept docs when they disagree on locked decisions.
