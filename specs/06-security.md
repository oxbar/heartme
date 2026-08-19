# Security, Privacy and Trust Specification

## Threat model highlights

Dating platforms have elevated exposure to:
- credential stuffing;
- account takeover;
- scraping;
- spam/bots;
- romance/financial scams;
- harassment;
- malicious media;
- location privacy leakage;
- payment abuse;
- enumeration;
- IDOR;
- message abuse.

## Authentication

- password hashing uses a modern slow password encoder (current baseline BCrypt cost 12);
- short-lived access JWT;
- rotating refresh sessions;
- hashed refresh tokens in DB;
- logout by device and logout-all;
- MFA/email verification are required production backlog items.

## Web tokens

- refresh cookie HttpOnly;
- `Secure=true` in production;
- SameSite set explicitly;
- access token memory only;
- HTTPS mandatory in production.

## Authorization

Never trust IDs supplied by the UI.

Backend checks:
- user owns photo before delete;
- conversation membership before read/send;
- match membership before unmatch;
- notification ownership;
- premium entitlement server-side;
- future admin endpoints by role/policy.

## Abuse controls

Current:
- Redis rate limiting;
- block/report;
- profile exclusions.

Production:
- progressive throttling by account/device/IP risk;
- bot mitigation;
- message spam heuristics;
- scam/fraud signals;
- moderation queue;
- photo moderation;
- device/account risk score;
- appeal/audit workflow.

## Media

Before public launch:
- presigned object-storage uploads;
- MIME + magic-byte checks;
- re-encode images;
- strip EXIF/GPS;
- virus/malware scanning;
- explicit-content moderation;
- derivative generation;
- private/origin access controls + CDN.

## Location privacy

Do not expose precise latitude/longitude to other users. Recommendation may use coordinates internally but external views should present city/approximate distance. The current API already separates owner profile data from public profile data: exact coordinates, birth date and private discovery filters are not returned by public profile/recommendation projections.

## Secrets

- environment/secret manager only;
- no production defaults;
- rotate JWT signing material;
- prefer asymmetric signing or managed identity provider if ecosystem needs token verification across multiple services;
- never log auth headers, refresh tokens, passwords or full private messages.

## Browser hardening

Production ingress/frontend should add:
- CSP;
- HSTS;
- Referrer-Policy;
- X-Content-Type-Options;
- Permissions-Policy;
- frame-ancestors / clickjacking controls.

## LGPD baseline

Production product must include:
- privacy notice;
- consent/legal-basis mapping;
- data export;
- account deactivation/deletion;
- retention rules;
- moderation/audit retention policy;
- vendor/DPA inventory;
- incident response;
- data-subject request workflow.

Legal review is required before public launch.
