# Match tab rehydration and route persistence

## Problem

A reciprocal match could be created correctly in the backend but disappear from the Matches/Messages UI after route navigation. The failure was timing-sensitive: Discovery could receive `mutualLike=true`, then navigate/refresh social state before the AFTER_COMMIT match reconciliation was visible to the next `/matches` request. A transient empty response became the route state. Visiting Discovery later caused another refresh and the match appeared again.

## Invariants

- Navigating `/app/matches -> /app/messages -> /app/matches` never consumes or deletes a match.
- An empty transient HTTP snapshot must not replace a known ACTIVE match.
- An active conversation is authoritative evidence of an ACTIVE match because the backend only lists conversations whose counterpart is still an active match.
- A match detected in Discovery is written to the shared social store before route navigation.
- Explicit unmatch remains authoritative and removes both match and conversation locally immediately.
- Social state is scoped by authenticated user and may not leak between accounts.

## Implementation

`SocialStateStore` is the session source of truth for matches and conversations. It now:

1. retries all-empty social snapshots briefly during navigation;
2. reconstructs an ACTIVE match from an active `ConversationView` when `/matches` is temporarily empty;
3. persists the last known-good snapshot in `sessionStorage`, keyed by authenticated user id;
4. restores that snapshot if the service/application is recreated in the same browser session;
5. exposes `rememberMatch()` so Discovery can seed a confirmed match immediately;
6. keeps known cards visible while a background refresh is running.

Discovery always performs the active-match lookup even when the interaction response already says `mutualLike=true`. This prevents short-circuiting the authoritative match lookup.

## Regression tests

The store tests cover:

- transient empty `/matches` response;
- recovery from an active conversation;
- service recreation / sessionStorage hydration;
- immediate `rememberMatch()` seeding;
- explicit unmatch removal;
- account isolation.
