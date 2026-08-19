# Himeros Project Rule

Before modifying code, read the closest relevant specification in `/specs` and the matching `.trae/skills/*/SKILL.md`.

## Preserve these architecture decisions

- Backend remains a modular monolith until an ADR proves a deployment boundary is needed.
- Angular talks to the backend only through `core/api`.
- Browser refresh credentials never enter JavaScript storage.
- Database schema is Flyway-owned.
- Kafka publication goes through Outbox for business facts.
- Cross-domain consumers are idempotent.
- Trust & Safety is a first-class domain.
- Recommendation remains replaceable behind its application boundary.
- Do not invent mock endpoints when a real backend endpoint already exists.
- If frontend/backend contract changes, update `specs/04-api-contract.md`.
- If architecture changes, update PlantUML and create an ADR under `docs/adr/`.

## Frontend hard rules

- Angular-only: do not add React or copy React shadcn/Radix source into this application.
- Standalone components only; do not add NgModules.
- Route features remain lazy with `loadComponent`/`loadChildren`.
- New forms use Signal Forms.
- Signals + computed state are the default local state model.
- Use functional guards/interceptors and `inject()`.
- Use `ChangeDetectionStrategy.OnPush`.
- Product chrome uses `src/app/ui` primitives; no emoji navigation/icons.
- No new `shared/` dumping ground.
- Do not recreate button/avatar/badge/skeleton/empty-state styling inside features.
- No backend URL literals inside feature components.
- Every async screen models loading/error/empty/success.
- Complex custom widgets use native semantics or Angular Aria/CDK behavior, not improvised keyboard/focus logic.
- Keep bundle budgets and lazy boundaries; do not solve regressions by simply increasing budget limits.

## Required completion checks

Backend change:

```bash
mvn test
```

Frontend change:

```bash
npm run lint:types
npm run build:prod
npm test
```

Full change: run both suites and document any environment-dependent check that could not be executed. Never silently disable a failing test.
