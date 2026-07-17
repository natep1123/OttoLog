# OttoLog Project Structure

Where code lives and how the signed-in app is organized.

## Repository layout

```text
ottolog-app/
├── App.tsx                 Entry: fonts, splash, auth gate → HomeScreen or auth stack
├── index.ts                Expo registerRootComponent
├── sql/                    Supabase migrations (001–007), run in order
├── docs/                   Official project docs (this folder)
│   ├── Database_Outline.md
│   ├── Project_Structure.md
│   ├── Setup.md
│   ├── Styling.md
│   └── original-concept/   Prototypes + early design notes (not the live contract)
└── src/
    ├── auth/               Session + sign in / sign up / delete account
    ├── components/         Shared UI + forms kit
    ├── constants/          Locked atom IDs, sentinels, target-shape field map
    ├── lib/                Supabase client, domain helpers
    ├── navigation/         Tab type definitions
    ├── screens/            Full screens and tab stacks
    ├── theme/              Design tokens
    └── types/              Shared TS types (e.g. exercise template)
```

## Navigation model

No React Navigation yet. The signed-in shell is **`HomeScreen`** with four bottom tabs and **nested stacks** per tab (state in React `useState`).

| Tab | Hub | Live drill-in | Stubs |
|-----|-----|---------------|-------|
| **Home** | Dashboard (greeting, quick actions, recent templates, week preview) | — | Week → sessions (Soon) |
| **Create** | Create hub | Templates → Exercise builder | Log session; Session / Block / Cluster templates |
| **Library** | Library hub | Templates → Exercises → editor | Logs; Session / Block / Cluster lists |
| **Account** | Account hub | Taxonomy → lists; Settings → Danger zone | Profile, Preferences |

Brand wordmark tap resets nested stacks and returns to Home tab content.

Bottom nav hides on the exercise builder (Create or Library drill-in).

## Key directories

### `src/auth/`

- **`AuthContext.tsx`** — Supabase session, profile fetch, `signOut`, `deleteAccount` RPC

### `src/lib/`

| File | Role |
|------|------|
| `supabase.ts` | Supabase client |
| `exerciseTemplates.ts` | List / get / save / delete exercise templates; default draft |
| `taxonomy.ts` | Picker lists + Account taxonomy CRUD |
| `localTime.ts` | Device-local greeting + week strip (`dayjs`) |

### `src/components/`

Shared chrome: `Screen`, `ScreenHeader`, `HubAction`, `Button`, `TextField`, `ConfirmDialog`, `ListSearchBar`, `BottomNav`, `BrandWordmark`.

**`components/forms/`** — Nestable exercise editor kit (`ExerciseEditor`, `SearchableSelect`, `TargetsGrid`, etc.). Same leaf will embed in future cluster/block/session builders.

### `src/screens/`

| Path | Purpose |
|------|---------|
| `WelcomeScreen`, `SignInScreen`, `SignUpScreen` | Auth flow |
| `HomeScreen.tsx` | Tab shell + stack routing |
| `home/HomeDashboardScreen.tsx` | Home tab UI |
| `create/` | Create hub, template hub, exercise builder |
| `library/` | Library hub, templates hub, exercise list |
| `account/` | Account hub, settings, danger zone, taxonomy hub + lists |

### `src/constants/` & `src/types/`

- **`sentinelIds.ts`** — `NO_TOOL_ID`, `UNCATEGORIZED_ID` (must match `sql/004`)
- **`lockedAtoms.ts`** — Target shape UUIDs from `sql/003`
- **`targetShapeFields.ts`** — Which columns each shape shows in the targets grid
- **`types/exerciseTemplate.ts`** — Template row + editor input types

## Data flow (exercise templates)

```text
ExerciseBuilderScreen
  → ExerciseEditor (draft state)
  → saveExerciseTemplate() → exercise_templates + analytics_tag_links
LibraryScreen / HomeDashboardScreen
  → listExerciseTemplates() → open ExerciseBuilderScreen by id
Account TaxonomyListScreen
  → taxonomy.ts → tools | analytics_primary_groups | analytics_tags
```

Pickers use **active-only** taxonomy lists. Editors resolve archived labels by id when reopening templates.

## Adding a new screen

1. Follow patterns in [`Styling.md`](./Styling.md) — `Screen`, tokens, `ScreenHeader`, `HubAction`.
2. Add stack state in `HomeScreen.tsx` if it needs nested back navigation.
3. Put domain logic in `src/lib/`, not in the screen.
4. Add SQL under `sql/` with the next sequence number; update [`Database_Outline.md`](./Database_Outline.md).

## Related docs

| Doc | Use when |
|-----|----------|
| [`Setup.md`](./Setup.md) | First run, env, migrations |
| [`Database_Outline.md`](./Database_Outline.md) | Tables, RLS, sentinels, what's live vs planned |
| [`Styling.md`](./Styling.md) | Colors, typography, component patterns |
