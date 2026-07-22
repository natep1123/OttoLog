# OttoLog Status (living)

> Edit this file when a phase closes. Canonical design still lives in the docs
> linked below — this file is the ops/planning board only.

## Canonical docs (do not paste wholesale)

- [`Setup.md`](./Setup.md), [`Project_Structure.md`](./Project_Structure.md), [`Database_Outline.md`](./Database_Outline.md), [`Template_Builders.md`](./Template_Builders.md), [`Styling.md`](./Styling.md), [`Label_Library.md`](./Label_Library.md), [`New_User_Seeds.md`](./New_User_Seeds.md), [`Analytics_Labeling.md`](./Analytics_Labeling.md)

## Current baseline

- Stack / greenfield path: `sql/greenfield/001`–`007` (facts view in `007`; no `008`)
- Live smoke DB: **OttoLog** Supabase (greenfield; email/password; confirm-email OFF for smoke)
- App: Insights **Phase 2** query builder MVP shipped (PG-first draft form; 1a dashboard chrome retired)
- **Analytics direction (locked):** PG-first **query builder** + Saved Insight templates + lock grammar — see [`Analytics_Overhaul_Proposal.md`](./Analytics_Overhaul_Proposal.md). v1 Hybrid/cube doc archived under `docs/deprecated/`
- Seeds: `sql/seeds/murph_personal_seed.sql` applied on `n8.perry` (personal smoke only; not Chat 6)
- Living board: this file (linked from AGENTS / README / Project_Structure)

## Shipped recently (newest first)

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

1. **Insights Phase 3 — Saved Insights + builder-parity lock** — ideate then implement. Nate Phase 2 feel: “ton better”; lean harder into template/log builder DNA. See proposal §5–6 + §9 Phase 3 + §11 (Jul 22 notes).
2. **Identity conviction** — PG + Variations + muscles (+ tools + nest labels); category stays PG metadata for balance **saved views**; Counts as = default facet (Phase 4)
3. **PG Counts as + Chat 6 (Phase 4)** — `natural_metric` on PGs; Account edit; New User Seeds dump
4. **Exercise lock ↔ pills scroll** — exercise form correctly hides the pills scroller when lock=ON and dropdown=OPEN, and shows it when lock=OFF or lock=ON + dropdown=COLLAPSED. Explore mirror on Sequence / Block / Session builders
5. **Override chip grammar** — revisit sequence override notation (e.g. `R16-20 → BW` is opaque/cluttered); **Insights Phase 3 may borrow the same collapsed-row grammar pattern** (conceptually — override notation itself still needs overhaul)
6. **Auth / landing UI** — restyle landing, sign-in, and create-account screens to match current [`Styling.md`](./Styling.md) / app chrome
7. **Prod hardening (when keeping OttoLog)** — Auth email confirm / SMTP; key rotation; backups / PITR; never ship `service_role` in app

## Phase 2 feel → Phase 3 ideation (Nate, Jul 22 — pick up here)

Directionally locked for tomorrow’s design pass (not implemented yet):

- **Builder family:** Insights should feel like Session/Block/Sequence/Exercise builders — same product family, not a one-off analytics form.
- **Saved queries ≈ templates/logs:** nameable + notes; reopen autopopulates form state; re-run live against current facts (or historic if dates are fixed). Elegant picker / “form card” list to open a saved query (Library-like).
- **Dynamic vs static windows:** e.g. “Pullups last 7 days” (rolling) vs “Pullups week of June 13” (pinned range) — date config is part of the saved definition.
- **Lock = chef’s-kiss grammar:** locked UI should mirror Locked Preview as closely as possible — clean converted outline of what the query asked for + results; unlock → editable form.
- **Per-PG scope rows (override analogy):** selecting a Primary Group spawns a **per-PG card** (open/editable). Identity filters (variations / tools / …) apply **to that PG only**. On save/collapse → compact grammar row of the ask (same *concept* as sequence override rows like `R16-20`, even though that chip notation will be overhauled later). Shared nest/date scope can stay query-level.
- **Mental model:** query form as an autoformatter in front of the fact/`v_log_set_facts` engine — users author readable asks; engine returns facets.

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

- Phase 3: exact chrome for per-PG cards (NestedLayer-lite vs flat Disclosure vs override-row pattern) — reuse Locked Preview *feel*, not full nest tree
- Phase 3: which filters are **per-PG** vs **query-global** (nest labels / dates / warmups likely global; variations/tools likely per-PG)
- Phase 3: dynamic date presets vocabulary (last 7 / last 28 / this week / custom fixed range)
- Phase 3: Insights home = blank draft vs saved-list first vs picker-above-draft
- Credit-each vs partition for balance **saved views** (credit-each default under the hood today)
- Nest labels: **Wellness** block vs session vs both? ([`New_User_Seeds.md`](./New_User_Seeds.md))
- Builder chrome: mirror exercise lock/dropdown pills-scroll on Sequence / Block / Session?
- When to retire live deprecated `001`–`019` project in favor of greenfield-only
- Chat 6: SQL-only seeds vs Account first-run UX
- Pricing: free storage cap; storage-only vs AI+storage bundles; what AI features ship first
- Pull-to-refresh: global rule vs per-tab
- Brand: logo / slogan / icon timing vs Auth landing restyle

Phase 2 lean locks (proposal §11) applied in MVP; Phase 3 expands builder parity per Jul 22 feel notes.
