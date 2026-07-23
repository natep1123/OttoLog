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
| `docs/` | Canonical design docs — start at [`docs/README.md`](docs/README.md) |
| `docs/deprecated/` | Historical only — **ignore**; never treat as current |
| `docs/references/` | UI gold screenshots (`workout-builder/`, `query-builder/`) |

## Canonical docs (read these, don’t reinvent)

| Doc | When |
|-----|------|
| [`docs/Status.md`](docs/Status.md) | Living ops board: shipped / next / parked / open questions |
| [`docs/README.md`](docs/README.md) | Docs index (canonical vs deprecated vs references) |
| [`docs/Analytics_Overhaul_Proposal.md`](docs/Analytics_Overhaul_Proposal.md) | Insights **product board**: hub = Dashboard (shipped) + Query builder |
| [`docs/Insights_Query_Builder.md`](docs/Insights_Query_Builder.md) | Insights **Query builder contract** (nest AST + madlib author / locked nest readout) |
| [`docs/references/`](docs/references/) | UI gold shots — open the `.jpg` files |
| [`docs/Project_Structure.md`](docs/Project_Structure.md) | Folders, tabs, data flow, lib map |
| [`docs/Setup.md`](docs/Setup.md) | Env, migration order, smoke test |
| [`docs/Database_Outline.md`](docs/Database_Outline.md) | Schema, naming glossary, RLS, sentinels |
| [`docs/Template_Builders.md`](docs/Template_Builders.md) | Nesting, lock/review mode, editors |
| [`docs/Styling.md`](docs/Styling.md) | Tokens, chrome, form layer accents |
| [`docs/Label_Library.md`](docs/Label_Library.md) | Seed / label vocabulary (short map) |
| [`docs/New_User_Seeds.md`](docs/New_User_Seeds.md) | Full new-account seed catalog |
| [`docs/Analytics_Labeling.md`](docs/Analytics_Labeling.md) | PG vs variations vs muscles vs tools |

## Orchestrator / execution / models

- Full habit: [`.cursor/rules/agent-workflow.mdc`](.cursor/rules/agent-workflow.mdc) (always on).
- **Token / chat scope:** [`.cursor/skills/scoped-execution-chats/SKILL.md`](.cursor/skills/scoped-execution-chats/SKILL.md) — one slice per execution chat; Pro+ included pools only (no on-demand).
- **Orchestrator chat** (this role): direction, kickoffs, reviews, Status — default **Auto**. Thin chat; don’t implement large slices here.
- **Execution chats**: scoped builds/spikes — orchestrator (or Nate) picks a model; **recommend regularly** (quality fit + cheaper fallback). Nate has Pro+ and wants max quality when it matters, without wasting tokens.
- **Allowed models only:** Auto (default), Composer 2.5, Sonnet 5, Opus 4.8, Fable 5, GPT-5.6 Sol, GPT-5.6 Terra, Cursor Grok 4.5 — see workflow rule for fit. Don’t suggest anything else.
- Don’t default every hard task to Opus 4.8; don’t default every build to Auto-only either — match the task.
- When drafting kickoffs: put **suggested model** (+ cheaper fallback) and **mode** (default **Agent**; recommend **Plan** when applicable) **below** the pasteable prompt for Nate — not inside the prompt the execution agent sees — unless Nate already chose.

## Locked habits

- Prefer existing shared components and `src/theme/tokens.ts` / `formTokens.ts`.
- Naming: follow the glossary in `Database_Outline.md` (no synonym invention).
- Legacy internal name **cluster** = product **Sequence** (`ClusterEditor`, `cluster_templates`, …).
- Templates nest Session → Block → Sequence → Exercise; logs denest/renest via `src/lib/sessionLogs.ts`.
- Insights = **card hub** → **Dashboard** + **Query builder**. Nest AST + workout-family **read** chrome. **Author (in tree):** WHERE → FOR → Insight (`asks[]`) + SPLIT — feel **unsigned-off** (Nate rethink pause). **Shipped read:** 1 + 1.5 + 2. Contract: `docs/Insights_Query_Builder.md` §11–§12. Gold: every `.jpg` under `docs/references/query-builder/` + `workout-builder/` (esp. workout `08`/`09`, QB `08`). Skill: `.cursor/skills/insights-query-builder/SKILL.md`. v1 flat QB **dead**; nest-shell-only **parked**. **Next:** feel rethink → SHOW polish → totals → `saved_queries` (**ask first**).
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
