# HTTP and Realtime Contract

Base: `/api/v1`

## Authentication

### Register
`POST /auth/register`

```json
{"email":"person@example.com","password":"minimum-10-chars"}
```

### Native/mobile login
`POST /auth/login`

Returns access + refresh token JSON.

### Browser login
`POST /auth/web/login`

Returns access token JSON and sets rotating HttpOnly refresh cookie.

### Browser refresh
`POST /auth/web/refresh`

Uses HttpOnly cookie, rotates it and returns a new access token.

### Browser logout
`POST /auth/web/logout`

Revokes current refresh token and deletes cookie.

### Logout all
`POST /auth/logout-all` with Bearer access token.

## Profile

- `GET /profile`
- `GET /profile/{userId}` — public-safe projection only; excludes exact coordinates, birth date and private discovery filters
- `PUT /profile`

Important constraints:
- birth date must be past;
- service enforces 18+;
- min/max age 18..99;
- distance 1..500 km;
- max 30 interests;
- at least one `lookingFor` gender.

### Gender enum
Values: `MAN | WOMAN | NON_BINARY | OTHER` (sent in profile `gender` and in `lookingFor[]`).

## Media

- `GET /media/photos`
- `GET /media/photos/users/{userId}`
- `POST /media/photos/batch` — batch photo lookup for up to 100 user IDs, used to avoid discovery N+1 requests
- `POST /media/photos` multipart field `file`
- `DELETE /media/photos/{photoId}`

## Discovery / interactions

- `GET /discovery?limit=20`
  - hard filters use the current viewer's `lookingFor`, explicit strict age/distance, safety state, match state and cooldown state;
  - `preferredBodyTypes`, non-strict age/distance, interests, activity and behavioral affinity are ranking features rather than hard exclusions;
  - `globalMode=true` bypasses the viewer's strict distance radius;
  - the candidate's private discovery preferences are not reverse-applied to the viewer's feed;
  - candidate must still be `discoverable=true` and not blocked/reported by the viewer;
  - past interactions re-enter after configurable cooldowns instead of being permanently hidden by `seen`.
- `POST /interactions/{targetUserId}`

```json
{"type":"LIKE"}
```

Types:
`LIKE | PASS | SUPER_LIKE`

## Matches

- `GET /matches`
- `DELETE /matches/{matchId}`

## Messaging

- `GET /conversations`
- `GET /conversations/{id}/messages?before=<ISO_INSTANT>&limit=50`
- `POST /conversations/{id}/messages`
- `POST /conversations/{id}/read`

Send body:

```json
{"content":"Olá!"}
```

### WebSocket

Handshake endpoint:
`/ws`

STOMP CONNECT header:
`Authorization: Bearer <access-token>`

Subscribe:
`/topic/conversations/{conversationId}`

The browser currently sends messages through REST and receives realtime fan-out through STOMP, simplifying command error semantics.

## Trust & Safety

- `POST /safety/blocks/{targetUserId}`
- `DELETE /safety/blocks/{targetUserId}`
- `POST /safety/reports/{targetUserId}`

## Premium

- `GET /premium/subscription`
- `POST /billing/purchase`

Plans:
`MONTHLY | QUARTERLY | YEARLY`

## Notifications

- `GET /notifications?limit=30`
- `POST /notifications/{id}/read`

## Contract evolution

- additive changes are preferred;
- breaking HTTP changes require `/v2` or a migration plan;
- event schema breaking changes require a new event type/schema version;
- CI should diff OpenAPI and event schemas before merge.

### Discovery Engine V2

- `GET /discovery/page?limit=20&cursor=<opaque>` — cursor page with `items`, `nextCursor`, `poolSize`, `eligibleCount`.
- `POST /discovery/{candidateId}/view` — impression signal; never overwrites a stronger LIKE/PASS/SUPER_LIKE interaction.
- `GET /discovery/explain/{candidateId}` — returns eligibility reason, cooldown, normalized ranking features, active weights and final score.
- `PASS`/`VIEW` are cooldown-based instead of permanent `seen` exclusions.
- active matches are excluded; unmatched profiles use a configurable cooldown.
- soft preferences rank candidates; only explicit strict/safety rules hard-filter them.
