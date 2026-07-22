# OttoLog Status (living)

> Edit this file when a phase closes. Canonical design still lives in the docs
> linked below — this file is the ops/planning board only.

## Canonical docs (do not paste wholesale)

- [`Setup.md`](./Setup.md), [`Project_Structure.md`](./Project_Structure.md), [`Database_Outline.md`](./Database_Outline.md), [`Template_Builders.md`](./Template_Builders.md), [`Styling.md`](./Styling.md), [`Label_Library.md`](./Label_Library.md), [`New_User_Seeds.md`](./New_User_Seeds.md), [`Analytics_Labeling.md`](./Analytics_Labeling.md)

## Current baseline

- Stack / greenfield path: `sql/greenfield/001`–`007` (facts view in `007`; no `008`)
- Live smoke DB: **OttoLog** Supabase (greenfield; email/password; confirm-email OFF for smoke)
- App: Insights is now a **card hub** (like Library / Create) → **Dashboard** (the shipped PG-first facet readout; fast, not saved) + **Query builder** (placeholder for the nested, savable, lockable builder now in progress)
- **Analytics direction (locked, Jul 22 reframe):** Insights = **two tools**. **Dashboard** = quick unsaved PG/facet look. **Query builder** = the real product bet: a **nested query form** that mirrors the log/template builders — collapsing dropdowns per layer, lockability + grammar-condensed locked view + preview modal, and **savable/reusable** asks (save like a template, reopen to the OPEN + locked clean view). See [`Analytics_Overhaul_Proposal.md`](./Analytics_Overhaul_Proposal.md). v1 Hybrid/cube doc archived under `docs/deprecated/`
- Seeds: `sql/seeds/murph_personal_seed.sql` applied on `n8.perry` (personal smoke only; not Chat 6)
- Living board: this file (linked from AGENTS / README / Project_Structure)

## Shipped recently (newest first)

- **Insights reframed to a card hub (Jul 22)** — Insights tab is now a hub (`InsightsHubScreen`) like Library / Create, with two cards: **Query builder** (placeholder screen, "Building" badge) and **Dashboard** (the per-PG facet UI we've built so far). Routing added via `InsightsStack` in `HomeScreen.tsx` (hub / dashboard / queryBuilder; resets on tab-leave + brand tap). Old `InsightsScreen.tsx` → `InsightsDashboardScreen.tsx` (header now "Dashboard", `onBack`). **Saving is not on the Dashboard** — it's a fast look. The nested savable/lockable builder lives behind the Query builder card (placeholder for now). Direction shift: the earlier "per-PG cards = Phase 3" plan is now the **Dashboard**; the real Phase 3 is the nested query builder.
- **Insights Phase 3 slice A (per-PG scope cards)** — *(now the Dashboard)* selecting Primary Groups spawns one editable card per PG. Each card holds its own Variations + Tools pickers (scoped to that PG only, soft — never enforced) above that PG's facet results. Variations picker wires `suggestedIds` from `listPrimaryGroupSuggestedTagIds(pgId)` (Show all still reaches the full pool). `InsightQuery` identity filters are now per-PG maps (`variationIdsByPg` / `toolIdsByPg`); aggregation applies each PG's filters to its own panel (credit-each unchanged). Nest labels + set type + dates + Working/warmups stay query-global in the Scope disclosure. Single global Variations/Tools filters removed (no rival UI). Category browse chips unchanged. No `008`. **Saved Insights + lock = slice B (not started; ask before `saved_insights` migration).**
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

1. **Insights Query builder — nested, savable, lockable** — build out the Query builder card (currently a placeholder). **Nesting design contract:** [`Insights_Query_Builder.md`](./Insights_Query_Builder.md) (bottom-up layer model + DNA reuse + slices) — read before any UI work. Mirror the log/template builder *DNA* (collapse / lock → grammar / preview / save-reopen) but **not** the 4-level tree: Insights nests by **subject** (PG) with facet leaves, nest labels as filters, and one optional Group level. Save/list/rename/delete reusable asks (`saved_insights` — **ask before migrating**); reopen → dropdown=OPEN + lock=TRUE clean view; per-subject split (variations / tools / loads) + totals line. Capability first (slices in the contract §9), then polish. Dashboard stays the fast unsaved look. See proposal §5–6 + §9 Phase 3b.
2. **Identity conviction** — PG + Variations + muscles (+ tools + nest labels); category stays PG metadata for balance **saved views**; Counts as = default facet (Phase 4)
3. **PG Counts as + Chat 6 (Phase 4)** — `natural_metric` on PGs; Account edit; New User Seeds dump
4. **Exercise lock ↔ pills scroll** — exercise form correctly hides the pills scroller when lock=ON and dropdown=OPEN, and shows it when lock=OFF or lock=ON + dropdown=COLLAPSED. Explore mirror on Sequence / Block / Session builders
5. **Override chip grammar** — revisit sequence override notation (e.g. `R16-20 → BW` is opaque/cluttered); **Insights Phase 3 may borrow the same collapsed-row grammar pattern** (conceptually — override notation itself still needs overhaul)
6. **Auth / landing UI** — restyle landing, sign-in, and create-account screens to match current [`Styling.md`](./Styling.md) / app chrome
7. **Prod hardening (when keeping OttoLog)** — Auth email confirm / SMTP; key rotation; backups / PITR; never ship `service_role` in app

## Query builder direction (Jul 22 reframe — pick up here next session)

Insights is a **card hub**. Per-PG cards + soft suggestions shipped as the
**Dashboard** (fast, unsaved). Next work is the **Query builder** screen.
**Design contract now written:** [`Insights_Query_Builder.md`](./Insights_Query_Builder.md)
(layer model facet → subject → body/groups → query-global → ask; DNA reuse map;
`SavedInsightDefinition` shape; slices 0–5). Summary:

- **Builder family:** nested collapsing dropdowns per layer — same product family as Session/Block/Sequence/Exercise builders, not a one-off analytics form.
- **Save ≈ templates/logs:** nameable + notes; reopen → OPEN + locked clean view; re-run live (or historic if dates pinned).
- **Dynamic vs static windows:** e.g. “Pullups last 7 days” (rolling) vs “Pullups week of June 13” (pinned) — part of the saved definition.
- **Lock per layer:** grammar-condensed line when locked; expand to edit; preview modal = Locked Preview family.
- **Per-exercise breakdown:** modifiers / loads / variations across the data, then a totals line.
- **Capability first**, friendliness after.
- Dashboard keeps category browse + per-PG soft suggestions as the quick path.

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

- Query builder: nesting design **signed off** ([`Insights_Query_Builder.md`](./Insights_Query_Builder.md) §8, Jul 22) — flat subjects + one Group level; split-by = variation/tool; global-only nest scope + set policy; ops = sum / load avg / count; saved-list home → OPEN+locked, blank via "New ask"; group rollup credit-each (partition later); full-tree lock; `saved_insights` at slice 4 (ask before migrating). No open sub-questions blocking slice 1.
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

Dashboard (Phases 2–3a) lean locks applied; Query builder **design signed off** ([`Insights_Query_Builder.md`](./Insights_Query_Builder.md) §8, Jul 22) — **cleared for slice 1** (builder shell, no persistence) in a fresh chat. Build order 1→2→3 before any save; groups + `saved_insights` are slice 4–5 (ask before that migration).

