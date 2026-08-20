# Himeros Brand & UI Skill

## Purpose
Use this skill whenever creating, refactoring, reviewing, or styling Himeros frontend UI. The visual identity is a premium relationship platform with Greco-Roman inspiration. The UI must feel contemporary, confident, romantic, clean, and high-end — never like a casino, game UI, luxury jewelry store, or generic Bootstrap dashboard.

## Brand identity
- Brand: **Himeros**.
- Core visual idea: modern relationship product + classical Greco-Roman refinement.
- Primary palette: **gold, black, white**.
- Dark mode is the canonical/default presentation.
- Gold is an accent and action color, not a page-filling background.
- The logo represents a classical man and woman facing each other with a subtle heart motif.

## Canonical colors
Always prefer these tokens instead of arbitrary colors.

| Token | Hex | Use |
|---|---:|---|
| `gold` | `#ECA420` | primary CTA, selected state, premium accent |
| `gold-hover` | `#D68F12` | CTA hover |
| `gold-active` | `#B9750C` | pressed/active |
| `gold-soft` | `#FFF3D6` | pale highlight on light backgrounds |
| `gold-muted` | `#F5CC7C` | subtle premium details |
| `black` | `#070707` | main application background |
| `black-soft` | `#111111` | navigation / large surfaces |
| `surface` | `#151515` | cards, dialogs, sidebars |
| `surface-elevated` | `#1C1C1C` | elevated cards / menus |
| `border` | `#2C2C2C` | separators and strokes |
| `white` | `#FFFFFF` | high-contrast text / logo |
| `text` | `#F8F8F8` | primary text on dark |
| `text-muted` | `#B8B8B8` | secondary copy |
| `text-dark` | `#111111` | text on gold/white |

### Semantic states
- Success: `#22C55E`
- Danger/report/destructive: `#EF4444`
- Do **not** use red/pink as the brand primary.
- Do **not** introduce blue/purple/green accents unless they are semantic or required by external branding.

## Color hierarchy
1. Backgrounds: black / near-black.
2. Content and typography: white / neutral gray.
3. Interaction and premium emphasis: gold.
4. Semantic colors only for status, error, success, online indicators, reports, or warnings.

### Gold usage rule
Gold should normally occupy less than ~15% of a screen. Use it for:
- primary CTA;
- selected nav/tab;
- match/like/premium highlight;
- focus ring;
- small icon or badge;
- logo.

Never turn entire cards, forms, chat areas, or large panels gold.

## Logo asset rules
Source package paths:
- `/assets/brand/png/logo-primary-gold.png`: hero, splash, authentication, marketing.
- `/assets/brand/png/logo-horizontal-gold.png`: main desktop header/sidebar.
- `/assets/brand/png/logo-horizontal-white.png`: dark surfaces where a simpler monochrome mark is preferred.
- `/assets/brand/png/logo-horizontal-black.png`: white/light backgrounds.
- `/assets/brand/png/logo-wordmark-gold.png`: wordmark-only placements.
- `/assets/brand/png/emblem-gold.png`: profile/menu/premium brand moments.
- `/assets/brand/png/icon-gold.png`: compact app icon.
- `/assets/icons/favicon.ico`: browser favicon.

Rules:
- Preserve aspect ratio; never stretch.
- Never recolor the gold logo to random hues.
- Never place gold logo over a busy photo without a dark overlay.
- Minimum clear space around logos: at least 20% of the logo height.
- Header logo target height: 32–44 px desktop, 28–36 px mobile.
- Prefer horizontal logo in navigation and emblem-only for compact mobile/icon contexts.

## Dating-product UI direction
Reference pattern: premium modern relationship apps, but Himeros must retain its own identity.

### Discovery
- Use a dominant photo card.
- Photo is the hero; UI chrome must stay secondary.
- Gradient overlay at the bottom for readable profile info.
- Name, age, location/activity, and 2–4 compact profile tags.
- Primary action group should be visually obvious and reachable.
- Like/premium actions use gold rather than Tinder-style red/pink.
- Pass/close remains neutral white/gray.

### Matches & messages
- Dark sidebar/panel.
- Match avatars use circular or softly rounded treatment.
- Selected conversation: subtle elevated surface + a 2–3 px gold indicator.
- Message composer stays neutral; send/primary action may use gold.
- Avoid gold chat bubbles; it harms readability and looks excessive.

