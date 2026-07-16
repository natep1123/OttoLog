# OttoLog — UI Design & App Shell (v1 Build Brief)

Agent-facing brief for scaffolding the React Native (Expo) app. Pair with:

| Doc | Owns |
|-----|------|
| `Backend/Database_Design.md` | Supabase schema, RLS, denest/renest, canonical JSON |
| `Frontend/Modular_Forms_Design.md` | Form behavior, layers, compass, analytics, snapshots |
| `Frontend/Styling.md` | Colors, type, ambient, component visual recipes |

**Your job as builder:** ship a clean shell — auth, tab nav, home, create hub, and navigable stubs (or thin first cuts) of the four template builders + session log — wired so domain work can fill in without re-architecting navigation.

**Human job:** paste Supabase URL/anon key (and any auth redirect config), run migrations, validate signup/login and navigation.

---

## Verdict: do you have enough?

**Yes — enough to start v1**, with this file closing the gap (nav + auth + screen inventory).

You do **not** need every form feature complete on day one. You need:

1. Expo app + theme tokens from `Styling.md`  
2. Supabase project + Auth (email + password) + schema from `Database_Design.md`  
3. Auth screens → main tabs  
4. Home (placeholder dashboard) + Create tab (two entry paths → template hub / log)  
5. Routes into the 4 template builders + session log (even if builders are scaffolded then deepened)

Defer: full compass polish, advanced Library analytics charts, mid-session offline sync perfection — leave hooks, don’t block the shell.

---

## Stack (v1)

| Layer | Choice |
|-------|--------|
| App | Expo (RN) + TypeScript |
| Router | Expo Router (file-based) |
| Backend | Supabase (Postgres + Auth + RLS) |
| Auth | Email + password (`signUp` / `signInWithPassword`); username stored on profile |
| Client | `@supabase/supabase-js` |
| State (early) | React context or Zustand for session user; form state local to editors |
| Config | `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` (env only — human fills) |

---

## Auth model

### Credentials

- **Email** + **password** for Supabase Auth  
- **Username** — required at signup; stored on **`public.users`** (one row per account = that user’s profile). Email lives in `auth.users`; app profile fields live on `public.users.id = auth.uid()`.

`public.users` (see also `Database_Design.md`):

```text
public.users
  id uuid PK = auth.uid()   -- references auth.users
  username text unique not null
  created_at, updated_at
  -- extend later with avatar_url, display prefs, etc.
```

On signup: create auth user → insert `public.users` row → seed **No Tool** + **Uncategorized** for that user (per Database_Design).

### Screens (auth stack — no bottom tabs)

| Screen | Contents |
|--------|----------|
| **Welcome** | Brand (gradient Fraunces “OttoLog”), short tagline, Log in / Sign up |
| **Sign up** | Username, email, password, confirm password → create account |
| **Log in** | Email, password → session |
| **Forgot password** (optional v1) | Email reset via Supabase |

Rules:

- Unauthenticated users only see auth stack  
- On session restore, go to main tabs  
- Sign out from Home or a simple Account/Settings entry on Home  

Styling: dark ambient background, primary gradient CTA, ghost secondary — match `Styling.md`.

---

## Main app: bottom tab bar

After auth, root is a **bottom tab navigator**.

| Tab | Label | Purpose |
|-----|--------|---------|
| 1 | **Home** | Dashboard / landing (placeholder-clean) |
| 2 | **Create** | Entry path: Build templates \| Log a session |
| 3 | **Library** | Browse / search / filter **sessions & templates**; open to view/edit; analytics entry points |
| 4 | **Account** | Username, email, sign out (minimal) |

All four tabs ship in v1. Prefer **Create** as the second tab so the product loop is obvious.

Tab bar chrome:

- Background `--bg-elevated` / panel  
- Inactive `--text-dim`  
- Active `--sunrise`  
- No loud purple; keep warm dark system  

Hide tab bar on full-screen builders (session/block/cluster/exercise/log editors) — push onto a stack above tabs, or present as stack inside Create.

---

## Navigation map

```
AuthStack
  Welcome → Login | Signup

AppTabs
  Home
  Create
    CreateHome          ← two big CTAs
    TemplateHub         ← 4 tiles
    SessionTemplateBuilder
    BlockTemplateBuilder
    ClusterTemplateBuilder
    ExerciseTemplateBuilder
    SessionLogBuilder   ← blank | from template
  Library
    LibraryHome         ← segments: Sessions | Templates (and sub-types)
    Search / filters
    Detail → open builder (view/edit) or analytics slice
  Account
```

### Create home (two entry paths)

Same energy as a branded landing, **inside the app** (not pre-auth):

1. **Build templates** → Template hub  
2. **Log a session** → Session log builder (optionally “Blank” vs “From template” sheet)

