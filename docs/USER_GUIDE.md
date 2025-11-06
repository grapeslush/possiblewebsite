# Possible Website · User Guide

This guide is written for non-technical teammates who want to experience the marketplace without touching source code. It focuses on a safe local preview using Docker Desktop.

## Prerequisites

- Docker Desktop 4.28 or later with at least 4 CPUs and 6 GB RAM allocated.
- 10 GB of free disk space for container images and seeded data.
- macOS, Windows, or Linux with hardware virtualization enabled.

## Launching the demo environment

1. Clone or download the repository ZIP and extract it.
2. Open the project folder in a terminal (Command Prompt, PowerShell, or Terminal.app).
3. Duplicate `.env.example` as `.env` and leave the generated placeholder values intact.
4. Run the following command and wait until all services report `healthy`:

   ```bash
   docker compose up --build
   ```

5. Keep the window open—the command streams logs so you can observe what is happening.

## Navigating the product

Once Docker reports that the web application is ready, explore the primary touch points:

| Area           | URL                                 | What to look for                                                                            |
| -------------- | ----------------------------------- | ------------------------------------------------------------------------------------------- |
| Marketing site | <http://localhost:3000>             | Experience the refreshed hero, feature stories, and testimonials on the home page.          |
| Dashboard      | <http://localhost:3000/dashboard>   | Review analytics cards, action shortcuts, and settings to understand the operator workflow. |
| Knowledge base | <http://localhost:3000/help-center> | Search articles, view FAQs, and check policy pages for compliance-ready content.            |
| API playground | <http://localhost:4000/api/health>  | Confirm the service responds with status details and linked metrics.                        |
| Email preview  | <http://localhost:8025>             | Inspect messages sent by the system without sending real emails.                            |
| Object storage | <http://localhost:9001>             | Explore the MinIO console to inspect uploaded assets and attachments.                       |

### Suggested walkthrough

1. Start on the home page and follow the "Start a project" CTA to review the listing flow.
2. Use the global search in the help center to find onboarding documentation.
3. Visit the dashboard, inspect the sample statistics, and download a CSV export.
4. Open MailHog to see the confirmation email that mirrors the in-app notification.
5. Visit `/policies` to review compliance and privacy commitments.

## Shutting everything down

Press `Ctrl+C` in the terminal window running Docker Compose. Once the stack has stopped, run:

```bash
docker compose down --volumes
```

This removes containers and resets databases so you can restart with fresh demo data next time.

## Troubleshooting tips

- **Port already in use:** Close any process listening on ports 3000, 4000, 8025, or 9001 and run the command again.
- **Docker Desktop memory warnings:** Increase the memory slider in Docker settings to at least 6 GB.
- **Missing seed data:** If the dashboard appears empty, rerun `docker compose up --build`—the seed script automatically repopulates data on boot.

If problems persist, capture screenshots of the terminal output and share them with your engineering partner.
