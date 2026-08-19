# Event and Messaging Specification

## Why events exist

Events communicate completed facts to independently evolving consumers. They are not a replacement for every method call.

## Current topics

- `himeros.identity.events.v1`
- `himeros.match.events.v1`
- `himeros.messaging.events.v1`
- `himeros.billing.events.v1`

Additional domains may receive topics when actual consumers exist.

## Required event properties

```json
{
  "eventId": "uuid",
  "eventType": "himeros.match.created.v1",
  "aggregateType": "Match",
  "aggregateId": "uuid",
  "occurredAt": "ISO-8601",
  "correlationId": "uuid",
  "payload": {}
}
```

Future envelope additions should include `causationId`, trace context and explicit schema version if not inferable from event type.

## Delivery semantics

The platform assumes **at-least-once** delivery.

Therefore:
- side-effect consumers use idempotency records;
- handlers can safely receive the same event repeatedly;
- retries use exponential/backoff policy;
- unrecoverable records land in a DLT;
- DLT replay is an operational action, not an automatic infinite loop.

## Ordering

Where ordering matters, partition by aggregate/conversation key.

Do not assume ordering across unrelated aggregates.

## Event design

Good:
- `MatchCreated`
- `MessageSent`
- `PaymentCaptured`

Avoid:
- `UpdateDatabase`
- `DoNotification`
- generic `EntityChanged` payloads that leak internal persistence.

## Saga

Use only for cross-service business processes after extraction. The initial modular monolith should prefer a local PostgreSQL transaction where all participants are still in the same deployment/database boundary.

Financial flows should favor orchestration once distributed because compensation and audit requirements are clearer.

## Enterprise Integration Patterns used

- Event Message
- Publish-Subscribe Channel
- Correlation Identifier
- Idempotent Receiver/Consumer
- Dead Letter Channel
- Competing Consumers
- Process Manager/Saga where justified
