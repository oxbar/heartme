# Architecture Specification

## Architectural style

The initial backend is a **modular monolith with event-driven integration boundaries**. It is intentionally designed for future service extraction without requiring network distribution today.

### Core bounded contexts

- Identity
- Profile
- Media
- Recommendation
- Interaction
- Match
- Messaging
- Trust & Safety
- Notification
- Billing
- Premium

## Core rules

1. A bounded context owns its entities and repositories.
2. Another module must not import another module's persistence implementation.
3. Cross-context synchronous calls use an explicit public application/domain interface.
4. Cross-context facts use domain/application events.
5. Durable external publication uses Transactional Outbox.
6. Consumers assume at-least-once delivery and must be idempotent.
7. PostgreSQL is the system of record for core transactional state.
8. Redis is cache/coordination/ephemeral state only.
9. Kafka is an event backbone, not a transactional database.
10. CQRS and Saga are selective patterns, introduced where the problem exists.

## Integration styles

### Synchronous
Use HTTP/application calls where the caller needs the immediate result:
- login;
- profile read/update;
- discovery query;
- interaction command acknowledgement;
- message history;
- payment initiation.

### Event driven
Use versioned facts for propagation:
- UserRegistered;
- ProfileUpdated;
- MatchCreated;
- MessageSent;
- PaymentCaptured;
- SubscriptionActivated.

## Consistency

Strong/local consistency:
- credentials/session rotation;
- unique match creation;
- conversation membership;
- blocking;
- payment state;
- subscription state.

Eventual consistency:
- notifications;
- analytics;
- search projections;
- future recommendation features;
- counters.

## Data evolution path

Initial:
- PostgreSQL: identity/profile/interactions/matches/messages/payments/subscriptions/trust;
- Redis: rate limiting and ephemeral coordination;
- local media adapter for development;
- Kafka for outbox externalization.

Scale extraction candidates:
1. media processing;
2. realtime messaging gateway;
3. recommendation engine;
4. notification workers;
5. analytics ingestion;
6. only then transactional modules when organizational or workload boundaries justify it.

## Observability

- structured logs;
- Micrometer metrics;
- Prometheus endpoint;
- OpenTelemetry tracing bridge;
- correlation/causation IDs on event envelopes;
- health probes via Actuator.

See PlantUML diagrams in `docs/architecture/`.
