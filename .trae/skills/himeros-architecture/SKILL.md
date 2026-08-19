---
name: himeros-architecture
description: Review architectural changes to Himeros using DDD, microservice patterns, enterprise messaging patterns and measurable scaling needs.
---

# Himeros Architecture Skill

For structural changes, answer these questions before coding:

1. Which bounded context owns this capability?
2. What data does it own?
3. Which invariant needs strong consistency?
4. Which updates can be eventually consistent?
5. Is the caller asking for a command result or propagating a fact?
6. What happens when the dependency is unavailable?
7. What is the retry/idempotency strategy?
8. What are the privacy/abuse implications?
9. Can the current modular deployment satisfy the load/SLO?
10. What measurable reason justifies a new process/service/database?

## Preferred patterns

Use when the problem requires them:
- Bounded Context / decomposition by subdomain
- Hexagonal adapters around external systems
- Transactional Outbox
- Idempotent Consumer
- Publish/Subscribe
- Correlation Identifier
- Dead Letter Channel
- Circuit Breaker for remote calls
- Saga for genuinely distributed business transactions
- CQRS for materially different read models

## Extraction rule

Design boundaries now; extract later.

A candidate service extraction requires an ADR containing:
- current bottleneck/failure isolation issue;
- expected workload;
- ownership/team boundary;
- API/event contract;
- data migration strategy;
- observability;
- rollback plan;
- added operational cost.

Update `/docs/architecture/*.puml` after approval.
