# BookMark Design System

BookMark is a dense developer reference library. Design must make scanning faster, not louder.

## Reference Sources

- Lucide, Heroicons, Phosphor, Untitled UI Icons: consistent 24px outline icons, rounded caps, readable at 16px.
- NameThatUI: correct pattern anatomy for command palette, skeleton, empty state, badge, chip, toolbar, segmented control, toast.
- boneyard: loading states should mirror final layout geometry.
- Untitled UI: product density, clear hierarchy, reusable tokens, accessible states.
- Design Spells, SmoothUI, Animate UI, React Bits: small stateful motion only when it communicates interaction.
- CTA.gallery: primary actions must be obvious; secondary actions stay quiet.
- Coolors, FontJoy, Fontshare: accessible contrast, calm palette, strong type scale.

## Visual Language

- Product register: dark command-center surface for long browsing sessions.
- Use OKLCH tokens, never raw black or white.
- Typography: Inter for interface, JetBrains Mono for URLs, shortcuts, technical metadata.
- Icons: local SVG registry, 24x24 viewBox, 1.75 stroke, round linecap/linejoin.
- Cards: one strong visual anchor, one metadata rail, clear actions. Avoid identical decorative grids.
- Motion: opacity/transform only, ease-out, reduced-motion safe.

## Components

- Command palette: search field, result rows, type badge, empty guidance.
- Skeleton: shaped like the final component, not generic spinners.
- Empty state: icon, direct reason, one recovery action when useful.
- Filter chips: compact, icon optional, active state via full background and border.
- Bookmark card: favicon tile, category glyph, title, domain, note, tags, actions.

## Bans

- No side-stripe active indicators.
- No gradient text.
- No decorative glass blur.
- No animation that does not communicate state.
- No new dependency for icons or UI polish.
