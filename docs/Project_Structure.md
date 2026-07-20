# OttoLog Project Structure

Where code lives and how the signed-in app is organized.

## Repository layout

```text
ottolog-app/
├── App.tsx                 Entry: fonts, splash, auth gate, then HomeScreen or auth stack
├── index.ts                Expo registerRootComponent
├── sql/                    Supabase migrations (001 through 015), run in order
├── docs/                   Official project docs (this folder)
│   ├── Database_Outline.md
│   ├── Project_Structure.md
│   ├── Setup.md
│   ├── Styling.md
│   ├── Template_Builders.md
│   ├── Analytics_Labeling.md
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
| **Insights** | Coming soon placeholder | (none) | Analytics surfaces |
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
| `exerciseTemplates.ts` | List, get, save, delete exercise templates; default draft |
| `clusterTemplates.ts` | Sequence persistence (legacy internal name): list, get, save, archive / hard-delete; rounds + overrides; `clusterTemplateToDraft`; `expandClusterPerformedSets` for log denest |
| `blockTemplates.ts` | List, get, save, archive / hard-delete; mixed exercise/sequence items; `blockTemplateToDraft` |
| `sessionTemplates.ts` | List, get, save, archive / hard-delete; nested blocks; `sessionTemplateToDraft`; default Session label |
| `sessionLogs.ts` | List, get, save, delete session logs; denest draft tree → `sql/014` tables (+ `sql/015` tool links); renest rows → editor draft |
| `exerciseTemplates.ts` | Exercise library CRUD; tag + tool link replace; `normalizeToolIds` / multi-tool primary |
| `lockedPreviewPages.ts` | Paginate a locked outline into screenshot pages for `LockedPreviewModal` |
| `taxonomy.ts` | Picker lists and Account taxonomy CRUD (tools, analytics, session/block/sequence labels) |
| `localTime.ts` | Local greeting, week strip, session date keys / labels (`dayjs`) |
| `displayTitles.ts` | Library titles: custom Name/Brief as typed, else bare kind. Compact UI titles (`sessionUiTitle` / `blockUiTitle` / `clusterUiTitle`): Label word. Log list titles: `sessionLogTitle` (Label + local date + same-day ordinal) |
| `targetSummaries.ts` | Compress/expand set groups; coach-shorthand summaries and lock outlines for all layers |

### `src/components/`

Shared chrome: `Screen`, `ScreenHeader`, `HubAction`, `Button`, `TextField`, `ConfirmDialog`, `ListSearchBar`, `BottomNav`, `BrandWordmark`.

**`components/forms/`**: Nestable editors — Session → Block → Sequence → Exercise (`ClusterEditor` remains the internal component name), plus `NestedLayer`, `CoordRow`, `LockedOutline`, `LockedPreviewModal`, `SessionDateControl`, `DurationTrackControl`, `LayerLabelSelect`, `TemplateNameSearch` / `ExerciseNameSearch`, `MorePanel`, `IconButton`, `AddChildButton`, `Disclosure`, `ClusterSequenceDiagram`, and the workspace `EditorChrome` / `EditorTools` + `ExpansionController` + `LockController` (Tools tray: Collapse exercises, Unlock & Expand All; ephemeral lock/view mode; optional `reviewLockId`). Behavior is documented in `docs/Template_Builders.md`.

### `src/screens/`

| Path | Purpose |
|------|---------|
| `WelcomeScreen`, `SignInScreen`, `SignUpScreen` | Auth flow |
| `HomeScreen.tsx` | Tab shell and stack routing |
| `home/HomeDashboardScreen.tsx` | Home tab UI |
| `insights/InsightsComingSoonScreen.tsx` | Insights placeholder |
| `create/` | Create hub, template hub, session / block / sequence / exercise builders, session log builder, log-from-template picker |
| `library/` | Library hub, templates hub, session / block / sequence / exercise lists, logs list |
| `account/` | Account hub, settings, danger zone, taxonomy hub and lists |

### `src/constants/` and `src/types/`

- **`sentinelIds.ts`**: `NO_TOOL_ID`, `UNCATEGORIZED_ID` (Session), `GENERAL_BLOCK_LABEL_ID` (Block), `CLUSTER_LABEL_NULL_ID` (Sequence) — must match `sql/004` / `sql/011` / `sql/013`
- **`lockedAtoms.ts`**: Target shape UUIDs from `sql/003`
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
  → taxonomy.ts → tools | analytics_primary_groups | analytics_tags
```

## Forms layer accents

See `formTokens.ts` / `docs/Styling.md`. Session → Block → Sequence → Exercise each own a background + accent rail used by `NestedLayer`, `IconButton`, and `MorePanel`. Session/Block/Sequence headers are label-first; Name/Brief and a `⌕` search shortcut live in the More panel; Exercise keeps its inline name search. Cards show scrollable summary chips from `targetSummaries.ts`, colored by the layer each pill describes with host-colored arrows between them. Library/search titles use custom Name/Brief as typed, else the bare kind word; compact chrome (pills, locked outline, add-button parent refs) uses Label words for Session/Block/Sequence. Locked cards offer a maximize control that opens `LockedPreviewModal` (paginated screenshot outline).
