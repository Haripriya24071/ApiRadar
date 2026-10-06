# 🛰️ApiRadar

> **Know what will break before your API dependencies break.**

ApiRadar is a full-stack API intelligence platform that continuously monitors third-party API and SDK changes, detects breaking changes, analyzes their impact, and surfaces actionable updates before they become production problems.

Instead of discovering a dependency change after an application breaks, ApiRadar turns scattered release notes, changelogs, and API specification changes into a centralized change feed for developers.

---

## What It Does

- **Multi-source change monitoring** — Collects updates from API RSS feeds and GitHub releases.
- **OpenAPI change detection** — Compares API specifications and identifies schema-level changes.
- **AI-assisted change analysis** — Uses OpenAI to turn raw change information into structured developer-facing insights.
- **Stack-aware monitoring** — Users can create stack profiles and watch the APIs relevant to their projects.
- **Change notifications** — Automatically creates notifications for users watching an affected API.
- **Daily developer digests** — Sends personalized email summaries containing important changes and migration information.
- **Scheduled background processing** — Scraping, OpenAPI comparison, and email delivery run as asynchronous Celery tasks instead of blocking API requests.

---

## Architecture

```text
                    ┌─────────────────────────────┐
                    │     Third-Party Sources     │
                    │                             │
                    │  RSS Feeds   GitHub Releases│
                    │       OpenAPI Specifications│
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │       FastAPI Backend       │
                    │                             │
                    │ Auth │ APIs │ Changes │     │
                    │ Stacks │ Notifications      │
                    └──────────────┬──────────────┘
                                   │
                         Queue / Background Tasks
                                   │
                    ┌──────────────▼──────────────┐
                    │       Celery + Redis        │
                    │                             │
                    │  RSS / GitHub Scrapers      │
                    │  OpenAPI Diff Engine        │
                    │  Daily Email Digests        │
                    └───────┬───────────┬─────────┘
                            │           │
                 ┌──────────▼───┐   ┌──▼─────────────┐
                 │ PostgreSQL   │   │ OpenAI API     │
                 │              │   │ Change         │
                 │ APIs         │   │ Analysis       │
                 │ Changes      │   └────────────────┘
                 │ Users/Stacks│
                 └──────┬──────┘
                        │
                ┌───────▼────────┐
                │  React + Vite  │
                │  TypeScript UI │
                └────────────────┘
```

### Processing Flow

1. **Collect** — Scheduled workers fetch new RSS entries and GitHub releases.
2. **Detect** — New changes are persisted and OpenAPI specifications are compared independently.
3. **Analyze** — Change information is processed into structured developer-facing data.
4. **Match** — Changes are associated with APIs users have added to their watched stack profiles.
5. **Notify** — Relevant users receive in-app notifications.
6. **Digest** — Important changes are aggregated into scheduled email summaries.

---

## Technical Highlights

### Asynchronous Background Processing

ApiRadar separates scheduled work from the request/response layer using **Celery + Redis**.

The scheduler handles three recurring workflows:

- API scraping every 6 hours
- OpenAPI diffing daily
- Daily email digests at 08:00 UTC

This keeps long-running external API operations and scheduled processing out of the FastAPI request path.

### Multi-Source Change Ingestion

The scraper layer uses a common change representation so different sources can feed the same downstream pipeline.

Currently implemented sources include:

- RSS/Atom feeds
- GitHub Releases
- OpenAPI specifications

Duplicate changes are checked against persisted change events before new records are created.

### OpenAPI Diffing

OpenAPI specifications are processed through a dedicated diff pipeline rather than being treated like ordinary changelog text.

The diff task identifies APIs with configured OpenAPI specifications, compares their current state, creates change events for detected differences, and feeds those events into the same notification system.

### Personalized Change Delivery

Users can build stack profiles containing the APIs they care about. When a new change is detected, ApiRadar resolves which users are watching the affected API and creates targeted notifications rather than broadcasting every change to everyone.

Daily digests further filter watched changes by severity before generating HTML email summaries.

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React, TypeScript, Vite, Tailwind CSS |
| **State & Data** | TanStack Query, Zustand |
| **Backend** | Python, FastAPI |
| **Database** | PostgreSQL, SQLAlchemy, Alembic |
| **Background Jobs** | Celery, Redis |
| **AI** | OpenAI API |
| **Data Sources** | RSS/Atom, GitHub Releases, OpenAPI |
| **Email** | Resend |
| **Infrastructure** | Docker, Docker Compose |

---

## Project Structure

```text
ApiRadar/
├── backend/
│   ├── routers/          # API endpoints
│   ├── models/           # Database models
│   ├── scrapers/         # External source ingestion
│   ├── diff/             # OpenAPI comparison
│   ├── services/         # Notifications and application services
│   ├── tasks/            # Celery background workflows
│   └── main.py           # FastAPI application
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   └── stores/
│   └── package.json
│
├── Dockerfile.backend
├── Dockerfile.frontend
├── docker-compose.yml
└── ApiRadar_PROJECT_SPEC.md
```

---

## My Contribution

Designed and built ApiRadar as a full-stack project, covering the system architecture, FastAPI backend, database layer, asynchronous scraping pipeline, OpenAPI diff workflow, notification system, email digest pipeline, and React/TypeScript frontend.

The project focuses on solving a real developer workflow problem: **turning API dependency changes into actionable information before they become breaking production issues.**
```
