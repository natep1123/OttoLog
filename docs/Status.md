# OttoLog Status (living)

> Edit this file when a phase closes. Canonical design still lives in the docs
> linked below — this file is the ops/planning board only.

## Canonical docs (do not paste wholesale)

- [`Setup.md`](./Setup.md), [`Project_Structure.md`](./Project_Structure.md), [`Database_Outline.md`](./Database_Outline.md), [`Template_Builders.md`](./Template_Builders.md), [`Styling.md`](./Styling.md), [`Label_Library.md`](./Label_Library.md), [`New_User_Seeds.md`](./New_User_Seeds.md), [`Analytics_Labeling.md`](./Analytics_Labeling.md)

## Current baseline

- Stack / greenfield path: `sql/greenfield/001`–`007` (facts view in `007`; no `008`)
- Live smoke DB: **OttoLog** Supabase (greenfield; email/password; confirm-email OFF for smoke)
- App: Insights lenses + credit rule; denest variation / intensity / category
- Seeds: `sql/seeds/murph_personal_seed.sql` applied on `n8.perry` (personal smoke only; not Chat 6)
- Living board: this file (linked from AGENTS / README / Project_Structure)

## Shipped recently (newest first)

- **Greenfield smoke on OttoLog** — `001`–`007`, sentinels, signup/`n8.perry`, nest+muscle defaults, Murph seed, Insights has PG-category volume; patched missing `public.users` GRANTs in `001` (needed when auto-expose is OFF)
- Living `Status.md` ops board + docs sync after greenfield Insights
- Fold Insights helpers + `v_log_set_facts` into greenfield `007`; drop standalone `008`
- Murph personal smoke seed (`sql/seeds/`) — one-account library + completed log
- Insights lenses for nest grains (session / block / sequence labels) + credit-each rule
- Greenfield Insights cutover: PG `category`, log variation links, `set_type` / `intensity`, `track_intensity`
- Variations product vocab locked; New User Seeds catalog as the seed contract
- Agent map (AGENTS / `.cursor` rules + skills) + `sql/deprecated/` historical split

## Next (priority order)

1. **Insights product rethink** — *in progress: see [`Analytics_Overhaul_Proposal.md`](./Analytics_Overhaul_Proposal.md) (audit + 4 approaches + recommendation D).* Direction lean: keep PG + Variations + muscles; metric-aware Insights; **PG taxonomy analytics settings** (“Counts as” natural metric, like Rest/`is_empty`) taught by quality seeds — complexity on vocabulary, not every log. Phase **1a** = feel pass on current schema (heuristic metric); Phase **1b/2** = persist settings on PGs + Chat 6 seeds wire them.
2. **Identity conviction** — *in progress: see [`Analytics_Overhaul_Proposal.md`](./Analytics_Overhaul_Proposal.md).* confirm PG + Variations + muscles (+ tools + nest-label grains); nest-label placement (e.g. **Wellness** block vs session); natural-metric / balance-group settings as the user-facing control surface
3. **Insights Phase 1a (feel)** — metric-aware Insights via `v_log_set_facts`; metric selector or Auto; date pickers (default last **7** days); filters in sheet; Working-only default; data-only balance. Heuristic natural metric until PG settings ship
4. **PG analytics settings (1b / Phase 2)** — Account taxonomy: per-PG **Counts as** (reps/time/distance/sets) + balance group; seeds teach defaults; Insights Auto respects settings. More important for long-term usability than Power cube
5. **Insights filters chrome / date UX** — folded into Phase 1a above (sheet + real pickers)
6. **Exercise lock ↔ pills scroll** — exercise form correctly hides the pills scroller when lock=ON and dropdown=OPEN, and shows it when lock=OFF or lock=ON + dropdown=COLLAPSED. Explore whether the same behavior should mirror on Sequence / Block / Session builders
7. **Override chip grammar** — revisit sequence override notation (e.g. `R16-20 → BW` is opaque/cluttered); clearer rounds/range + “what changed” for templates and logs
8. **Auth / landing UI** — restyle landing, sign-in, and create-account screens to match current [`Styling.md`](./Styling.md) / app chrome
9. **Chat 6** — dump New User Seeds into `ensure_*` stubs **with natural metric (+ balance group) per PG**; nest-label tweaks; blocked until 1a feel + settings shape (4) accepted
10. **Prod hardening (when keeping OttoLog)** — turn on Auth email confirm (or custom SMTP); rotate/migrate to publishable keys intentionally; enable backups / PITR on paid plan; never ship `service_role` / secret keys in the app

## Parked

- Agent map: Status close-out habit + Insights rule landed
- Point Insights at `v_log_set_facts` (app still joins `log_sets` today)
- Time / distance Insights metrics; lbs/kg tonnage normalize
- Home week calendar wired to session logs
- Starter exercise templates; in-app taxonomy / intensity user guide
- Optional Postgres `fn_denest_session_log` / `fn_renest_session_log`
- e1RM / ACWR / session-load / Challenge PRs; saved Insights views
- Rename DB `analytics_tags` → Variations (product term already Variations)
- EAS / prod Supabase / Play / privacy policy

## Open questions

- Is PG + Variations + muscles the right analytics identity? *(Lean yes — with per-PG analytics settings + seeds teaching “Counts as.”)*
- What should day-one Insights *feel* like? *(Lean: Auto metric from PG settings / heuristic; Simple list; filters tucked away; Power later.)*
- Category-partition vs credit-each for balance charts (credit-each ships today; revisit?)
- Balance empty buckets — data-only for Phase 1a; later PG-groups may replace hard enum
- Partial / multi-metric logging — track what exists; PG **Counts as** picks the headline measure; never sum across metrics
- PG analytics settings UX — mirror Rest/`is_empty` pattern: config on taxonomy row, not on every set
- Override grammar: preferred compact notation for round ranges + changed fields?
- Nest labels: should **Wellness** stay a **block** label, move to **session**, or both? Part of default-seed / best-practice design before Chat 6 locks vocabulary ([`New_User_Seeds.md`](./New_User_Seeds.md) nest section)
- Builder chrome: mirror exercise lock/dropdown pills-scroll behavior on Sequence / Block / Session?
- When to retire live deprecated `001`–`019` project in favor of greenfield-only
- Whether Chat 6 seeds ship as SQL-only or also touch Account first-run UX
