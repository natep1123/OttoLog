# Deprecated docs

Archived design docs. **Historical only — not the contract.** Do not build from these.

Live map: [`../README.md`](../README.md). Agent map: [`../../AGENTS.md`](../../AGENTS.md).

## Live docs (use these)

| Live doc | Covers |
|----------|--------|
| `docs/Status.md` | Ops board — shipped / next / parked |
| `docs/Database_Outline.md` | Schema, sentinels, templates, session logs |
| `docs/Project_Structure.md` | Folders, navigation, key files |
| `docs/Template_Builders.md` | Shipped builder + session log behavior |
| `docs/Insights_Query_Builder.md` | Query builder nest contract |
| `docs/Analytics_Overhaul_Proposal.md` | Insights product board (hub = Dashboard + QB) |
| `docs/Analytics_Labeling.md` | Primary Group vs Variations vs nest labels |
| `docs/Styling.md` | Visual system and screen patterns |
| `docs/Setup.md` | Env, migrations, run, verify |
| `docs/references/` | UI gold screenshots |

## What is in here

### `original-concept/`

Original aspirational design set that seeded v1. Session logging and relational
denest/renest now ship (`sql/greenfield/007`, `src/lib/sessionLogs.ts`); treat
archived log sketches as history only.

Known disagreements with the shipped app:

- Says signup seeds No Tool and Uncategorized. Wrong — global sentinels with
  fixed UUIDs and `user_id IS NULL`. See `docs/Database_Outline.md`.
- Uses `composition_categories` / `comp_category_id`. Retired → `target_shapes` /
  `target_shape_id`.
- Describes clusters with `prescribed_sets` and a growable set list. Wrong —
  shipped Sequence is rounds + sparse overrides.
- Address Compass / "Save as … template" snapshot sheet — never built.
- Assumes Expo Router — app uses a custom stack in `HomeScreen`.
- Assumes denest/renest only as Postgres RPCs — v1 runs in the app against
  greenfield log tables.
- `Overview.md` links to `Frontend/Styling.md` (never here) — use `docs/Styling.md`.

### `Analytics_Overhaul_Proposal_v1_hybrid_cube.md`

Jul 2026 Hybrid Approach D (Simple cards + Power cube, lens×metric). Superseded by
canonical [`../Analytics_Overhaul_Proposal.md`](../Analytics_Overhaul_Proposal.md)
(PG-first; hub = Dashboard + nested Query builder).
