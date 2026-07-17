# OttoLog Styling System

This document is the official styling reference for the OttoLog app. It describes the visual system currently implemented in React Native and should guide future screens and components.

The original form prototype helped establish the visual direction, but it is not the active implementation contract. When documentation, prototypes, and app code disagree, use this order of precedence:

1. `src/theme/tokens.ts`
2. Shared components in `src/components/`
3. This document
4. Original concept documents and prototypes

Update this document and the shared implementation together when an intentional design change is approved.

## Visual Direction

OttoLog uses a warm dusk visual language that should feel personal, focused, and journal-like.

- Dark, warm backgrounds instead of pure black
- Sunrise orange, sunset red, dusk pink, and restrained gold accents
- Soft ambient color near the top of the screen
- Fraunces for the brand wordmark
- DM Sans for all interface text
- Compact radii and subtle warm borders
- Sparse layouts with strong hierarchy and generous breathing room
- No generic purple, blue-gray, or cold SaaS styling

The interface should not feel like a dashboard unless the content truly requires one. Prefer one clear purpose per screen.

## Implementation Rules

- Use React Native `StyleSheet`, not CSS, NativeWind, or Tailwind.
- Import reusable values from `src/theme/tokens.ts`.
- Do not introduce arbitrary colors when an existing semantic token applies.
- Never use pure black.
- Use shared components before creating screen-specific copies.
- Test visual changes in Expo Go on a physical phone.
- Account for safe areas, the on-screen keyboard, and mobile touch targets.
- Use `Pressable` for interactive elements.
- Keep decorative SVG and gradient layers non-interactive.

## Color Tokens

### Backgrounds

```ts
bg: '#0c0a0e'
bgElevated: '#161218'
bgPanel: '#1a151c'
bgInset: '#100e12'
```

- `bg` is the main app background.
- `bgElevated` is used for raised navigation and chrome.
- `bgPanel` is reserved for panels and cards.
- `bgInset` is used for inputs and inset surfaces.

### Borders

```ts
border: 'rgba(255, 180, 120, 0.12)'
borderStrong: 'rgba(255, 160, 100, 0.22)'
```

Borders should be subtle and warm. Use `borderStrong` for selected, focused, or emphasized boundaries.

### Text

```ts
text: '#f3ebe3'
textMuted: '#9a8b80'
textDim: '#6b5f57'
```

- `text` is primary text.
- `textMuted` is supporting copy and secondary labels.
- `textDim` is tertiary text, inactive navigation, and field labels.

### Accents

```ts
sunrise: '#ff9a5a'
sunset: '#e85d4c'
dusk: '#c96b8a'
gold: '#e8b86d'
amberGlow: 'rgba(255, 154, 90, 0.15)'
onPrimary: '#1a0e0a'
```

- `sunrise` is the main active and interactive accent.
- `sunset` is the second primary-gradient color and the error color.
- `dusk` completes the brand gradient.
- `gold` is a restrained secondary accent, not a default highlight.
- `onPrimary` is used for text on the sunrise-to-sunset primary button.

Do not use accent colors as large solid backgrounds without a specific approved design.

## Typography

### Font Families

```ts
font: 'DMSans_400Regular'
fontMedium: 'DMSans_500Medium'
fontSemiBold: 'DMSans_600SemiBold'
display: 'Fraunces_600SemiBold'
```

DM Sans is the interface font. Fraunces is reserved for the OttoLog wordmark and intentional future display moments.

### Current Type Usage

- Brand hero: Fraunces SemiBold, 42
- Brand header: Fraunces SemiBold, 28
- Main placeholder screen title: DM Sans Medium, 30
- Greeting / eyebrow: DM Sans Medium, 15
- Supporting body copy: DM Sans Regular, 15 with 22 line height
- Button labels: DM Sans Medium or SemiBold, 16
- Input text: DM Sans Regular, 16
- Input labels: DM Sans SemiBold, 11, uppercase, 0.7 letter spacing
- Bottom navigation labels: DM Sans Medium, 12

