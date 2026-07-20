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

- New Exercise: one target row; name optional (blank → referred to as **Exercise**).
- New Sequence: label system null **Sequence**, one round, one exercise.
  **Superset** and **Circuit** are editable seeded defaults.
- New Block: label **Block**, one Exercise.
- New Session: label **Session**, one Block containing one Exercise.

## Shared card chrome

Every layer uses `NestedLayer` for its card: left rail, tinted border, collapse
chevron, lock toggle, and a header (`CoordRow`):

1. Chevron (expand/collapse), then lock (view mode), then Label selector
   (Session/Block/Sequence) or exercise name search, plus a search shortcut and
   overflow (Session/Block/Sequence). Exercise keeps its inline name search and a
   single overflow.
2. Resolved title line, shown **only when collapsed** (Session/Block/Sequence).
   Session/Block/Sequence no longer edit Name/Brief inline in the header; the
   field lives in the More panel (see below). Expanded cards keep the header clear.
3. Full-card-width scrollable summary chips, centered while they fit. Chips show
   only the **immediate next layer** (session → block titles; block → child
   sequence/exercise titles; sequence → exercise titles; exercise → prescriptions).
   Arrows between chips stay the **host layer's** color and make execution order
   explicit; each pill is colored by **what it describes** (see Chip colors).

Collapse and lock are independent axes. Collapse state is local to each card.
Collapsing a card also closes its More panel. Lock state is ephemeral UI only
(see Lock / view mode) — not written to draft JSON or the database.

Session/Block/Sequence headers carry two trailing buttons: a **search icon**
(`⌕`) and the **overflow** (`⋯`). The search icon opens the More panel and jumps
focus straight to Name/Brief; pressing it again while open just refocuses that
field. Overflow toggles the same panel without moving focus. Exercise keeps only
the overflow. Both use `IconButton`, which now renders a Feather glyph or the `⋯`
label. Trailing edit chrome hides while the card is effectively locked.

The overflow button opens `MorePanel`, a dashed layer-colored panel labeled
"More options". Each layer's More panel holds:

- **Name / Brief** (Session/Block/Sequence only) — the layer-tinted
  `TemplateNameSearch` typeahead, moved here so the collapse UI stays clean and
  labels stay the primary identity. Library search still runs from this field.
- Track duration toggle plus an HH/MM/SS stepper. The unit-label row is always
  reserved so enabling duration shifts nothing.
- Coaching notes. The note field's focused border uses the **card's own layer
  color** (red/blue/violet/gold), not a global orange.
