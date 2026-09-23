# 🛰️ ApiRadar

> Real-time breaking change detection and developer digest platform for third-party APIs and SDKs.

---

## ⚡ Quick Start

Get ApiRadar up and running in minutes using Docker Compose:

```bash
git clone https://github.com/Haripriya24071/ApiRadar
cd ApiRadar
cp .env.example .env
# Fill in OPENAI_API_KEY and GITHUB_TOKEN in .env

docker-compose up --build

# In a new terminal tab, seed the API catalog and trigger the initial scrape:
docker exec -it apiradar_backend python seed_catalog.py

# Open your browser to access the frontend:
# http://localhost:5173
```

---

## 🌐 Supported APIs

ApiRadar monitors third-party API changes, RSS feeds, GitHub release notes, and OpenAPI specifications for top cloud & API providers:

- **Stripe**: Payment APIs, SDK releases, and OpenAPI breaking schema diffs
- **OpenAI**: AI/ML models, API deprecations, and library releases
- **Supabase**: Backend-as-a-Service, database updates, and client SDKs
- **Twilio**: Communication APIs and SDK version changes
- **GitHub**: Octokit libraries and REST API breaking change notices
- **SendGrid**: Email delivery APIs and client SDK releases

---

## 🏗️ Architecture

```
                                  ┌───────────────────────────┐
                                  │   Third-Party Sources     │
                                  │ RSS / GitHub / OpenAPI    │
                                  └─────────────┬─────────────┘
                                                │
                                                ▼
┌─────────────────────────┐       ┌───────────────────────────┐
│     ApiRadar Web UI     │ ────> │   FastAPI Backend Server  │
│ React + Vite + Tailwind │ <──── │   REST API & Routers      │
└─────────────────────────┘       └─────────────┬─────────────┘
                                                │
                                                ▼
                                  ┌───────────────────────────┐
                                  │ Celery Beat & Workers     │
                                  │ Scrapers & OpenAI LLM     │
                                  └─────────────┬─────────────┘
                                                │
                                  ┌─────────────┴─────────────┐
                                  ▼                           ▼
                     ┌────────────────────────┐  ┌────────────────────────┐
                     │ PostgreSQL Database    │  │ Resend Email Digest    │
                     │ Catalog, Changes, Stack│  │ Daily Summaries        │
                     └────────────────────────┘  └────────────────────────┘
```

1. **Scrapers & Diffs**: Celery beat workers run automated RSS scrapers, GitHub release monitors, and OpenAPI specification diffs every 6 hours.
2. **LLM Intelligence**: OpenAI `gpt-4o-mini` analyzes raw changelog entries to extract structured change events, migration summaries, and effort estimates.
3. **Real-time Notifications**: Background processes generate user notification feeds and soft-resolve change events.
4. **Daily Email Digest**: Celery beat dispatches custom HTML daily email digests via Resend API at 8:00 AM UTC.

---

## 🛠️ Built With

### **Backend**
- **Python 3.11** / **FastAPI**
- **SQLAlchemy 2.0 (Async)** & **AsyncPG**
- **PostgreSQL** & **Alembic**
- **Celery** & **Redis**
- **OpenAI API** (`gpt-4o-mini`)
- **Resend Python SDK**

### **Frontend**
- **React 18** & **TypeScript**
- **Vite**
- **TailwindCSS** (Custom Glassmorphism Dark Theme)
- **TanStack Query (React Query)**
- **Zustand** (State & Toast Management)
- **Lucide React** (Icons)

---

## 🔧 Development Commands

- **Database Reset & Re-seed**:
  ```bash
  python backend/scripts/reset_db.py
  ```
- **Backend Health Check**:
  ```bash
  python backend/healthcheck.py
  ```
- **Run Frontend Tests / Build**:
  ```bash
  cd frontend && npm run build
  ```
