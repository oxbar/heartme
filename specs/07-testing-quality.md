# Testing and Quality Specification

## Test pyramid

### Backend
- pure unit tests for domain policies;
- repository integration tests against PostgreSQL via Testcontainers;
- security/controller tests;
- application flow tests;
- Spring Modulith boundary verification;
- outbox/idempotency tests;
- WebSocket authorization tests;
- migration validation.

### Frontend
- pure unit tests for utilities/state transitions;
- component tests for interactive screens;
- API service tests;
- guard/interceptor tests;
- accessibility assertions where practical;
- end-to-end critical journeys before release.

## Critical end-to-end scenarios

1. register → browser login → onboarding;
2. two users like each other → exactly one match;
3. match → exactly one conversation;
4. send message → history + realtime delivery;
5. block → candidate excluded;
6. report → report persisted;
7. purchase → active subscription;
8. logout → refresh revoked;
9. logout-all → all sessions revoked;
10. expired access → refresh rotation → request retry.

## Contract testing

Before production:
- generate OpenAPI from backend;
- generate/validate frontend client;
- diff contract in CI;
- add AsyncAPI/event schemas;
- compatibility test producer/consumer schemas.

## Static quality gates

Backend:
- Maven build;
- unit/integration tests;
- architecture test;
- dependency/security scan;
- formatting/static analysis.

Frontend:
- Angular production build;
- Vitest;
- strict TypeScript;
- bundle budgets;
- dependency/security scan.

## Definition of done

A feature is not done if:
- happy path works but error/empty/loading UI does not;
- authorization exists only in UI;
- a schema change has no Flyway migration;
- a new event consumer is not idempotent;
- API behavior changes without spec/contract change;
- new architecture bypasses a bounded context.