- A remove action when the card is nested and removable (for example "Remove from
  block", "Remove from session", "Delete sequence").

Duration here is a structural clock for the whole node. It is separate from a
Time-shape target's `time_duration`.

## Chip colors

Summary pills are colored by the layer of the item each pill names, while the
arrows between them stay the host card's color. This makes the nest legible at a
glance — e.g. a Block shows a mix of gold exercise pills and violet sequence
pills, joined by blue arrows.

| Host card | Arrows | Pills |
|-----------|--------|-------|
| Session | red | blue (blocks) |
| Block | blue | gold (exercises) + violet (sequences) |
| Sequence | violet | gold (exercises) |
| Exercise | gold | sunrise-orange (set groups) |

Set-group pills reuse the existing sunrise orange (`colors.sunrise` /
`amberGlow`), matching the Tool selector's active state and the `+ Add sets`
control. `CoordRow` accepts either plain strings (colored by the host layer) or
`{ label, kind }` chips where `kind` is a layer name or `'set'`.

## Editor tools tray

Each builder screen wraps its editor tree in `EditorChrome`, which renders an
`EditorTools` dropdown above the form (outside the nested card chrome), an
`ExpansionControllerProvider`, and a `LockControllerProvider`. The **Tools**
button opens a small tray whose first action is **Collapse exercises** — it folds
every exercise card while leaving blocks and sequences open, via a broadcast
signal each `ExerciseEditor` listens for. The tray is the intended home for
future workspace actions (reset, undo/redo). It also offers **Unlock & Expand
All**, which clears every ephemeral lock and expands every card in the builder.
It renders in a `Modal` anchored to the button so it floats above card
`elevation`.

## Lock / view mode

Ephemeral **locked × expanded** presentation, orthogonal to collapse. Lock state
lives only in `LockController` (per-node map + parent tree) — no schema fields.

- **Header:** `chevron · lock · label/title · trailing`. Lock works while
  collapsed. Ancestor lock forces descendants locked. Unlocking a node unlocks
  that node and **own-locks each immediate child** (so unlocking a session leaves
  every block locked; unlocking a block leaves its sequences/exercises locked).
  A child’s own lock only matters when no ancestor is locked (child toggle is
  disabled while forced). **Tools → Unlock & Expand All** clears every lock and
  expands every card in the open template.
- **Expand cascade (independent of lock):** Opening a collapsed card collapses
  its immediate children. Expanding via Tools → Unlock & Expand All does not
  run that cascade — every card stays open.
- **Collapsed + locked:** Same header + immediate-child pills; no editing.
- **Expanded + locked (Session / Block / Sequence):** Form body is replaced by
  `LockedOutline` — a nested coach-grammar outline of everything below (blocks →
  sequences → exercises → sets, including sequence override one-liners). Nested
  outline spines use each child’s layer color (blue / violet / gold) on the
  thin left rule. Map, overrides, More, and add controls are hidden.
- **Exercise locked:** Locking stops at the exercise leaf. No per-set-row locks.
  A locked exercise always shows the compact header + prescription pills view
  (identical whether the card would otherwise be expanded or collapsed) — no
  outline body, Tool/Shape, or targets grid.
-   Outline builders: `outlineExercise` / `outlineCluster` / `outlineBlock` /
  `outlineSession` in `targetSummaries.ts` (used by parent-layer outlines).
  Session/Block/Sequence outline titles use Label words; exercises use names.

## Labels, Name/Brief, and resolved titles

Session, Block, and Sequence have a **mandatory Label** (taxonomy) and an optional
**Name/Brief**. Empty brief is stored as null. Display titles are resolved in
`displayTitles.ts`:

- **Library / search / owned identity:** Custom Name/Brief wins **exactly as
  typed** (no auto-append of “Block” / “Sequence”). Empty name → bare kind word:
  `Session`, `Block`, `Sequence`, or `Exercise`.
- **Compact builder chrome (summary pills, locked outline):** Session / Block /
  Sequence show the **Label** word only (`Warmup`, `Circuit`, …) so a long brief
  never crowds the nest. Exercise pills/outline still use the exercise name.
- Labels never compose with briefs — no `Warmup - Incline Walking…` generation.
  Put detail in Name/Brief; keep Label short for the tree.
- Exercise: blank name → always `Exercise` (no tool prefix, no order number).

System null label rows (fixed UUIDs): **Session**, **Block**, **Sequence**.
Seeded user defaults (Strength/Cardio/…, Warmup/Workout/Cooldown, Superset/Circuit)
are editable ordinary taxonomy rows via `ensure_default_template_labels()`.

## Name field and copy-from-template

Name/Brief (in the More panel for Session/Block/Sequence) and the exercise name
field use typeahead (`TemplateNameSearch`; Exercise wraps it as
`ExerciseNameSearch`). Behavior:

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

Each exercise set group is one sunrise-orange chip (see Chip colors). Multiple
metrics stay together inside that chip, separated by middle dots. Parent cards
show only immediate child titles; they do not flatten deeper descendants. Blank
exercise volume yields no prescription chip.

## Sequence editor

Header: Label (taxonomy) + search icon + overflow. Name/Brief lives in the More
panel.

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
  Session (system null).
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
  owned name or `Session - [Weekday, Month D, YYYY]` with same-day `(session N)`).
- Dropping legacy `cluster_templates.cluster_type` after full label cutover.
