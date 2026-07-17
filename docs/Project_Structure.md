# OttoLog Project Structure

Where code lives and how the signed-in app is organized.

## Repository layout

```text
ottolog-app/
├── App.tsx                 Entry: fonts, splash, auth gate, then HomeScreen or auth stack
├── index.ts                Expo registerRootComponent
├── sql/                    Supabase migrations (001 through 008), run in order
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
    └── types/              Shared TS types (exercise / cluster templates)
```

## Navigation model

No React Navigation yet. **`HomeScreen`** holds four bottom tabs and a nested stack per tab (React `useState`).

| Tab | Hub | Live drill-in | Stubs |
|-----|-----|---------------|-------|
| **Home** | Dashboard | (none) | Week → sessions (Soon) |
| **Create** | Create hub | Templates → Exercise / Cluster builders | Log session; Session / Block templates |
| **Library** | Library hub | Templates → Exercises / Clusters → editor | Logs; Session / Block lists |
| **Account** | Account hub | Taxonomy → lists; Settings → Danger zone | Profile, Preferences |

Tapping the brand wordmark resets nested stacks.

Bottom nav hides on the exercise and cluster builders (Create or Library drill-in).

## Key directories

### `src/auth/`

- **`AuthContext.tsx`**: Supabase session, profile fetch, `signOut`, `deleteAccount` RPC

### `src/lib/`

| File | Role |
|------|------|
| `supabase.ts` | Supabase client |
| `exerciseTemplates.ts` | List, get, save, delete exercise templates; default draft |
| `clusterTemplates.ts` | List, get, save, archive / hard-delete cluster templates; draft helpers |
| `taxonomy.ts` | Picker lists and Account taxonomy CRUD |
| `localTime.ts` | Local greeting and week strip (`dayjs`) |

### `src/components/`

Shared chrome: `Screen`, `ScreenHeader`, `HubAction`, `Button`, `TextField`, `ConfirmDialog`, `ListSearchBar`, `BottomNav`, `BrandWordmark`.

**`components/forms/`**: Nestable editors (`ExerciseEditor`, `ClusterEditor`, `SearchableSelect`, `TargetsGrid`, etc.). Cluster embeds Exercise leaves; the same leaves will embed in future block and session builders.

### `src/screens/`

| Path | Purpose |
|------|---------|
| `WelcomeScreen`, `SignInScreen`, `SignUpScreen` | Auth flow |
| `HomeScreen.tsx` | Tab shell and stack routing |
| `home/HomeDashboardScreen.tsx` | Home tab UI |
| `create/` | Create hub, template hub, exercise + cluster builders |
| `library/` | Library hub, templates hub, exercise + cluster lists |
| `account/` | Account hub, settings, danger zone, taxonomy hub and lists |

### `src/constants/` and `src/types/`

- **`sentinelIds.ts`**: `NO_TOOL_ID`, `UNCATEGORIZED_ID` (must match `sql/004`)
- **`lockedAtoms.ts`**: Target shape UUIDs from `sql/003`
- **`targetShapeFields.ts`**: Which columns each shape shows in the targets grid
- **`types/exerciseTemplate.ts`**: Exercise template row and editor input types
- **`types/clusterTemplate.ts`**: Cluster template row, content blob, and editor input types

## Data flow (templates)

```text
ExerciseBuilderScreen
  → ExerciseEditor (draft state)
  → saveExerciseTemplate() → exercise_templates + analytics_tag_links

ClusterBuilderScreen
  → ClusterEditor → nested ExerciseEditor leaves
  → saveClusterTemplate() → cluster_templates (content jsonb)

LibraryScreen / LibraryClustersScreen / HomeDashboardScreen
  → list*Templates() → open builder by id

Account TaxonomyListScreen
  → taxonomy.ts → tools | analytics_primary_groups | analytics_tags
```

Pickers load active taxonomy rows only. Editors resolve archived labels by id when reopening a template.

## Adding a new screen

1. Match patterns in [`Styling.md`](./Styling.md): `Screen`, tokens, `ScreenHeader`, `HubAction`.
2. Add stack state in `HomeScreen.tsx` if the screen needs back navigation.
3. Put domain logic in `src/lib/`, not in the screen file.
4. Add SQL under `sql/` with the next sequence number; update [`Database_Outline.md`](./Database_Outline.md).

## Related docs

| Doc | Use when |
|-----|----------|
| [`Setup.md`](./Setup.md) | First run, env, migrations |
| [`Database_Outline.md`](./Database_Outline.md) | Tables, RLS, sentinels, live vs planned |
| [`Styling.md`](./Styling.md) | Colors, typography, component patterns |
