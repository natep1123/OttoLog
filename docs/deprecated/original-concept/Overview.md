# OttoLog — Project Overview (v1)

OttoLog is a **personal workout design and logging system**: an infinite canvas for how *you* train, not a catalog of someone else’s exercise list.

This folder is the **source of truth for building v1** as a React Native (Expo) app on Supabase. 

---

## What OttoLog is

OttoLog lets you:

1. **Build templates** at any layer — full sessions, blocks, clusters, or single exercises — and save them as reusable library objects.  
2. **Log sessions** with the same nested structure (blocks → exercises/clusters → sets), optionally starting from a template.  
3. **Track only what matters** — optional duration at any nesting level, optional analytics with *your* labels and tags.  
4. **Own the vocabulary** — tools, session categories, analytics groups, and tags are *yours* to create. Signup only seeds two structural defaults: **No Tool** and **Uncategorized** (same idea as a null bucket — always present, not starter content).

The core metaphor is an **addressable workout tree** (`X.Y.Z` — block / item / sub-item), edited with an address compass and persisted as either JSONB blueprints (templates) or relational facts (logs) for analytics.

**v1 product shape**

- Auth: email + password + username  
- App shell: bottom tabs (Home, Create, Library (browse/search/filter sessions & templates; analytics views), Account)  
- Create path: **Build templates** (4 builders) | **Log a session**  
- Session log = same editor kit as the session template builder, different document type and save path  

---

## What sets it apart from typical fitness trackers

| Typical tracker | OttoLog |
|-----------------|--------|
| Fixed global exercise database | **Blank canvas** — you name movements; no mandatory catalog |
| One “workout” blob | **Modular layers** — session / block / cluster / exercise, each saveable |
| Logging-only or programming-only | **Both** — design blueprints *and* log reality, same tree |
| Canonical exercise name = analytics | **Split identity** — display name free; analytics via optional primary group + tags |
| Rigid equipment enums | **Your tools** (+ required “No Tool” for unequipped work) |
| Drag-heavy mobile editors | **Coordinate + compass** routing through nesting levels |
| Templates as soft copies in UI only | **Explicit snapshot-to-library** with independent JSONB rows (no surprise sync) |
| Generic SaaS chrome | **Warm dusk/sunrise visual system** — intentional, journal-like |

OttoLog is closer to a **coach’s programming surface that also logs** than to a calorie/step clone or a fixed CrossFit WOD browser.

---

## v1 scope (in / out)

### In scope

- Supabase Auth + Postgres schema (RLS, locked atoms, user taxonomy)  
- App shell and navigation per UI design (including **Library** browse/search/filter)  
- Four template builders + session log builder (behavior per forms design)  
- Optional duration (session → exercise) and optional analytics (exercise + sets)  
- User-owned session categories (always including **Uncategorized**); cluster types `superset` | `circuit`; load units `lbs` | `kg` | `BW`; distance units `mi` | `km` | `m`  
- Theme tokens from the styling system  

### Out of scope for v1 (intentionally later)

- Social / feed / challenges  
- Live-linked templates (editing a library block updates old sessions)  
- Rich “smart coach” AI (natural language logging, AI planning) — Library may include basic analytics views  
- Extra load units (`% 1RM`, etc.) or more cluster types / user-editable locked atoms  
- Seeded exercise libraries or default session category lists beyond **Uncategorized**  
- Seeded tool lists beyond **No Tool**  

---

## Doc map — the four working specs

Use all four together.

### 1. `Backend/Database_Design.md`

**Purpose:** How data lives in Supabase.

- Philosophy (infinite canvas, RLS, array order as editor truth)  
- Locked atoms vs user taxonomy (`tools`, `session_categories`, analytics groups/tags)  
- `public.users` profile row; signup seeds **No Tool** + **Uncategorized**  
- Template tables (JSONB) vs log tables (relational X.Y.Z + sets)  
- Canonical JSON tree, denest/renest RPCs, archive rules  
- v1 constraints (cluster types, load units, distance units)  

**Use when:** writing migrations, RLS, save/load adapters, denest.

### 2. `Frontend/Modular_Forms_Design.md`

**Purpose:** How the editors behave.

- Two entry paths; four template builders; log as modified session builder  
- Field specs per layer; ⋯ menus; snapshot confirm sheets  
- Duration toggles; analytics search/create; targets table by composition category  
- Address compass rules; collapse/expand; build ladder (exercise → session)  

**Use when:** implementing React Native form components and save UX.

### 3. `Frontend/Styling.md`

**Purpose:** How OttoLog looks.

- Warm dark palette (sunrise / sunset / dusk / gold)  
- Typography (DM Sans UI, Fraunces brand)  
- Ambient gradients, radii, shadows, nesting rails  
- Button/input/panel recipes; RN mapping notes  

**Use when:** building `theme.ts` and visual components — keep the product recognizable.

### 4. `Frontend/UI_Design.md`

**Purpose:** How the app is structured and what to ship first.

- Auth screens (username + email + password)  
- Bottom tab shell (Home, Create, **Library**, Account)  
- Create hub → template tiles / log path  
- Library: browse, search, filter, session/template viewing, analytics entry points  
- Agent build order, env vars, definition of done for the shell  

**Use when:** scaffolding Expo Router, auth gates, and navigation before deep form polish.

---

## How to use this folder with an agent

1. Point the agent at **this Overview** plus the four specs above.  
2. Prefer build order in `UI_Design.md`: shell + auth → Create hub routes → deepen forms per `Modular_Forms_Design.md` → persist per `Database_Design.md`.  
3. You provide Supabase URL/anon key and validate signup, tabs, and saves.  

---

## One-line summary

**OttoLog v1** is a Supabase-backed React Native app for designing and logging nested workouts on a user-owned canvas — modular templates, honest logging, optional analytics — specified by database, forms, styling, and UI shell docs in this folder.
