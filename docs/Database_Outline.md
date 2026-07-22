# OttoLog Database Outline

Official high-level map of OttoLog’s Supabase / Postgres structure.

This document is the project outline for what exists and what we intend to build. Shipped builder and session-log behavior lives in `docs/Template_Builders.md`. The archived design set in `docs/deprecated/original-concept/` still holds useful JSON-tree background, but it is historical and contradicts shipped behavior in places (see that folder's README).

When outline, archived docs, and live SQL disagree, use this order:

1. Applied SQL in `sql/`
2. This document (status + intended shape)
3. `docs/deprecated/original-concept/Backend/Database_Design.md` (historical only)

---

## Current Status

**Live today** *(current Supabase project still on the incremental set now in `sql/deprecated/001`–`019`)*

| Layer | Objects |
|-------|---------|
| Auth | `auth.users` (Supabase Auth: email / password) |
| Profile | `public.users` (`id = auth.uid()`, unique `username`) |
| RPCs | `delete_own_account()` |
| Locked atoms | `target_shapes`, `load_units`, `distance_units` |
| Taxonomy | `tools`, `session_categories`, `block_labels`, `cluster_labels` + global nulls |
| Analytics taxonomy | `analytics_primary_groups`, `analytics_tags`, `analytics_muscle_groups` |
| Exercise templates | `exercise_templates`, `analytics_tag_links`, `exercise_template_tool_links`, `exercise_template_primary_group_links`, `exercise_template_muscle_group_links` |
| Sequence templates | `cluster_templates` (legacy internal name) |
| Block templates | `block_templates` |
| Session templates | `session_templates` |
| Session logs | `session_logs`, `log_blocks`, `log_items`, `log_sub_items`, `log_sets`, `log_item_tools`, `log_sub_item_tools`, `log_item_primary_group_links`, `log_sub_item_primary_group_links`, `log_item_muscle_group_links`, `log_sub_item_muscle_group_links` |

**App slice live**

- **Home**: dashboard with quick actions (build session template, browse exercises, manage taxonomy) and local week preview placeholder
- **Insights**: grain model — pick a **lens** (Primary Group / category / muscle / session / block / sequence label) for the headline volume chart; secondary balance-by-category, working-sets × muscle, tonnage; filters for session label / **block label** / **set type** / Variations / Tools; honest once-totals (sessions, sessions/week, working sets, session tonnage) (`src/lib/insights.ts`)
- **Create** → Log a session (from scratch or from a session template) → denest save; Templates hub → Session / Block / Sequence / Exercise builders
- **Library** → Templates and Logs: browse, search, open in review mode (locked + expanded outline), edit / archive / delete
- Searchable create-comboboxes for tools, primary groups, and variations in the exercise builder
- **Account** → Taxonomy: tools, primary groups, muscle groups, variations (create, rename, archive, hard-delete when unused)
- **Account** → Settings → Danger zone: delete account
- Name search on Session / Block / Sequence / Exercise builders can copy another template's fields into the current draft without switching which template you are editing
- Active template names are unique per user per layer, case-insensitive (`sql/007`–`010`)
- Sequence delete prefers soft archive; hard delete only when unreferenced (v1: always allowed — no FK references yet)
- Sequences use **rounds (each)** programming: ordered nested exercises × `rounds`, with sparse round-range overrides; performed sets expand on log denest
- Blocks nest an ordered mix of exercise and sequence blobs; sessions nest ordered block blobs (copied JSON, no cross-template FKs). Session/Block/Sequence use mandatory labels (`category_id` / `label_id`); names are optional Name/Brief
- Session logs reuse the Session editor tree plus `session_date` / `status` / optional `template_id`; denest/renest run in `src/lib/sessionLogs.ts` (not Postgres RPCs yet)

**Gaps on live deprecated `001`–`019` vs Insights day-one contract**

| Gap | Needed for |
|-----|------------|
| No `analytics_primary_groups.category` | Balance charts (Push / Pull / …) |
| No log variation links (`log_*_tag_links`) | Filter logged volume by Variation (renest currently drops tags) |
| No `log_sets.set_type` / `intensity` | Working-set counts; intensity averages |
| No `track_intensity` on exercises | More-menu Intensity toggle |
| Incomplete nest-label seed (`Workout` vs `Main`, missing Wellness / …) | New User Seeds labels |
| No New User Seeds PG / variation / tool seed RPCs (stubs only in greenfield) | First-run vocabulary (chat 6) |

**Greenfield (authored, not applied to production)** — `sql/greenfield/001`–`008`

Condensed schema for a **fresh** Supabase project. Do **not** run over live `001`–`019`. Closes the Insights gaps above; keeps identifiers stable (`analytics_tags`, `cluster_*`, sentinel UUIDs).

| File | Role |
|------|------|
| `001_users.sql` | Profile + signup trigger |
| `002_delete_own_account.sql` | Delete RPC |
| `003_locked_atoms.sql` | Target shapes / load / distance units |
| `004_taxonomy.sql` | Tools + nest labels + New User Seeds nest list (`Main`, `Wellness`, Rest/`is_empty`, …) |
| `005_analytics.sql` | PGs **+ `category`**, tags, muscles, suggestions; muscle seed; **stubs** for PG/variation/tool ensure |
| `006_templates.sql` | All template layers + template link tables + `track_intensity` |
| `007_session_logs.sql` | Log tree + tool/PG/muscle/**tag** links + `set_type` / `intensity` + `track_intensity` |
| `008_analytics_facts.sql` | **Additive.** IMMUTABLE `ol_hms_to_seconds` / `ol_distance_to_meters` + read-only `v_log_set_facts` (one row per set, flattened to session/block/sequence labels + PG/category/muscle/variation/tool). Insights grain source. No table changes. |

**Not live yet**

- Seed content dump for New User Seeds PGs / ~60 variations / tools (chat 6)
- Postgres `fn_denest_session_log` / `fn_renest_session_log` wrappers (optional)
- AI-assisted log drafting; e1RM / ACWR / session-load rollups
- Insights UI polish (charts beyond bar lists)

Applied migrations *(current project — historical path)*:

- `sql/deprecated/001_users.sql` … `sql/deprecated/019_primary_group_tag_suggestions.sql`

Canonical path for **new** projects: `sql/greenfield/001`–`008` (see `docs/Setup.md`).

---


## Philosophy

OttoLog is an infinite workout canvas:

- No fixed global exercise catalog
- No fixed equipment list beyond structural defaults
- No fixed session category list beyond structural defaults
- Only the *shape* of tracking is shared (target shapes, load units, distance units, cluster types)

**Structural defaults are global sentinels, not per-user copies:**

1. **No Tool**: one global row in `tools`
2. **Session**: one global row in `session_categories` (system null label)
2b. **Block** / **Sequence**: global null rows in `block_labels` / `cluster_labels`

They are null-buckets (so FKs never need to be null), immutable, and shared by every account. They are **not** seeded on signup.

User-created tools, session categories, `analytics_primary_groups`, `analytics_tags`, `analytics_muscle_groups`, templates, and logs remain per-user and RLS-scoped to `auth.uid()` (except `public.users`, keyed by `id = auth.uid()`).

Array order in the editor is the source of truth. Persisted `*_order` / `set_number` columns on log rows are denormalized for query and renest. Coordinates like `1.2.3` are derived, not stored as source of truth.

---

## Design Decision: Global Sentinels (locked)

**Decision:** **No Tool** and **Session** (system null session label) are single global rows with **known fixed UUID primary keys** and **`user_id IS NULL`**.

This deliberately diverges from `docs/deprecated/original-concept/Backend/Database_Design.md`, which seeded a copy of each default per user. Official project docs win.

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
  id              uuid PK   -- FIXED known UUID for Session null (UNCATEGORIZED_ID)
  user_id         uuid NULL
  name            text      -- 'Session' (system null label word)
  is_system_default boolean
  is_empty        boolean   -- true = no blocks allowed (e.g. Rest); default false
  archived_at     timestamptz NULL
```

Fixed UUIDs (locked; must match `sql/greenfield/003_locked_atoms.sql`, `sql/greenfield/004_taxonomy.sql`, and `src/constants/`):

| Constant | UUID | Row |
|----------|------|-----|
| `NO_TOOL_ID` | `40000000-0000-4000-8000-000000000001` | tools → No Tool |
| `UNCATEGORIZED_ID` | `40000000-0000-4000-8000-000000000002` | session_categories → **Session** (system null) |
| `GENERAL_BLOCK_LABEL_ID` | `50000000-0000-4000-8000-000000000001` | block_labels → Block |
| `CLUSTER_LABEL_NULL_ID` | `60000000-0000-4000-8000-000000000001` | cluster_labels → Sequence |

Locked-atom IDs are listed at the top of `sql/greenfield/003_locked_atoms.sql` and in `src/constants/lockedAtoms.ts`.

### RLS implications

```text
SELECT:  user_id = auth.uid()  OR  is_system_default = true
INSERT:  user_id = auth.uid()  AND  is_system_default = false
UPDATE:  user_id = auth.uid()  AND  is_system_default = false
DELETE / archive: same as update; never on system defaults
```

Policies must use explicit `is_system_default` / `user_id IS NULL` checks. Do not rely on `user_id = auth.uid()` alone for SELECT, or globals vanish (NULL never equals `auth.uid()`).

### What signup does *not* do

Signup creates `auth.users` + `public.users` only. It does **not** insert No Tool or the Session system null. Those rows exist once for the whole project.

---

## Naming Glossary (locked)

Use these names consistently in SQL, app code, and docs. Do not invent synonyms.

| Concept | Table | FK / field | Notes |
|---------|--------|------------|--------|
| Tool | `tools` | `tool_id` / `tool_ids[]` | Equipment. Global sentinel: **No Tool**. Primary = first selected; extras via tool link tables. |
| Session category | `session_categories` | `category_id` | Session/template label. Global sentinel display name: **Session** (constant `UNCATEGORIZED_ID`). Not a target shape. |
| Target shape | `target_shapes` | `target_shape_id` | Which **set/target input fields** an exercise uses (Reps, Time, Time & Distance, Time & Reps, Distance). Locked atom. Not tree `kind`. Not session category. |
| Primary analytics group | `analytics_primary_groups` | `primary_group_id` / `primary_group_ids[]` | Chart noun(s) when `track_analytics = true`. Primary = first selected; extras via PG link tables. Complexes credit multiple buckets. Greenfield: required **`category`** (Push / Pull / Lower / Core / Power / Skill / Cardio / Combat / Mobility / Wellness). |
| Analytics tag (Variation) | `analytics_tags` | via `analytics_tag_links.tag_id` / log `*_tag_links` | Product UI: **Variations**. Template links live; **log** variation links ship in greenfield (`log_item_tag_links` / `log_sub_item_tag_links`). |
| Muscle group | `analytics_muscle_groups` | via muscle link tables / `muscle_group_ids[]` | Anatomy rollups (0–N). Seeded defaults. |
| Tag link | `analytics_tag_links` | `exercise_template_id`, `tag_id` | M2M join only (templates). |
| Tool link | `exercise_template_tool_links` | `exercise_template_id`, `tool_id`, `sort_order` | Ordered M2M for multi-tool exercises. Log mirrors: `log_item_tools` / `log_sub_item_tools`. |
| Set type | `log_sets.set_type` | — | Greenfield: `Warmup` / `Working` / `Drop` / `Failure` / `AMRAP` / `Backoff` (default `Working`). |
| Intensity | `log_sets.intensity` | — | Greenfield: nullable `numeric(3,1)`, 0.5–10.0 half-steps; UI 0 → `NULL`. Gated by exercise `track_intensity`. |

**Target shape (important)**

- An exercise in the nest (template or log) points at one `target_shape_id`.
- That row decides which columns appear on each set/target: reps, time, distance (and combinations).
- It does **not** mean the structural role of the node (`kind = exercise | cluster`).
- It does **not** mean session labeling (`category_id` / Session null).
- `default_target_shape` (jsonb on exercise templates) is the **prescribed targets array payload**, not the shape enum. The enum is `target_shape_id`; the jsonb holds the actual target rows for that shape.
- Legacy / concept-doc name `composition_categories` / `comp_category_id` is **retired** in official project docs and SQL. Archived docs under `docs/deprecated/` may still say composition; this outline wins.

**Groups vs tags vs muscles**

- **Group** = `analytics_primary_groups` / `primary_group_id` (+ PG link tables): aggregation identity (1–N).
- **Muscle** = `analytics_muscle_groups` / muscle link tables: anatomy rollups (0–N).
- **Tag** = `analytics_tags` / `analytics_tag_links`: plural free-form labels.
- Editor JSON may carry `analytics_tag_ids: uuid[]`; that array is expanded into `analytics_tag_links` rows for templates, not stored as a column named `analytics_tag_ids` on the template table.
- Editor JSON may carry `tool_ids: uuid[]` on exercise leaves; expanded into `exercise_template_tool_links` (library) or `log_*_tools` (logs). Singular `tool_id` remains the primary (= first) for compatibility. **No Tool** is exclusive: real tools clear it; empty selection restores it.
- Editor JSON may carry `primary_group_ids: uuid[]`; expanded into PG link tables; singular `primary_group_id` = first when tracking.
- Editor JSON may carry `muscle_group_ids: uuid[]`; expanded into muscle link tables on templates **and** logs.
- Legacy prototype names `master_exercise_name` / `group_tags` are **not** used.
- How to choose values in practice: `docs/Analytics_Labeling.md`.

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
    ├── global: Session null (fixed UUID, user_id NULL)
    └── user rows (user_id = owner)
  analytics_primary_groups                 ← LIVE (user only; greenfield + category)
  analytics_tags                           ← LIVE (user only; product: Variations)
  analytics_muscle_groups                  ← LIVE (user only)
  analytics_tag_links                      ← LIVE (via exercise_templates)
  analytics_primary_group_tag_suggestions  ← LIVE (soft PG→tag picker hints)
  exercise_template_tool_links             ← LIVE (via exercise_templates)
  exercise_template_primary_group_links    ← LIVE (via exercise_templates)
  exercise_template_muscle_group_links     ← LIVE (via exercise_templates)

templates (library / blueprints)
  exercise_templates                       ← LIVE (greenfield + track_intensity)
  cluster_templates             (jsonb content)  ← LIVE
  block_templates               (jsonb content)  ← LIVE
  session_templates             (jsonb content)  ← LIVE

logs (relational facts)                    ← LIVE (deprecated `014`–`018`; greenfield `007`)
  session_logs
    └── log_blocks              (X)
          └── log_items         (Y: exercise | cluster)
                ├── log_item_tools (exercise only)
                ├── log_item_primary_group_links / log_item_muscle_group_links
                ├── log_item_tag_links           ← greenfield (Variations on logs)
                ├── log_sub_items (Z, cluster children only)
                │     ├── log_sub_item_tools
                │     └── log_sub_item_*_group_links / tag_links
                └── log_sets                     ← greenfield + set_type / intensity
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

No Tool and the Session system null are **not** created here. They are global sentinels (see Design Decision).

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
| Session category | `session_categories` / `category_id` | How the user labels a session/template (e.g. Session null, Strength, Rest) |
| Tree kind | `kind` on items | `exercise` vs `cluster` in the nest |
| Default targets payload | `default_target_shape` jsonb | The actual prescribed target rows for an exercise template |

---

## 3. Taxonomy (`tools`, `session_categories`, analytics)

Mixed ownership on tools / session categories; analytics tables are user-only.

| Table | Ownership | Purpose |
|-------|-----------|---------|
| `tools` | Global sentinel + user rows | Equipment vocabulary. Global **No Tool**; users add their own tools. |
| `session_categories` | Global sentinel + user rows | Session / template labels. Global **Session** null; users add their own. `is_empty` (default false): when true, sessions/templates with that label cannot have blocks (notes only). Seeded **Rest** has `is_empty = true`. |
| `analytics_primary_groups` | User only | Reporting buckets. Referenced by `primary_group_id` + PG link tables. Greenfield adds required `category`. |
| `analytics_tags` | User only | Variations (modifiers). Template: `analytics_tag_links`. Log (greenfield): `log_item_tag_links` / `log_sub_item_tag_links`. |
| `analytics_muscle_groups` | User only | Anatomy rollups. Referenced by muscle group link tables. Seeded via `ensure_default_muscle_groups`. |
| `analytics_tag_links` | User only (via owning exercise template) | M2M: `exercise_template_id` ↔ `tag_id`. |
| `exercise_template_tool_links` | User only (via owning exercise template) | Ordered M2M: `exercise_template_id` ↔ `tool_id` (`sort_order`). |
| `exercise_template_primary_group_links` | User only (via owning exercise template) | Ordered M2M: `exercise_template_id` ↔ `primary_group_id` (`sort_order`). |
| `exercise_template_muscle_group_links` | User only (via owning exercise template) | Ordered M2M: `exercise_template_id` ↔ `muscle_group_id` (`sort_order`). |
| `analytics_primary_group_tag_suggestions` | User only (via owning primary group) | Soft picker hints: which tags to surface for a PG. Does not constrain stored tag links. Muscles unaffected. |

### Structural sentinels (global)

| Sentinel | Table | Rules |
|----------|--------|-------|
| **No Tool** | `tools` | Fixed UUID PK, `user_id IS NULL`, `is_system_default = true`. Exercises always have ≥1 tool id; unequipped work points here as the exclusive selection. Singular `tool_id` columns stay NOT NULL as primary. UI may show “None”. |
| **Session** (system null) | `session_categories` | Fixed UUID PK, `user_id IS NULL`, `is_system_default = true`, `is_empty = false`. Sessions/templates always have a non-null `category_id`. Display name: **Session**. Unclassified ≠ Rest. |

Sentinels cannot be renamed, archived, or deleted. User taxonomy rows may be soft-archived (`archived_at`). Hard delete is restricted while referenced.

**App behavior**

- Pickers (`listTools` / `listPrimaryGroups` / `listAnalyticsTags`) return **active** rows only.
- Account → Taxonomy lists can include archived rows; prefer archive over hard delete.
- Existing templates keep FKs to archived rows; editors resolve those labels via id lookup so reopen still shows the name.
- Hard delete is offered in UI only when usage count is zero (templates for tools/groups; tag links for tags).

### Analytics identity vs exercise name

- Exercise **display `name`** is free text and is not the analytics identity.
- If `track_analytics = true`, the exercise has ≥1 primary group: singular `primary_group_id` (first) plus ordered `exercise_template_primary_group_links` / log PG links (editor `primary_group_ids[]`).
- If `track_analytics = false`, `primary_group_id` is null, link rows are empty, and there are no `analytics_tag_links` (editor `analytics_tag_ids` is `[]`).
- Multiple differently named exercises can share one `analytics_primary_groups` row so volume rolls up together. Complexes may select **multiple** PGs so the same volume accrues to each chart (do not sum PG totals into one grand total).
- Variations (`analytics_tags`) are optional many-to-many modifiers and never replace primary groups. Product UI: **Variations**.
- On **greenfield**, denest writes variations onto `log_*_tag_links`; renest restores them. Live deprecated schema still lacks those tables.
- **Suggested variations** (soft): Account → Taxonomy → Primary group → Suggested variations. Empty suggestions → exercise variation picker shows the full A→Z pool. Any suggestions → Suggested section first; **Show all** reveals the full A→Z list underneath (suggested variations appear in both; toggling one flips both). Multi-PG unions suggestions. Does not affect muscle groups.
- **Greenfield PG `category`:** required text enum for balance Insights. Account taxonomy + `createPrimaryGroup` write it. Live `001`–`019` has no `category` column yet.

---

## 4. Templates (reusable blueprints)

Personal library objects for Create → Build templates.

| Table | Storage style | Notes |
|-------|---------------|--------|
| `exercise_templates` | Columns + `default_target_shape` jsonb | Presets. Always primary `tool_id` + `target_shape_id`. Full tool list via `exercise_template_tool_links` (ordered); editor `tool_ids[]`. Optional `track_analytics` + `primary_group_id` (required iff tracking). Variations via `analytics_tag_links`, not a column on this table. `default_target_shape` holds the targets[] payload for that shape. Active names are unique per user (case-insensitive), enforced app-side and by a partial unique index (`sql/007`). |
| `cluster_templates` | Columns + `content` jsonb | Standalone Sequence blob (internal legacy table name). Mandatory `label_id` → `cluster_labels` (system null **Sequence**). Optional `name` (Name/Brief). Legacy `cluster_type` kept for dual-write. `content` holds `{ rounds, notes, track_duration, duration, items[], overrides[] }`. Nested items are per-round prescriptions. Active **nonblank** names unique per user. Soft-archive preferred. |
| `block_templates` | Columns + `content` jsonb | Mandatory `label_id` → `block_labels` (system null **Block**). Optional `name`. `content` holds mixed exercise/sequence items (`kind = 'cluster'` internally). Active **nonblank** names unique per user. Soft-archive preferred. |
| `session_templates` | `content` jsonb + `category_id` | Full session tree. `category_id` is the session **label** (never null; default Session). Optional `name` (Name/Brief). `content` holds `{ notes, track_duration, duration, blocks[] }`. Active **nonblank** names unique per user. Soft-archive preferred. |

### Independence rule (v1)

`session_templates`, `block_templates`, and `cluster_templates` do **not** FK each other. Inserting a saved block/sequence into a session **copies JSON**. Editing a library row later does not propagate. Accepted v1 tradeoff.

`exercise_templates` are the first real save path and the recommended vertical slice after taxonomy exists.

**Naming + copy-from-template**

- Active template names are unique per user, per layer (case-insensitive). Archiving frees the name. Log session names may repeat later.
- On Session, Block, Sequence, and Exercise builders (including nested cards), picking a name from search copies that library template's editable fields into the current draft or card. It does not switch which template is being saved, and nested cards keep their outer id. Save under a new name if you are creating a standalone copy.
- New Blocks default to one Exercise. New Sessions default to one Block containing one Exercise.
- Sequence templates: soft archive removes them from library lists and frees the name; hard delete is available when unreferenced.
- Sequence programming is compact (`rounds` + per-round subitem targets + overrides). Performed sets are expanded only into session logs (not stored as N duplicate rows on the template).

---

## 5. Logs (relational fact layer)

Logged sessions are fully relational so analytics can query sets. Tables and RLS: greenfield `007` (or historical `sql/deprecated/014`+). Denest (editor tree → rows) and renest (rows → editor tree) live in `src/lib/sessionLogs.ts` for v1; optional Postgres RPCs can wrap the same shape later.

| Table | Role |
|-------|------|
| `session_logs` | Session header (`status`: `draft` \| `complete`, optional `template_id`, required `category_id`, required `session_date`) |
| `log_blocks` | Block level (X) via `block_order`; mandatory `label_id` → `block_labels` |
| `log_items` | Item level (Y): `kind = 'exercise'` or `'cluster'` |
| `log_sub_items` | Nested exercise inside a cluster (Z) |
| `log_sets` | One row per set; exactly one of `log_item_id` / `log_sub_item_id` is set. Greenfield adds `set_type` + `intensity`. |
| `log_item_tools` | Ordered tools for exercise-kind `log_items` (`sql/015` / greenfield `007`) |
| `log_sub_item_tools` | Ordered tools for `log_sub_items` |
| `log_item_tag_links` / `log_sub_item_tag_links` | Greenfield only: Variations denested onto logged exercises |

### `log_items` rules

- `kind = 'exercise'` → primary `tool_id` + `target_shape_id` required; full list in `log_item_tools`; `cluster_type` null; `primary_group_id` required iff `track_analytics`
- `kind = 'cluster'` → `cluster_type` required (`superset` \| `circuit`); `label_id` + `rounds`; exercise-only FKs null

### Tree → rows (denest)

```
session header          → session_logs
blocks[]                → log_blocks
  items[] exercise      → log_items + log_item_tools + log_sets
  items[] cluster       → log_items
    nested exercises    → log_sub_items + log_sub_item_tools + log_sets (rounds × overrides expanded)
```

App API (`src/lib/sessionLogs.ts`):

- `saveSessionLog` — replace-write denest for create/update
- `getSessionLog` / `listSessionLogs` — renest / list with same-day ordinal for display titles
- `deleteSessionLog` — hard delete (cascade children)

Optional future Postgres boundary functions (not required for the app today):

- `fn_denest_session_log(user_id, tree jsonb) → uuid`
- `fn_renest_session_log(log_id) → jsonb`

Templates stay JSONB end-to-end and do not denest for analytics in v1. Log list titles use `sessionLogTitle`: Label + local date, with `(session N)` when multiple logs share a day.

---

## Relationships At a Glance

```
auth.users
  └── public.users

tools / session_categories
  ├── global sentinels (No Tool, Session)
  └── user-owned rows
  └── session_templates.category_id / session_logs.category_id → session_categories
  └── exercise tool_id / exercise_template_tool_links → tools (No Tool allowed)

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
              ├── log_item_tools (if exercise)
              ├── log_sub_items (if cluster)
              │     └── log_sub_item_tools
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
| 2 | `tools` + `session_categories` **including global No Tool / Session null** | Valid FKs for templates/logs *(done)* |
| 3 | `analytics_primary_groups`, `analytics_tags`, `analytics_tag_links` | Optional exercise analytics *(done)* |
| 4 | `exercise_templates` | First Create → save → Library path *(done)* |
| 5 | `cluster_templates` | Sequence Create → save → Library *(done)* |
| 5b | `block_templates` / `session_templates` | Full template library *(done — run `sql/009`, `sql/010`)* |
| 6 | Log tables + app denest/renest (greenfield `007` + `sessionLogs.ts`) | Session logging + Insights MVP *(chat 5)* |
| 6b | Multi-tool links (`sql/015`) | Exercises with multiple tools *(done)* |

---

## Indexes (v1 minimum)

- `session_logs (user_id, session_date DESC)`
- `session_logs (user_id, status)`
- `log_items (log_block_id, item_order)`
- `log_sub_items (log_item_id, sub_item_order)`
- `log_sets (log_item_id)`, `log_sets (log_sub_item_id)`
- `log_items (primary_group_id)`, `log_sub_items (primary_group_id)` where not null
- Partial unique: at most one `is_system_default` row per taxonomy table that uses sentinels

---

## Insights query contract (day one)

Facts Insights must read (prefer greenfield schema; live project missing starred rows):

| Need | Tables / columns |
|------|------------------|
| Date window + status | `session_logs.user_id`, `session_date`, `status`, `category_id` |
| Set metrics | `log_sets`: reps, time, distance, load, `is_per_side`, **`set_type`**, **`intensity`** |
| Exercise identity | `track_analytics`, PG links, muscle links, tool links, **variation (`*_tag_links`)**, **`track_intensity`** |
| Dims | `analytics_primary_groups.name` + **`category`**, muscles, tags, tools, session labels |

### Grain model (chat 5.5 → 5.6/5.7)

Every log set is one fact carrying its own **grain keys**: session label
(`session_logs.category_id`), block label (`log_blocks.label_id`), sequence label
(`log_items.label_id` on cluster kind), and the exercise identity (PG / category /
muscle / variation / tool). Insights picks one **lens** (group-by) and applies
stacked filters. Session / block / sequence labels are valid **grains** (filter +
group-by), never exercise identity.

- **Credit rule (credit-each, documented):** per-PG / per-category / per-muscle
  rollups deliberately double-count (a multi-PG complex credits each PG; a
  multi-muscle exercise credits each muscle). **Never sum** those rows into one
  total. Session / block / sequence label lenses count each set **once** (honest
  partition). Honest totals (session count, working sets, session tonnage) come
  from the set grain once.
- **App layer:** `src/lib/insights.ts` (single set-anchored fetch, O(1) Map
  joins, lens + block-label + set-type filters).
- **Additive fact layer (greenfield `008`):** `v_log_set_facts` flattens the log
  tree per set; `ol_hms_to_seconds` / `ol_distance_to_meters` give canonical
  numeric time (seconds) and distance (**meters** canonical; UI presents mi/km by
  preference). Structural node durations power "minutes"; set `time_duration`
  stays a target-shape metric (do not mix unlabeled).

**Deferred:** New User Seeds content dump (chat 6), starter templates, saved views,
Insights UI polish, e1RM / ACWR, Postgres denest RPCs, rename `analytics_tags`.
Category-partition (vs credit-each) revisit is open.

## Out of Scope for v1

- Live-linked templates (editing a library block updates old sessions)
- Seeded exercise libraries or extra default categories/tools beyond the two global sentinels *(New User Seeds tool/PG/variation content dump is chat 6; greenfield stubs exist)*
- Extra load units (`% 1RM`, etc.) or cluster types beyond `superset` / `circuit`
- Soft propagation between template layers
- Per-user copies of system nulls (No Tool / Session / Block / Sequence) — rejected; see Global Sentinels. Editable **seeded defaults** (Strength, Warmup / Main, Superset, Circuit, …) are ordinary user-owned rows via `ensure_default_template_labels()`.
- Set rest / tempo columns; derived load / e1RM math

---

## Related Docs

| Doc | Role |
|-----|------|
| `docs/Template_Builders.md` | Shipped builder behavior (Session / Block / Sequence / Exercise / logs) |
| `docs/Analytics_Labeling.md` | Primary Group vs tags vs nest labels — how to organize analytics vocabulary |
| `docs/Styling.md` | Official visual system |
| `docs/Project_Structure.md` | Folders, navigation, key files |
| `docs/deprecated/original-concept/Backend/Database_Design.md` | Historical schema + JSON tree. Retired names (`composition_categories`), retired seeding model. Log tables now live; prefer `sql/greenfield/007` + this outline |
| `docs/deprecated/` | Archived design set (README explains what is stale) |
| `sql/` | `greenfield/` = canonical fresh-project set; `deprecated/` = old `001`–`019` |

---

## How To Use This File

- Use this outline when planning the next backend chat or migration.
- Mark sections Live / Planned as SQL lands.
- Keep field-level SQL in `sql/greenfield/*.sql` (or `sql/deprecated/` for the old incremental set), not duplicated here.
- After each migration ships, update **Current Status** and the relevant layer notes.
- Prefer this document over archived docs when they disagree on locked decisions.
