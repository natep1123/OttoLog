---
name: apply-sql-migrations
description: >-
  Apply or author OttoLog Supabase SQL migrations in numeric order with RLS and
  sentinel awareness. Use when adding sql/*.sql files, fixing empty lists / RLS
  issues, or the user mentions migrations, schema, or Setup.md database steps.
---

# Apply SQL migrations

## Before changing anything

1. Read the migration list and notes in `docs/Setup.md`.
2. For schema meaning / naming / RLS / sentinels, open `docs/Database_Outline.md` (glossary + RLS sections) — do not invent table or column synonyms.
3. List existing `sql/*.sql` and take the **next** numeric prefix for new files.

## Authoring a new migration

- One concern per file; match style of neighboring `sql/0xx_*.sql` files.
- Preserve global sentinel UUIDs (`user_id IS NULL`); never create per-user copies of No Tool / system-null labels.
- Keep app constants in sync when IDs or seeds change (`src/constants/sentinelIds.ts`, `lockedAtoms.ts`).
- Update `docs/Setup.md` migration list and troubleshooting if the new file is required for a feature.

## Applying (Supabase SQL Editor)

Run files **in ascending numeric order**. Do not skip. After apply, smoke-check the feature path from `docs/Setup.md` (signed-in user; empty lists usually mean missing migration or RLS).

## App-side follow-through

Persistence helpers live in `src/lib/` (`*Templates.ts`, `sessionLogs.ts`, `taxonomy.ts`). Mirror existing list/get/save/delete and link-table replace patterns; see `docs/Project_Structure.md` data-flow section.
