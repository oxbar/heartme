---
name: himeros-backend
description: Implement Himeros Java/Spring backend behavior with modular boundaries, secure contracts, transactional consistency and event reliability.
---

# Himeros Backend Skill

## Read first

- `/AGENTS.md`
- `/specs/01-architecture.md`
- `/specs/02-backend-spec.md`
- `/specs/04-api-contract.md`
- `/specs/05-events.md`
- `/specs/06-security.md`

## Workflow

1. Identify the owning bounded context.
2. Put the rule in its domain/application service, not controller.
3. Decide required consistency before choosing sync/event communication.
4. Preserve module ownership.
5. If persistence changes, add a Flyway migration.
6. If publishing a durable fact, append to Outbox in the same transaction.
7. Make consumers idempotent.
8. Add authorization at the server boundary.
9. Add tests for success, authorization, duplicate/retry and invalid input where relevant.
10. Run `mvn test`.

## Security

- Never return a refresh token to browser-specific endpoints.
- Never log credentials/tokens/private message contents.
- IDs in URLs are untrusted; verify ownership/membership.
- Keep JWT access lifetime short.
- Production cookie must be Secure.
- Premium checks must remain server-side.

## Data

- PostgreSQL source of truth.
- Redis only for cache/rate limit/ephemeral coordination.
- Avoid cross-module repository access.
- Avoid N+1 and unbounded queries.
- Use DB uniqueness constraints for invariants that must survive races.

## Events

Event names are facts in past tense and versioned.
Use a bounded, stable payload; do not serialize JPA entities.
At-least-once delivery is expected.

## Do not

- split a service because "microservices scale";
- introduce distributed transactions;
- call Kafka before committing business state;
- use `ddl-auto=update`;
- make controller-level authorization the only authorization;
- hide production integration gaps behind fake providers.
