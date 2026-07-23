# OttoLog Status (living)

> Edit this file when a phase closes. Canonical design still lives in the docs
> linked below — this file is the ops/planning board only.

## Canonical docs (do not paste wholesale)

- [`Setup.md`](./Setup.md), [`Project_Structure.md`](./Project_Structure.md), [`Database_Outline.md`](./Database_Outline.md), [`Template_Builders.md`](./Template_Builders.md), [`Styling.md`](./Styling.md), [`Label_Library.md`](./Label_Library.md), [`New_User_Seeds.md`](./New_User_Seeds.md), [`Analytics_Labeling.md`](./Analytics_Labeling.md)
- Insights: [`Analytics_Overhaul_Proposal.md`](./Analytics_Overhaul_Proposal.md) (product board) + [`Insights_Query_Builder.md`](./Insights_Query_Builder.md) (Query builder nest contract) + [`references/workout-builder/`](./references/workout-builder/) (UI gold)

## Current baseline

- Stack / greenfield path: `sql/greenfield/001`–`007` (facts view in `007`; no `008`)
- Live smoke DB: **OttoLog** Supabase (greenfield; email/password; confirm-email OFF for smoke)
- App: Insights is now a **card hub** (like Library / Create) → **Dashboard** (the shipped PG-first facet readout; fast, not saved) + **Query builder** (v2 **nest skeleton shipped**: Query → Section → Breakdown → Subject → Measure, ephemeral). **Next:** chrome/feel parity with workout nest (reuse `layer` accents by depth), then lock/preview + save. Nest contract: [`Insights_Query_Builder.md`](./Insights_Query_Builder.md). UI gold: [`references/workout-builder/`](./references/workout-builder/)
- **Analytics direction (locked, Jul 22 reframe):** Insights = **two tools**. **Dashboard** = quick unsaved PG/facet look. **Query builder** = the real product bet: a **nested query form** that mirrors the log/template builders — collapsing dropdowns per layer, lockability + grammar-condensed locked view + preview modal, and **savable/reusable** asks (save like a template, reopen to the OPEN + locked clean view). See [`Analytics_Overhaul_Proposal.md`](./Analytics_Overhaul_Proposal.md). v1 Hybrid/cube doc archived under `docs/deprecated/`
- Seeds: `sql/seeds/murph_personal_seed.sql` applied on `n8.perry` (personal smoke only; not Chat 6)
- Living board: this file (linked from AGENTS / README / Project_Structure)

## Shipped recently (newest first)

- **UI reference galleries + QB feel overturn (Jul 22 evening)** — Added `docs/references/` with workout-builder gold shots (Murph Session: locked outline, preview p1/p2, mixed collapse, unlocked exercise, More, add cascade) + pool/optionals + `pool-query-insights/001.jpg` (QB open “before”). **Decision 12 overturned:** QB should match workout nest **structure/feel** (same `layer`/`override` accents by depth); content inside nodes stays analytics. Cool `queryLayer` was provisional in slice 1 — replace in slice 1.5. Contract + Styling + agent rules/skill updated.
- **Insights Query builder — v2 slice 1: nest skeleton (Jul 22)** — scrapped the flat shell and rebuilt `InsightsQueryBuilderScreen` as the real nest: **Query → Section → (optional) Breakdown → Subject → Measure**, mirroring log/template builder **geometry** (provisional cool `queryLayer` — superseded by feel overturn above). New code under `src/components/querybuilder/` (`Qb*`). Defaults per §6. Client-side aggregate over `v_log_set_facts` via `loadQueryFacts` + `engine.ts`. Ephemeral. **No lock/preview, no save/`saved_queries`, no migration.** Dashboard + hub untouched. Contract: [`Insights_Query_Builder.md`](./Insights_Query_Builder.md) §9.
- **Insights Query builder — v2 layer model signed off (Jul 22)** — **overturned the v1 flat design.** New contract: Query builder mirrors log/template builders — Query → Section → Breakdown → Subject → Measure (= Session → Block → Sequence → Exercise → Set); ops at Measure leaf; one auto Section; Breakdown wraps Subjects (no nesting); dims variation/tool; client-side aggregate; `Qb*` + cool palette; saved artifact = **Query**. Full contract: [`Insights_Query_Builder.md`](./Insights_Query_Builder.md).
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

