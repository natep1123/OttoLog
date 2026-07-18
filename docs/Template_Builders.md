# OttoLog Template Builders

How the four nested template builders behave as shipped. Source of truth is the
code in `src/components/forms/` and `src/screens/create/`. Data contracts live in
`Database_Outline.md`; visual tokens and chrome live in `Styling.md`.

There are four builders: Session, Block, Sequence, Exercise. They compose the same
leaf editors, so a Session builder contains Block editors, which contain Sequence
and Exercise editors, and a Sequence contains Exercise editors.

## Where they live

- Create tab: Templates hub opens each builder for a new draft.
- Library tab: opening a saved template reopens the matching builder by id.
- Bottom navigation hides on all four builders.
- Each builder screen is header, editor, then a footer with Save. The footer,
  not the editor, owns Save, Done, and remove actions.

## Nesting rules

| Layer | Adds | Controls |
|-------|------|----------|
| Session | Blocks | `+ Add block` |
| Block | Ordered mix of Sequences and standalone Exercises | `+ Add sequence`, `+ Add exercise` |
| Sequence | Exercises only | `+ Add exercise` |
| Exercise | Leaf (no children) | Targets grid |

A block holds an ordered mix of exercise and sequence items in one list, not
sequences only. Each add control is tinted with the token of the layer it creates
and uses one centered line: `+ Add [child] → [resolved parent title]`. Add actions
stack vertically when a parent offers more than one child type.

## Defaults

- New Exercise: one target row; name optional.
- New Sequence: label system null **Standard**, one round, one exercise.
  **Superset** and **Circuit** are editable seeded defaults.
- New Block: label **General**, one Exercise.
- New Session: label **Uncategorized**, one Block containing one Exercise.

## Shared card chrome

Every layer uses `NestedLayer` for its card: left rail, tinted border, collapse
chevron, and a three-band header (`CoordRow`):

1. Label selector (Session/Block/Sequence) or exercise name search, plus overflow
2. Optional Name/Brief (Session/Block/Sequence) — the same width and height as the
   Label selector; editable when expanded; smaller read-only title when collapsed
3. Full-card-width scrollable summary chips, centered while they fit. Chips show
   only the **immediate next layer** (session → block titles; block → child
   sequence/exercise titles; sequence → exercise titles; exercise → prescriptions).
   Layer-colored arrows between every chip make their execution order explicit.

Collapse state is local to each card. Collapsing a card also closes its More
panel.

The overflow button (`IconButton`) opens `MorePanel`, a dashed layer-colored
panel labeled "More options". Each layer's More panel holds:

- Track duration toggle plus an HH/MM/SS stepper. The unit-label row is always
  reserved so enabling duration shifts nothing.
