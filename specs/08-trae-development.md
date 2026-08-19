# TRAE Premium Development Specification

## Project-local context

TRAE should treat these files as authoritative, in this order:

1. `AGENTS.md`
2. `.trae/rules/himeros-project.md`
3. relevant `.trae/skills/*/SKILL.md`
4. `specs/*`
5. existing source/code tests.

## Included Himeros project skills

- `himeros-angular`: Angular implementation conventions and backend communication.
- `himeros-backend`: Java/Spring/domain/event conventions.
- `himeros-architecture`: architecture review before structural changes.

## Official Angular skill

Run:

```bash
./scripts/install-official-angular-skill.sh
```

It installs the upstream Angular `angular-developer` skill into:

```text
.trae/skills/angular-developer/
```

The directory is gitignored so the project can refresh upstream guidance without vendoring a stale copy.

## Recommended TRAE prompts

### New frontend feature

```text
Read AGENTS.md, specs/03-frontend-spec.md, specs/04-api-contract.md,
.trae/skills/himeros-angular/SKILL.md and the installed angular-developer skill.
Implement <feature>. Preserve standalone/lazy/Signals/Signal Forms conventions.
Run Angular build/tests and update specs when the contract changes.
```

### Backend change

```text
Read AGENTS.md, specs/01-architecture.md, specs/02-backend-spec.md,
specs/05-events.md and .trae/skills/himeros-backend/SKILL.md.
Implement <feature> without breaking module ownership. Add migration/tests.
```

### Architecture change

```text
Read specs/01-architecture.md and .trae/skills/himeros-architecture/SKILL.md.
Before coding, identify bounded context, consistency need, ownership,
failure modes and why current deployment cannot satisfy the requirement.
If a new service/broker/database is proposed, create an ADR.
```

## Agent safety rails

Agents must not:
- rewrite large working areas without need;
- invent backend endpoints instead of reading the contract;
- store tokens in localStorage;
- create duplicate DTO definitions feature-by-feature;
- add NgRx/microservices/CQRS/Saga just because they are available patterns;
- change schema without Flyway;
- bypass server authorization;
- silently disable failing tests.