Use font family tokens rather than relying on `fontWeight` to synthesize unavailable weights.

## Spacing

The base spacing scale is:

```ts
xs: 4
sm: 8
md: 16
lg: 24
xl: 32
xxl: 48
```

Use these values for normal layout spacing. Small optical adjustments are allowed inside precise components such as the bottom navigation, but they should remain documented in that component.

The standard `Screen` content inset is:

```ts
paddingHorizontal: 24
paddingVertical: 32
```

## Radii

```ts
sm: 6
md: 10
```

- `sm` is used for buttons and inputs.
- `md` is used for navigation shells, cards, and larger panels.
- Fully circular highlights may use a radius equal to half their size.

Avoid excessively rounded pill-shaped surfaces unless the component is intentionally circular or capsule-shaped.

## Gradients

### Brand Gradient

The OttoLog wordmark runs:

```text
sunrise at 0% → sunset at 55% → dusk at 100%
```

The React Native implementation uses SVG text filled with a linear gradient because React Native `Text` does not support CSS-style gradient clipping.

### Primary Button Gradient

The primary button runs diagonally:

```text
sunrise → sunset
```

It is rendered with `expo-linear-gradient`. The label uses `onPrimary`.

## Ambient Background

Every main screen uses `AmbientBackground` behind its content.

The current implementation includes two SVG radial washes:

- A sunrise wash near the upper-left edge
- A dusk wash near the upper-right edge

The earlier bottom gold wash is intentionally excluded because it appeared as a large yellow ball on phone screens. Gold remains available as an accent and the omitted wash may be reconsidered later.

Ambient washes must:

- Stay subtle
- Remain behind all content
- Ignore pointer events
- Fade to transparent
- Never reduce text legibility

## Screen Shell

Use `Screen` as the base wrapper for full-screen app views. It provides:

- The warm `bg` base color
- `AmbientBackground`
- A light status bar
- Safe-area handling through `react-native-safe-area-context`
- Standard horizontal and vertical content padding

Do not import the deprecated core React Native `SafeAreaView`.

## Brand Wordmark

Use `BrandWordmark` for the gradient “OttoLog” mark.

Available sizes:

```ts
size="hero"   // 42
size="header" // 28
```

The component uses Fraunces SemiBold with approximately `-0.02em` optical letter spacing.

When `onPress` is supplied, the wordmark becomes navigation:

- Logged out: return to Welcome
- Logged in: return to Home

Do not recreate the wordmark as ordinary colored `Text`.

## Buttons

Use the shared `Button` component.

### Primary

- Sunrise-to-sunset gradient
- `onPrimary` label
- DM Sans SemiBold, 16
- 14 vertical padding
- 24 horizontal padding
- Small radius
- Pressed state: slight opacity reduction and 1-point downward movement

### Ghost

- Transparent background
- Warm subtle border
- `textMuted` label
- DM Sans Medium, 16
- 13 vertical padding
- 24 horizontal padding
- Pressed state: `borderStrong` with a faint sunrise wash

Disabled buttons use reduced opacity.

Button labels should use consistent product language:

- Log in
- Log out
- Create account

## Text Fields

Use `TextField` for labeled inputs.

Current recipe:

- `bgInset` background
- `border` at 1 point
- Small radius
- 12-point horizontal and vertical padding
- Primary text in `text`
- Placeholder text in `textDim`
- Sunrise selection color
- Uppercase dim label
- Sunset border and message for errors

Secure fields use native `secureTextEntry`. Configure keyboard type, content type, capitalization, and autocomplete for the field’s purpose.

## Bottom Navigation

The signed-in shell uses a custom four-item bottom navigation in this order:

1. Home
2. Create
3. Library
4. Account

Current measurements:

```ts
bar minHeight: 72
bar horizontal padding: 8
bar top/bottom padding: 6
bar radius: 10
icon size: 22
active spotlight size: 40
icon-to-label gap: 2
label size: 12
```

