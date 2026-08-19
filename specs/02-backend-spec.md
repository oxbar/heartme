# Backend Development Specification

## Stack

- Java 21
- Spring Boot 3.5.x
- Spring Modulith
- Spring Security Resource Server
- Spring Data JPA
- PostgreSQL + Flyway
- Redis
- Apache Kafka
- Spring Kafka retry/DLT
- Micrometer / Prometheus / OpenTelemetry
- Springdoc OpenAPI
- JUnit + Spring Boot Test + Testcontainers

## Package policy

```text
com.himeros
  identity
  profile
  media
  recommendation
  interaction
  match
  messaging
  trustsafety
  notification
  billing
  premium
  shared
```

`shared` is kept intentionally small. It must not become a dumping ground for domain rules.

## Layering inside a module

For larger modules, evolve toward:

```text
api/
application/
domain/
infrastructure/
```

The current baseline may use a flatter package where the module is still small; preserve dependency direction as complexity grows.

## Controller rules

Controllers:
- validate transport input;
- map HTTP semantics;
- call application services;
- never contain domain decisions;
- never access repositories directly.

## Persistence rules

- migrations are additive and versioned;
- never use `ddl-auto=update/create` outside disposable experiments;
- UTC timestamps;
- UUID identifiers;
- avoid large eager graphs;
- protect uniqueness with DB constraints, not only Java checks;
- queries must be bounded.

## Authentication

Native/mobile:
- JSON access + refresh token pair.

Browser:
- short-lived access token in JSON;
- refresh token in HttpOnly rotating cookie;
- cookie scoped to `/api/v1/auth/web`;
- production enables `Secure`;
- frontend keeps access token only in memory.

Refresh tokens are SHA-256 hashed before persistence and support revocation/rotation.

## Events

Envelope:
- eventId;
- eventType;
- aggregateType;
- aggregateId;
- occurredAt;
- correlationId;
- causationId where available;
- schemaVersion;
- payload.

Naming:
`himeros.<domain>.<fact>.v1`

Kafka topic naming:
`himeros.<domain>.events.v1`

## Outbox

Business mutation and outbox row are in the same PostgreSQL transaction. A relay publishes after commit. Publishing is at-least-once; consumers deduplicate using `eventId + consumer`.

## Messaging

- REST for history and command fallback;
- WebSocket/STOMP for realtime delivery;
- authorization checks conversation membership;
- message payload max 4000 chars;
- future high-volume design should move realtime routing to a separately scalable edge service while preserving the domain API.

## Media

Current local adapter:
- JPEG/PNG/WEBP;
- max request enforced by Spring;
- per-user count;
- storage key generated server-side.

Production adapter must use object storage, presigned upload, content scanning, EXIF removal, resizing, moderation and CDN.

## Error handling

One consistent error envelope; do not leak stack traces, SQL or secrets to clients.

## Production extensions

Tracked in `specs/09-production-readiness.md`.
