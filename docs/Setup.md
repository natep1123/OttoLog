# OttoLog Setup

Run the app locally and connect it to Supabase.

## Prerequisites

- Node.js (LTS)
- npm
- [Expo Go](https://expo.dev/go) on a phone (recommended for layout and touch testing)
- Supabase project with email/password auth enabled

## 1. Install

```sh
git clone <repo-url>
cd ottolog-app
npm install
```

## 2. Environment

```sh
cp .env.example .env.local
```

| Variable | Where to find it |
|----------|------------------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon public key |

Expo reads `.env.local` when you run `npx expo start`.

## 3. Database migrations

Run each file in order in the Supabase SQL Editor (Dashboard → SQL → New query):

```text
sql/001_users.sql
sql/002_delete_own_account.sql
sql/003_locked_atoms.sql
sql/004_taxonomy.sql
sql/005_analytics_taxonomy.sql
sql/006_exercise_templates.sql
sql/007_template_name_uniqueness.sql
sql/008_cluster_templates.sql
sql/009_block_templates.sql
sql/010_session_templates.sql
```

After `004`, **No Tool** and **Uncategorized** exist once for the whole project (fixed UUIDs). Signup does not create copies per user. Session templates require Uncategorized (`010` depends on `004`).

**Auth vs profile:** credentials in `auth.users`; profile `username` in `public.users` where `id = auth.uid()`.

## 4. Run the app

```sh
npx expo start
```

Scan the QR code in Expo Go.

## 5. Smoke test

1. Create account and sign in
2. **Create** → Build templates → Exercise → save
3. **Create** → Build templates → Cluster → add exercises → save
4. **Create** → Build templates → Block / Session → nest lower layers → save
5. **Library** → Templates → Exercises / Clusters / Blocks / Sessions → reopen and edit
6. **Account** → Taxonomy → add a tool
7. **Home** → recent exercise templates and quick actions show up

## Troubleshooting

| Issue | Check |
|-------|--------|
| Auth errors | URL and anon key in `.env.local`; restart Metro after env changes |
| RLS / empty lists | Migrations applied in order; user is signed in |
| Delete account fails | `sql/002_delete_own_account.sql` applied |
| Duplicate template name | By design. Active names are unique per user per layer (`007`–`010`). |
| Cluster list empty / RLS | Apply `sql/008_cluster_templates.sql`; user signed in |
| Block / Session list empty | Apply `sql/009` and `sql/010`; user signed in |

Schema: [`Database_Outline.md`](./Database_Outline.md). Folders: [`Project_Structure.md`](./Project_Structure.md).
