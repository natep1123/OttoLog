# OttoLog Project Structure

Where code lives and how the signed-in app is organized.

## Repository layout

```text
ottolog-app/
├── App.tsx                 Entry: fonts, splash, auth gate, then HomeScreen or auth stack
├── index.ts                Expo registerRootComponent
├── sql/                    Supabase migrations (001 through 010), run in order
├── docs/                   Official project docs (this folder)
│   ├── Database_Outline.md
│   ├── Project_Structure.md
│   ├── Setup.md
│   ├── Styling.md
│   └── original-concept/   Early prototypes (not the live contract)
└── src/
    ├── auth/               Session, sign in, sign up, delete account
    ├── components/         Shared UI and forms kit
    ├── constants/          Locked atom IDs, sentinels, target-shape field map
    ├── lib/                Supabase client and domain helpers
    ├── navigation/         Tab type definitions
    ├── screens/            Full screens and tab stacks
    ├── theme/              Design tokens
    └── types/              Shared TS types (exercise / cluster / block / session)
```

## Navigation model

No React Navigation yet. **`HomeScreen`** holds four bottom tabs and a nested stack per tab (React `useState`).

| Tab | Hub | Live drill-in | Stubs |
|-----|-----|---------------|-------|
| **Home** | Dashboard | (none) | Week → sessions (Soon) |
| **Create** | Create hub | Templates → Session / Block / Cluster / Exercise builders | Log session |
| **Library** | Library hub | Templates → Sessions / Blocks / Clusters / Exercises → editor | Logs |
| **Account** | Account hub | Taxonomy → lists; Settings → Danger zone | Profile, Preferences |

Tapping the brand wordmark resets nested stacks.

Bottom nav hides on Session / Block / Cluster / Exercise builders (Create or Library drill-in).

## Key directories

### `src/auth/`

- **`AuthContext.tsx`**: Supabase session, profile fetch, `signOut`, `deleteAccount` RPC

### `src/lib/`

| File | Role |
|------|------|
| `supabase.ts` | Supabase client |
| `exerciseTemplates.ts` | List, get, save, delete exercise templates; default draft |
| `clusterTemplates.ts` | List, get, save, archive / hard-delete; rounds + overrides; `expandClusterRounds` for future denest |
| `blockTemplates.ts` | List, get, save, archive / hard-delete; nested cluster items |
| `sessionTemplates.ts` | List, get, save, archive / hard-delete; nested blocks; default Uncategorized |
| `taxonomy.ts` | Picker lists and Account taxonomy CRUD |
| `localTime.ts` | Local greeting and week strip (`dayjs`) |

### `src/components/`

Shared chrome: `Screen`, `ScreenHeader`, `HubAction`, `Button`, `TextField`, `ConfirmDialog`, `ListSearchBar`, `BottomNav`, `BrandWordmark`.

**`components/forms/`**: Nestable editors — `SessionEditor` → `BlockEditor` → `ClusterEditor` → `ExerciseEditor`, plus `MorePanel`, `Disclosure`, `ClusterSequenceDiagram`, `CoordRow`, `NodeShell`, etc.

### `src/screens/`

| Path | Purpose |
|------|---------|
| `WelcomeScreen`, `SignInScreen`, `SignUpScreen` | Auth flow |
| `HomeScreen.tsx` | Tab shell and stack routing |
| `home/HomeDashboardScreen.tsx` | Home tab UI |
| `create/` | Create hub, template hub, session / block / cluster / exercise builders |
| `library/` | Library hub, templates hub, session / block / cluster / exercise lists |
| `account/` | Account hub, settings, danger zone, taxonomy hub and lists |

### `src/constants/` and `src/types/`

- **`sentinelIds.ts`**: `NO_TOOL_ID`, `UNCATEGORIZED_ID` (must match `sql/004`)
- **`lockedAtoms.ts`**: Target shape UUIDs from `sql/003`
- **`targetShapeFields.ts`**: Which columns each shape shows in the targets grid
- **`types/exerciseTemplate.ts`**: Exercise template row and editor input types
- **`types/clusterTemplate.ts`**: Cluster template row, content blob, and editor input types
- **`types/blockTemplate.ts`**: Block template row and nested cluster items
- **`types/sessionTemplate.ts`**: Session template row and nested blocks

## Data flow (templates)

```text
ExerciseBuilderScreen
  → ExerciseEditor (draft state)
  → saveExerciseTemplate() → exercise_templates + analytics_tag_links

ClusterBuilderScreen
  → ClusterEditor → nested ExerciseEditor leaves
  → saveClusterTemplate() → cluster_templates (content jsonb)

BlockBuilderScreen
  → BlockEditor → nested ClusterEditor leaves
  → saveBlockTemplate() → block_templates (content jsonb)

SessionBuilderScreen
  → SessionEditor → nested BlockEditor → ClusterEditor leaves
  → saveSessionTemplate() → session_templates (content jsonb)

Library* screens / HomeDashboardScreen
  → list*Templates() → open builder by id

Account TaxonomyListScreen
  → taxonomy.ts → tools | analytics_primary_groups | analytics_tags
```

## Forms layer accents

See `formTokens.ts` / `docs/Styling.md`. Session → Block → Cluster → Exercise each own a background + accent rail used by `NodeShell`, `IconButton`, and `MorePanel`.
