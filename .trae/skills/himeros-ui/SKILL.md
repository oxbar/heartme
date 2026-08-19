---
name: himeros-ui
description: Build and evolve the Himeros Angular design system using shadcn-style open-code composition and Radix-style accessibility principles without importing React primitives.
---

# Himeros UI Skill

## Design intent

Himeros uses an owned Angular design system inspired by the qualities of shadcn and Radix: composable primitives, neutral defaults, predictable variants, accessibility-first interactions, and source code that belongs to the application.

This is **not** permission to paste React components into Angular.

## Design tokens

Global design tokens live in `frontend/src/styles.css` and are the source of truth for:

- canvas/surface/elevated colors;
- foreground/muted/border colors;
- primary/destructive/success/warning semantic colors;
- radii;
- shadows;
- focus rings;
- typography and spacing conventions.

Do not add random hexadecimal colors, radii or shadows to feature pages when an existing token works.

## Primitive hierarchy

1. **Native HTML first** — button, anchor, input, select, textarea, dialog when browser support/UX is adequate.
2. **Himeros primitive** — reusable visual API in `src/app/ui`.
3. **Angular Aria/CDK behavior** — for focus management, keyboard interactions and complex WAI-ARIA widgets.
4. New external UI dependency only after an ADR demonstrates a real gap.

## Existing primitives

- `hmButton`: variants and sizes; never recreate primary/outline/ghost buttons per feature.
- `hm-icon`: consistent SVG product icons.
- `hm-avatar`: image/fallback/avatar semantics.
- `hm-badge`: compact semantic status/metadata.
- `hm-skeleton`: predictable loading placeholders.
- `hm-empty-state`: reusable empty/error-like zero-state composition.
- `hm-page-header`: route title, description and actions.
- `hm-brand`: product mark/wordmark.

## Component quality bar

A reusable UI component must:

- have a small typed input/output API;
- be standalone and OnPush;
- preserve native semantics;
- expose focus states;
- work at keyboard and touch sizes;
- avoid product/business rules;
- avoid HTTP/state-store dependencies;
- support long labels and responsive layouts;
- use host classes/attributes predictably.

## Visual language

- Professional dating product, not game UI.
- Neutral white/ink surfaces with blue as the primary accent.
- Strong hierarchy, generous whitespace and compact controls.
- Borders before heavy shadows.
- Rounded corners are consistent, not random.
- Avoid gradients unless they communicate brand/hero emphasis.
- Avoid glassmorphism, neon, excessive glow and emoji chrome.
- Keep motion subtle and honor reduced-motion preferences.

## UX states

Every data-driven route must define:

- skeleton/loading;
- recoverable error with retry when meaningful;
- empty state with a next action;
- populated state;
- mutation/submitting/disabled state;
- destructive confirmation where applicable.

## Forms

- Label + control + hint/error as a unit.
- Do not use placeholder as the only label.
- Validation copy says what to do next.
- Preserve user-entered values on server errors.
- Disable duplicate submissions while submitting.
- Destructive actions visually and semantically differ from primary actions.

## Responsive behavior

- Mobile-first layout must remain complete, not a squeezed desktop page.
- Desktop uses application sidebar; mobile uses bottom navigation.
- Primary touch targets target comfortable mobile size.
- Cards and text must handle long names/cities without breaking layout.
- Critical actions stay reachable with one hand on mobile where practical.
