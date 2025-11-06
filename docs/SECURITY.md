# Possible Website · Security & Compliance Guide

This document outlines how the project mitigates common web vulnerabilities and how to report issues responsibly.

## Secure-by-default configuration

- **HTTP headers:** Both the web and API applications enforce a strict Content Security Policy, HSTS, Referrer-Policy, X-Content-Type-Options, X-Frame-Options, and Permissions-Policy via their respective `next.config.js` files.
- **Transport security:** HSTS instructs browsers to prefer HTTPS once deployed behind TLS. Use managed certificates (e.g., AWS ACM) in production.
- **Authentication:** Protected routes are guarded by middleware in `apps/web/middleware.ts`; extend it when adding new dashboard sections.
- **Secrets management:** The `.env.example` file documents required variables. Never commit real secrets—load them via environment variables or secret managers.
- **Dependency hygiene:** Run `pnpm audit --prod` and `pnpm outdated` routinely. Address high or critical issues before releasing.
- **Database safety:** Prisma migrations execute inside transactions, and seed scripts avoid destructive operations to preserve data integrity.

## Operational practices

- **Monitoring:** Expose `/api/metrics`, `/api/health`, and `/api/readiness` endpoints to your platform monitoring solution. Alert on elevated error rates and latency.
- **Logging:** Pino structured logs enable correlation across services. Configure retention policies compliant with your region’s privacy laws.
- **Incident response:** Track incidents in your ticketing system. Include reproduction steps, impacted customers, mitigation timeline, and remediation tasks.
- **Backups:** Schedule automated database snapshots and object storage versioning. Test restoration quarterly.

## Reporting a vulnerability

1. Email `security@possiblewebsite.test` with detailed reproduction steps and proof-of-concept requests. Do not open public GitHub issues for sensitive findings.
2. Encrypt the report using the PGP key published in `docs/pgp/SECURITY.asc` (create the directory if you adopt this guidance in production).
3. Allow the team at least 10 business days to confirm and triage the report before public disclosure.

## Responsible disclosure policy

- Only test against environments you control or have explicit permission to probe.
- Do not access, modify, or delete data that is not yours.
- Provide a clear timeline for public disclosure so the team can patch issues and notify impacted users.

By contributing to Possible Website you agree to uphold this security posture and collaborate on remediation efforts promptly.
