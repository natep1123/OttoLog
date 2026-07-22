# OttoLog Status (living)

> Edit this file when a phase closes. Canonical design still lives in the docs
> linked below — this file is the ops/planning board only.

## Canonical docs (do not paste wholesale)

- [`Setup.md`](./Setup.md), [`Project_Structure.md`](./Project_Structure.md), [`Database_Outline.md`](./Database_Outline.md), [`Template_Builders.md`](./Template_Builders.md), [`Styling.md`](./Styling.md), [`Label_Library.md`](./Label_Library.md), [`New_User_Seeds.md`](./New_User_Seeds.md), [`Analytics_Labeling.md`](./Analytics_Labeling.md)

## Current baseline

- Stack / greenfield path: `sql/greenfield/001`–`007` (facts view in `007`; no `008`)
- Live smoke DB: **OttoLog** Supabase (greenfield; email/password; confirm-email OFF for smoke)
- App: Insights **Phase 1a** shipped (metric-aware dashboard — **interim IA**, not destination)
- **Analytics direction (locked):** PG-first **query builder** + Saved Insight templates + lock grammar — see [`Analytics_Overhaul_Proposal.md`](./Analytics_Overhaul_Proposal.md). v1 Hybrid/cube doc archived under `docs/deprecated/`
- Seeds: `sql/seeds/murph_personal_seed.sql` applied on `n8.perry` (personal smoke only; not Chat 6)
- Living board: this file (linked from AGENTS / README / Project_Structure)

## Shipped recently (newest first)

- **Insights Phase 1a (substrate)** — `v_log_set_facts`; metric selector + Auto; date pickers (last 7); filters sheet; Working-only + warmups; data-only balance. **UI to be replaced** by query builder (Phase 2)
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

1. **Insights query builder MVP (Phase 2)** — PG multiselect first; per-PG **shape-driven facets** (reps / time / distance / load as logged); nest scope filters; date window. Murph feel-test. See [`Analytics_Overhaul_Proposal.md`](./Analytics_Overhaul_Proposal.md) §9
2. **Saved Insights + lock (Phase 3)** — persist query templates; live re-run; lock → paginated result grammar (screenshot/share)
3. **Identity conviction** — PG + Variations + muscles (+ tools + nest labels); category stays PG metadata for balance **saved views**; Counts as = default facet (Phase 4)
4. **PG Counts as + Chat 6 (Phase 4)** — `natural_metric` on PGs; Account edit; New User Seeds dump — blocked until Phase 2 feel accepted
5. **Exercise lock ↔ pills scroll** — exercise form correctly hides the pills scroller when lock=ON and dropdown=OPEN, and shows it when lock=OFF or lock=ON + dropdown=COLLAPSED. Explore mirror on Sequence / Block / Session builders
6. **Override chip grammar** — revisit sequence override notation (e.g. `R16-20 → BW` is opaque/cluttered)
7. **Auth / landing UI** — restyle landing, sign-in, and create-account screens to match current [`Styling.md`](./Styling.md) / app chrome
8. **Prod hardening (when keeping OttoLog)** — Auth email confirm / SMTP; key rotation; backups / PITR; never ship `service_role` in app

## Parked

- v1 **Simple card stack / Power cube** (`measure × dimension × time`) — superseded by Saved Insight templates
- Dashboard **lens × metric** IA (Phase 1a layout — keep fact loader, replace chrome)
- Home week calendar wired to session logs
- Starter exercise templates; in-app taxonomy / intensity user guide
- Optional Postgres `fn_denest_session_log` / `fn_renest_session_log`
- e1RM / ACWR / session-load / Challenge PRs; **derived facets** as advanced toggles
- PG-groups multi-axis (replace hard category enum)
- Rename DB `analytics_tags` → Variations (product term already Variations)
- EAS / prod Supabase / Play / privacy policy

## Open questions

- Credit-each vs partition for balance **saved views** (credit-each default under the hood today)
- Nest labels: **Wellness** block vs session vs both? ([`New_User_Seeds.md`](./New_User_Seeds.md)) — not a Phase 2 blocker
- Builder chrome: mirror exercise lock/dropdown pills-scroll on Sequence / Block / Session?
- When to retire live deprecated `001`–`019` project in favor of greenfield-only
- Chat 6: SQL-only seeds vs Account first-run UX

Phase 2 lean locks (also in proposal §11): stacked multi-PG panels; load facet without tonnage; draft form as home; keep category enum; replace 1a in place.