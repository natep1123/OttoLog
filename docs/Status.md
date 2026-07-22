# OttoLog Status (living)

> Edit this file when a phase closes. Canonical design still lives in the docs linked below — this file is the ops/planning board only.

## Canonical docs (do not paste wholesale)

- [`Setup.md`](./Setup.md), [`Project_Structure.md`](./Project_Structure.md), [`Database_Outline.md`](./Database_Outline.md), [`Template_Builders.md`](./Template_Builders.md), [`Styling.md`](./Styling.md), [`Label_Library.md`](./Label_Library.md), [`New_User_Seeds.md`](./New_User_Seeds.md), [`Analytics_Labeling.md`](./Analytics_Labeling.md)

## Current baseline

- Stack / greenfield path: `sql/greenfield/001`–`007` (facts view in `007`; no `008`)
- App: Insights lenses + credit rule; denest variation / intensity / category
- Seeds: `sql/seeds/murph_personal_seed.sql` (personal smoke only; not Chat 6)

## Shipped recently (newest first)

- Fold Insights helpers + `v_log_set_facts` into greenfield `007`; drop standalone `008`
- Murph personal smoke seed (`sql/seeds/`) — one-account library + completed log
- Insights lenses for nest grains (session / block / sequence labels) + credit-each rule
- Greenfield Insights cutover: PG `category`, log variation links, `set_type` / `intensity`, `track_intensity`
- Variations product vocab locked; New User Seeds catalog as the seed contract
- Agent map (AGENTS / `.cursor` rules + skills) + `sql/deprecated/` historical split

## Next (priority order)

1. Chat 6 — dump New User Seeds PG / variation / tool content into `ensure_*` stubs (`sql/greenfield/005`)
2. Fresh-project cutover: apply greenfield `001`–`007` on a new Supabase; smoke per [`Setup.md`](./Setup.md)
3. Point Insights at `v_log_set_facts` (app still joins `log_sets` today)
4. Time / distance metrics on Insights; lbs/kg tonnage normalize
5. Home week calendar wired to session logs

## Parked

- Chat 6 New User Seeds content dumps into ensure stubs *(also #1 above when unblocked)*
- Point Insights at `v_log_set_facts`; time/distance metrics; lbs/kg tonnage normalize
- Starter exercise templates; in-app taxonomy / intensity guide
- Optional Postgres `fn_denest_session_log` / `fn_renest_session_log`
- e1RM / ACWR / session-load rollups; Insights UI polish beyond bar lists
- Rename DB `analytics_tags` → Variations (product term already Variations)
- EAS / prod Supabase / Play

## Open questions

- Category-partition vs credit-each for balance charts (credit-each ships today; revisit?)
- When to retire live deprecated `001`–`019` project in favor of greenfield-only
- Whether Chat 6 seeds ship as SQL-only or also touch Account first-run UX
