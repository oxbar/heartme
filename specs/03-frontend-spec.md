# Frontend Development Specification

## Stack and Angular strategy

- Angular 22.x
- standalone components;
- lazy route boundaries;
- Signals for local/application state;
- Signal Forms for new forms;
- functional interceptors and guards;
- HttpClient for REST;
- `@stomp/stompjs` for WebSocket/STOMP;
- Vitest;
- strict TypeScript and strict Angular templates.

## Route map

Public:
- `/`
- `/login`
- `/register`

Authenticated onboarding:
- `/onboarding`

Authenticated shell:
- `/app/discover`
- `/app/matches`
- `/app/messages`
- `/app/messages/:id`
- `/app/profile`
- `/app/profile/edit`
- `/app/profiles/:id`
- `/app/premium`
- `/app/notifications`
- `/app/safety`
- `/app/settings`

## Frontend architecture

```text
src/app/
  core/
    api/
    auth/
    realtime/
    state/
  shared/
  layout/
  features/
```

`core/api` is the only normal entry point to backend REST contracts. Feature components must not hand-build API URLs.

## State policy

Signals are preferred for:
- session token state;
- loaded profile;
- local screen state;
- async status.

Do not introduce a global state library by default. Add one only if state transition complexity or cross-feature orchestration becomes objectively difficult, and capture the decision in an ADR.

## Browser token policy

- never store refresh token in localStorage/sessionStorage/IndexedDB;
- access token is memory-only;
- startup attempts an HttpOnly-cookie refresh;
- interceptor attaches Bearer token;
- one failed authenticated request may attempt token refresh then retry;
- logout clears the refresh cookie and memory token.

## Forms

New forms use Signal Forms:
- writable signal is the model;
- validators are defined in `form()`;
- `[formField]` binds controls;
- show validation feedback after touch;
- `submit()` coordinates async submission.

Server validation remains authoritative.

## UI/UX

Design language:
- neutral/light canvas;
- blue primary;
- restrained rounded surfaces;
- strong typography;
- minimal decorative noise;
- responsive desktop sidebar;
- fixed mobile bottom navigation.

Every async page handles:
1. loading;
2. empty;
3. error;
4. success.

## Accessibility

- semantic landmarks;
- label every input;
- keyboard-operable actions;
- native button/anchor semantics before ARIA;
- visible focus;
- meaningful image alt text;
- color cannot be the only state signal;
- touch targets designed for mobile.

## Performance

- feature routes lazy-loaded;
- avoid loading all profile images at full size in production;
- future image CDN should serve responsive derivatives;
- lists must use `track`;
- avoid expensive template calls for dynamic computations;
- use computed signals for derived state.

## Backend synchronization

The handwritten `core/api/contracts.ts` is a bootstrap implementation. Before production, generate API types/clients from the backend OpenAPI document in CI and fail the build on incompatible contract drift.
