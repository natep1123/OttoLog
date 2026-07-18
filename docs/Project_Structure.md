# OttoLog Project Structure

Where code lives and how the signed-in app is organized.

## Repository layout

```text
ottolog-app/
├── App.tsx                 Entry: fonts, splash, auth gate, then HomeScreen or auth stack
├── index.ts                Expo registerRootComponent
├── sql/                    Supabase migrations (001 through 012), run in order
├── docs/                   Official project docs (this folder)
│   ├── Database_Outline.md
│   ├── Project_Structure.md
│   ├── Setup.md
│   ├── Styling.md
│   ├── Template_Builders.md
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
    └── types/              Shared TS types (exercise / sequence / block / session; cluster internally)
```

## Navigation model

No React Navigation yet. **`HomeScreen`** holds four bottom tabs and a nested stack per tab (React `useState`).

| Tab | Hub | Live drill-in | Stubs |
|-----|-----|---------------|-------|
| **Home** | Dashboard | (none) | Week → sessions (Soon) |
| **Create** | Create hub | Templates → Session / Block / Sequence / Exercise builders | Log session |
| **Library** | Library hub | Templates → Sessions / Blocks / Sequences / Exercises → editor | Logs |
| **Account** | Account hub | Taxonomy → lists; Settings → Danger zone | Profile, Preferences |

Tapping the brand wordmark resets nested stacks.

Bottom nav hides on Session / Block / Sequence / Exercise builders (Create or Library drill-in).

## Key directories

### `src/auth/`

- **`AuthContext.tsx`**: Supabase session, profile fetch, `signOut`, `deleteAccount` RPC

### `src/lib/`

| File | Role |
|------|------|
| `supabase.ts` | Supabase client |
| `exerciseTemplates.ts` | List, get, save, delete exercise templates; default draft |
| `clusterTemplates.ts` | Sequence persistence (legacy internal name): list, get, save, archive / hard-delete; rounds + overrides; `clusterTemplateToDraft`; `expandClusterRounds` for future denest |
| `blockTemplates.ts` | List, get, save, archive / hard-delete; mixed exercise/sequence items; `blockTemplateToDraft` |
| `sessionTemplates.ts` | List, get, save, archive / hard-delete; nested blocks; `sessionTemplateToDraft`; default Uncategorized |
| `taxonomy.ts` | Picker lists and Account taxonomy CRUD (tools, analytics, session/block/sequence labels) |
| `localTime.ts` | Local greeting and week strip (`dayjs`) |
| `displayTitles.ts` | Resolved titles from label/tool + optional Name/Brief |
| `targetSummaries.ts` | Compress/expand set groups; coach-shorthand summaries for all layers |

### `src/components/`

Shared chrome: `Screen`, `ScreenHeader`, `HubAction`, `Button`, `TextField`, `ConfirmDialog`, `ListSearchBar`, `BottomNav`, `BrandWordmark`.

**`components/forms/`**: Nestable editors — Session → Block → Sequence → Exercise (`ClusterEditor` remains the internal component name), plus `NestedLayer`, `CoordRow`, `LayerLabelSelect`, `TemplateNameSearch` / `ExerciseNameSearch`, `MorePanel`, `IconButton`, `AddChildButton`, `Disclosure`, `ClusterSequenceDiagram`, and the workspace `EditorChrome` / `EditorTools` + `ExpansionController` (Tools tray, collapse exercises). Behavior is documented in `docs/Template_Builders.md`.

### `src/screens/`

| Path | Purpose |
|------|---------|
| `WelcomeScreen`, `SignInScreen`, `SignUpScreen` | Auth flow |
| `HomeScreen.tsx` | Tab shell and stack routing |
| `home/HomeDashboardScreen.tsx` | Home tab UI |
| `create/` | Create hub, template hub, session / block / sequence / exercise builders |
| `library/` | Library hub, templates hub, session / block / sequence / exercise lists |
| `account/` | Account hub, settings, danger zone, taxonomy hub and lists |

### `src/constants/` and `src/types/`

- **`sentinelIds.ts`**: `NO_TOOL_ID`, `UNCATEGORIZED_ID`, `GENERAL_BLOCK_LABEL_ID`, `CLUSTER_LABEL_NULL_ID` (must match `sql/004` / `sql/011`)
- **`lockedAtoms.ts`**: Target shape UUIDs from `sql/003`
- **`targetShapeFields.ts`**: Which columns each shape shows in the targets grid
- **`types/exerciseTemplate.ts`**: Exercise template row and editor input types
- **`types/clusterTemplate.ts`**: Sequence template row, content blob, and editor input types (legacy internal name)
- **`types/blockTemplate.ts`**: Block template row and mixed exercise/sequence items
- **`types/sessionTemplate.ts`**: Session template row and nested blocks

## Data flow (templates)

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

Library* screens / HomeDashboardScreen
  → list*Templates() → open builder by id

Account TaxonomyListScreen
  → taxonomy.ts → tools | analytics_primary_groups | analytics_tags
```

## Forms layer accents

See `formTokens.ts` / `docs/Styling.md`. Session → Block → Sequence → Exercise each own a background + accent rail used by `NestedLayer`, `IconButton`, and `MorePanel`. Session/Block/Sequence headers are label-first; Name/Brief and a `⌕` search shortcut live in the More panel; Exercise keeps its inline name search. Cards show scrollable summary chips from `targetSummaries.ts`, colored by the layer each pill describes with host-colored arrows between them.
