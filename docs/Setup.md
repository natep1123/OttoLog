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
sql/011_layer_labels.sql
sql/012_standard_sequence_label.sql
sql/013_kind_system_null_labels.sql
sql/014_session_logs.sql
sql/015_exercise_tools.sql
```

After `004`, **No Tool** and the Session system-null label exist once for the whole project (fixed UUIDs). Signup does not create copies per user. Session templates require the Session sentinel (`010` depends on `004`; rename in `013`). Session logging requires `014` (tables + RLS; denest/renest run in the app). Multi-tool exercises require `015` (template + log tool link tables).

**Auth vs profile:** credentials in `auth.users`; profile `username` in `public.users` where `id = auth.uid()`.

## 4. Run the app

```sh
npx expo start
```

Scan the QR code in Expo Go.

## 5. Smoke test

1. Create account and sign in
2. **Create** → Build templates → Exercise → save
3. **Create** → Build templates → Sequence → add exercises → save
4. **Create** → Build templates → Block / Session → nest lower layers → save
5. **Create** → Log a session → From scratch (or From template) → set date → save
6. **Library** → Templates → Exercises / Sequences / Blocks / Sessions → reopen (review mode) and unlock to edit
7. **Library** → Logs → reopen a saved log → edit / delete
8. **Account** → Taxonomy → add a tool
9. **Home** → quick actions navigate; **Insights** shows the placeholder

## Troubleshooting

| Issue | Check |
|-------|--------|
| Auth errors | URL and anon key in `.env.local`; restart Metro after env changes |
| RLS / empty lists | Migrations applied in order; user is signed in |
| Delete account fails | `sql/002_delete_own_account.sql` applied |
| Duplicate template name | By design. Active names are unique per user per layer (`007`–`010`). |
| Sequence list empty / RLS | Apply `sql/008_cluster_templates.sql`; user signed in |
| Block / Session list empty | Apply `sql/009` and `sql/010`; user signed in |
| Session logs fail to save / empty Logs | Apply `sql/014_session_logs.sql`; user signed in |
| Multi-tool exercises fail to save / load | Apply `sql/015_exercise_tools.sql` after `014` |

Schema: [`Database_Outline.md`](./Database_Outline.md). Folders: [`Project_Structure.md`](./Project_Structure.md).
