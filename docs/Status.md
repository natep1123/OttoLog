# OttoLog Status (living)

> Edit this file when a phase closes. Canonical design still lives in the docs
> linked below — this file is the ops/planning board only.

## Canonical docs (do not paste wholesale)

- [`Setup.md`](./Setup.md), [`Project_Structure.md`](./Project_Structure.md), [`Database_Outline.md`](./Database_Outline.md), [`Template_Builders.md`](./Template_Builders.md), [`Styling.md`](./Styling.md), [`Label_Library.md`](./Label_Library.md), [`New_User_Seeds.md`](./New_User_Seeds.md), [`Analytics_Labeling.md`](./Analytics_Labeling.md)

## Current baseline

- Stack / greenfield path: `sql/greenfield/001`–`007` (facts view in `007`; no `008`)
- App: Insights lenses + credit rule; denest variation / intensity / category
- Seeds: `sql/seeds/murph_personal_seed.sql` (personal smoke only; not Chat 6)
- Living board: this file (linked from AGENTS / README / Project_Structure)

## Shipped recently (newest first)

- Living `Status.md` ops board + docs sync after greenfield Insights
- Fold Insights helpers + `v_log_set_facts` into greenfield `007`; drop standalone `008`
- Murph personal smoke seed (`sql/seeds/`) — one-account library + completed log
- Insights lenses for nest grains (session / block / sequence labels) + credit-each rule
- Greenfield Insights cutover: PG `category`, log variation links, `set_type` / `intensity`, `track_intensity`
- Variations product vocab locked; New User Seeds catalog as the seed contract
- Agent map (AGENTS / `.cursor` rules + skills) + `sql/deprecated/` historical split

## Next (priority order)

1. **Greenfield smoke** — fresh Supabase, apply `001`–`007`, optional Murph seed; Library + Insights check per [`Setup.md`](./Setup.md)
2. **Insights product rethink** — discuss what questions analytics should answer; current Lens + filters MVP may not match intended use (discussion before more schema)
3. **Identity conviction** — confirm whether **Primary Group + Variations + muscle groups** (+ tools + nest-label grains) is the long-term model before Chat 6 locks vocabulary
4. **Override chip grammar** — revisit sequence override notation (e.g. `R16-20 → BW` is opaque/cluttered); clearer rounds/range + “what changed” for templates and logs
5. **Insights date UX** — replace raw `YYYY-MM-DD` text fields with the same date-selector pattern used elsewhere (e.g. session date); fold into a broader Insights UI pass after (2)
6. **Chat 6** — dump New User Seeds PG / variation / tool content into `ensure_*` stubs (`sql/greenfield/005`) once (3) feels solid

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

- Is PG + Variations + muscles the right analytics identity, or do we simplify / reshape before seeding?
- What should day-one Insights *feel* like (lenses vs fewer fixed views vs something else)?
- Category-partition vs credit-each for balance charts (credit-each ships today; revisit?)
- Override grammar: preferred compact notation for round ranges + changed fields?
- When to retire live deprecated `001`–`019` project in favor of greenfield-only
- Whether Chat 6 seeds ship as SQL-only or also touch Account first-run UX
