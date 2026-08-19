# Himeros engineering instructions

These instructions apply to all coding agents, including TRAE.

## Non-negotiable architecture

- Preserve bounded contexts: identity, profile, media, recommendation, interaction, match, messaging, trust & safety, notification, billing, premium.
- Do not introduce a microservice without an ADR and a measurable operational reason.
- Do not access another module's repository or internal entity directly. Cross-module communication uses public application/domain interfaces or events.
- PostgreSQL is the transactional source of truth. Redis is acceleration/ephemeral state, never authority for payments, matches, identity or subscriptions.
- Events are facts in past tense and versioned (`himeros.<domain>.<event>.v1`).
- Database + event publication uses Transactional Outbox.
- Consumers must tolerate at-least-once delivery and be idempotent.
- Sagas are reserved for genuine multi-boundary distributed workflows.
- CQRS is selective, not a default for CRUD.

## Angular

- Use standalone components and lazy route boundaries.
- Prefer Signals for local/reactive state.
- New forms use Angular Signal Forms.
- Use functional interceptors/guards and `inject()`.
- Do not add NgRx unless state complexity justifies it in an ADR.
- No business rules inside templates.
- Every async screen must handle loading, empty, error and success states.
- Accessibility: semantic elements, labels, keyboard support, visible focus, appropriate ARIA only when native semantics are insufficient.
- Backend contracts live in `frontend/src/app/core/api/contracts.ts`; keep them synchronized with OpenAPI.

## Backend

- Java 21.
- Constructor injection.
- `@Transactional` at application/service boundaries.
- Controllers translate HTTP only; domain behavior lives outside controllers.
- Flyway only for schema evolution.
- No `ddl-auto=create/update`.
- Avoid bidirectional JPA graphs.
- Pagination/cursors for unbounded collections.
- Never log passwords, refresh tokens, authorization headers or private message bodies.
- External integrations are behind ports/adapters.

## Definition of done

- Build succeeds.
- Tests for changed behavior.
- No secrets committed.
- Specs/API contract updated when behavior changes.
- New architectural decision has an ADR.
- Error/loading/empty UI states covered.
