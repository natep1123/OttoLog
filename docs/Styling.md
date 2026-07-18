# OttoLog Styling System

This document is the official styling reference for the OttoLog app. It describes the visual system currently implemented in React Native and should guide future screens and components.

The original form prototype helped establish the visual direction, but it is not the active implementation contract. When documentation, prototypes, and app code disagree, use this order of precedence:

1. `src/theme/tokens.ts`
2. Shared components in `src/components/`
3. This document
4. Archived concept documents and prototypes in `docs/deprecated/` (historical only)

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

The nested template hierarchy is one intentional, tightly scoped exception to
the warm-only direction: Block and Sequence may use cool blue/violet accents
for their structural rails, card borders, overflow icons, and any summary pill
that describes a Block or Sequence. Because pills are colored by the item they
name (not the host card), a warm Session or Block card can legitimately show
cool block/sequence pills. Session and Exercise bookend the hierarchy with warm
accents. Cool colors must not spread to general buttons, CTAs, ambient washes,
or the brand gradient. The narrow control exception is the solid-outline “Add
sequence” button, which uses the Sequence token because add controls identify
the layer they create.

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
paddingHorizontal: 20
paddingVertical: 32  // spacing.xl
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
- Bottom navigation (hidden on Session / Block / Sequence / Exercise builders)

### Home

Top-aligned dashboard using live data where it exists:

- Greeting from local device time (`dayjs`)
- Quick actions: Build exercise, Browse exercise library, Manage taxonomy
- Up to four recent exercise templates from Supabase
- **This week** strip with today highlighted; **Soon** badge until session logging ships

Greeting by local hour: morning 5–11, afternoon 12–17, evening 18–21, late night **Hey** (22–4).

The week strip is a placeholder layout, not a session calendar yet.

### Account

Account hub: profile (username, email), then:

- **Taxonomy**: Tools, Primary groups, Analytics tags. Create, rename, archive, hard-delete when unused. **Show archived** toggle. Pickers elsewhere stay active-only. Global **None** (No Tool) is system-locked. Session categories come later.
- **Settings**: Profile and Preferences (**Soon**), **Danger zone** (live)

Danger zone has **Delete account** with confirmation. **Log out** is on the Account hub footer.

### Create and Library

Same hub pattern: `ScreenHeader` plus stacked `HubAction` rows.

- **Create**: Build templates (live), Log a session (Soon) → Templates hub → Session / Block / Sequence / Exercise builders (live)
- **Library**: Templates (live), Logs (Soon) → Templates hub → Session / Block / Sequence / Exercise lists with name search (live)

All four template builders hide bottom nav. Library lists are top-aligned with `ListSearchBar`.

### Nestable form layers

Each template layer resolves its complete structural treatment from
`layer` in `src/theme/tokens.ts`. `NestedLayer`, chevrons, add controls,
`IconButton`, and `MorePanel` must consume those shared tokens rather than
hardcoding per-component colors.

| Layer | Background | Structural accent | Rail |
|-------|------------|-------------------|------|
| Session | `#0c0a0e` | muted warm red `#d65b4b` | solid 4px |
| Block | `#0d0b0f` | cool blue `#4a7fb5` | solid 4px |
| Sequence | `#0f0d11` | cool violet `#7a6bc9` | solid 4px |
| Exercise | `#100e12` | muted warm gold `#d6aa66` | solid 4px with glow |

The backgrounds are solid and progress monotonically from Session to Exercise;
card borders are 1-point outlines at 12% of the layer color. Every nested card
escapes its parent's horizontal inset so all outer bounds and 4-point rails
overlap at the same x-position. Each card then applies the same 12-point
horizontal content inset. Eight-point vertical gaps reveal the parent rail
between child boxes, while the child accent visually covers it over the child's
own height. The 4-point accent runs the full left edge, curves around the
bottom-left corner, and continues across the full bottom edge. Collapse state is
local to each card; the layer chevron rotates `-90deg` when collapsed, and
collapsing a card also closes its More panel.

Session/Block/Sequence headers keep Name/Brief out of the header entirely: an
expanded card shows only the Label selector, a `⌕` search shortcut, and the `⋯`
overflow; a collapsed card shows the resolved title line. Name/Brief moves into
the More panel, and the `⌕` shortcut opens that panel focused on the field.

Summary pills are colored by the layer of the item each pill names, while the
arrows between pills stay the host card's color: red arrows in Session, blue in
Block, violet in Sequence, gold in Exercise. Set-group pills use the sunrise
orange (`colors.sunrise` / `amberGlow`) already used by the active Tool selector
and `+ Add sets`. Focused controls take their card's layer color — Tool/Shape and
analytics selectors focus gold, label selectors and coaching notes focus their
own layer color — so orange is reserved for set-level actions.

Overflow and search triggers use a dashed layer-colored square. Their expanded
More panel uses the same 1-point dashed outline as the card hairline, on all
sides, with centered option content.

Each builder screen wraps its editor in `EditorChrome`, which shows an
`EditorTools` dropdown (the **Tools** tray) above the form and outside the card
chrome. Its first action collapses every exercise card while leaving blocks and
sequences open. The tray renders in a `Modal` anchored to its button so it floats
above card `elevation`; it is the intended home for future workspace actions.

Nesting is constrained by role: Session adds Blocks; Block adds an ordered mix
of Sequences and standalone Exercises; Sequence adds Exercises only. Each
solid-outline add control uses the shared color token of the layer it creates.
New blocks start with one Exercise, and new Sessions start with one Block
containing one Exercise.
Sequence round overrides retain a dusk-pink semantic accent across their add
button, disclosure, editable panels, selectors, steppers, and save controls.

Sequences show a circuit-style diagram (chips left→right, wrap onto the
next line, dashed return loop), per-round subitem editors, and an overrides list
for round-range exceptions. Its blueprint grid uses the Sequence structural
color; gold arrows and chips remain warm. Sequence labels replace the old
non-searchable Type selector; Standard is the system default. A compact violet Map on/off
toggle shares the Exercises heading row with the ROUNDS box and mounts the diagram
directly below it. Overrides continues to use a tight `Disclosure`.

More-panel duration controls stay left-aligned. All four layers reserve the
HH/MM/SS label row even while duration is off, preventing the toggle and time
inputs from shifting when duration is enabled. Session/Block/Sequence Name/Brief
fields live in the More panel as layer-tinted `TemplateNameSearch` typeaheads
(Exercise keeps its inline name search). Selecting a hit copies contents into the
current draft without changing save identity.

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