1. **Insights Query builder — slice 1.5 chrome/feel parity, then 2+ (lock/preview, save)** — Nest skeleton shipped (ephemeral). **Next: 1.5** — structure/feel match workout gold shots (`docs/references/workout-builder/`): reuse `layer`/`override`/set-chip by depth; CoordRow DNA (lock control, More/trailing, label-first where it fits); keep analytics content. Then **slice 2** lock + preview → totals (3) → `saved_queries` (4 — **ask before migrating**) → multi-Section/dims/ops (5; date-bucket after lock/save). Contract: [`Insights_Query_Builder.md`](./Insights_Query_Builder.md) §9. Dashboard stays the fast unsaved look.
2. **Identity conviction** — PG + Variations + muscles (+ tools + nest labels); category stays PG metadata for balance **saved views**; Counts as = default facet (Phase 4)
3. **PG Counts as + Chat 6 (Phase 4)** — `natural_metric` on PGs; Account edit; New User Seeds dump
4. **Exercise lock ↔ pills scroll** — exercise form correctly hides the pills scroller when lock=ON and dropdown=OPEN, and shows it when lock=OFF or lock=ON + dropdown=COLLAPSED. Explore mirror on Sequence / Block / Session builders
5. **Override chip grammar** — revisit sequence override notation (e.g. `R16-20 → BW` is opaque/cluttered); **Insights Phase 3 may borrow the same collapsed-row grammar pattern** (conceptually — override notation itself still needs overhaul)
6. **Auth / landing UI** — restyle landing, sign-in, and create-account screens to match current [`Styling.md`](./Styling.md) / app chrome
7. **Prod hardening (when keeping OttoLog)** — Auth email confirm / SMTP; key rotation; backups / PITR; never ship `service_role` in app

## Query builder direction (v2 — pick up at slice 1.5)

Insights is a **card hub**. Per-PG cards + soft suggestions shipped as the
**Dashboard** (fast, unsaved). The **Query builder** is a **nested** builder that
mirrors the log/template builders — **Query → Section → Breakdown → Subject →
Measure**, ops at the Measure leaf (op × field), own `Qb*` chrome. **Structure/feel
≈ workout nest** (same `layer` accents by depth); content inside differs.
Full nest contract: [`Insights_Query_Builder.md`](./Insights_Query_Builder.md).
Gold shots: [`references/workout-builder/`](./references/workout-builder/).

- **Shipped:** slice 1 nest skeleton (ephemeral; provisional cool palette). **Next:** 1.5 chrome/feel parity → 2 lock + preview → totals → save/reopen (`saved_queries`, **ask first**) → multi-Section + more dims/ops + seeds (date-bucket after lock/save).
- **Save ≈ templates/logs (later):** nameable + notes; reopen → OPEN + locked clean view; re-run live (rolling) or historic (pinned window).
- **v1 flat Subject-card QB is dead** — do not rebuild it. Dashboard keeps category browse + per-PG soft suggestions as the quick path.

## Parked

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

- Query builder: **v2 layer model signed off** ([`Insights_Query_Builder.md`](./Insights_Query_Builder.md) §8) — nest depth locked. **Palette/feel (Decision 12) overturned Jul 22 evening:** reuse workout `layer`/`override` by depth; cool `queryLayer` was provisional. Non-blocking open items in doc §10 (extra breakdown dims, empty-Measure display, add affordances when locked).
- Query builder: dynamic date presets (last 7 / last 28 / this week / custom fixed range) — rolling vs pinned lives in the saved definition (slice 4)
- Dashboard lock/collapse grammar — still open if Dashboard ever grows lock; today it stays unlocked/fast
- Grouped taxonomy (Group → Movement → Modifier): Option A vs B; enforced vs soft modifier scoping? See [`Analytics_Labeling.md`](./Analytics_Labeling.md) proposal
- Credit-each vs partition for balance **saved views** (credit-each default under the hood today)
- Nest labels: **Wellness** block vs session vs both? ([`New_User_Seeds.md`](./New_User_Seeds.md))
- Builder chrome: mirror exercise lock/dropdown pills-scroll on Sequence / Block / Session?
- When to retire live deprecated `001`–`019` project in favor of greenfield-only
- Chat 6: SQL-only seeds vs Account first-run UX
- Pricing: free storage cap; storage-only vs AI+storage bundles; what AI features ship first
- Pull-to-refresh: global rule vs per-tab
- Brand: logo / slogan / icon timing vs Auth landing restyle

Dashboard (Phases 2–3a) lean locks applied; Query builder **v2 slice 1 nest skeleton shipped** ([`Insights_Query_Builder.md`](./Insights_Query_Builder.md), Jul 22) — ephemeral; cool palette provisional. **Next: slice 1.5 chrome/feel parity** (workout gold shots), then slice 2 lock + preview; `saved_queries` is slice 4 (ask before that migration). Refs: `docs/references/workout-builder/`.

