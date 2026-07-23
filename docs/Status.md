# OttoLog Status (living)

> Edit this file when a phase closes. Canonical design still lives in the docs
> linked below — this file is the ops/planning board only.

## Canonical docs (do not paste wholesale)

- [`Setup.md`](./Setup.md), [`Project_Structure.md`](./Project_Structure.md), [`Database_Outline.md`](./Database_Outline.md), [`Template_Builders.md`](./Template_Builders.md), [`Styling.md`](./Styling.md), [`Label_Library.md`](./Label_Library.md), [`New_User_Seeds.md`](./New_User_Seeds.md), [`Analytics_Labeling.md`](./Analytics_Labeling.md)
- Insights: [`Analytics_Overhaul_Proposal.md`](./Analytics_Overhaul_Proposal.md) (product board) + [`Insights_Query_Builder.md`](./Insights_Query_Builder.md) (nest contract) + [`references/`](./references/) (UI gold) + [`README.md`](./README.md) (docs index)

## Current baseline

- Stack / greenfield path: `sql/greenfield/001`–`007` (facts view in `007`; no `008`)
- Live smoke DB: **OttoLog** Supabase (greenfield; email/password; confirm-email OFF for smoke)
- App: Insights is now a **card hub** (like Library / Create) → **Dashboard** (fast unsaved PG facets) + **Query builder** (v2 nest AST + 1.5 warm chrome + slice 2 lock + **2.5 madlib** + **author polish A–G**; ephemeral). **Author/read split live.** **Next:** decide SPLIT/WITH overlap UX + SHOW dropdowns + optional Subject lock → totals (3) → `saved_queries` (4 — **ask first**). Contract: [`Insights_Query_Builder.md`](./Insights_Query_Builder.md). UI gold: [`references/query-builder/`](./references/query-builder/)
- **Analytics direction (locked, Jul 22; authoring updated same evening):** Insights = **two tools**. **Dashboard** = quick unsaved PG/facet look. **Query builder** = structured, eventually savable ask — **madlib author** + **locked nest outline** (workout chrome family for read/share). Nest AST + client engine stay. See [`Analytics_Overhaul_Proposal.md`](./Analytics_Overhaul_Proposal.md) + [`Insights_Query_Builder.md`](./Insights_Query_Builder.md). v1 Hybrid/cube doc archived under `docs/deprecated/`
- Seeds: `sql/seeds/murph_personal_seed.sql` applied on `n8.perry` (personal smoke only; not Chat 6)
- Living board: this file (linked from AGENTS / README / Project_Structure)

## Shipped recently (newest first)

- **Insights Query builder — madlib author polish A–G (Jul 23, ephemeral)** — Progressive empty (FOR first); SHOW as `op | field` chips (tap-cycle); WITH collapsed chip; live SPLIT groups behind disclosure; locked outline soft-hides “Section”; date pill hidden unlocked+expanded. Gold refreshed: [`references/query-builder/`](./references/query-builder/) (`01` locked, `06` SHOW+SPLIT, `07` measure rail). Early 2.5 shots → [`references/archive/query-madlib-2.5-early/`](./references/archive/query-madlib-2.5-early/). **Open dogfood:** Subject lock?, SHOW halves as dropdowns (not tap-cycle), SPLIT flat partition vs WITH-filter + overlap / within-flavor splits (no new PGs; credit-each stays).
- **Insights Query builder — slice 2.5 madlib authoring spike (Jul 23, ephemeral)** — Unlocked author = Query frame (**IN** presets + **WHERE** summary/expand) + Subject clause-blocks (**FOR** / **WITH** / **SHOW** / optional **SPLIT**). Section collapsed in author UI; whole-ask Query lock only. Maps to existing nest AST; locked branch + `qbOutline` / preview protected. Nest-shell author cards kept unused (fallback). No `008` / save. Contract: [`Insights_Query_Builder.md`](./Insights_Query_Builder.md).
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

1. **Insights Query builder — SPLIT/WITH product pass → SHOW dropdowns → optional Subject lock → slice 3 totals** — Dogfood says flat “for each variation” is wrong mental model; need filter + overlap / within-flavor splits without separate PGs. Then polish SHOW to dropdowns; decide per-Subject lock. Then **slice 3** totals → **4** `saved_queries` (**ask first**) → **5**. Contract §10 + [`references/query-builder/`](./references/query-builder/). Dashboard stays fast/unsaved.
2. **Identity conviction** — PG + Variations + muscles (+ tools + nest labels); category stays PG metadata for balance **saved views**; Counts as = default facet (Phase 4)
3. **PG Counts as + Chat 6 (Phase 4)** — `natural_metric` on PGs; Account edit; New User Seeds dump
4. **Exercise lock ↔ pills scroll** — exercise form correctly hides the pills scroller when lock=ON and dropdown=OPEN, and shows it when lock=OFF or lock=ON + dropdown=COLLAPSED. Explore mirror on Sequence / Block / Session builders
5. **Override chip grammar** — revisit sequence override notation (e.g. `R16-20 → BW` is opaque/cluttered); **Insights Phase 3 may borrow the same collapsed-row grammar pattern** (conceptually — override notation itself still needs overhaul)
6. **Auth / landing UI** — restyle landing, sign-in, and create-account screens to match current [`Styling.md`](./Styling.md) / app chrome
7. **Prod hardening (when keeping OttoLog)** — Auth email confirm / SMTP; key rotation; backups / PITR; never ship `service_role` in app

