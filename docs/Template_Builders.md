# OttoLog Template Builders

How the four nested template builders behave as shipped. Source of truth is the
code in `src/components/forms/` and `src/screens/create/`. Data contracts live in
`Database_Outline.md`; visual tokens and chrome live in `Styling.md`.

There are four builders: Session, Block, Cluster, Exercise. They compose the same
leaf editors, so a Session builder contains Block editors, which contain Cluster
and Exercise editors, and a Cluster contains Exercise editors.

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
| Block | Ordered mix of Clusters and standalone Exercises | `+ Add cluster`, `+ Add exercise` |
| Cluster | Exercises only | `+ Add exercise` |
| Exercise | Leaf (no children) | Targets grid |

A block holds an ordered mix of exercise and cluster items in one list, not
clusters only. Each add control is tinted with the token of the layer it creates.

## Defaults

- New Exercise: one target row.
- New Cluster: type Superset, one round, one exercise.
- New Block: one Exercise.
- New Session: one Block containing one Exercise, category Uncategorized.

## Shared card chrome

Every layer uses `NestedLayer` for its card: left rail, tinted border, collapse
chevron, and a header row (`CoordRow`) holding the name field and the overflow
button. Collapse state is local to each card. Collapsing a card also closes its
More panel.

The overflow button (`IconButton`) opens `MorePanel`, a dashed layer-colored
panel labeled "More options". Each layer's More panel holds:

- Track duration toggle plus an HH/MM/SS stepper. The unit-label row is always
  reserved so enabling duration shifts nothing.
- Coaching notes.
- A remove action when the card is nested and removable (for example "Remove from
  block", "Remove from session", "Delete cluster").

Duration here is a structural clock for the whole node. It is separate from a
Time-shape target's `time_duration`.

## Name field and copy-from-template

Every layer's name field is a typeahead (`TemplateNameSearch`; the Exercise layer
wraps it as `ExerciseNameSearch`). Behavior:

- Typing at least one character runs a debounced search over that layer's active
  templates and shows up to eight name matches in an in-card menu.
- Picking a hit copies that library template's editable fields into the current
  draft or card.
- It does not change save identity. The builder keeps its own template id, and a
  nested card keeps its own item id. To create a standalone copy, save under a new
  name.

Picking an Exercise hit inside a Block or Cluster copies that exercise template's
fields into the card. Picking a Session, Block, or Cluster hit at the top of a
builder replaces the current draft with a copy of that library template.

## Exercise editor

Header controls, left to right: Tool, Shape, Sets.

- Tool is a searchable create-combobox over the user's `tools`. "None" resolves to
  the global No Tool sentinel.
- Shape is a fixed select over the locked target shapes (Reps, Time, Time &
  Distance, Time & Reps, Distance). Changing shape migrates existing target rows
  into the new shape's fields.
- Sets is a number input (1 to 50) that grows or trims the targets grid and keeps
  existing row values where possible.

The targets grid below shows the columns for the current shape. When Track
analytics is on, each target row also carries an include-in-rollups flag.

Analytics is opt-in in the More panel. When on, it reveals a required Primary
analytics group (single, searchable create-combobox) and optional Analytics tags
(multi, searchable create-combobox). When off, the group is null and tag links are
empty.

### Exercise as a cluster or block subitem

Inside a Cluster (and as a standalone Block exercise), the exercise leaf is a
per-round prescription. The Sets control is replaced by a locked "Round" value of
1: one target row per exercise per round. The `rounds` count on the cluster
repeats the sequence.

## Cluster editor

Header controls: Type and Rounds.

- Type is a two-option select (Superset or Circuit) and defaults to Superset.
- Rounds is a stepper for how many times the exercise sequence repeats.

Below the header is the "Exercises per-round" section with a compact violet
MAP ON / MAP OFF toggle. When on it mounts `ClusterSequenceDiagram`, a chips
left-to-right, wrap-to-next-line, dashed return-loop map of the sequence. The
nested exercises are the per-round prescription (one target each).

Overrides is a tight disclosure with a dusk-pink accent. An override targets a
round range for one exercise and can:

- Skip that exercise for those rounds. Skipped rounds are not logged as zero-rep
  sets.
- Patch target fields for those rounds, staying within the exercise's existing
  target shape (shape itself is not overridden).
- Carry notes alone, without changing targets.

Clusters stay compact in the template (rounds plus per-round targets plus sparse
overrides). Individual sets expand only when a session is logged, which is not
built yet.

## Save, name uniqueness, and removal

- Save validates the draft, then rejects a name that matches another active
  template for the same user and layer, case-insensitive. Archiving frees the
  name.
- Exercise saves to columns plus `default_target_shape` jsonb plus
  `analytics_tag_links`. Cluster, Block, and Session save their tree into a
  `content` jsonb column. Session also stores `category_id`, defaulting to
  Uncategorized.
- Removal prefers soft archive, which drops the template from library lists and
  frees the name. Hard delete is offered only when the template is not referenced.
  Cluster checks references; the other layers have no cross-template FKs in v1, so
  hard delete is always available there.

## Independence rule (v1)

Session, Block, and Cluster templates do not FK each other. Inserting a saved
block or cluster into a session copies JSON. Editing a library row later does not
propagate to templates that already copied it.

## Not built yet

- Session category picker UI. Sessions default to Uncategorized.
- Session logging and denest/renest into relational log tables.
