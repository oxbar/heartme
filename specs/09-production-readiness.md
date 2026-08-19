# Production Readiness / Known Gaps

The repository is a complete executable **product baseline**, not a claim that vendor-dependent launch controls are already configured.

## Required before public launch

### Identity
- email verification provider;
- password reset;
- MFA/passkeys decision;
- compromised-password controls;
- account recovery;
- stronger suspicious-login/device risk.

### Payments
- replace fake provider with real PSP;
- webhook signature verification;
- idempotency keys;
- reconciliation;
- refunds/chargeback flows;
- invoice/tax/legal review as applicable.

### Media
- S3/Azure/GCS adapter;
- presigned uploads;
- CDN;
- EXIF removal;
- image re-encoding;
- malware/content moderation;
- lifecycle/retention.

### Notifications
- FCM/APNs push;
- transactional email;
- preference center;
- quiet hours;
- provider retry/feedback handling.

### Trust & Safety
- moderator console;
- moderation queue;
- rule engine/risk scoring;
- anti-scraping;
- spam/scam model or rule system;
- appeals and audit trail.

### Privacy / LGPD
- deletion/export workflows;
- retention schedule;
- privacy/cookie/consent texts;
- legal-basis mapping;
- DPO/legal review.

### Infrastructure
- TLS/WAF;
- production secret manager;
- managed PostgreSQL/Redis/Kafka strategy;
- backups/PITR;
- DR/runbooks;
- SLO dashboards and alerting;
- load/soak tests;
- vulnerability/SBOM pipeline.

### Recommendation
Current algorithm is intentionally deterministic. ML should only be introduced after telemetry, labels, bias/safety evaluation and offline/online experimentation infrastructure exist.
