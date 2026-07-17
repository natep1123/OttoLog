# OttoLog Setup

How to run the app locally and connect it to Supabase.

## Prerequisites

- Node.js (LTS recommended)
- npm
- [Expo Go](https://expo.dev/go) on a physical phone (primary dev target)
- A Supabase project with Auth (email / password) enabled

## 1. Install

```sh
git clone <repo-url>
cd ottolog-app
npm install
```

## 2. Environment

Copy the example env file and add your Supabase project values:

```sh
cp .env.example .env.local
```

| Variable | Source |
|----------|--------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon public key |

Expo loads `.env.local` automatically via `env: load .env.local` when you run `npx expo start`.

## 3. Database migrations

Run each file **in order** in the Supabase SQL Editor (Dashboard → SQL → New query):

```text
sql/001_users.sql
sql/002_delete_own_account.sql
sql/003_locked_atoms.sql
sql/004_taxonomy.sql
sql/005_analytics_taxonomy.sql
sql/006_exercise_templates.sql
sql/007_template_name_uniqueness.sql
```

After `004`, global sentinels **No Tool** and **Uncategorized** exist once project-wide (fixed UUIDs). Signup does not seed them per user.

**Auth vs profile:** Supabase Auth stores credentials in `auth.users`. OttoLog profile data (`username`) lives in `public.users` with `id = auth.uid()`.

## 4. Run the app

```sh
npx expo start
```

Scan the QR code with Expo Go. Test on a real device when changing layout, keyboard behavior, or touch targets.

## 5. Verify a happy path

1. Create account → sign in
2. **Create** → Build templates → Exercise → save a template
3. **Library** → Templates → Exercises → reopen and edit
4. **Account** → Taxonomy → add a tool
5. **Home** → quick actions and recent templates appear

## Troubleshooting

| Issue | Check |
|-------|--------|
| Auth errors | URL and anon key in `.env.local`; restart Metro after env changes |
| RLS / empty lists | Migrations applied in order; user is signed in |
| Delete account fails | `sql/002_delete_own_account.sql` applied |
| Duplicate template name | Expected — active names are unique per user (`007`) |

For schema details see [`Database_Outline.md`](./Database_Outline.md). For folder layout see [`Project_Structure.md`](./Project_Structure.md).
