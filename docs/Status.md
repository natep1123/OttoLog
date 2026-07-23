# OttoLog Status (living)

> Edit this file when a phase closes. Canonical design still lives in the docs
> linked below — this file is the ops/planning board only.

## Canonical docs (do not paste wholesale)

- [`Setup.md`](./Setup.md), [`Project_Structure.md`](./Project_Structure.md), [`Database_Outline.md`](./Database_Outline.md), [`Template_Builders.md`](./Template_Builders.md), [`Styling.md`](./Styling.md), [`Label_Library.md`](./Label_Library.md), [`New_User_Seeds.md`](./New_User_Seeds.md), [`Analytics_Labeling.md`](./Analytics_Labeling.md)
- Insights: [`Analytics_Overhaul_Proposal.md`](./Analytics_Overhaul_Proposal.md) (product board) + [`Insights_Query_Builder.md`](./Insights_Query_Builder.md) (nest contract) + [`references/`](./references/) (UI gold) + [`README.md`](./README.md) (docs index)

## Current baseline

- Stack / greenfield path: `sql/greenfield/001`–`007` (facts view in `007`; no `008`)
- Live smoke DB: **OttoLog** Supabase (greenfield; email/password; confirm-email OFF for smoke)
- App: Insights **card hub** → **Dashboard** + **Query builder**. QB **in tree (committed):** nest AST + lock/preview + §11 WHERE/FOR/Insight author + §12 A/B (facet-split, WHERE date, per-layer lock/pills, Insight editor). **Author feel unsigned-off** — Nate pausing to rethink what’s wrong before more chrome slices. Contract: [`Insights_Query_Builder.md`](./Insights_Query_Builder.md) §11–§12. Gold: [`references/query-builder/`](./references/query-builder/) + workout [`08`/`09`](./references/workout-builder/) for Insight dusk DNA. No `008`.
- **Analytics direction (locked):** Insights = **two tools**. Dashboard = fast unsaved. QB = structured, eventually savable — nest AST + nest-shaped author + locked nest readout. See proposal + nest contract.
- Seeds: `sql/seeds/murph_personal_seed.sql` applied on `n8.perry` (personal smoke only; not Chat 6)
- Living board: this file (linked from AGENTS / README / Project_Structure)

## Shipped recently (newest first)

