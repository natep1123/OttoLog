# OttoLog Project Structure

Where code lives and how the signed-in app is organized.

## Repository layout

```text
ottolog-app/
├── App.tsx                 Entry: fonts, splash, auth gate, then HomeScreen or auth stack
├── index.ts                Expo registerRootComponent
├── AGENTS.md               Short map for AI agents (Expo v57 note + canonical docs)
├── .cursorignore           Index exclusions (deps, caches, secrets, docs/deprecated/)
├── .cursor/
│   ├── rules/              Scoped Cursor rules (point at docs; do not paste them)
│   └── skills/             Repeatable workflows (SQL migrations, taxonomy labeling)
├── sql/                    Supabase migrations — greenfield/ (canonical 001–007); deprecated/ historical
│   └── seeds/              Optional personal smoke scripts (not migrations)
├── docs/                   Official project docs (this folder)
│   ├── Status.md           Living ops board (shipped / next / parked)
│   ├── Analytics_Overhaul_Proposal.md  Insights product board (hub = Dashboard + Query builder)
│   ├── Insights_Query_Builder.md       Query builder nest contract (Query→Section→Breakdown→Subject→Measure)
│   ├── Database_Outline.md
│   ├── Project_Structure.md
│   ├── Setup.md
│   ├── Styling.md
│   ├── Template_Builders.md
│   ├── Label_Library.md
│   ├── Analytics_Labeling.md
│   ├── New_User_Seeds.md   Full new-account seed catalog (PGs, variations, tools, …)
│   └── deprecated/         Archived design set (historical, not the contract)
│       └── original-concept/
└── src/
    ├── auth/               Session, sign in, sign up, delete account
    ├── components/         Shared UI and forms kit
    ├── constants/          Locked atom IDs, sentinels, target-shape field map
    ├── lib/                Supabase client and domain helpers
    ├── navigation/         Tab type definitions
    ├── screens/            Full screens and tab stacks
    ├── theme/              Design tokens
    └── types/              Shared TS types (exercise / sequence / block / session / sessionLog; cluster internally)
```

## Navigation model

No React Navigation yet. **`HomeScreen`** holds five bottom tabs and a nested stack per tab (React `useState`).

| Tab | Hub | Live drill-in | Stubs |
|-----|-----|---------------|-------|
| **Home** | Dashboard | Quick actions → Create session builder / Library exercises / Account taxonomy | Week → sessions (Soon) |
| **Insights** | Insights hub (card select) | **Dashboard** (per-PG facet readout; fast, unsaved) · **Query builder** (nested savable/lockable — v2 nest skeleton shipped, ephemeral) | `src/lib/insights.ts`, `src/components/querybuilder/` |
| **Create** | Create hub | Log from scratch / from template; Templates → Session / Block / Sequence / Exercise builders | AI-assisted log |
| **Library** | Library hub | Templates → Sessions / Blocks / Sequences / Exercises; Logs → log editor (review mode) | — |
| **Account** | Account hub | Taxonomy → lists; Settings → Danger zone | Profile, Preferences |

Tapping the brand wordmark resets nested stacks.

Bottom nav hides on Session / Block / Sequence / Exercise / Session-log builders (Create or Library drill-in).

Library opens of templates and logs use **`reviewMode`**: `EditorChrome` starts the root node locked so the coach outline is visible until unlock.

## Key directories

### `src/auth/`

- **`AuthContext.tsx`**: Supabase session, profile fetch, `signOut`, `deleteAccount` RPC

### `src/lib/`

| File | Role |
|------|------|
| `supabase.ts` | Supabase client |
| `exerciseTemplates.ts` | List, get, save, delete; tag + tool link replace; `normalizeToolIds` / multi-tool primary; default draft |
| `clusterTemplates.ts` | Sequence persistence (legacy internal name): list, get, save, archive / hard-delete; rounds + overrides; `clusterTemplateToDraft`; `expandClusterPerformedSets` for log denest |
| `blockTemplates.ts` | List, get, save, archive / hard-delete; mixed exercise/sequence items; `blockTemplateToDraft` |
| `sessionTemplates.ts` | List, get, save, archive / hard-delete; nested blocks; `sessionTemplateToDraft`; default Session label |
| `sessionLogs.ts` | List, get, save, delete session logs; denest draft tree → log tables (tools / PG / muscle / **variation** links, `track_intensity`, `set_type` / `intensity`); renest rows → editor draft |
| `insights.ts` | Insights reads over `v_log_set_facts`: `loadInsightQuery` (Dashboard per-PG panels) + `loadQueryFacts` (raw scoped facts for the Query builder); shared scope / `passesPgIdentity` / credit-each |
| `lockedPreviewPages.ts` | Paginate a locked outline into screenshot pages for `LockedPreviewModal` (notes/overrides row packing; swipe + chevron sync) |
| `taxonomy.ts` | Picker lists and Account taxonomy CRUD (tools, analytics + PG **category**, session/block/sequence labels) |
| `localTime.ts` | Local greeting, week strip, session date keys / labels (`dayjs`) |
| `displayTitles.ts` | Library titles: custom Name/Brief as typed, else bare kind. Compact UI titles (`sessionUiTitle` / `blockUiTitle` / `clusterUiTitle`): Label word. Log list titles: `sessionLogTitle` (Label + local date + same-day ordinal) |
| `targetSummaries.ts` | Compress/expand set groups; coach-shorthand summaries and lock outlines for all layers (notes + outline overrides) |

