# Security baseline

- Never commit `.env` or production credentials.
- Use at least 256-bit JWT secrets and rotate them through a secrets manager.
- Terminate TLS at a trusted ingress/load balancer and only expose HTTPS/WSS publicly.
- Keep PostgreSQL, Redis and Kafka on private networks.
- Enable Kafka TLS/SASL and ACLs outside local development.
- Apply WAF/bot protection and rate limits at the edge in addition to application limits.
- Scan uploaded media and strip metadata before public delivery.
- Treat reports, blocks, messages and location as sensitive user data; apply retention and access controls.
- Dependency and container scanning should be mandatory in CI.
- Run SAST, secret scanning and DAST before production release.