- **Docs / agent map sync (Jul 23)** — Status + nest contract + `insights-query-builder` skill + `insights.mdc` + AGENTS aligned to §11/§12 author path; author **feel** marked unsigned-off / rethink pause.
- **Insights Query builder — §12 Slice B: per-layer lock/pills + Insight editor (Jul 23, ephemeral)** — WHERE + FOR independently lockable; collapsed child-summary pills; `QbInsightCard` summary-row/editor. Contract §12 #4–5.
- **Insights Query builder — §12 Slice A: WITH facet-split + WHERE nested date (Jul 23, ephemeral)** — `variationMatch` / `toolMatch`; optional `SectionNode.dateWindow`. Contract §12 #1–2.
- **Insights Query builder — §11 Insight nest-chrome (Jul 23, ephemeral)** — `QbWhereCard` / `QbForCard` / `QbInsightCard` / `QbSplitWrapperCard`; `SubjectNode.asks`; Mode C SPLIT + seed. Gold: `query-builder/08`. **Feel not signed off** — further author chrome paused pending Nate rethink.
- **Insights Query builder — WITH any/all + sibling SPLIT (Jul 23, ephemeral)** — shared match superseded by §12 A facet-split; sibling SPLIT (Option C) remains. Gold: `01` / `06`.
- **Insights Query builder — madlib polish + slice 2.5 (Jul 23, ephemeral)** — progressive author path that evolved into §11 nest chrome; flat `QbMadlibSubjectClause` removed when §11 landed.
- **Scoped execution chats skill + Pro+ (Jul 23)** — [`.cursor/skills/scoped-execution-chats/SKILL.md`](../.cursor/skills/scoped-execution-chats/SKILL.md); workflow notes Pro+ / no on-demand; Sonnet 5 as mid-range sweet spot (promo through Aug 31).
- **Insights Query builder — author/read split (Jul 22, docs)** — Decision: **madlib author** (Query frame + Subject clause-blocks) vs **nest LockedOutline readout** (protect slices 1–2 chrome). Collapse Section in author UI until multi-Section; Breakdown = author SPLIT chip / read purple rail; whole-ask lock for v1 madlib. Nest AST + engine + warm accents stay. Nest-shell-only authoring **parked**. Contract: [`Insights_Query_Builder.md`](./Insights_Query_Builder.md).
- **Docs map + agent workflow (Jul 22)** — `docs/README.md` + references archive reorg earlier; always-on [`.cursor/rules/agent-workflow.mdc`](../.cursor/rules/agent-workflow.mdc): orchestrator (Auto) vs execution chats; regular model recommendations; token-aware quality.
- **Insights Query builder — slice 2 lock grammar + preview (Jul 22)** — Locked+expanded shows `LockedOutline` analytics grammar via `qbOutline.ts` (measure tokens, Breakdown groups + dusk totals); maximize → shared `LockedPreviewModal` (paginated). Unlock restores edit body; Tools tray **Unlock & Expand All** (`QbEditorTools`). Still ephemeral — no `saved_queries`/`008`. Gold: [`references/query-builder/`](./references/query-builder/).
- **Insights Query builder — slice 1.5 chrome/feel parity (Jul 22)** — Warm `layer` accents by depth (`qbTokens` / `QB_TO_FORM`); CoordRow lock toggle; Query More; provisional cool `queryLayer` removed. Open history: [`references/archive/query-open-history/`](./references/archive/query-open-history/).
- **UI reference galleries + QB feel overturn (Jul 22 evening)** — `docs/references/` gold shots; Decision 12 overturned (structure/feel ≈ workout nest).
- **Insights Query builder — v2 slice 1: nest skeleton (Jul 22)** — Query → Section → Breakdown → Subject → Measure; client aggregate over `v_log_set_facts`. Ephemeral. Dashboard + hub untouched.
- **Insights Query builder — v2 layer model signed off (Jul 22)** — **overturned the v1 flat design.** Nest AST + SQL-per-layer + `Qb*` chrome; later same day: authoring path → madlib (see author/read split above). Full contract: [`Insights_Query_Builder.md`](./Insights_Query_Builder.md).
- **Insights Query builder — slice 1 flat shell (Jul 22 — SCRAPPED)** — flat “Dashboard in builder skin” form removed when the v2 nest landed. Dashboard still uses `loadInsightQuery`/`buildPanel`.
- **Insights reframed to a card hub (Jul 22)** — Insights tab is a hub (`InsightsHubScreen`) like Library / Create, with **Query builder** + **Dashboard** cards. Routing via `InsightsStack` in `HomeScreen.tsx` (hub / dashboard / queryBuilder). Old `InsightsScreen.tsx` → `InsightsDashboardScreen.tsx`. Saving is not on the Dashboard.
- **Insights Phase 3 slice A (per-PG scope cards)** — *(now the Dashboard)* selecting Primary Groups spawns one editable card per PG. Each card holds its own Variations + Tools pickers (scoped to that PG only, soft — never enforced) above that PG's facet results. Variations picker wires `suggestedIds` from `listPrimaryGroupSuggestedTagIds(pgId)` (Show all still reaches the full pool). `InsightQuery` identity filters are now per-PG maps (`variationIdsByPg` / `toolIdsByPg`); aggregation applies each PG's filters to its own panel (credit-each unchanged). Nest labels + set type + dates + Working/warmups stay query-global in the Scope disclosure. Single global Variations/Tools filters removed (no rival UI). Category browse chips unchanged. No `008`. *(Save + lock superseded by the v2 Query builder slices — table is now `saved_queries` at slice 4; still ask before migrating.)*
- **Insights Phase 2 (query builder MVP)** — draft form home: FOR Primary Groups → stacked per-PG facet panels (reps/time/distance/load/sets as logged) → Scope disclosure (session/block/sequence + variations/tools/set type) → dates (last 7) + Working/warmups; `v_log_set_facts` + load facet (no tonnage default); 1a lens/metric/balance chrome removed
- **Insights Phase 1a (substrate)** — `v_log_set_facts`; metric-aware dashboard (interim IA — **replaced** by Phase 2)
- **Analytics direction locked** — PG-first query builder + Saved Insights + lock; v1 Hybrid proposal → `docs/deprecated/Analytics_Overhaul_Proposal_v1_hybrid_cube.md`
- **Greenfield smoke on OttoLog** — `001`–`007`, sentinels, signup/`n8.perry`, nest+muscle defaults, Murph seed; patched missing `public.users` GRANTs in `001`
- Living `Status.md` ops board + docs sync after greenfield Insights
- Fold Insights helpers + `v_log_set_facts` into greenfield `007`; drop standalone `008`
- Murph personal smoke seed (`sql/seeds/`) — one-account library + completed log
- Insights lenses for nest grains (session / block / sequence labels) + credit-each rule
- Greenfield Insights cutover: PG `category`, log variation links, `set_type` / `intensity`, `track_intensity`
- Variations product vocab locked; New User Seeds catalog as the seed contract
- Agent map (AGENTS / `.cursor` rules + skills) + `sql/deprecated/` historical split