## Query builder direction (v2 — madlib author / nest readout)

Insights is a **card hub**. Per-PG cards + soft suggestions shipped as the
**Dashboard** (fast, unsaved). The **Query builder** keeps a **nest AST**
(Query → Section → Breakdown → Subject → Measure) and **workout-family read
chrome** (rails, lock look, LockedOutline, preview, warm accents). **Authoring**
is **madlib / clause compose** (not five Session-like edit shells). Full contract:
[`Insights_Query_Builder.md`](./Insights_Query_Builder.md).
Gold shots: [`references/workout-builder/`](./references/workout-builder/) + [`references/query-builder/`](./references/query-builder/). Docs index: [`README.md`](./README.md).

- **Shipped:** slices 1 nest + 1.5 chrome/feel + **2 lock** + **2.5 madlib** + **author polish A–G** (ephemeral). **Next:** SPLIT/WITH overlap UX (product) → SHOW dropdowns / Subject lock → totals (3) → save (`saved_queries`, **ask first**) → multi-Section + more dims/ops + seeds.
- **Save ≈ templates/logs (later):** nameable + notes; reopen → OPEN + locked clean view; re-run live (rolling) or historic (pinned window). Prefer nest JSON behind madlib view.
- **v1 flat Subject-card QB is dead** — do not rebuild it. **Nest-shell-only authoring is parked** — do not keep forcing it as the main bet. Dashboard keeps category browse + per-PG soft suggestions as the quick path.

## Parked

- **QB nest-shell-only authoring** — forcing Query→Section→Breakdown→Subject→Measure as the *edit* path; superseded by madlib author / nest readout (softened nest = fallback only if spike fails)
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

- Query builder **SPLIT / WITH identity (Jul 23 dogfood — open):** Flat `GROUP BY variation` (Running vs Weighted vs Walking vs Incline as peer buckets) does **not** match Nate’s ask. Want: (1) WITH filters to chosen variations only; (2) metrics for a flavor alone (`Gait → Running`); (3) overlap / co-tagged sets (`Gait → Incline∩Walking`) without inventing separate PGs for Running/Walking; (4) optional split *within* a filtered flavor. Credit-each / multi-tag facts stay — UI + grouping semantics are the gap. Venn / diagram dashboards = later, not v1. See [`Insights_Query_Builder.md`](./Insights_Query_Builder.md) §10 + [`Analytics_Labeling.md`](./Analytics_Labeling.md) credit-each.
- Query builder **SHOW chips:** keep `op | field` visual; prefer **dropdown selectors** per half instead of tap-to-cycle.
- Query builder **Subject / exercise lock:** madlib whole-ask Query lock only today — restore optional per-Subject lock?
- Query builder madlib §10 polish **decided (Jul 23):** progressive empty; SHOW chip sentence; WITH collapsed; live SPLIT behind disclosure; soft-hide Section title; date pill rules — see contract. Still open: nest JSON save shape; date-bucket SPLIT; measure `availableFields` wiring.
- Query builder: IN presets shipped; rolling vs pinned date semantics live in saved definition (slice 4)
- Dashboard lock/collapse grammar — still open if Dashboard ever grows lock; today it stays unlocked/fast
- Grouped taxonomy (Group → Movement → Modifier): Option A vs B; enforced vs soft modifier scoping? See [`Analytics_Labeling.md`](./Analytics_Labeling.md) proposal
- Credit-each vs partition for balance **saved views** (credit-each default under the hood today) — related to SPLIT dogfood above
- Nest labels: **Wellness** block vs session vs both? ([`New_User_Seeds.md`](./New_User_Seeds.md))
- Builder chrome: mirror exercise lock/dropdown pills-scroll on Sequence / Block / Session?
- When to retire live deprecated `001`–`019` project in favor of greenfield-only
- Chat 6: SQL-only seeds vs Account first-run UX
- Pricing: free storage cap; storage-only vs AI+storage bundles; what AI features ship first
- Pull-to-refresh: global rule vs per-tab
- Brand: logo / slogan / icon timing vs Auth landing restyle

Dashboard (Phases 2–3a) lean locks applied; Query builder **slices 1 + 1.5 + 2 + 2.5 + author polish in tree** ([`Insights_Query_Builder.md`](./Insights_Query_Builder.md)) — still ephemeral. **Next: SPLIT/WITH product → SHOW dropdowns → totals (3) → `saved_queries` (4, ask first).** Refs: [`references/query-builder/`](./references/query-builder/).

