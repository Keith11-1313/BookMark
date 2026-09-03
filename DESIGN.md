# BookMark Design System

BookMark is a dense developer reference library. Design must make scanning faster, not louder.

## Themes

Five themes ship with the app, switchable in Settings > Theme.

### Default
Dark command-center surface for long browsing sessions. Indigo accent (hue 266),
soft radii, layered shadows, spring-eased transitions. Token root is `:root`.

### Anti-design
Brutalist display register. Pure achromatic black, electric green accent (hue 145),
zero border-radius, no shadows, uppercase mono labels, linear transitions.
Token root is `[data-theme="anti-design"]`.

### Sport
High-energy saturated color. Lime accent (hue 130), bouncy spring easing,
glow shadows on primary actions. Token root is `[data-theme="sport"]`.

### Map-forward
Civic clarity. Muted blue-gray surface, desaturated teal accent (hue 210),
generous spacing, calm deliberate motion. Token root is `[data-theme="map-forward"]`.

### Dark Glass
Premium frosted glass. Deep violet-tinted base (hue 280), translucent layered
surfaces with `backdrop-filter: blur()` + saturate, large radii, refined
lightweight typography, glow accents. Token root is `[data-theme="dark-glass"]`.

## Reference Sources

- Lucide, Heroicons, Phosphor, Untitled UI Icons: consistent 24px outline icons, rounded caps, readable at 16px.
- NameThatUI: correct pattern anatomy for command palette, skeleton, empty state, badge, chip, toolbar, segmented control, toast.
- boneyard: loading states should mirror final layout geometry.
- Untitled UI: product density, clear hierarchy, reusable tokens, accessible states.

## Visual Language

- Typography: Inter for interface, JetBrains Mono for URLs, shortcuts, technical metadata.
- Icons: local SVG registry, 24x24 viewBox, 1.75 stroke, round linecap/linejoin.
- OKLCH tokens throughout, never raw black or white in the default theme.
- Motion: opacity/transform only, ease-out, reduced-motion safe.

## Adding a Theme

1. Add a `[data-theme="your-name"]` block in `css/index.css` overriding the `:root` tokens.
2. Add scoped component overrides as `[data-theme="your-name"] .selector` in the relevant CSS file.
3. Add an `<option>` in `js/settings.js` inside `#theme-select`.
4. Theme is persisted via `localStorage` key `bookmark_theme`, applied in `App.init()`.

## Shared Components

- Dropdown (`js/dropdown.js` + `css/dropdown.css`): themed listbox replacing native
  `<select>` popups (OS-rendered, unthemeable). `Dropdown.enhance(select)` keeps the
  hidden native select as source of truth — `.value` reads and `change` listeners
  keep working. Call `enhance()` again after rebuilding options. List is
  fixed-positioned (escapes modal overflow); closes on outside pointer,
  scroll, resize, Esc, and route change (`Dropdown.reset()` in `App.navigate`).
- Legal modal (`js/legal.js` + `css/legal.css`): Privacy Notice and Terms of Use
  as a popup with no route change. `Legal.open('privacy' | 'terms')` follows the
  `App.confirm` pattern: body-appended backdrop, Esc/backdrop-click close,
  focus moved inside on open, single-instance guard.

## Bans

- No gradient text.
- No glass blur outside the Dark Glass theme (there it is structural, with opaque fallbacks via translucent tokens).
- No animation that does not communicate state.
- No new dependency for icons or UI polish.
