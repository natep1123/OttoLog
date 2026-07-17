# OttoLog

Personal workout design and logging — an infinite canvas for how *you* train, not a fixed exercise catalog. Build reusable templates, log sessions with the same nested structure, and track only what matters with your own vocabulary.

**Stack:** Expo · React Native · TypeScript · Supabase

## What's live

Signed-in app with four tabs: **Home · Create · Library · Account**

| Area | Today |
|------|--------|
| **Home** | Dashboard — quick actions, recent exercise templates, live week preview |
| **Create** | Exercise template builder (save to Supabase) |
| **Library** | Browse / search / edit / delete exercise templates |
| **Account** | Taxonomy CRUD (tools, primary groups, tags); Settings → delete account |

Auth (welcome, sign in, sign up), global sentinels **No Tool** / **Uncategorized**, searchable taxonomy pickers in the exercise editor, unique active template names.

**Next:** cluster / block / session template builders, session logging, denest/renest.

## Quick start

```sh
npm install
cp .env.example .env.local   # add Supabase URL + anon key
npx expo start               # open in Expo Go
```

Run SQL migrations `sql/001` through `sql/007` in order in the Supabase SQL Editor. Details: [`docs/Setup.md`](docs/Setup.md).

## Documentation

Official docs (live contract):

| Doc | Contents |
|-----|----------|
| [`docs/Setup.md`](docs/Setup.md) | Env, migrations, run, verify |
| [`docs/Project_Structure.md`](docs/Project_Structure.md) | Folders, navigation, key files |
| [`docs/Database_Outline.md`](docs/Database_Outline.md) | Schema, RLS, live vs planned |
| [`docs/Styling.md`](docs/Styling.md) | Visual system + screen patterns |

Historical prototypes: [`docs/original-concept/`](docs/original-concept/) — useful context, not the source of truth.

## Project layout (short)

```text
src/auth/          Session + profile
src/components/    Shared UI + forms/ (ExerciseEditor kit)
src/lib/           Supabase, templates, taxonomy, localTime
src/screens/       Auth, Home shell, home/, create/, library/, account/
src/theme/         tokens.ts
sql/               Migrations 001–007
```

Full map: [`docs/Project_Structure.md`](docs/Project_Structure.md).
