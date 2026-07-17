# OttoLog

Personal workout design and logging app. You define the exercises, tools, and analytics labels. No preset catalog.

Expo, React Native, TypeScript, Supabase.

## What's live

Four tabs when signed in: **Home**, **Create**, **Library**, **Account**.

| Area | Today |
|------|--------|
| **Home** | Dashboard with quick actions, recent exercise templates, week preview |
| **Create** | Exercise template builder (saved to Supabase) |
| **Library** | Browse, search, edit, and delete exercise templates |
| **Account** | Taxonomy (tools, primary groups, tags); Settings with account delete |

Also in place: auth, global **No Tool** and **Uncategorized** sentinels, searchable taxonomy pickers in the exercise editor, unique active template names per user.

**Next:** cluster, block, and session template builders, then session logging and denest/renest.

## Quick start

```sh
npm install
cp .env.example .env.local   # Supabase URL + anon key
npx expo start               # Expo Go on your phone
```

Run `sql/001` through `sql/007` in order in the Supabase SQL Editor. See [`docs/Setup.md`](docs/Setup.md).

## Documentation

| Doc | Contents |
|-----|----------|
| [`docs/Setup.md`](docs/Setup.md) | Env, migrations, run, verify |
| [`docs/Project_Structure.md`](docs/Project_Structure.md) | Folders, navigation, key files |
| [`docs/Database_Outline.md`](docs/Database_Outline.md) | Schema, RLS, live vs planned |
| [`docs/Styling.md`](docs/Styling.md) | Visual system and screen patterns |

Older prototypes live in [`docs/original-concept/`](docs/original-concept/). They are background only; official docs above are the contract.

## Project layout (short)

```text
src/auth/          Session and profile
src/components/    Shared UI and forms/ (ExerciseEditor kit)
src/lib/           Supabase, templates, taxonomy, localTime
src/screens/       Auth, Home shell, home/, create/, library/, account/
src/theme/         tokens.ts
sql/               Migrations 001 through 007
```

Full map: [`docs/Project_Structure.md`](docs/Project_Structure.md).