The bar uses `bgElevated` with a subtle `border`.

Inactive icons and labels use `textDim`. Active icons and labels use `sunrise`.

The selected icon sits inside a centered circular spotlight:

```ts
backgroundColor: 'rgba(255, 154, 90, 0.14)'
borderColor: borderStrong
```

The spotlight must remain centered on the icon. It should not surround the label or change the layout width of a tab.

Bottom navigation icons use Feather icons through `@expo/vector-icons`.

## Auth Screens

Auth screens use:

- Ambient screen shell
- Header-sized wordmark
- Muted screen title
- Inset text fields
- Primary submit button
- Sunrise text links for switching between Log in and Create account
- No back button

Users navigate to Welcome by pressing the wordmark. They move directly between Log in and Create account through the link beneath the form button.

## Signed-In Screens

### Shell

Home now uses a dashboard layout. Create, Library, and Account use hub / list / builder screens with:

- Header-sized wordmark
- Screen title + muted subtitle via `ScreenHeader`
- Bottom navigation (hidden on the exercise builder)

### Home

Home is top-aligned and uses live app data where available:

- Warm greeting / hero panel driven by the device local clock (`dayjs`)
- Quick actions for Build exercise, Browse exercise library, and Manage taxonomy
- Recent exercise templates (up to four) from Supabase
- Live **This week** preview with today's local date highlighted and a **Soon** badge for future session logging

Greeting bands (local hour): morning 5–11, afternoon 12–17, evening 18–21, late night **Hey** (22–4) so midnight is never “Good morning.”

The week preview is intentionally not a fake session calendar yet. It is a visual placeholder for the future log-driven Home screen.

### Account

Account hub shows profile (username / email), then:

- **Taxonomy** — Tools, Primary groups, Analytics tags (create / rename / archive / hard-delete when unused). **Show archived** toggle; pickers stay active-only. Global **None** (No Tool) is System-locked. Session categories ship later.
- **Settings** — Profile / Preferences (**Soon**), **Danger zone** (live)

Danger zone holds **Delete account** with confirmation. **Log out** stays on the Account hub footer.

### Create & Library

Both use the same hub pattern: `ScreenHeader` + stacked `HubAction` rows.

- **Create:** Build templates (live) · Log a session (Soon) → Templates hub → Exercise (live) · Session / Block / Cluster (Soon)
- **Library:** Templates (live) · Logs (Soon) → Templates hub → Exercise list with name search (live) · other layers (Soon)

Exercise builder hides bottom nav. Library exercise list is top-aligned with `ListSearchBar`.

## Native Implementation Notes

React Native does not use the browser CSS box model or CSS gradient backgrounds.

- Use `View`, `Text`, `Pressable`, and `TextInput`.
- Use `StyleSheet.create` for styles.
- Use `expo-linear-gradient` for gradient surfaces.
- Use `react-native-svg` for radial washes and gradient text.
- Use `react-native-safe-area-context` for device insets.
- Use numeric density-independent points rather than CSS units.
- Use `gap` only where supported by the project’s React Native version.

## Adding New UI

Before adding a new screen or component:

1. Start with `Screen`.
2. Use existing color, typography, spacing, and radius tokens.
3. Reuse `BrandWordmark`, `Button`, `TextField`, and `BottomNav` where applicable.
4. Keep the layout sparse and purpose-driven.
5. Add a shared component when a visual recipe repeats.
6. Test on Expo Go.
7. Update this document if the work introduces an approved reusable pattern.

## Avoid

- Pure black or pure white
- Purple or gray SaaS defaults
- Unapproved hex values
- Cold blue highlights
- Excessive cards and dashboard chrome
- Large decorative gold circles
- Mechanical conversion of prototype HTML or CSS
- Web-only APIs or CSS assumptions
- Screen-specific copies of existing shared components
- Navigation labels or auth wording that conflict with established language
