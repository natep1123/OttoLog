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

For a **fresh** Supabase project, run each greenfield file in order in the SQL Editor (Dashboard → SQL → New query):

```text
sql/greenfield/001_users.sql
sql/greenfield/002_delete_own_account.sql
sql/greenfield/003_locked_atoms.sql
sql/greenfield/004_taxonomy.sql
sql/greenfield/005_analytics.sql
sql/greenfield/006_templates.sql
sql/greenfield/007_session_logs.sql
```

Do **not** mix greenfield with the old incremental set. Historical `sql/001`–`019` live under `sql/deprecated/` (already-applied projects only; do not re-run on a greenfield DB).

After greenfield `004`, **No Tool** and the Session / Block / Sequence system-null labels exist once for the whole project (fixed UUIDs). Signup does not create copies per user. Nest-label defaults (`Main`, Rest/`is_empty`, …) come from `ensure_default_template_labels()`. Muscle defaults from `ensure_default_muscle_groups()`. PG / variation / tool New User Seeds content dumps are stubs until chat 6.

Schema notes (category, log variation links, `set_type` / `intensity`, `track_intensity`): [`Database_Outline.md`](./Database_Outline.md) Current Status.

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
| RLS / empty lists | Greenfield migrations applied in order; user is signed in |
| Delete account fails | `sql/greenfield/002_delete_own_account.sql` applied |
| Duplicate template name | By design. Active names are unique per user per layer |
| Sequence / Block / Session list empty | Apply greenfield `006_templates.sql`; user signed in |
| Session logs fail to save / empty Logs | Apply greenfield `007_session_logs.sql`; user signed in |
| Rest / empty session label missing | Apply greenfield `004_taxonomy.sql` (includes `is_empty` + Rest seed) |
| Muscle groups missing | Apply greenfield `005_analytics.sql`; call `ensure_default_muscle_groups` |
| PG `category` / intensity / log variations missing | You are on deprecated `001`–`019` — use greenfield for a fresh project |

Schema: [`Database_Outline.md`](./Database_Outline.md). Folders: [`Project_Structure.md`](./Project_Structure.md).
