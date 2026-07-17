# OttoLog

OttoLog is a personal workout design and logging app — an infinite canvas for how *you* train, not a fixed exercise catalog. Build reusable templates at any layer, log real sessions with the same nested structure, and track only what matters with your own vocabulary.

React Native (Expo) · Supabase · TypeScript

## Project Status

Foundation + first vertical slice are live:

- OttoLog visual system, auth (welcome / log in / create account), session restore, Account + delete
- Bottom tabs: Home · Create · Library · Account
- Create hub → Template hub → **Exercise builder** (nestable form kit)
- Save / reopen exercise templates in Supabase; Library browse
- Searchable create-comboboxes for tools, primary analytics groups, and tags
- **Account → Taxonomy** management (create / rename / archive / hard-delete when unused)

**Next:** cluster / block / session template builders, then session logging + denest/renest.

## Product Concept

OttoLog is designed around a user-owned workout tree rather than a global exercise database. The long-term product lets people build reusable templates at multiple levels — session, block, cluster, and exercise — then log sessions with the same nested structure.

The goal is a warm, journal-like training surface for designing and recording workouts without forcing someone into a preset catalog, fixed vocabulary, or rigid analytics model.

## Tech Stack

- Expo / React Native
- TypeScript
- Supabase Auth and Postgres
- Plain `StyleSheet` styling with centralized theme tokens
- `expo-font`, `expo-splash-screen`, `expo-linear-gradient`, and `react-native-svg`

## Documentation

Official project docs live in [`docs/`](./docs/). Concept / prototype material is under [`docs/original-concept/`](./docs/original-concept/).

| Doc | Role |
|-----|------|
| [`docs/Database_Outline.md`](./docs/Database_Outline.md) | Official DB map + live vs planned (wins on naming) |
| [`docs/Styling.md`](./docs/Styling.md) | Official visual system |
| [`docs/original-concept/`](./docs/original-concept/) | Prototypes + deeper form/editor notes |

## Getting Started

Install dependencies:

```sh
npm install
```

Create a local env file:

```sh
cp .env.example .env.local
# Edit .env.local with your actual Supabase keys
```

Start the Expo dev server:

```sh
npx expo start
```

Open the app with Expo Go on a phone.

## Supabase Setup

Run migrations **in order** in the Supabase SQL Editor:

```text
sql/001_users.sql
sql/002_delete_own_account.sql
sql/003_locked_atoms.sql
sql/004_taxonomy.sql
sql/005_analytics_taxonomy.sql
sql/006_exercise_templates.sql
sql/007_template_name_uniqueness.sql
```

Supabase Auth stores credentials in `auth.users`; OttoLog stores app profile data (e.g. `username`) in `public.users`. Global sentinels **No Tool** and **Uncategorized** are seeded in `004` (fixed UUIDs).

## Current App Flow

- Signed out: Welcome → Log in / Create account
- Signed in: Home · Create · Library · Account
- Create → Build templates → Exercise → save → Library reopen
- Library → Templates → Exercise (open / edit saved templates); Logs is a stub
- Account → Taxonomy → Tools / Primary groups / Analytics tags
- Session / Block / Cluster tiles (Create + Library) and Log a session are stubs for now

## Project Structure

```text
App.tsx                      Root app, fonts, auth routing
src/auth/                    Auth context + session
src/components/              Shared UI + nestable forms kit (forms/)
src/constants/               Locked-atom + sentinel IDs, targetShapeFields
src/lib/                     Supabase client, exercise + taxonomy helpers
src/screens/                 Auth, Home shell, account/, create/, library/
src/theme/                   OttoLog theme tokens
sql/                         Supabase migrations (001–007)
docs/                        Official + original-concept docs
```