- Coaching notes.
- A remove action when the card is nested and removable (for example "Remove from
  block", "Remove from session", "Delete sequence").

Duration here is a structural clock for the whole node. It is separate from a
Time-shape target's `time_duration`.

## Labels, Name/Brief, and resolved titles

Session, Block, and Sequence have a **mandatory Label** (taxonomy) and an optional
**Name/Brief**. Empty brief is stored as null. Display titles are resolved in
`displayTitles.ts` and never overwrite a custom brief:

- Session template: `[Label] Session` (e.g. `Cardio Session`)
- Block: `[Label] Block` (e.g. `Warmup Block`, `General Block`)
- Sequence: `[Label] Sequence` (e.g. `Circuit Sequence`, `Standard Sequence`)
- Exercise: name optional; blank → `[Tool] Exercise N` or bare `Exercise N` (N
  resets per direct parent). No exercise label taxonomy; exempt from Label+Kind.

Parent chips list those resolved sibling titles. Custom Name/Brief still wins
over the calculated Label+Kind signature when set.

System null words: Uncategorized (session), General (block), Standard (sequence).
Seeded user defaults (Strength/Cardio/…, Warmup/Workout/Cooldown, Superset/Circuit)
are editable ordinary taxonomy rows via `ensure_default_template_labels()`.

## Name field and copy-from-template

Name/Brief and exercise name fields use typeahead (`TemplateNameSearch`; Exercise
wraps it as `ExerciseNameSearch`). Behavior:

- Typing at least one character runs a debounced search over that layer's active
  templates and shows up to eight matches by resolved title or stored brief.
- Picking a hit copies that library template's editable fields into the current
  draft or card.
- It does not change save identity. The builder keeps its own template id, and a
  nested card keeps its own item id.

Picking an Exercise hit inside a Block or Sequence copies that exercise template's
fields into the card. Picking a Session, Block, or Sequence hit at the top of a
builder replaces the current draft with a copy of that library template.

## Exercise editor

Header controls, left to right: Tool, Shape.

- Tool is a searchable create-combobox over the user's `tools`. "None" resolves to
  the global No Tool sentinel.
- Shape is a fixed select over the locked target shapes (Reps, Time, Time &
  Distance, Time & Reps, Distance). Changing shape migrates existing target rows
  into the new shape's fields.

The targets grid below shows the columns for the current shape. When Track
analytics is on, each group also carries an include-in-rollups flag.

Analytics is opt-in in the More panel. When on, it reveals a required Primary
analytics group (single, searchable create-combobox) and optional Analytics tags
(multi, searchable create-combobox). When off, the group is null and tag links are
empty.

### Exercise as a sequence subitem

Inside a Sequence only, the exercise leaf is a per-round prescription. The grid
Sets multiplier is locked to 1 (one target row per exercise per round). The
`rounds` count on the sequence repeats it. Standalone Block exercises
are not subitems and use normal set groups.

The Sequence rounds count is a plain numeric box beside the Map toggle on the
Exercises heading line.

### Sets (solo / block exercise)

Solo exercises (and standalone Block exercises) edit sets as **groups** in
`TargetsGrid`. Consecutive equal prescriptions compress into one row; the **Sets**
column is that group's multiplier (e.g. `2×10`, then `1×9`, then `1×8` in order).
The centered `+ Add sets → [resolved exercise title]` action appends another
distinct prescription row. Storage stays one expanded row per set in
`default_target_shape` / `targets[]` (renumbered on expand). Sequence subitems stay
locked to a single set. The grid keeps row identity while editing so identical
prescriptions do not merge until reload/compress for chips.

### Prescription summaries

`src/lib/targetSummaries.ts` builds coach-shorthand strings for chips and later
library/detail surfaces.

Grammar:

- Groups: `3×10 @ BW`, ladders `1×10 @ BW · 2×8 @ BW · 5×5 @ BW`
- Per side: `10/side`
- Load: `@ BW` or `@ 135 lbs`; omit `@ …` when load value is missing on lbs/kg
- Time under one hour: `m:ss`; at/above one hour: `h:mm:ss`
- Single group of one set: drop the `1×` prefix (`10 @ BW`)
- Multi-group ladders: keep `1×` so run lengths stay parallel
- Multi-metric group: `2×8:30 · 1 mi @ BW`

Each exercise set group is one layer-tinted chip. Multiple metrics stay together
inside that chip, separated by middle dots. Parent cards show only immediate
child titles; they do not flatten deeper descendants. Blank exercise volume
yields no prescription chip.

## Sequence editor

Header: Label (taxonomy) + Name/Brief.

- Label replaces the old Type select. Seeded Superset/Circuit map to legacy
  `cluster_type` for dual-write while that column remains.
- Rounds is a plain numeric box for how many times the sequence repeats.

Below the header is the "Exercises" section with a compact violet MAP ON /
MAP OFF toggle and ROUNDS box. When on it mounts `ClusterSequenceDiagram`, a chips
left-to-right, wrap-to-next-line, dashed return-loop map of the sequence. The
nested exercises are the per-round prescription (one target each).

Overrides is a tight disclosure with a dusk-pink accent. An override targets a
round range for one exercise and can:

- Skip that exercise for those rounds. Skipped rounds are not logged as zero-rep
  sets.
- Patch target fields for those rounds, staying within the exercise's existing
  target shape (shape itself is not overridden).
- Carry notes alone, without changing targets.

Its `+ Add override → [resolved sequence title]` trigger uses the same aligned
action / arrow / reference columns as the other contextual add buttons.

Sequences stay compact in the template (rounds plus per-round targets plus sparse
overrides). Individual sets expand only when a session is logged, which is not
built yet.

## Save, name uniqueness, and removal

- Save requires Session/Block/Sequence labels. Names/briefs are optional (blank →
  null). Uniqueness applies only to nonblank custom names, case-insensitive,
  active rows. Archiving frees a custom name.
- Exercise saves to columns plus `default_target_shape` jsonb plus
  `analytics_tag_links`. Sequence, Block, and Session save their tree into a
  `content` jsonb column. Session also stores `category_id`, defaulting to
  Uncategorized.
- Removal prefers soft archive, which drops the template from library lists and
  frees the name. Hard delete is offered only when the template is not referenced.
  Sequence checks references; the other layers have no cross-template FKs in v1, so
  hard delete is always available there.

## Independence rule (v1)

Session, Block, and Sequence templates do not FK each other. Inserting a saved
block or sequence into a session copies JSON. Editing a library row later does not
propagate to templates that already copied it.

## Not built yet

- Session logging and denest/renest into relational log tables (log titles use
  `[Label] Session - [Weekday, Month D, YYYY]` with same-day `(session N)`).
- Dropping legacy `cluster_templates.cluster_type` after full label cutover.
