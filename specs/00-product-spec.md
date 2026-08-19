# Himeros — Product Specification

## Mission

Himeros is an 18+ dating platform focused on intentional discovery, mutual matching, safe messaging and progressive personalization.

## Primary user journey

1. Register and authenticate.
2. Complete an 18+ profile and discovery preferences.
3. Add profile photos.
4. Receive ranked candidates.
5. Like, pass or super-like.
6. Mutual likes create one idempotent match.
7. A match creates a conversation.
8. Users exchange messages in real time.
9. Users can block or report another member.
10. Premium unlocks server-enforced entitlements.

## MVP capabilities

### Identity
- registration;
- login;
- short-lived JWT access tokens;
- rotating refresh tokens;
- per-device refresh sessions;
- logout and logout-all;
- browser HttpOnly refresh-cookie flow.

### Profile
- display name;
- biography;
- birth date and age enforcement (18+);
- gender;
- location metadata;
- age/distance preferences;
- discovery visibility;
- interests;
- gender preferences.

### Discovery & Recommendation
- candidate eligibility;
- block/seen filters;
- viewer-owned preference filtering (the current user controls their own feed);
- inbound visibility controlled by discoverable + trust/safety, not by reverse-applying the candidate's private preferences;
- geographical distance when coordinates exist;
- deterministic score based on interests + distance;
- ranked response.

### Interaction & Match
- LIKE / PASS / SUPER_LIKE;
- mutual-like detection;
- unique match;
- unmatch.

### Messaging
- match-created conversation;
- paginated history;
- send message;
- read receipts;
- WebSocket/STOMP updates;
- authorization by conversation membership.

### Trust & Safety
- block/unblock;
- report;
- excluded profiles removed from recommendation.

### Premium
- monthly, quarterly and annual plans;
- payment boundary;
- active subscription endpoint;
- fake local provider in the current baseline.

## Non-functional targets

These are design targets, not current benchmark claims.

- API P95 read target: <300 ms for ordinary core endpoints under expected MVP load.
- Availability target after production hardening: >=99.9%.
- Zero plain-text refresh tokens in persistence.
- Zero client-side browser persistence of refresh tokens.
- All unbounded data endpoints cursor/page bounded.
- Every externally visible state change traceable by request/event identifiers.
- Event consumers idempotent.
- Schema evolution migration-first.
- WCAG-oriented keyboard and semantic UI.

## Product principles

- Safety is a core domain, not an admin afterthought.
- Recommendation is a product capability, not a SQL query.
- A match is mutual consent, not simply two independent rows.
- Premium is an entitlement domain; UI visibility must never be the authorization mechanism.
- Design for future extraction, deploy according to demonstrated need.