## Next (priority order)

1. **Insights Query builder — author feel rethink (Nate)** — §11/§12 are in tree but **not where Nate wants**. Pause chrome pile-on. Clarify what’s wrong (WHERE/FOR/Insight density, SPLIT, locks/pills, copy) → then a scoped kickoff. Agents: prefer Plan/discussion; open gold `query-builder/08` + workout `08`/`09`.
2. **SHOW dropdown polish** — after author shape settles (or thin parallel if Nate says go). `op | field` halves as dropdowns; truncation; `availableFields`.
3. **Slice 3 totals** → **4** `saved_queries` (**ask first**) → **5** multi-Section / multi-WHERE compare / more dims.
4. **Identity conviction** — PG + Variations + muscles (+ tools + nest labels); Counts as (Phase 4)
5. **PG Counts as + Chat 6 (Phase 4)** — `natural_metric`; New User Seeds dump
6. **Exercise lock ↔ pills scroll** — builders
7. **Override chip grammar** — Sequence override notation
8. **Auth / landing UI** — restyle to current chrome
9. **Prod hardening** — email confirm / SMTP; key rotation; backups; never ship `service_role`

## Query builder direction (v2 — nest author / nest readout)

Insights is a **card hub**. **Dashboard** = fast unsaved. **Query builder** =
nest AST + workout-family **read** chrome + nest-shaped **author** (WHERE →
FOR → Insight). Full contract: [`Insights_Query_Builder.md`](./Insights_Query_Builder.md).
Gold: [`references/`](./references/).

- **In tree:** slices 1–2 read + 2.5→§11 author nest chrome + §12 A/B. Ephemeral. **Author feel unsigned-off** (Jul 23 pause — Nate rethinks before more chrome).
- **Protect:** locked outline / preview; Dashboard; no nest-shell-only un-park.
- **Save later:** `saved_queries` (**ask first**); nest JSON; author/read = views over same definition.
- **Dead / parked:** v1 flat Subject-card QB; nest-shell-only five-shell edit path.

## Parked

