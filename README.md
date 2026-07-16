# OttoLog

OttoLog is a personal workout design and logging app — an infinite canvas for how *you* train, not a fixed exercise catalog. Build reusable templates at any layer, log real sessions with the same nested structure, and track only what matters with your own vocabulary.

React Native (Expo) · Supabase · TypeScript

## Project Status

This app is at the foundation stage. The current build includes the OttoLog visual system, a welcome screen, email/password auth, profile creation, session restore, and a placeholder signed-in Home screen.

Next major areas are app navigation, the Create flow, template builders, session logging, and the Library.

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

The product specs and prototype references live in [`docs/`](./docs/).

- [`docs/Overview.md`](./docs/Overview.md) — high-level product overview
- [`docs/Frontend/UI_Design.md`](./docs/Frontend/UI_Design.md) — app shell and screen flow
- [`docs/Frontend/Form Prototype/session-templator.html`](./docs/Frontend/Form%20Prototype/session-templator.html) — styling source of truth
- [`docs/Backend/Database_Design.md`](./docs/Backend/Database_Design.md) — Supabase schema direction

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

Run the initial auth profile migration in the Supabase SQL Editor:

```text
sql/001_users.sql
```

This creates the app profile table, `public.users`, and a trigger that creates a matching profile row when a new Supabase Auth user signs up.

Supabase Auth stores credentials in `auth.users`; OttoLog stores app profile data, like `username`, in `public.users`.

## Current App Flow (Auth -> Home Page)

- Signed out users see the welcome screen.
- Welcome links to Log in and Create account.
- Create account writes to Supabase Auth and creates a matching OttoLog profile.
- Existing sessions restore automatically.
- Signed in users land on a simple placeholder Home screen with Log out.

## Project Structure

```text
App.tsx                 Root app, font loading, auth/session routing
src/auth/               Auth context and session state
src/components/         Shared UI components
src/lib/                Supabase client
src/screens/            Welcome, auth, and placeholder Home screens
src/theme/              OttoLog theme tokens
sql/                    Supabase SQL setup
docs/                   Product docs and prototype references
```
