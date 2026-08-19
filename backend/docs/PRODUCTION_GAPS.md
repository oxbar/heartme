# Production integrations intentionally left behind ports

The repository is a complete runnable backend foundation, but external vendors require credentials and commercial decisions. Before public launch, replace/configure these adapters:

1. **Payment provider** — replace `fake-local` billing with Stripe/Adyen/Mercado Pago/Pagar.me adapter, webhook signature verification and reconciliation.
2. **Object storage/CDN** — replace local filesystem media adapter with S3/Azure Blob/GCS using presigned upload, image processing, EXIF stripping and CDN.
3. **Push/e-mail/SMS** — add FCM/APNs and transactional e-mail provider for notifications, verification and MFA delivery.
4. **Identity hardening** — add verified e-mail workflow, optional TOTP/WebAuthn MFA and risk-based login rules.
5. **Moderation** — connect image/text moderation, scam/bot detection and an admin moderation queue.
6. **Discovery at large scale** — move candidate retrieval from the relational pool to PostGIS/OpenSearch/geo index and eventually a feature/recommendation store.
7. **Kafka production topology** — use a multi-broker managed cluster, TLS/SASL, ACLs, schema registry/AsyncAPI and operational replay tooling.
8. **Secrets** — use Vault/Secret Manager/KMS; never keep production secrets in `.env`.
9. **Observability backend** — connect OTLP to Tempo/Jaeger/Datadog/New Relic and Prometheus/Grafana.
10. **Compliance** — finish LGPD retention, export/delete workflows, legal consent records and privacy/audit policies.

These are intentionally isolated from the domain so adding them does not require redesigning the core modules.