- **QB nest-shell-only authoring** — five Session-like edit shells as *the* edit path. §11 nest-*shaped* author is in tree and separate — still not that un-park.
- **Multi-WHERE side-by-side date-slice compare** — deferred to Slice 5. Prefer `+ Duplicate WHERE` / vertical stack when it lands; true side-by-side stays Phase 5 Compare in the proposal.
- v1 **Simple card stack / Power cube** (`measure × dimension × time`) — superseded by Saved Insight templates
- Dashboard **lens × metric** IA (Phase 1a layout — retired; fact loader evolved into Phase 2 query API)
- Home week calendar wired to session logs
- Starter exercise templates; in-app taxonomy / intensity user guide
- Optional Postgres `fn_denest_session_log` / `fn_renest_session_log`
- e1RM / ACWR / session-load / Challenge PRs; **derived facets** as advanced toggles
- PG-groups multi-axis (replace hard category enum)
- Rename DB `analytics_tags` → Variations (product term already Variations)
- EAS / prod Supabase / Play / privacy policy

## Backlog / flags (misc — Jul 22 brain dump)

Rough priority bands only; not sequenced against Phase 3. Ideas stay ideas until promoted to Next.

### Near / polish

- **Pull-to-refresh at top** — Insights overscroll refresh only today; decide intentional policy for all scroll screens (keep / remove / standardize)
- **Date picker day highlight** — selected day number not visually centered in the highlight circle
- **Copy pass (app-wide)** — de-AI / clarify text on cards and screens (voice: coach-plain, not marketing; see `AGENTS.md` voice rule)

### Product structure (medium)

- **QB SHOW dropdown polish** — after author feel rethink (or if Nate greenlights parallel)
- **Grouped taxonomy proposal (under review)** — three-tier drill-down **Group → Movement → Modifier**; second-agent review in [`Analytics_Labeling.md`](./Analytics_Labeling.md). **No `008` yet.** Half-step on Dashboard: category browse + Murph suggestion thicken. Full adopt only after Query builder feel / before Chat 6.
- **Taxonomy screens** — reorganize Account taxonomy for clarity
- **Library + Create IA** — revisit structure so both tabs read clearly
- **Account / profiles / preferences** — general Account + settings overhaul eventually
- **Logo, slogan, marketing basics** — brand kit + app icon / splash / in-app marks so stores and chrome aren’t placeholder
- **Themed loading spinner** — later; tie to logo/icon + dawn/dusk (ideate with marketing)

### Monetization / AI (later — optional paid; free must stay highly useful)

- **UI reframed for optional AI** — e.g. natural-language logging → structured log via user’s library; propose new exercises/labels with one-tap confirm/deny + notes; NLP → Insights SQL/ask same pattern. Always optional; paid access; core app valuable without AI
- **User tiers (ideas only)** — free = limited storage; paid storage tiers; AI tiers that bundle storage. Affordable; storage is the main free limiter; worth the money
- **Custom themes** — user color picker over token fields; plus a few more default themes as good as dawn/dusk
- **Agent skills (meta)** — quality commits; generate templates/logs; v0 NLP → SQL/log helpers

## Open questions

- Query builder **author feel (Jul 23 — blocking):** §11/§12 **in tree** but Nate says not where he wants. Pause more chrome until he clarifies (density, SPLIT, locks/pills, Insight vs workout dusk, copy). Then scoped kickoff. Contract §11–§12 + gold `query-builder/08`.
- Query builder **SHOW chips:** `op | field` → dropdown halves; truncation; `availableFields` — after feel rethink unless Nate says parallel.
- Query builder **nest JSON save shape** before `saved_queries`; date-bucket SPLIT; rolling vs pinned dates (slice 4).
- Dashboard lock/collapse — open if Dashboard ever grows lock
- Grouped taxonomy Group→Movement — under review; no `008`
- Credit-each vs partition for balance saved views
- Nest labels Wellness; builder pills-scroll mirror; Chat 6; pricing; pull-to-refresh; brand timing

Dashboard lean locks applied; QB **through §11 + §12 A/B in tree**. **Next: author feel rethink → SHOW polish → totals (3) → `saved_queries` (4, ask first).** Refs: [`references/query-builder/`](./references/query-builder/).