### Template hub (4 forms)

| Tile | Opens |
|------|--------|
| Session | Session template builder |
| Block | Block template builder |
| Cluster | Cluster template builder |
| Exercise | Exercise template builder |

Behavior, fields, ⋯ snapshots, duration, analytics: **`Modular_Forms_Design.md`**.  
This UI doc requires those screens to **exist and navigate**; depth follows forms + DB docs.

### Library (v1)

Real surface — not a stub:

| Capability | Notes |
|------------|--------|
| Browse | Lists of session logs + session/block/cluster/exercise templates |
| Search | Text search across names / notes |
| Filter | By type, `session_categories` (incl. Uncategorized), date range for logs, cluster type, etc. |
| Open | Tap → appropriate builder (edit) or read-focused detail |
| Analytics | Entry points / simple views over logged sets (primary group, tags) — deepen over time; schema already supports facts |

Empty states CTA → Create tab.

---

## Screen specs (shell)

### Home (dashboard placeholder)

Clean, not empty-looking:

- Greeting + **username** (from `public.users`)  
- Brand mark small (not competing with Create)  
- Cards: recent sessions / templates — link into Library or Create  
- No fake charts required in v1  

Goal: looks intentional; doesn’t pretend features that aren’t built.

### Create home

- Title e.g. “What are you doing?”  
- Primary button: Build templates (+ hint)  
- Ghost button: Log a session (+ hint)  
- Ambient background  

### Template hub

- Four equal tiles/cards (Session / Block / Cluster / Exercise)  
- Short subtitle each  
- Back to Create home  

### Builders (session / block / cluster / exercise / log)

- Stack header: title + close/back  
- Body: implement per `Modular_Forms_Design.md` (scaffold → iterate)  
- Footer: primary Save (template) or Save draft / Complete (log)  
- Use theme tokens; nesting rails per Styling  

Minimum scaffold if timeboxed: header meta fields + “Add block/exercise” stub list + Save writing to Supabase (even partial JSON). Prefer one vertical slice (Exercise template save) before full session tree.

### Account

- Username, email (read-only)  
- Sign out  

---

## Supabase checklist (human + agent)

**Agent prepares:**

- SQL migrations from `Database_Design.md` (tables, RLS, seed locked atoms)  
- Signup hook: `public.users` row + **No Tool** + **Uncategorized**  
- Auth email/password enabled in config notes  
- Client singleton reading env vars  
- Auth gate in root layout  

**Human provides / validates:**

1. Create Supabase project  
2. Set `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY`  
3. Enable Email provider; disable unused providers  
4. Run migrations  
5. Sign up test user → confirm `public.users`, No Tool, Uncategorized  
6. Walk tabs: Home → Create → Template hub → Library → Log path  

---

## Agent build order (recommended)

1. Expo app + theme (`Styling.md` → `theme.ts`)  
2. Supabase client + env template (`.env.example`)  
3. Migrations + signup seeds (`users`, No Tool, Uncategorized)  
4. Auth stack (Welcome / Signup / Login)  
5. App tabs (Home, Create home, Library shell, Account)  
6. Template hub + stack routes to 4 builders + Session log  
7. Deepen builders per `Modular_Forms_Design.md` (exercise → cluster → block → session)  
8. Wire saves to Supabase; flesh Library search/filter  
9. Basic Library analytics views when log facts exist  

Do **not** block on perfect compass before tabs + auth work.

---

## Out of scope for this shell pass

- Social login / magic link (unless human asks)  
- Push notifications  
- Full offline-first sync engine (draft `status` field is enough to start)  
- Redesigning the color system  

---

## Definition of done (v1 shell)

- [ ] User can sign up with username + email + password and log in again  
- [ ] `public.users` row exists; No Tool + Uncategorized seeded  
- [ ] Bottom tabs work (Home, Create, Library, Account); Account signs out  
- [ ] Create → Build templates → 4 hub destinations open  
- [ ] Create → Log a session opens log builder  
- [ ] Library lists templates/sessions with search/filter hooks  
- [ ] Theme matches warm dark OttoLog tokens  
- [ ] Env-based Supabase config; no secrets committed  
- [ ] Schema applied; RLS on  

Forms depth and denest completeness can iterate after this shell is green.

---

## How to prompt the coding agent

Point it at this folder and say roughly:

> Build OttoLog Expo app per `Frontend/UI_Design.md`. Use `Frontend/Styling.md` for theme, `Frontend/Modular_Forms_Design.md` for editors, `Backend/Database_Design.md` for Supabase. I will fill env credentials. Ship auth + tabs + Create/Template hub routes first, then deepen forms.

That package is sufficient to start; keep product extras as follow-ups, not blockers.
