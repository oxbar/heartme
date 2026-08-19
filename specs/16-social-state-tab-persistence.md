# Social state persistence between Matches and Messages

## Problem

`/app/matches`, `/app/messages` and the desktop sidebar previously loaded their own independent copies of matches and conversations. Angular destroys and recreates route components while switching tabs. A transient empty response during that navigation could therefore replace a valid match list with `[]`, making an existing match disappear until another route forced a fresh request.

## Decision

Matches and conversations are authenticated-session state and now live in a root `SocialStateStore`.

The store:

- is shared by the sidebar, Matches page and Messages page;
- deduplicates concurrent refreshes;
- preserves the last known-good non-empty lists during navigation refreshes;
- resets automatically when the authenticated user changes;
- removes a match and its conversation immediately after explicit unmatch;
- is refreshed after a new reciprocal match is detected in Discovery.

Route components may still enrich cards with profiles, photos and presence, but they no longer own the canonical match/conversation arrays.

## Regression contract

Given an ACTIVE match between A and B:

1. A opens `/app/matches` and sees B.
2. A opens `/app/messages`.
3. A returns to `/app/matches`.
4. B must still be rendered without requiring a visit to Discovery or a manual reload.

An empty or failed navigation refresh must not erase an already loaded match. Only an explicit domain action such as unmatch may remove it from the session store.
