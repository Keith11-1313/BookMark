# BookMark Design System

BookMark is a dense developer reference library. Design must make scanning faster, not louder.

## Themes

Two themes ship with the app, switchable in Settings > Theme.

### Default
Dark command-center surface for long browsing sessions. Indigo accent (hue 266),
soft radii, layered shadows, spring-eased transitions. Token root is `:root`.

### Anti-design
Brutalist display register. Pure achromatic black, electric green accent (hue 145),
zero border-radius, no shadows, uppercase mono labels, linear transitions.
Token root is `[data-theme="anti-design"]`.

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

## Bans

- No gradient text.
- No decorative glass blur.
- No animation that does not communicate state.
- No new dependency for icons or UI polish.
