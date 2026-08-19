# Himeros Platform

Production-oriented dating platform baseline: **Angular 22 web + Java 21 / Spring Boot backend**.

The repository is intentionally a modular platform rather than an early microservice sprawl. Domain boundaries, event contracts and data ownership are designed for extraction later.

## Repository layout

```text
backend/        Java 21 + Spring Boot + Spring Modulith
frontend/       Angular 22 standalone web application
specs/          Product, architecture, API, security, testing and UI specifications
docs/           PlantUML architecture diagrams
.trae/          Project rules and project-local TRAE skills
scripts/        Local checks and official Angular skill installer
```

## Local development without Docker

### Prerequisites

- Java 21
- Maven 3.9+
- Node compatible with Angular 22 (see `frontend/package.json`; use `nvm install 24 && nvm use 24` if your local Node is older)
- PostgreSQL 17
- Redis
- Kafka

Start infrastructure with your local package manager, then:

```bash
# terminal 1
cd backend
mvn spring-boot:run

# terminal 2
cd frontend
npm install
npm start
```

Open `http://localhost:4200`.

The Angular dev server proxies `/api`, `/media` and `/ws` to `http://localhost:8080`.

### Local database defaults

```text
database: himeros
username: himeros
password: himeros_dev
port: 5432
```

Flyway owns schema migrations. Hibernate uses `ddl-auto=validate`.

## Docker alternative

```bash
docker compose up -d --build
```

Then open `http://localhost:4200`.

## Browser authentication

The web client deliberately does **not** persist a refresh token in localStorage:

- access token: memory only;
- rotating refresh token: HttpOnly cookie;
- authenticated API calls: Bearer token;
- refresh performed by `/api/v1/auth/web/refresh`;
- native/mobile JSON refresh-token endpoints remain available for a future Flutter client.

## TRAE

Project-specific agent instructions live in `.trae/`.

Install the official upstream Angular skill into this project:

```bash
./scripts/install-official-angular-skill.sh
```

This copies the current upstream `angular-developer` skill into `.trae/skills/angular-developer/`.

Read `specs/08-trae-development.md` before asking an agent to change architecture.

## Quality commands

```bash
make check
make backend-test
make frontend-test
make frontend-build
```

## Specs

Start with:

1. `specs/00-product-spec.md`
2. `specs/01-architecture.md`
3. `specs/02-backend-spec.md`
4. `specs/03-frontend-spec.md`
5. `specs/04-api-contract.md`
6. `specs/06-security.md`
7. `specs/07-testing-quality.md`

`specs/09-production-readiness.md` is intentionally explicit about integrations that still need real vendors/credentials before public launch.