### Profile
- Large photography with strong visual hierarchy.
- Use near-black surfaces for sections.
- Profile completion/premium state can use gold.
- Avoid thick gold borders around every card.

### Premium
Premium can use richer gold treatment but still needs restraint:
- gold headline/icon;
- gold CTA;
- subtle gold glow/gradient;
- black card background.
Never use giant glossy gold blocks as the entire interface.

## Typography
Use a clean sans-serif for UI. Recommended stack:
`Inter, Manrope, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`

Use classical serif only for selective marketing/brand headlines, never for dense app UI. Good serif direction: Cinzel, Cormorant Garamond, or a Trajan-like alternative if licensing permits.

## Layout & components
- Standalone Angular components.
- Prefer `ChangeDetectionStrategy.OnPush`.
- Prefer Signals for local UI state.
- Lazy-load route features.
- Keep feature boundaries intact; do not put all UI into `app.component`.
- Reuse shared primitives for buttons, dialogs, cards, avatar, badge, skeleton, empty state, toast, tabs and icon buttons.
- All components must have loading, empty, error, disabled and keyboard-focus states where relevant.

## Spacing and radius
Use a 4 px base spacing system: 4, 8, 12, 16, 20, 24, 32, 40, 48.
- Small radius: 10 px
- Default card: 16 px
- Large/photo card/dialog: 20–24 px
- Pills/actions: 999 px

## Accessibility
- Maintain WCAG AA contrast for functional text.
- Gold CTA uses dark text (`#111111` or `#070707`).
- Do not rely on color alone for match, online, error, premium, or selected states.
- Every icon-only button must have accessible name/`aria-label`.
- Visible `:focus-visible` states are mandatory.
- Interactive target size should be at least 44×44 px on touch surfaces when practical.
- Respect `prefers-reduced-motion`.

## Motion
Use restrained motion:
- hover/focus: 120–180 ms;
- card transitions: 180–260 ms;
- avoid bounce-heavy animations;
- swipe/discovery interactions may use spring-like motion but must remain performant and interruptible.

## Do
- Make photography the hero.
- Use black surfaces + white typography + strategic gold.
- Keep navigation and cards visually calm.
- Use gold to communicate desire/premium/selection.
- Keep responsive behavior first-class.
- Preserve backend contracts and existing frontend feature boundaries during UI refactors.

## Do not
- Do not restore the old blue brand palette.
- Do not use Tinder red/pink as the Himeros primary color.
- Do not copy another product's trademarked branding, icons, logo, copy, or exact visual assets.
- Do not add random gradients, neon purple, glassmorphism everywhere, or huge shadows.
- Do not use gold text for paragraphs.
- Do not use the detailed emblem at tiny sizes; use `icon-gold.png`/favicon.
- Do not replace functional Angular patterns just to achieve styling.

## CSS token source of truth
Import `/styles/himeros-brand.css` globally and use CSS custom properties. Prefer:
```css
color: var(--himeros-text);
background: var(--himeros-background);
border-color: var(--himeros-border);
```
Do not scatter literal hex values through component styles unless implementing semantic exception states.

## Angular integration
Recommended `styles.scss`:
```scss
@use './styles/himeros-brand';
```
Or copy/import `himeros-brand.css` from the asset package into the application's global styles.

Example primary button:
```scss
.primary-action {
  background: var(--himeros-primary);
  color: var(--himeros-primary-foreground);
  border-radius: var(--himeros-radius-pill);
}
.primary-action:hover { background: var(--himeros-gold-hover); }
```

## AI acceptance checklist
Before considering a Himeros frontend change finished, verify:
- [ ] Gold/black/white palette is respected.
- [ ] No legacy blue primary branding remains.
- [ ] Logo variant matches the background and placement.
- [ ] Gold is accent, not dominant page fill.
- [ ] Desktop, tablet and mobile layouts work.
- [ ] Keyboard/focus/labels are present.
- [ ] Loading, empty, error and disabled states exist where needed.
- [ ] Existing APIs/contracts were not changed purely for UI work.
- [ ] Feature boundaries and reusable components were preserved.
- [ ] The result looks like Himeros, not a clone of another dating brand.
