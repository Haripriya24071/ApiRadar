<div align="center">

# 🛰️ ApiRadar

### Pre-Emptive API Breaking-Change & Deprecation Intelligence Platform

**Don't find out your API broke in production. Find out before it does.**

![React](https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Celery](https://img.shields.io/badge/Celery-37814A?style=for-the-badge&logo=celery&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![OpenAI](https://img.shields.io/badge/OpenAI-412991?style=for-the-badge&logo=openai&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)

</div>

---

## 🧠 What is ApiRadar?

Every application sits on a stack of third-party APIs and SDKs, and every one of them ships breaking changes, deprecations, and sunset dates through scattered changelogs, release notes, and blog posts. Nobody reads them all, so teams usually learn about a breaking change when production fails.

**ApiRadar** is a full-stack API intelligence platform that monitors the APIs your application depends on, detects changes from multiple sources, uses an LLM to turn raw updates into structured, developer-ready information, and delivers only the changes that matter to *your* stack.

```
Provider publishes:   "legacy endpoint deprecated, migrate to the new API"
                          │
                          ▼
         ┌────────────────────────────────────┐
         │         APIRADAR ENGINE            │
         │                                    │
         │  Collect  →  Analyze  →  Match     │
         │ (scrapers)   (LLM)     (your stack)│
         └────────────────────────────────────┘
                          │
                          ▼
         🔴 Change type + severity classification
         🛠️ Migration summary
         ⏱️ Effort estimate + deadlines
         🔔 In-app notification + daily email digest
```

> *"Turn scattered API updates into actionable information before a dependency change becomes a production problem."*

---

## ✨ Core Features

| | Feature | What it does |
|---|---|---|
| 📡 | **Multi-Source Monitoring** | Collects updates from RSS/Atom feeds, GitHub releases, and OpenAPI specifications every 6 hours |
| 🚨 | **Breaking-Change & Deprecation Detection** | Converts provider updates into structured change events with type, severity, migration info, and effort estimates |
| 🤖 | **LLM-Powered Analysis** | `gpt-4o-mini` turns raw changelog text into developer-focused summaries |
| 🧩 | **OpenAPI Diff Engine** | Compares specification versions and generates change events from structural differences, even when no changelog mentions them |
| 📚 | **Stack-Aware Monitoring** | Create stack profiles of the APIs you depend on and see only the changes relevant to you |
| 🔔 | **Personalized Notifications** | Matches every detected change against user stacks and creates targeted in-app notifications |
| 📧 | **Daily Email Digest** | Aggregated HTML digest delivered via Resend at 8:00 AM UTC |
| 🖥️ | **Developer Dashboard** | Browse, filter, search, and resolve change events in one place |

---

## 🌐 Supported APIs

| Provider | What's Monitored |
|---|---|
| 💳 **Stripe** | Payment APIs, SDK releases, OpenAPI breaking-schema diffs |
| 🧠 **OpenAI** | Models, API deprecations, library releases |
| ⚡ **Supabase** | Database updates, client SDKs |
| 📞 **Twilio** | Communication APIs, SDK version changes |
| 🐙 **GitHub** | Octokit libraries, REST API breaking-change notices |
| ✉️ **SendGrid** | Email delivery APIs, client SDK releases |

---

## ⚙️ How It Works

```
Provider Update
      │
      ▼
┌──────────────────────────┐
│  RSS / GitHub / OpenAPI  │
│         Sources          │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│    Background Workers    │
│      Celery + Redis      │
└────────────┬─────────────┘
             │
       ┌─────┴─────┐
       ▼           ▼
  Change Feed   OpenAPI Diff
       │           │
       └─────┬─────┘
             ▼
┌──────────────────────────┐
│    Change Processing     │
│                          │
│  Persistence + Dedup     │
│  LLM Analysis            │
│  Classification          │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│    User Stack Matching   │
└────────────┬─────────────┘
             │
       ┌─────┴──────────┐
       ▼                ▼
  In-App Feed      Email Digest
```

### The 6-Step Pipeline

| Step | Stage | What happens |
|---|---|---|
| 1 | **Collect** | Celery Beat workers pull updates from configured provider sources every 6 hours |
| 2 | **Detect** | New changes are persisted after duplicate checks; OpenAPI specs are diffed independently |
| 3 | **Analyze** | `gpt-4o-mini` extracts structured change events, migration summaries, and effort estimates |
| 4 | **Match** | Changes are linked to users who track the affected API through their stack profiles |
| 5 | **Notify** | Relevant users receive targeted in-app notifications |
| 6 | **Digest** | Changes are aggregated into a daily HTML email at 8:00 AM UTC |

---

## 🔬 Technical Highlights

### ⚡ Asynchronous Processing
**Celery + Redis** move scraping, OpenAPI comparison, notification generation, and email delivery outside the FastAPI request cycle, so the interactive API layer stays fast while recurring external-service work runs in the background.

### 🌍 Multi-Source Change Ingestion
RSS/Atom feeds, GitHub Releases, and OpenAPI specs are normalized into one common change-event workflow, and persisted events are checked for duplicates before new records are created.

### 🧬 OpenAPI Diff Engine
OpenAPI monitoring runs independently of changelog ingestion. The system finds APIs with configured specs, compares versions, and generates change events from the differences, so structural changes are caught even when a provider never announces them.

### 🧠 LLM-Based Change Analysis
Raw change information becomes structured, developer-facing data: **change type · severity · migration summary · migration effort · deadlines**. The LLM is part of the pipeline, not a standalone chatbot.

### 🎯 Stack-Aware Notifications
Not every change matters to every user. Stack profiles let the backend identify exactly who is affected and generate notifications only for the APIs they track.

---

## 🏗️ Architecture

```
                                  ┌───────────────────────────┐
                                  │    Third-Party Sources    │
                                  │  RSS / GitHub / OpenAPI   │
                                  └─────────────┬─────────────┘
                                                │
                                                ▼
┌─────────────────────────┐       ┌───────────────────────────┐
│     ApiRadar Web UI     │ ────> │   FastAPI Backend Server  │
│ React + Vite + Tailwind │ <──── │    REST API & Routers     │
└─────────────────────────┘       └─────────────┬─────────────┘
                                                │
                                                ▼
                                  ┌───────────────────────────┐
                                  │   Celery Beat & Workers   │
                                  │  Scrapers & OpenAI LLM    │
                                  └─────────────┬─────────────┘
                                                │
                                  ┌─────────────┴─────────────┐
                                  ▼                           ▼
                     ┌────────────────────────┐  ┌────────────────────────┐
                     │   PostgreSQL Database  │  │  Resend Email Digest   │
                     │ Catalog, Changes, Stack│  │    Daily Summaries     │
                     └────────────────────────┘  └────────────────────────┘
```

### Key Architectural Decisions

| Decision | Rationale |
|---|---|
| Celery + Redis workers | Scraping and LLM calls are slow and unreliable; keeping them off the request path keeps the API responsive |
| Separate OpenAPI diff pipeline | Catches structural breaking changes that no changelog announces |
| Dedup before persistence | Repeated scrapes never create duplicate change events |
| LLM output feeds the workflow | Structured fields (type, severity, effort) drive filtering, notifications, and digests |
| Stack profiles | Users see only the changes that affect the APIs they actually use |
| Async SQLAlchemy + AsyncPG | Non-blocking database access under FastAPI |

---

## 🎨 Design

A custom **glassmorphism dark theme** built with Tailwind CSS, with **Lucide** icons, **TanStack Query** for server state, and **Zustand** for client state and toast management.

---

## 🛠️ Tech Stack

### Frontend
| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Build Tool | Vite |
| Styling | Tailwind CSS (custom glassmorphism dark theme) |
| Server State | TanStack Query |
| Client State | Zustand |
| Icons | Lucide React |

### Backend
| Layer | Technology |
|---|---|
| Framework | Python 3.11 + FastAPI |
| Database | PostgreSQL + SQLAlchemy 2.0 (async) + AsyncPG |
| Migrations | Alembic |
| Background Jobs | Celery + Redis |
| Email | Resend |

### AI & Data Sources
| Service | Purpose |
|---|---|
| OpenAI `gpt-4o-mini` | Change analysis, migration summaries, effort estimation |
| RSS / Atom | Provider changelog ingestion |
| GitHub Releases | SDK and library release monitoring |
| OpenAPI Specs | Structural API diffing |

### Infrastructure
Docker · Docker Compose

---

## 🚀 Getting Started

```bash
git clone https://github.com/Haripriya24071/ApiRadar
cd ApiRadar
cp .env.example .env

docker-compose up --build

# In a new terminal, seed the API catalog and trigger the first scrape
docker exec -it apiradar_backend python seed_catalog.py
```

Open **http://localhost:5173**

### Development Commands

```bash
python backend/scripts/reset_db.py     # Reset and re-seed the database
python backend/healthcheck.py          # Backend health check
cd frontend && npm run build           # Build the frontend
```

---

## 📁 Project Structure

```
ApiRadar/
├── backend/
│   ├── routers/          # REST API routes
│   ├── models/           # Database models
│   ├── scrapers/         # External source ingestion
│   ├── tasks/            # Celery background workflows
│   ├── services/         # Application services
│   └── main.py           # FastAPI application
│
├── frontend/
│   └── src/
│       ├── components/   # Reusable UI components
│       ├── pages/        # Application pages
│       ├── hooks/        # Data and application hooks
│       └── stores/       # Client-side state
│
├── Dockerfile.backend
├── Dockerfile.frontend
└── docker-compose.yml
```

---

## 🌍 Real-World Use Cases

- 🚢 **Engineering Teams**: know about a deprecation months before the sunset date
- 🔄 **SDK & Dependency Upgrades**: see what a version bump will actually break
- 💳 **Payment & Infrastructure Integrations**: stay ahead of changes in the APIs your revenue depends on
- 🧑‍💻 **Solo Developers**: replace manually checking six changelogs with one daily digest

---

## 🗺️ Roadmap

- [ ] More providers (AWS, Google Cloud, Slack, and others)
- [ ] Slack and webhook notifications
- [ ] Auto-build a stack profile from `package.json` / `requirements.txt`
- [ ] Test suite + CI/CD pipeline

---

<div align="center">

Built by **Haripriya**

⭐ Star the repo if you find it useful.

</div>
