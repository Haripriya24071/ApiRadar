# ApiRadar 🛰️
### Pre-Emptive API Breaking-Change & Deprecation Intelligence Platform

> **"Don't find out your API broke in production. Find out 3 months before it does."**

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Solution](#2-solution)
3. [Who Is This For](#3-who-is-this-for)
4. [Core Features](#4-core-features)
5. [Tech Stack](#5-tech-stack)
6. [System Architecture](#6-system-architecture)
7. [Database Schema](#7-database-schema)
8. [Backend — API Design](#8-backend--api-design)
9. [Frontend — UI Design](#9-frontend--ui-design)
10. [LLM Integration Layer](#10-llm-integration-layer)
11. [Scraper Engine](#11-scraper-engine)
12. [OpenAPI Diff Engine](#12-openapi-diff-engine)
13. [File & Folder Structure](#13-file--folder-structure)
14. [Environment Variables](#14-environment-variables)
15. [Setup & Run Instructions](#15-setup--run-instructions)
16. [Roadmap & Future Scope](#16-roadmap--future-scope)

---

## 1. Problem Statement

Modern web applications depend on dozens of third-party SaaS APIs — Stripe, OpenAI, Supabase, Twilio, GitHub, SendGrid. These APIs change constantly:

- Endpoints get deprecated without fanfare
- Response schemas change silently
- Authentication flows get overhauled
- Rate limits and status codes shift

**The pain engineers actually feel:**

| Scenario | What happens today |
|---|---|
| Stripe deprecates a payment intent field | You find out when transactions start failing at 2 AM |
| OpenAI removes a model from the API | Your chatbot throws 404s in production |
| Supabase changes an auth endpoint | Your users can't log in |
| GitHub API bumps a required header | Your CI pipeline breaks silently |

Standard APM tools (Datadog, New Relic) alert you **after** a crash. RSS readers drown you in noise. There's no tool that **pre-emptively** watches your specific dependency stack and tells you what's going to break, when, and what to do about it.

**ApiRadar fixes this.**

---

## 2. Solution

ApiRadar is a specialized **background intelligence engine** that:

1. **Crawls** public changelogs, GitHub release tags, RSS feeds, and OpenAPI spec URLs for the APIs you care about
2. **Diffs** OpenAPI schemas over time to detect removed endpoints, changed response types, renamed fields
3. **Filters** changes to only what affects your specific stack profile (your `package.json`, your declared dependencies)
4. **Summarizes** raw changelog noise into structured, actionable impact cards using an LLM
5. **Delivers** a personalized, risk-scored dashboard with severity levels, deadline countdowns, and migration steps

**The core insight:** Every API provider publicly announces breaking changes. They just do it in 10 different places, in 10 different formats, buried under non-breaking updates. ApiRadar reads all of it and surfaces only what matters to you.

---

## 3. Who Is This For

| Persona | Use case |
|---|---|
| Full-Stack Developer | Paste your `package.json` and get a personal breaking-change watchlist |
| Tech Lead / Engineering Manager | Monitor the team's entire dependency surface from one dashboard |
| CTO at a startup | Know weeks in advance before an API change forces a sprint pivot |
| DevSecOps Engineer | Audit third-party API risk before quarterly reviews |

---

## 4. Core Features

### 4.1 Stack Profile Onboarding
- User pastes or uploads their `package.json` / `requirements.txt`
- ApiRadar auto-detects known API dependencies (Stripe SDK, OpenAI, Supabase client, Twilio, etc.)
- User can also manually search and add APIs to their watchlist
- Saved as a personal "stack profile" with a unique slug

### 4.2 Multi-Source Scraper Engine
Crawls the following source types on a scheduled cadence:

| Source Type | Examples |
|---|---|
| RSS / Atom Feeds | Stripe changelog feed, Twilio blog RSS |
| GitHub Release Tags | `api.github.com/repos/{owner}/{repo}/releases` |
| Official Changelog Pages | `stripe.com/docs/changelog`, `platform.openai.com/docs/changelog` |
| OpenAPI / Swagger Spec URLs | Versioned JSON/YAML specs fetched and stored |
| Developer Forum Mentions | Reddit r/webdev, HN, GitHub Discussions (keyword-filtered) |

### 4.3 OpenAPI Diff Engine
- Fetches current and previous OpenAPI 3.x spec for each tracked API
- Field-by-field structural comparison using `openapi-diff` or custom AST parser
- Classifies every change as:
  - 🔴 **BREAKING** — removed endpoint, required field added, status code changed
  - 🟡 **WARNING** — deprecated marker added, field type changed
  - 🟢 **INFO** — new optional field added, description updated
- Outputs structured diff objects stored in DB

### 4.4 LLM Summarization Layer
- Raw changelog text → LLM prompt → structured JSON output
- Output schema per change event:
```json
{
  "severity": "CRITICAL | WARNING | INFO",
  "affected_endpoints": ["/v1/charges", "/v1/payment_intents"],
  "deadline_date": "2025-03-01",
  "what_changed": "The `capture_method` field is removed from POST /v1/payment_intents",
  "migration_summary": "Replace capture_method with separate capture call. Update SDK to stripe@14.x.",
  "effort_estimate": "2-4 hours"
}
```

### 4.5 Personalized Risk Dashboard
- **Risk Timeline View**: horizontal timeline sorted by deadline date, color-coded by severity
- **Stack Overview Card**: shows your full watchlist with live status per API
- **Change Feed**: real-time stream of new change events, filterable by severity
- **Impact Card**: per-change card with full context, affected endpoints, migration guide

### 4.6 Alerting & Notifications
- Email digest (daily or weekly) for new critical changes
- In-app notification bell with unread count
- Webhook support — post change events to Slack, Discord, or any endpoint

### 4.7 Search & Explore
- Global search across all tracked APIs
- Public API directory — browse all supported APIs even without a profile
- Filter by category: Payments, AI/ML, Auth, Messaging, Storage, etc.

---

## 5. Tech Stack

### Backend
| Layer | Technology | Why |
|---|---|---|
| API Server | **FastAPI** (Python) | Async, fast, auto Swagger docs — perfect for an API-about-APIs project |
| Task Queue | **Celery + Redis** | Schedules and runs scraper jobs in the background |
| Database | **PostgreSQL** | Relational — fits the stack/api/change event relationships well |
| ORM | **SQLAlchemy + Alembic** | Clean models, migration support |
| LLM Calls | **OpenAI API (GPT-4o-mini)** | Cheap, fast, structured output via JSON mode |
| OpenAPI Diffing | **openapi-diff** (Python lib) + custom AST parser | Field-level schema comparison |
| Web Scraping | **httpx + BeautifulSoup4 + feedparser** | Lightweight, async-friendly |
| Auth | **JWT (python-jose) + bcrypt** | Stateless auth, industry standard |
| Caching | **Redis** | Cache scrape results, rate-limit LLM calls |
| Email | **Resend API** | Clean transactional email, great Python SDK |

### Frontend
| Layer | Technology | Why |
|---|---|---|
| Framework | **React 18 + Vite** | Fast dev server, modern React features |
| Styling | **Tailwind CSS** | Rapid UI, dark mode easy |
| Component Library | **shadcn/ui** | Accessible, unstyled components you own |
| Charts & Timelines | **Recharts** | Risk timeline visualization |
| State Management | **Zustand** | Lightweight, no boilerplate |
| Data Fetching | **TanStack Query (React Query)** | Server state caching, auto refetch |
| Icons | **Lucide React** | Clean, consistent icon set |
| Routing | **React Router v6** | SPA routing |
| Package Upload Parsing | **Custom JS parser** | Reads `package.json` client-side to extract deps |

### Infrastructure / DevOps
| Tool | Purpose |
|---|---|
| **Docker + Docker Compose** | Local dev environment (app + postgres + redis) |
| **GitHub Actions** | CI pipeline — lint, test, build on every PR |
| **Railway / Render** | Deployment (free tier friendly for demo) |
| **Upstash Redis** | Serverless Redis for production |

---

## 6. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER BROWSER                             │
│                    React SPA (Vite)                             │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTPS / REST
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FASTAPI APPLICATION SERVER                    │
│                                                                  │
│   /auth/*         /stacks/*       /changes/*     /apis/*        │
│   JWT Auth        Stack CRUD      Change Events  API Directory   │
│                                                                  │
│   ┌──────────────────────┐    ┌──────────────────────────────┐  │
│   │   SQLAlchemy ORM     │    │     Celery Task Dispatcher   │  │
│   └──────────┬───────────┘    └──────────────┬───────────────┘  │
└──────────────┼─────────────────────────────── ┼ ────────────────┘
               │                                │
               ▼                                ▼
┌──────────────────────┐          ┌─────────────────────────────────┐
│     POSTGRESQL       │          │      REDIS (Task Broker)         │
│                      │          │                                   │
│  users               │          │  celery-beat schedules:          │
│  stack_profiles      │          │  - scrape_rss (every 6h)        │
│  watched_apis        │          │  - scrape_github (every 6h)     │
│  api_catalog         │          │  - diff_openapi_specs (daily)   │
│  change_events       │          │  - send_digest_emails (daily)   │
│  openapi_snapshots   │          │                                   │
│  notifications       │          └──────────────┬────────────────────┘
└──────────────────────┘                         │
                                                 ▼
                              ┌─────────────────────────────────────┐
                              │         CELERY WORKERS               │
                              │                                       │
                              │  ┌─────────────────────────────┐    │
                              │  │     SCRAPER ENGINE           │    │
                              │  │  - RSS / Atom reader         │    │
                              │  │  - GitHub Releases API       │    │
                              │  │  - Changelog page crawler    │    │
                              │  └──────────────┬──────────────┘    │
                              │                 │                     │
                              │  ┌──────────────▼──────────────┐    │
                              │  │   OPENAPI DIFF ENGINE        │    │
                              │  │  - Fetch current spec        │    │
                              │  │  - Compare to snapshot       │    │
                              │  │  - Classify changes          │    │
                              │  └──────────────┬──────────────┘    │
                              │                 │                     │
                              │  ┌──────────────▼──────────────┐    │
                              │  │   LLM SUMMARIZER             │    │
                              │  │  - GPT-4o-mini JSON mode     │    │
                              │  │  - Structured impact cards   │    │
                              │  │  - Cached in Redis           │    │
                              │  └──────────────┬──────────────┘    │
                              │                 │                     │
                              │                 ▼                     │
                              │         Write to PostgreSQL           │
                              └─────────────────────────────────────┘
```

---

## 7. Database Schema

```sql
-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- API Catalog (all APIs ApiRadar supports)
CREATE TABLE api_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,               -- "Stripe", "OpenAI"
    slug TEXT UNIQUE NOT NULL,        -- "stripe", "openai"
    category TEXT NOT NULL,           -- "payments", "ai-ml", "auth"
    changelog_url TEXT,
    rss_feed_url TEXT,
    github_repo TEXT,                 -- "stripe/stripe-node"
    openapi_spec_url TEXT,
    logo_url TEXT,
    last_scraped_at TIMESTAMPTZ
);

-- User Stack Profiles
CREATE TABLE stack_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'My Stack',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- APIs watched per profile (many-to-many)
CREATE TABLE watched_apis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES stack_profiles(id) ON DELETE CASCADE,
    api_id UUID REFERENCES api_catalog(id),
    sdk_version TEXT,                 -- "stripe@14.2.0"
    UNIQUE(profile_id, api_id)
);

-- All detected change events
CREATE TABLE change_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_id UUID REFERENCES api_catalog(id),
    source TEXT NOT NULL,             -- "rss", "github_release", "openapi_diff"
    severity TEXT NOT NULL,           -- "CRITICAL", "WARNING", "INFO"
    title TEXT NOT NULL,
    what_changed TEXT,
    affected_endpoints TEXT[],
    deadline_date DATE,
    migration_summary TEXT,
    effort_estimate TEXT,
    raw_content TEXT,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- OpenAPI spec snapshots (for diffing)
CREATE TABLE openapi_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_id UUID REFERENCES api_catalog(id),
    spec_json JSONB NOT NULL,
    spec_version TEXT,
    fetched_at TIMESTAMPTZ DEFAULT NOW()
);

-- Per-user notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    change_event_id UUID REFERENCES change_events(id),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 8. Backend — API Design

### Auth
```
POST   /api/auth/register          Register new user
POST   /api/auth/login             Returns JWT access token
POST   /api/auth/refresh           Refresh token
GET    /api/auth/me                Current user info
```

### Stack Profiles
```
GET    /api/stacks                 List user's profiles
POST   /api/stacks                 Create new profile
DELETE /api/stacks/{id}            Delete profile
POST   /api/stacks/{id}/parse      Upload package.json → auto-detect APIs
POST   /api/stacks/{id}/watch      Add API to watchlist
DELETE /api/stacks/{id}/watch/{api_id}   Remove API
```

### Change Events
```
GET    /api/changes                All changes across user's stack (paginated, filterable)
GET    /api/changes/{id}           Single change event detail
GET    /api/changes/feed           Latest changes (real-time feed endpoint, SSE)
```

### API Catalog
```
GET    /api/apis                   Browse all supported APIs
GET    /api/apis/{slug}            API detail + recent changes
GET    /api/apis/search?q=stripe   Search
```

### Notifications
```
GET    /api/notifications          User's unread notifications
PATCH  /api/notifications/read-all Mark all as read
```

### Admin / Scraper Triggers (dev use)
```
POST   /admin/scrape/{api_slug}    Manually trigger scrape for one API
POST   /admin/diff/{api_slug}      Manually trigger OpenAPI diff
```

---

## 9. Frontend — UI Design

### Pages & Routes

```
/                    Landing page (public)
/login               Auth
/register            Auth
/dashboard           Main dashboard (protected)
/dashboard/feed      Change event feed
/dashboard/stack     My stack profile manager
/dashboard/apis      Browse API catalog
/dashboard/api/:slug API detail page
/dashboard/settings  Email/notification preferences
```

### Design System

**Color Palette:**
```
Background:    #0A0A0F  (near-black)
Surface:       #111118  (card background)
Border:        #1E1E2E  (subtle border)
Primary:       #6366F1  (indigo — trust, tech)
Critical:      #EF4444  (red)
Warning:       #F59E0B  (amber)
Info:          #10B981  (emerald)
Text primary:  #F8FAFC
Text muted:    #64748B
```

**Typography:** `Inter` for UI, `JetBrains Mono` for version strings and code snippets

---

### Component Map

#### Landing Page `/`
- Hero: Bold tagline + animated radar sweep SVG
- "How it works" — 3-step illustration
- Supported APIs logo grid (Stripe, OpenAI, Supabase, Twilio, GitHub, etc.)
- CTA: "Paste your package.json →"
- No login required to preview the public change feed

#### Dashboard Layout
```
┌────────────────────────────────────────────────────────┐
│  🛰️ ApiRadar      [Search]       🔔 3    [Avatar]      │
├──────────────┬─────────────────────────────────────────┤
│              │                                          │
│  Sidebar:    │   Main Content Area                      │
│  - Feed      │                                          │
│  - My Stack  │                                          │
│  - Browse    │                                          │
│  - Settings  │                                          │
│              │                                          │
└──────────────┴─────────────────────────────────────────┘
```

#### Change Feed (main view)
- Filter bar: [ All ] [ 🔴 Critical ] [ 🟡 Warning ] [ 🟢 Info ] | Sort: Newest / Deadline
- Each change renders as an **Impact Card**:

```
┌─────────────────────────────────────────────────────────┐
│  🔴 CRITICAL             Stripe API          3 days left │
│                                                          │
│  capture_method field removed from /v1/payment_intents   │
│                                                          │
│  Affected: POST /v1/payment_intents                      │
│  Deadline: March 1, 2025                                 │
│                                                          │
│  Migration: Replace with explicit capture endpoint.      │
│  Effort: ~2-4 hours   Detected via: OpenAPI Diff         │
│                                                          │
│  [View Migration Guide]  [Mark Resolved]                 │
└─────────────────────────────────────────────────────────┘
```

#### Risk Timeline View
- Horizontal scrollable Recharts timeline
- X axis: calendar dates (next 6 months)
- Each API gets a row with dots at deadline dates, colored by severity
- Hover to see event summary tooltip

#### My Stack Page
- Upload box: drag & drop `package.json` or `requirements.txt`
- Auto-detected APIs shown with checkboxes → one click to add all to watchlist
- Manually search + add more from catalog
- Shows current SDK version detected vs latest stable version

#### API Detail Page `/dashboard/api/stripe`
- API logo + name + category tag
- Live status badge: "🟢 No critical changes" / "🔴 1 Critical pending"
- Recent change history table (sortable)
- Link to official changelog
- "Watch this API" button if not already watching

---

## 10. LLM Integration Layer

### When LLM is Called
- After raw scraped content is fetched, before storing to DB
- For each new GitHub release note or changelog entry
- Rate-limited via Redis to avoid excessive API cost

### Prompt Design

**System Prompt:**
```
You are an API breaking-change analyst. Your job is to read raw API changelog text
and extract structured intelligence about changes that could break developer applications.

You MUST respond with ONLY valid JSON. No explanations, no markdown fences.

Severity definitions:
- CRITICAL: endpoint removed, required parameter added, authentication changed, breaking status code change
- WARNING: field deprecated, response type changed, field renamed, rate limit changed
- INFO: new optional field, documentation update, new endpoint added, SDK version bump
```

**User Prompt:**
```
API Name: {api_name}
Source: {source_type}
Raw Content:
{raw_content}

Extract ALL change events. Return a JSON array:
[
  {
    "severity": "CRITICAL|WARNING|INFO",
    "title": "one-line summary",
    "what_changed": "precise technical description",
    "affected_endpoints": ["list of endpoints, empty array if none"],
    "deadline_date": "YYYY-MM-DD or null",
    "migration_summary": "what developer should do",
    "effort_estimate": "time estimate or null"
  }
]
```

### Caching Strategy
- Redis key: `llm:{api_slug}:{sha256(raw_content)}`
- TTL: 7 days
- Avoids re-processing identical content

---

## 11. Scraper Engine

### Scraper Base Class

```python
# scrapers/base.py
class BaseScraper:
    api: APICatalog
    
    async def fetch(self) -> list[RawChange]:
        raise NotImplementedError
    
    async def run(self):
        raw_changes = await self.fetch()
        for item in raw_changes:
            processed = await llm_summarize(item)
            await save_change_event(processed)
```

### RSS Scraper
```python
# scrapers/rss_scraper.py
import feedparser
import httpx

class RSSScraper(BaseScraper):
    async def fetch(self):
        feed = feedparser.parse(self.api.rss_feed_url)
        return [
            RawChange(
                source="rss",
                title=entry.title,
                content=entry.summary,
                published_at=entry.published_parsed,
                url=entry.link
            )
            for entry in feed.entries
            if not already_processed(entry.link)
        ]
```

### GitHub Release Scraper
```python
# scrapers/github_scraper.py
class GitHubReleaseScraper(BaseScraper):
    async def fetch(self):
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"https://api.github.com/repos/{self.api.github_repo}/releases",
                headers={"Authorization": f"Bearer {GITHUB_TOKEN}"}
            )
            releases = resp.json()
            return [
                RawChange(source="github_release", content=r["body"], ...)
                for r in releases
                if r["published_at"] > self.api.last_scraped_at
            ]
```

### Supported APIs at Launch (v1)

| API | RSS | GitHub | OpenAPI Spec |
|---|---|---|---|
| Stripe | ✅ | ✅ | ✅ |
| OpenAI | ✅ | ✅ | ✅ |
| Supabase | ✅ | ✅ | ❌ |
| Twilio | ✅ | ✅ | ✅ |
| GitHub API | ✅ | ✅ | ✅ |
| SendGrid | ✅ | ✅ | ✅ |

---

## 12. OpenAPI Diff Engine

### How It Works

```python
# diff/openapi_differ.py
from deepdiff import DeepDiff
import httpx, json

async def diff_api_spec(api: APICatalog):
    # 1. Fetch current spec
    async with httpx.AsyncClient() as client:
        resp = await client.get(api.openapi_spec_url)
        current_spec = resp.json()

    # 2. Get last snapshot from DB
    last_snapshot = await get_latest_snapshot(api.id)

    if not last_snapshot:
        await save_snapshot(api.id, current_spec)
        return []

    # 3. Deep diff
    diff = DeepDiff(last_snapshot.spec_json, current_spec, ignore_order=True)

    # 4. Classify changes
    changes = []
    for change_type, details in diff.items():
        for path, value in details.items():
            change = classify_openapi_change(change_type, path, value)
            if change:
                changes.append(change)

    # 5. Save new snapshot
    await save_snapshot(api.id, current_spec)
    return changes

def classify_openapi_change(change_type, path, value) -> ChangeEvent | None:
    # "dictionary_item_removed" on a /paths/ key = endpoint removed = CRITICAL
    # "type_changes" on a response field = type changed = WARNING
    # "dictionary_item_added" on a /paths/ key = new endpoint = INFO
    ...
```

---

## 13. File & Folder Structure

```
apiradar/
│
├── README.md                        ← This file
│
├── backend/
│   ├── main.py                      ← FastAPI app entry point
│   ├── config.py                    ← Settings (pydantic BaseSettings)
│   ├── database.py                  ← SQLAlchemy engine + session
│   │
│   ├── models/
│   │   ├── user.py
│   │   ├── api_catalog.py
│   │   ├── stack_profile.py
│   │   ├── change_event.py
│   │   └── openapi_snapshot.py
│   │
│   ├── routers/
│   │   ├── auth.py
│   │   ├── stacks.py
│   │   ├── changes.py
│   │   ├── apis.py
│   │   └── notifications.py
│   │
│   ├── services/
│   │   ├── auth_service.py
│   │   ├── stack_service.py
│   │   ├── package_parser.py        ← Parses package.json/requirements.txt
│   │   └── notification_service.py
│   │
│   ├── scrapers/
│   │   ├── base.py
│   │   ├── rss_scraper.py
│   │   ├── github_scraper.py
│   │   └── changelog_scraper.py
│   │
│   ├── diff/
│   │   └── openapi_differ.py
│   │
│   ├── llm/
│   │   ├── summarizer.py            ← LLM call + prompt templates
│   │   └── cache.py                 ← Redis caching for LLM responses
│   │
│   ├── tasks/
│   │   ├── celery_app.py            ← Celery + Redis broker config
│   │   ├── scraper_tasks.py         ← Scheduled scrape jobs
│   │   ├── diff_tasks.py            ← Scheduled diff jobs
│   │   └── email_tasks.py           ← Digest email jobs
│   │
│   ├── alembic/                     ← DB migrations
│   │   └── versions/
│   │
│   └── requirements.txt
│
├── frontend/
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── package.json
│   │
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       │
│       ├── pages/
│       │   ├── Landing.tsx
│       │   ├── Login.tsx
│       │   ├── Register.tsx
│       │   ├── Dashboard.tsx
│       │   ├── Feed.tsx
│       │   ├── MyStack.tsx
│       │   ├── BrowseAPIs.tsx
│       │   ├── APIDetail.tsx
│       │   └── Settings.tsx
│       │
│       ├── components/
│       │   ├── layout/
│       │   │   ├── Sidebar.tsx
│       │   │   ├── Navbar.tsx
│       │   │   └── PageWrapper.tsx
│       │   ├── dashboard/
│       │   │   ├── ImpactCard.tsx
│       │   │   ├── RiskTimeline.tsx
│       │   │   ├── SeverityBadge.tsx
│       │   │   ├── StackOverview.tsx
│       │   │   └── DeadlineCountdown.tsx
│       │   ├── stack/
│       │   │   ├── PackageUploader.tsx
│       │   │   ├── APISelector.tsx
│       │   │   └── WatchedAPIList.tsx
│       │   └── ui/                  ← shadcn/ui components
│       │
│       ├── hooks/
│       │   ├── useAuth.ts
│       │   ├── useChanges.ts
│       │   └── useStack.ts
│       │
│       ├── store/
│       │   └── authStore.ts         ← Zustand
│       │
│       └── lib/
│           ├── api.ts               ← Axios instance + interceptors
│           ├── packageParser.ts     ← Client-side package.json parser
│           └── utils.ts
│
├── docker-compose.yml
├── Dockerfile.backend
├── Dockerfile.frontend
└── .env.example
```

---

## 14. Environment Variables

```env
# Backend (.env)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/apiradar
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=your-jwt-secret-key-here
OPENAI_API_KEY=sk-...
GITHUB_TOKEN=ghp_...
RESEND_API_KEY=re_...
ALLOWED_ORIGINS=http://localhost:5173

# Frontend (.env)
VITE_API_BASE_URL=http://localhost:8000
```

---

## 15. Setup & Run Instructions

```bash
# Clone the repo
git clone https://github.com/Haripriya24071/ApiRadar.git
cd ApiRadar

# Start all services (postgres, redis, backend, celery, frontend)
docker-compose up --build

# Or run manually:

# Backend
cd backend
pip install -r requirements.txt
alembic upgrade head
uvicorn main:app --reload --port 8000

# Celery worker (in a separate terminal)
celery -A tasks.celery_app worker --loglevel=info

# Celery beat scheduler (in a separate terminal)
celery -A tasks.celery_app beat --loglevel=info

# Frontend
cd frontend
npm install
npm run dev
```

App runs at:
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000`
- API Docs (Swagger): `http://localhost:8000/docs`

---

## 16. Roadmap & Future Scope

### v1 — MVP (Build this first)
- [x] 6 APIs supported (Stripe, OpenAI, Supabase, Twilio, GitHub, SendGrid)
- [x] RSS + GitHub release scrapers
- [x] LLM summarization into structured cards
- [x] Stack profile via package.json upload
- [x] Risk dashboard with severity filters
- [x] Email digest

### v2 — Intelligence Upgrade
- [ ] OpenAPI Diff Engine fully implemented for all 6 APIs
- [ ] Risk score per stack (aggregate severity weighted by how many of your APIs are affected)
- [ ] GitHub Action integration — run ApiRadar check on every PR
- [ ] Slack bot `/apiradar status`

### v3 — Platform
- [ ] Public API for embedding into CI/CD pipelines
- [ ] Team accounts with shared stacks
- [ ] Expand to 30+ APIs
- [ ] Browser extension — highlights deprecated endpoints in API docs you're reading

---

*Built by R Hari Priya — CSE AI Engineering @ [University] | [LinkedIn](https://www.linkedin.com/in/haripriya-tech)*