### `src/components/`

Shared chrome: `Screen`, `ScreenHeader`, `HubAction`, `Button`, `TextField`, `ConfirmDialog`, `ListSearchBar`, `BottomNav`, `BrandWordmark`.

**`components/forms/`**: Nestable editors — Session → Block → Sequence → Exercise (`ClusterEditor` remains the internal component name), plus `NestedLayer`, `CoordRow`, `LockedOutline`, `LockedPreviewModal`, `SessionDateControl`, `DurationTrackControl`, `LayerLabelSelect`, `TemplateNameSearch` / `ExerciseNameSearch`, `MorePanel`, `IconButton`, `AddChildButton`, `Disclosure`, `ClusterSequenceDiagram`, and the workspace `EditorChrome` / `EditorTools` + `ExpansionController` + `LockController` (Tools tray: Collapse exercises, Unlock & Expand All; ephemeral lock/view mode; optional `reviewLockId`). Behavior is documented in `docs/Template_Builders.md`.

### `src/screens/`

| Path | Purpose |
|------|---------|
| `WelcomeScreen`, `SignInScreen`, `SignUpScreen` | Auth flow |
| `HomeScreen.tsx` | Tab shell and stack routing |
| `home/HomeDashboardScreen.tsx` | Home tab UI |
| `insights/InsightsHubScreen.tsx` | Insights hub — card select (Dashboard / Query builder) |
| `insights/InsightsDashboardScreen.tsx` | Dashboard — PG-first per-PG facet readout (fast, unsaved) |
| `insights/InsightsQueryBuilderScreen.tsx` | Query builder — nested builder (Query→Section→Breakdown→Subject→Measure); v2 nest skeleton shipped (ephemeral) |
| `components/querybuilder/` | `Qb*` nest chrome + `types.ts` draft model + `engine.ts` client-side aggregate (cool `queryLayer` palette; forks `forms/` builder DNA) |
| `create/` | Create hub, template hub, session / block / sequence / exercise builders, session log builder, log-from-template picker |
| `library/` | Library hub, templates hub, session / block / sequence / exercise lists, logs list |
| `account/` | Account hub, settings, danger zone, taxonomy hub and lists |

### `src/constants/` and `src/types/`

- **`sentinelIds.ts`**: `NO_TOOL_ID`, `UNCATEGORIZED_ID` (Session), `GENERAL_BLOCK_LABEL_ID` (Block), `CLUSTER_LABEL_NULL_ID` (Sequence) — must match `sql/greenfield/004`
- **`lockedAtoms.ts`**: Target shape UUIDs from `sql/greenfield/003`
- **`primaryGroupCategories.ts`**: PG `category` enum (Push / Pull / …)
- **`setTypes.ts`**: `log_sets.set_type` + intensity normalize helpers
- **`targetShapeFields.ts`**: Which columns each shape shows in the targets grid
- **`types/exerciseTemplate.ts`**: Exercise template row and editor input types
- **`types/clusterTemplate.ts`**: Sequence template row, content blob, and editor input types (legacy internal name)
- **`types/blockTemplate.ts`**: Block template row and mixed exercise/sequence items
- **`types/sessionTemplate.ts`**: Session template row and nested blocks
- **`types/sessionLog.ts`**: Session log draft / list / detail types (`session_date`, `status`, optional `template_id`)

## Data flow (templates + logs)

```text
ExerciseBuilderScreen
  → ExerciseEditor (draft state)
  → saveExerciseTemplate() → exercise_templates + analytics_tag_links

Sequence (internal ClusterBuilderScreen)
  → ClusterEditor → nested ExerciseEditor leaves
  → saveClusterTemplate() → cluster_templates (content jsonb)

BlockBuilderScreen
  → BlockEditor → nested ExerciseEditor and/or ClusterEditor items
  → saveBlockTemplate() → block_templates (content jsonb)

SessionBuilderScreen
  → SessionEditor → nested BlockEditor → mixed Block items
  → saveSessionTemplate() → session_templates (content jsonb)

SessionLogBuilderScreen
  → SessionDateControl + SessionEditor (same nested tree)
  → saveSessionLog() → denest into session_logs / log_blocks / log_items / log_sub_items / log_sets
  → getSessionLog() → renest relational rows back into the editor draft

Library* screens / HomeDashboardScreen
  → list*Templates() / listSessionLogs() → open builder by id (reviewMode from Library)

Account TaxonomyListScreen
  → taxonomy.ts → tools | analytics_primary_groups | analytics_tags | analytics_muscle_groups
```

## Forms layer accents

See `formTokens.ts` / `docs/Styling.md`. Session → Block → Sequence → Exercise each own a background + accent rail used by `NestedLayer`, `IconButton`, and `MorePanel`. Session/Block/Sequence headers are label-first; Name/Brief and a `⌕` search shortcut live in the More panel; Exercise keeps its inline name search. Cards show scrollable summary chips from `targetSummaries.ts`, colored by the layer each pill describes with host-colored arrows between them. Library/search titles use custom Name/Brief as typed, else the bare kind word; compact chrome (pills, locked outline, add-button parent refs) uses Label words for Session/Block/Sequence. Locked cards offer a maximize control that opens `LockedPreviewModal` (paginated screenshot outline; swipe between pages).
