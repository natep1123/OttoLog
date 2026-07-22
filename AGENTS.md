# OttoLog — agent project map

## Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any Expo / React Native code.

## Stack

Expo ~57 · React Native · TypeScript · Supabase (Auth + Postgres + RLS)

## Where code lives

| Path | Role |
|------|------|
| `App.tsx` / `index.ts` | Entry: fonts, splash, auth gate |
| `src/` | App code (auth, screens, components, lib, theme, types) |
| `sql/` | Supabase migrations — **greenfield** `001`–`007` for new projects; `deprecated/` historical; `seeds/` optional personal smoke |
| `docs/` | Canonical design docs (this is the contract) |
| `docs/deprecated/` | Historical only — **ignore**; never treat as current |

## Canonical docs (read these, don’t reinvent)

| Doc | When |
|-----|------|
| [`docs/Status.md`](docs/Status.md) | Living ops board: shipped / next / parked / open questions |
| [`docs/Analytics_Overhaul_Proposal.md`](docs/Analytics_Overhaul_Proposal.md) | Insights: hub = Dashboard + Query builder (QB = nested savable/lockable) |
| [`docs/Project_Structure.md`](docs/Project_Structure.md) | Folders, tabs, data flow, lib map |
| [`docs/Setup.md`](docs/Setup.md) | Env, migration order, smoke test |
| [`docs/Database_Outline.md`](docs/Database_Outline.md) | Schema, naming glossary, RLS, sentinels |
| [`docs/Template_Builders.md`](docs/Template_Builders.md) | Nesting, lock/review mode, editors |
| [`docs/Styling.md`](docs/Styling.md) | Tokens, chrome, form layer accents |
| [`docs/Label_Library.md`](docs/Label_Library.md) | Seed / label vocabulary (short map) |
| [`docs/New_User_Seeds.md`](docs/New_User_Seeds.md) | Full new-account seed catalog |
| [`docs/Analytics_Labeling.md`](docs/Analytics_Labeling.md) | PG vs variations vs muscles vs tools |

## Locked habits

- Prefer existing shared components and `src/theme/tokens.ts` / `formTokens.ts`.
- Naming: follow the glossary in `Database_Outline.md` (no synonym invention).
- Legacy internal name **cluster** = product **Sequence** (`ClusterEditor`, `cluster_templates`, …).
- Templates nest Session → Block → Sequence → Exercise; logs denest/renest via `src/lib/sessionLogs.ts`.
- Cursor rules under `.cursor/rules/` point at these docs by scope — open matching files so the right rule attaches.
- When a feature/phase chat closes, update `docs/Status.md` (Shipped / Next / Parked / Open questions) — do not paste that board into always-on rules.

## Voice / copy (user-facing + agent-written UI strings)

- Write like a clear coach UI, not a landing page or LLM default.
- Avoid AI-flavored prose: em dashes as decoration, “delightful / seamless / elevate / unlock your potential” marketing talk, fake urgency, stacked hedges.
- Prefer short labels, concrete verbs, and glossary terms from the docs.
- Same bar for comments and Status/proposal edits when they become user-facing copy later.

## Git / commits (Nate owns the gate)

- **Never create a git commit** unless Nate explicitly asks in **this** chat (e.g. “commit”, “commit this”, “go ahead and commit”).
- Do **not** treat “ship”, “done”, “landed”, “Phase X complete”, or Status updates as permission to commit.
- Do **not** push, amend, or force-push unless he explicitly asks.
- Leave changes in the working tree for him to inspect; summarize what changed and wait.
- Kickoff prompts for other agents should include this gate unless Nate grants commit permission in that prompt.
