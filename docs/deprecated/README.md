# Deprecated docs

Archived design docs. Kept for history, not the current contract. The shipped
product moved past them, and in places they contradict the live behavior.

Do not build from these files. Use the live docs in `docs/`:

| Live doc | Covers |
|----------|--------|
| `docs/Database_Outline.md` | Schema, sentinels, templates, planned log layer |
| `docs/Project_Structure.md` | Folders, navigation, key files |
| `docs/Template_Builders.md` | Shipped builder behavior (Session / Block / Cluster / Exercise) |
| `docs/Styling.md` | Visual system and screen patterns |
| `docs/Setup.md` | Env, migrations, run, verify |

## What is in here

`original-concept/` is the original aspirational design set that seeded v1. It
still holds useful background for the not-yet-built phase (session logging plus
denest/renest into relational log tables), but read it against the live docs.

### Known ways it disagrees with the shipped app

- Says signup seeds No Tool and Uncategorized. Wrong. Those are global sentinels
  with fixed UUIDs and `user_id IS NULL`, not per-user copies. See
  `docs/Database_Outline.md`.
- Uses `composition_categories` / `comp_category_id`. Retired. The live name is
  `target_shapes` / `target_shape_id`.
- Describes clusters with `prescribed_sets` and a growable set list. Wrong. The
  shipped cluster is a rounds model: one target per exercise per round, `rounds`
  repeats the sequence, and sparse round-range overrides handle exceptions.
- Describes an Address Compass (X/Y/Z mover) and a "Save as ... template"
  snapshot confirm sheet. Neither was built. Reordering plus name-search
  copy-from-template replaced them.
- Assumes Expo Router. The app uses a custom `useState` stack in `HomeScreen`.
- `Overview.md` links to `Frontend/Styling.md`, which never existed here. The
  styling doc is `docs/Styling.md`.
