---
name: himeros-api-integration
description: Connect Angular features to the Himeros Spring backend without contract drift, duplicated endpoints, unsafe auth storage or N+1 request patterns.
---

# Himeros API Integration Skill

## Authority order

1. Backend controller/OpenAPI behavior.
2. `specs/04-api-contract.md`.
3. `frontend/src/app/core/api/contracts.ts`.
4. Feature UI.

If these disagree, stop propagating the mismatch and align the contract.

## REST rules

- Only `core/api/*` owns endpoint paths and HttpClient calls.
- Feature components call typed API methods.
- Use relative URLs so proxy/reverse-proxy selects the backend origin.
- Encode user-provided path/query data.
- Pagination/cursor is mandatory for unbounded collections.
- Prefer batch APIs for fan-out data such as photos.
- Do not hide HTTP errors; translate them into actionable UI state.

## Browser authentication

- Access token: memory only.
- Refresh credential: HttpOnly/Secure/SameSite cookie controlled by backend.
- Startup may restore session through refresh.
- Interceptor attaches Bearer access token.
- A refresh flow must be single-flight so concurrent 401 responses do not create refresh storms.
- Logout clears memory state and server cookie/session.

## Realtime messaging

- Authenticate the WebSocket/STOMP connection using supported backend contract.
- Subscribe only to conversation topics the backend authorizes.
- REST remains source for history/pagination and mutation acknowledgement.
- Realtime events update the current view idempotently; duplicate delivery must not duplicate messages.
- Disconnect subscriptions when route/component is destroyed.

## DTO rules

- Never use owner/private profile DTO where a public profile DTO is expected.
- Exact coordinates and private discovery preferences stay private.
- Do not expose backend persistence entities to templates.
- Prefer discriminated/explicit status types over magic strings when contracts allow it.

## Error policy

Classify UI behavior:

- 400/422: validation/actionable input issue;
- 401: refresh/login flow;
- 403: permission/business access denial;
- 404: resource absent / route state;
- 409: conflict/idempotency/business race;
- 429: rate-limit feedback;
- 5xx/network: retryable service state where safe.
