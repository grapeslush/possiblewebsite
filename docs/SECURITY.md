# Tackle Exchange Security Overview

Security is foundational to Tackle Exchange. The following practices keep anglers and their gear trades protected.

## Identity & access

- Sellers complete multi-step verification (government ID, proof of address, workspace photo) before gaining full
  privileges.
- Multi-factor authentication (TOTP) is available to all users and required for administrators.
- Session management includes device fingerprinting, IP-based heuristics, and forced logout when suspicious activity is
  detected.

## Payments & escrow

- All checkout flows run through PCI-compliant processors; raw card data never touches Tackle Exchange servers.
- Funds land in a segregated escrow ledger until buyers confirm inspection or support resolves a dispute.
- Payouts require verified bank accounts and trigger automated sanctions screening.

## Data protection

- PostgreSQL data is encrypted at rest. Connection strings enforce TLS in production.
- Object storage buckets use signed URLs with short expirations for listing media and inspection evidence.
- Secrets are managed via environment variables in development and parameter stores or vault services in production.

## Application security

- Rate limiting, hCaptcha, and content moderation guard against automated abuse.
- Listings run through AI-assisted and manual review to catch counterfeit or unsafe tackle.
- Sensitive mutations rely on server actions or API routes with schema validation and consistent audit logging.

## Monitoring & incident response

- OpenTelemetry spans and Prometheus metrics power proactive monitoring of latency, error rates, and payout throughput.
- Centralized logging (Pino + structured log shipping) enables quick root cause analysis.
- Incident runbooks cover escrow freezes, compromised accounts, and data export requests.

## Compliance

- Annual policy reviews align with evolving tax and consumer protection regulations.
- 1099-K reporting thresholds are tracked automatically; documents are delivered electronically.
- GDPR/CCPA requests (access, deletion, opt-out) can be fulfilled from the privacy dashboard or by contacting support.

Security is a shared responsibility. If you notice something suspicious, alert the Tackle Exchange security team at
security@tackle.exchange.
