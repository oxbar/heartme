# Himeros — Desktop Dating UI Redesign

This frontend keeps the existing Angular architecture and backend contracts, while replacing the authenticated application shell with a desktop dating-product layout inspired by the supplied Tinder wireframes.

## Implemented screen structure

- Persistent 380px desktop sidebar with Himeros branding, profile entry, shortcuts, Matches and Messages modes.
- Discovery stage with centered portrait card, photo progress, stacked/rotated next card, action dock and desktop keyboard shortcuts.
- Matches thumbnail grid using real match/profile/media APIs.
- Messages list in the persistent sidebar and a two-panel conversation workspace, producing the three-column desktop composition shown in the references.
- Own-profile preview with a dedicated account/settings sidebar mode.
- Profile editor with Tinder-style photo grid plus the existing Himeros profile fields and Signal Forms.
- Public profile view with photo navigation, profile details, block and report actions.
- Responsive mobile header, drawer and bottom navigation without changing the lazy-loaded route structure.

## Himeros visual identity

The layout geometry and interaction model follow the supplied references, but Tinder logos, copy and brand assets are not used. Himeros keeps its blue primary palette and its own labels, components, APIs and domain model.

## Architecture preserved

- Angular standalone components and lazy routes.
- Signals and OnPush change detection.
- API access remains in `core/api`.
- Existing auth/session/profile stores remain in place.
- Existing backend endpoints are reused; no frontend-only fake endpoint was introduced.
- Media batch endpoint is used for match/conversation thumbnail loading where applicable.

## Desktop shortcuts on Discover

- Left Arrow: Pass
- Right Arrow: Like
- Up Arrow: Open profile
- Enter: Super Like
- Space: Next photo

## Local validation commands

Use the Node version required by `package.json` (`>=22.22.3`), then run:

```bash
npm ci
npm run lint:types
npm run build:prod
npm test
```

Or build the complete stack from the repository root:

```bash
docker compose up -d --build
```
