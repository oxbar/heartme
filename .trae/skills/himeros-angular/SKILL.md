---
name: himeros-angular
description: Implement Himeros Angular web features with strict feature boundaries, lazy routing, Signals, Signal Forms, owned UI primitives, API contract discipline and production UX states.
---

# Himeros Angular Skill

## Read first

- `/AGENTS.md`
- `/.trae/rules/himeros-project.md`
- `/.trae/skills/angular-developer/SKILL.md`
- `/.trae/skills/himeros-ui/SKILL.md`
- `/.trae/skills/himeros-api-integration/SKILL.md`
- `/specs/03-frontend-spec.md`
- `/specs/04-api-contract.md`
- `/specs/06-security.md`

## Required source layout

```text
src/app/
  core/        # API, auth, realtime, app-wide state
  ui/          # reusable presentational/headless primitives
  layout/      # application shell and navigation
  features/    # route-level product capabilities
```

Do not create a generic dumping-ground `shared/` directory.

## Feature workflow

1. Identify the route and backend capability.
2. Read `core/api/contracts.ts` and the relevant API service before touching UI.
3. Reuse or extend `src/app/ui` primitives before adding one-off buttons/cards/avatars/loaders.
4. Keep route components lazy.
5. Keep API calls out of reusable UI primitives.
6. Model loading, error, empty, success, disabled and submitting states where relevant.
7. Test keyboard, narrow viewport and long-content behavior mentally and in browser when available.
8. Run type check, production build and tests.

## Non-negotiable Angular rules

- Standalone only.
- Signals for local reactive state.
- Signal Forms for new forms.
- `computed()` for derived state.
- `inject()` over constructor boilerplate.
- `ChangeDetectionStrategy.OnPush`.
- Native control flow, with `track` in `@for`.
- Route-level code splitting with `loadComponent` / `loadChildren`.
- `@defer` only where delayed content is truly secondary.
- No direct DOM manipulation unless a framework primitive cannot solve it; isolate unavoidable DOM access.
- No nested subscriptions; prefer promise conversion or composed RxJS at service boundaries.
- No `any` as an escape hatch.

## API communication

- Feature code never writes `/api/...` URL literals.
- REST paths stay centralized under `core/api`.
- Access token is memory-only.
- Browser refresh uses HttpOnly cookie endpoints.
- Never persist authentication tokens in localStorage/sessionStorage/IndexedDB.
- Chat commands/history use REST; realtime delivery uses STOMP `/ws`.
- Do not invent endpoints when a backend endpoint exists.
- If a contract changes, change backend/OpenAPI/spec/types together.

## UI rules

- Product chrome uses the Himeros design system, never emoji icons.
- Reuse `hmButton`, `hm-icon`, `hm-avatar`, `hm-badge`, `hm-skeleton`, `hm-empty-state`, `hm-page-header`, `hm-brand`.
- Keep pages composition-oriented; repeated patterns become UI components.
- Avoid giant inline templates/styles. Split a component when it owns a distinct interaction, can be reused, or makes route code difficult to reason about.
- Use restrained surfaces and consistent spacing/tokens rather than arbitrary per-page values.

## Forbidden shortcuts

- React dependencies just to copy shadcn/Radix.
- direct Radix React primitives in Angular.
- Bootstrap/Material/Tailwind/Spartan added casually without an ADR for design-system impact.
- NgRx by default.
- service calls from templates.
- auth tokens in browser storage.
- `prompt()`/`alert()` for production workflows.
- emoji as functional navigation icons.
- hard-coded backend origins inside feature components.
