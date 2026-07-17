# OttoLog Database Outline

Official high-level map of OttoLog’s Supabase / Postgres structure.

This document is the project outline for what exists and what we intend to build. Detailed field contracts, JSON tree shapes, and denest/renest behavior live in the original concept docs and will be promoted into official project docs as each layer ships.

When outline, concept docs, and live SQL disagree, use this order:

1. Applied SQL in `sql/`
2. This document (status + intended shape)
3. `docs/original-concept/Backend/Database_Design.md`

---

## Current Status

**Live today**

| Layer | Objects |
|-------|---------|
| Auth | `auth.users` (Supabase Auth: email / password) |
| Profile | `public.users` (`id = auth.uid()`, unique `username`) |
| RPCs | `delete_own_account()` |

**Not live yet**

- Locked atoms
- User taxonomy (`tools`, `session_categories`, analytics tables)
- Template tables
- Log / relational session tables
- Signup seeds for **No Tool** and **Uncategorized**
- Denest / renest functions

The app can authenticate and manage profiles. Create, Library, and session logging have no backend tables yet.

Applied migrations:

- `sql/001_users.sql`
- `sql/002_delete_own_account.sql`

---

## Philosophy

OttoLog is an infinite workout canvas:

- No fixed global exercise catalog
- No fixed equipment list beyond structural defaults
- No fixed session category list beyond structural defaults
- Only the *shape* of tracking is shared (composition categories, load units, distance units, cluster types)

**Signup seeds only two structural defaults** (null-buckets, not starter content):

1. **No Tool** in `tools`
2. **Uncategorized** in `session_categories`

Every user-owned table is RLS-scoped to `auth.uid()` (except `public.users`, keyed by `id = auth.uid()`).

Array order in the editor is the source of truth. Persisted `*_order` / `set_number` columns on log rows are denormalized for query and renest. Coordinates like `1.2.3` are derived, not stored as source of truth.

---

## Layer Overview

