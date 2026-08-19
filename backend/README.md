# Himeros Backend

Backend modular e production-oriented para uma plataforma de relacionamento. O projeto nasce como **modular monolith com boundaries verificáveis**, event backbone via Kafka e Transactional Outbox, deixando os módulos prontos para extração futura.

## Stack
- Java 21
- Spring Boot 3.5.16
- Spring Security + JWT access/refresh rotation
- Spring Modulith 1.4.12
- PostgreSQL + Flyway
- Redis (rate limit / cache foundation)
- Apache Kafka + Outbox + idempotent consumers + retry/DLT
- WebSocket/STOMP + REST
- OpenAPI/Swagger
- Actuator + Prometheus + Micrometer/OpenTelemetry bridge
- Docker / Docker Compose
- JUnit 5 + Testcontainers + Spring Modulith architecture test

## Módulos
`identity`, `profile`, `media`, `recommendation`, `interaction`, `match`, `messaging`, `trustsafety`, `billing`, `premium`, `notification`, `shared`.

## Subir tudo
```bash
cp .env.example .env
docker compose up -d --build
```

API: `http://localhost:8080`  
Swagger: `http://localhost:8080/swagger-ui.html`  
Health: `http://localhost:8080/actuator/health`

## Fluxo mínimo de teste
1. `POST /api/v1/auth/register`
2. `POST /api/v1/auth/login`
3. `PUT /api/v1/profile`
4. Cadastre um segundo usuário/perfil.
5. `POST /api/v1/interactions/{targetUserId}` com `LIKE` nos dois sentidos.
6. `GET /api/v1/matches`
7. `GET /api/v1/conversations`
8. `POST /api/v1/conversations/{id}/messages`

## Principais endpoints
- Auth: `/api/v1/auth/**`
- Profile: `/api/v1/profile`
- Photos: `/api/v1/media/photos`
- Discovery: `/api/v1/discovery`
- Interactions: `/api/v1/interactions/**`
- Matches: `/api/v1/matches`
- Conversations/messages: `/api/v1/conversations/**`
- Safety: `/api/v1/safety/**`
- Billing: `/api/v1/billing/**`
- Premium: `/api/v1/premium/subscription`
- Notifications: `/api/v1/notifications`

## WebSocket
Endpoint STOMP: `/ws`. No frame `CONNECT`, envie header `Authorization: Bearer <access-token>`. Publique em `/app/conversations/{conversationId}/messages` e assine `/topic/conversations/{conversationId}`.

## Segurança
- BCrypt para senha.
- Access token curto (15 min por padrão).
- Refresh token opaco, persistido apenas como SHA-256, com rotação/revogação.
- Rate limiting Redis para `/api/v1/auth/**`.
- CORS configurável por ambiente.
- Autorização por ownership nas operações de conversa, match, mídia e perfil.
- Upload limitado a JPEG/PNG/WEBP, nomes randomizados e diretório fora do classpath.

## Eventos / Outbox
Módulos gravam `outbox_events` na mesma transação do estado de negócio. O `OutboxPublisher` publica no Kafka com entrega at-least-once. Consumers usam `processed_events` para idempotência.

Tópicos principais:
- `himeros.identity.events.v1`
- `himeros.profile.events.v1`
- `himeros.interaction.events.v1`
- `himeros.match.events.v1`
- `himeros.messaging.events.v1`
- `himeros.billing.events.v1`

## Observação sobre pagamentos e object storage
`billing` usa um provider fake/local de propósito para o projeto rodar sem credenciais externas. O boundary está isolado para trocar por Stripe/Adyen/Mercado Pago. O módulo `media` usa storage local no profile padrão e mantém a mesma separação necessária para substituir por S3/Blob + presigned upload em produção.

## Testes
```bash
./mvnw test
```

O `ArchitectureTest` valida os módulos com Spring Modulith. Os testes de integração usam Testcontainers quando Docker estiver disponível.

## Arquitetura
Veja `docs/architecture/backend.puml`.
