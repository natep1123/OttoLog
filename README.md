# OttoLog

Personal workout design and logging app. You define the exercises, tools, and analytics labels. No preset catalog.

Expo, React Native, TypeScript, Supabase.

## What's live

Five tabs when signed in: **Home**, **Insights**, **Create**, **Library**, **Account**.

| Area | Today |
|------|--------|
| **Home** | Dashboard with quick actions and a week preview placeholder |
| **Insights** | Lenses (PG / category / muscle / session / block / sequence label), filters, volume / balance / muscles / tonnage MVP |
| **Create** | Log a session (from scratch or from a session template); Session / Block / Sequence / Exercise template builders |
| **Library** | Browse templates and session logs; open in review mode (locked + expanded outline) |
| **Account** | Taxonomy (tools, primary groups, Variations, labels); Settings with account delete |

Also in place: auth, global **No Tool**, and kind-named system null labels (**Session**, **Block**, **Sequence**), searchable taxonomy pickers in the exercise editor, unique active template names per user (per layer). Composition is Session → Block → Sequence → Exercise (JSON copy, no cross-template FKs). Sequences use rounds × per-round exercises with sparse overrides; soft archive preferred. Session logs denest into relational tables (`sql/greenfield/007`) via app-side save/load.

**Next:** see living board [`docs/Status.md`](docs/Status.md) (Insights query builder Phase 2, PG Counts as, Chat 6, …). Direction: [`docs/Analytics_Overhaul_Proposal.md`](docs/Analytics_Overhaul_Proposal.md).

## Quick start

```sh
npm install
cp .env.example .env.local   # Supabase URL + anon key
npx expo start               # Expo Go on your phone
```

For a **fresh** Supabase project, run `sql/greenfield/001`–`007` in order (facts view lives in `007`). See [`docs/Setup.md`](docs/Setup.md). Historical incremental SQL is under `sql/deprecated/` only.

## Documentation

| Doc | Contents |
|-----|----------|
| [`AGENTS.md`](AGENTS.md) | Short project map for AI agents; Cursor rules/skills under `.cursor/` |
| [`docs/Status.md`](docs/Status.md) | Living ops board: shipped / next / parked / open questions |
| [`docs/Analytics_Overhaul_Proposal.md`](docs/Analytics_Overhaul_Proposal.md) | Insights: PG-first query builder (canonical); 1a = interim |
| [`docs/Setup.md`](docs/Setup.md) | Env, migrations, run, verify |
| [`docs/Project_Structure.md`](docs/Project_Structure.md) | Folders, navigation, key files |
| [`docs/Database_Outline.md`](docs/Database_Outline.md) | Schema, RLS, live vs planned |
| [`docs/Template_Builders.md`](docs/Template_Builders.md) | Shipped builder + session log behavior |
| [`docs/Label_Library.md`](docs/Label_Library.md) | Seed / label vocabulary |
| [`docs/New_User_Seeds.md`](docs/New_User_Seeds.md) | Full new-account seed catalog |
| [`docs/Analytics_Labeling.md`](docs/Analytics_Labeling.md) | Primary Group vs Variations vs nest labels (best practices) |
| [`docs/Styling.md`](docs/Styling.md) | Visual system and screen patterns |

Older prototypes live in [`docs/deprecated/original-concept/`](docs/deprecated/original-concept/). They are background only; official docs above are the contract.

## Project layout (short)

```text
AGENTS.md          Agent project map (.cursor/rules + .cursor/skills)
src/auth/          Session and profile
src/components/    Shared UI and forms/ (Session → Block → Sequence → Exercise)
src/lib/           Supabase, templates, session logs, taxonomy, localTime
src/screens/       Auth, Home shell, home/, insights/, create/, library/, account/
src/theme/         tokens.ts
sql/greenfield/    Canonical migrations 001–007 (see Setup.md)
sql/seeds/         Optional personal smoke scripts (not migrations)
sql/deprecated/    Historical incremental 001–019
docs/Status.md     Living shipped / next / parked board
```

Full map: [`docs/Project_Structure.md`](docs/Project_Structure.md).