```
auth.users
  └── public.users                         ← LIVE

locked atoms (global, no user_id)          ← planned
  composition_categories
  load_units
  distance_units

user taxonomy (per user)                   ← planned
  tools                         (+ No Tool seed)
  session_categories            (+ Uncategorized seed)
  analytics_primary_groups
  analytics_tags
  analytics_tag_links

templates (library / blueprints)           ← planned
  exercise_templates
  cluster_templates             (jsonb content)
  block_templates               (jsonb content)
  session_templates             (jsonb content)

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
3. Seed **No Tool** + **Uncategorized** for that user *(seeds not implemented yet)*

---

## 2. Locked Atoms (system-fixed)

Shared by all users. No `user_id`. Seeded once for the project.

| Table | v1 values |
|-------|-----------|
| `composition_categories` | Reps, Time, Time & Distance, Time & Reps, Distance |
| `load_units` | `lbs`, `kg`, `BW` |
| `distance_units` | `mi`, `km`, `m` |

These define *how* tracking works. They are not user vocabulary.

Do not confuse **composition categories** (exercise measurement shape) with **session categories** (user labels like Strength / Uncategorized).

---

## 3. User Taxonomy (user-owned)

Owned by `user_id` → `public.users.id`.

| Table | Purpose |
|-------|---------|
| `tools` | Equipment vocabulary. Always includes **No Tool** (`is_system_default = true`). |
| `session_categories` | Session / template labels. Always includes **Uncategorized** (`is_system_default = true`). |
| `analytics_primary_groups` | Optional reporting bucket when analytics is on. |
| `analytics_tags` | Optional free-form filters. |
| `analytics_tag_links` | Many-to-many: exercise templates ↔ tags. |

### Structural seeds

| Seed | Table | Why |
|------|--------|-----|
| **No Tool** | `tools` | Exercises always have a non-null `tool_id`. Unequipped work points here. UI may show “None”. |
| **Uncategorized** | `session_categories` | Sessions/templates always have a non-null `category_id`. |

System defaults cannot be archived or deleted. Other taxonomy rows may be soft-archived (`archived_at`). Hard delete is restricted while referenced.

### Analytics identity vs exercise name

- Exercise **display name** is free text.
- If `track_analytics = true`, the exercise maps to exactly one `analytics_primary_groups` row via `primary_group_id`.
- If `track_analytics = false`, `primary_group_id` is null and tags are empty.
- Multiple differently named exercises can share one primary group so volume rolls up together.

---

## 4. Templates (reusable blueprints)

Personal library objects for Create → Build templates.

| Table | Storage style | Notes |
|-------|---------------|--------|
| `exercise_templates` | Columns + `default_target_shape` jsonb | Personal exercise presets. Always has `tool_id` and `comp_category_id`. |
| `cluster_templates` | `content` jsonb | Standalone cluster blob. `cluster_type` ∈ `superset` \| `circuit`. |
| `block_templates` | `content` jsonb | Standalone block blob. |
| `session_templates` | `content` jsonb + `category_id` | Full session tree. Default category = Uncategorized. |

### Independence rule (v1)

`session_templates`, `block_templates`, and `cluster_templates` do **not** FK each other. Inserting a saved block/cluster into a session **copies JSON**. Editing a library row later does not propagate. Accepted v1 tradeoff.

`exercise_templates` are the first real save path and the recommended vertical slice after taxonomy exists.

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

- `kind = 'exercise'` → `tool_id` + `comp_category_id` required; `cluster_type` null; `primary_group_id` required iff `track_analytics`
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

tools, session_categories, analytics_primary_groups, analytics_tags
  └── owned by public.users
  └── referenced by templates / log exercises
  └── session_templates + session_logs require category_id
  └── exercises require tool_id (No Tool allowed)

exercise_templates ── analytics_tag_links ── analytics_tags

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
| User-owned tables | `user_id = auth.uid()` for select / insert / update; archive rules for delete |
| Locked atoms | Readable by authenticated users; not user-writable |
| RPCs | Explicit grants (e.g. `delete_own_account` → `authenticated`) |

---

## Recommended Build Order

Do not create the full graph in one migration. Ship in dependency order:

| Step | Ship | Unlocks |
|------|------|---------|
| 0 | `public.users` + delete RPC | Auth shell *(done)* |
| 1 | Locked atoms | Exercise measurement shape |
| 2 | `tools` + `session_categories` + signup seeds (+ backfill existing users) | Valid FKs for templates/logs |
| 3 | Analytics taxonomy tables | Optional exercise analytics |
| 4 | `exercise_templates` | First Create → save → Library path |
| 5 | `cluster_templates` / `block_templates` / `session_templates` | Full template library |
| 6 | Log tables + denest/renest | Session logging + analytics facts |

---

## Indexes (v1 minimum, when logs exist)

- `session_logs (user_id, session_date DESC)`
- `session_logs (user_id, status)`
- `log_items (log_block_id, item_order)`
- `log_sub_items (log_item_id, sub_item_order)`
- `log_sets (log_item_id)`, `log_sets (log_sub_item_id)`
- `log_items (primary_group_id)`, `log_sub_items (primary_group_id)` where not null

---

## Out of Scope for v1

- Live-linked templates (editing a library block updates old sessions)
- Seeded exercise libraries beyond structural defaults
- Extra load units (`% 1RM`, etc.) or cluster types beyond `superset` / `circuit`
- Soft propagation between template layers
- Log-instance tag join tables beyond template defaults (revisit later)

---

## Related Docs

| Doc | Role |
|-----|------|
| `docs/Styling.md` | Official visual system |
| `docs/original-concept/Backend/Database_Design.md` | Full field-level concept schema + canonical JSON tree |
| `docs/original-concept/Frontend/Modular_Forms_Design.md` | Editor behavior that the schema supports |
| `docs/original-concept/Frontend/UI_Design.md` | App shell / auth / tab structure |
| `sql/` | Applied and pending migrations |

---

## How To Use This File

- Use this outline when planning the next backend chat or migration.
- Mark sections Live / Planned as SQL lands.
- Keep field-level SQL in `sql/*.sql`, not duplicated here.
- After each migration ships, update **Current Status** and the relevant layer notes.
