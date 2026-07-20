# OttoLog

Personal workout design and logging app. You define the exercises, tools, and analytics labels. No preset catalog.

Expo, React Native, TypeScript, Supabase.

## What's live

Five tabs when signed in: **Home**, **Insights**, **Create**, **Library**, **Account**.

| Area | Today |
|------|--------|
| **Home** | Dashboard with quick actions and a week preview placeholder |
| **Insights** | Placeholder (coming soon) |
| **Create** | Log a session (from scratch or from a session template); Session / Block / Sequence / Exercise template builders |
| **Library** | Browse templates and session logs; open in review mode (locked + expanded outline) |
| **Account** | Taxonomy (tools, primary groups, tags, labels); Settings with account delete |

Also in place: auth, global **No Tool**, and kind-named system null labels (**Session**, **Block**, **Sequence**), searchable taxonomy pickers in the exercise editor, unique active template names per user (per layer). Composition is Session → Block → Sequence → Exercise (JSON copy, no cross-template FKs). Sequences use rounds × per-round exercises with sparse overrides; soft archive preferred. Session logs denest into relational tables (`sql/014`) via app-side save/load.

**Next:** Insights / analytics surfaces; AI-assisted logging; week calendar on Home.

## Quick start

```sh
npm install
cp .env.example .env.local   # Supabase URL + anon key
npx expo start               # Expo Go on your phone
```

Run `sql/001` through `sql/014` in order in the Supabase SQL Editor. See [`docs/Setup.md`](docs/Setup.md).

## Documentation

| Doc | Contents |
|-----|----------|
| [`docs/Setup.md`](docs/Setup.md) | Env, migrations, run, verify |
| [`docs/Project_Structure.md`](docs/Project_Structure.md) | Folders, navigation, key files |
| [`docs/Database_Outline.md`](docs/Database_Outline.md) | Schema, RLS, live vs planned |
| [`docs/Template_Builders.md`](docs/Template_Builders.md) | Shipped builder + session log behavior |
| [`docs/Analytics_Labeling.md`](docs/Analytics_Labeling.md) | Primary Group vs tags vs nest labels (best practices) |
| [`docs/Styling.md`](docs/Styling.md) | Visual system and screen patterns |

Older prototypes live in [`docs/deprecated/original-concept/`](docs/deprecated/original-concept/). They are background only; official docs above are the contract.

## Project layout (short)

```text
src/auth/          Session and profile
src/components/    Shared UI and forms/ (Session → Block → Sequence → Exercise)
src/lib/           Supabase, templates, session logs, taxonomy, localTime
src/screens/       Auth, Home shell, home/, insights/, create/, library/, account/
src/theme/         tokens.ts
sql/               Migrations 001 through 014
```

Full map: [`docs/Project_Structure.md`](docs/Project_Structure.md).
