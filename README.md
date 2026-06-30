# AI-Inventory-Assistant

**AI-powered inventory platform with semantic + hybrid search.**

Manage items and folders in a modern UI, then query inventory in plain language. Semantic hybrid search (OpenAI embeddings + OpenSearch) and structured filters (PostgreSQL) run via a Python API.

---

## Repository layout

```
├── frontend/          # Next.js UI (deploy to Vercel)
├── backend/           # FastAPI API (containerize for AWS)
├── docker-compose.yml # Local API + OpenSearch stack
└── scripts/           # Repo maintenance scripts
```

---

## Highlights

- **AI natural-language search** — Query inventory in plain language; intent and filters extracted by LLM.
- **Hybrid search (OpenSearch)** — Text + vector similarity on item descriptions; results loaded from PostgreSQL.
- **Structured filters (PostgreSQL)** — SKU, price, tags, folder, and low-stock queries run as SQL.
- **Python backend** — FastAPI service handles CRUD, OpenSearch indexing, LLM extraction, search, and JWT auth.
- **Supabase Auth** — Browser session tokens validated by the Python API (`SUPABASE_JWT_SECRET`).
- **Async search indexing** — OpenSearch index refreshed after item save (fire-and-forget).

---

## Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript, Tailwind, Radix UI |
| **Backend** | Python FastAPI (`backend/`), SQLAlchemy, OpenAI |
| **Database** | Supabase PostgreSQL — inventory source of truth |
| **Search** | OpenSearch — hybrid text + vector search on item descriptions |
| **Auth** | Supabase Auth (JWT validated in Python) |

---

## Architecture

```
Browser (Next.js UI)
    → frontend/lib/api-client.ts  (Authorization: Bearer <supabase_token>)
    → Python API :8000
        → PostgreSQL (CRUD, structured filters, inventory summaries)
        → OpenSearch (hybrid semantic search on descriptions)
        → OpenAI (embeddings + chat intent extraction)
```

- **Frontend** — UI only; no server actions or Next.js API routes for inventory data.
- **Python API** — All persistence, OpenSearch indexing, chat search orchestration, and auth.
- **Auth** — Supabase login in the browser; Python verifies JWT and scopes every query by `sub`.

---

## Quickstart (Docker)

```bash
git clone https://github.com/<your-org>/AI-Inventory-Assistant.git
cd AI-Inventory-Assistant
```

Copy `.env.example` to `.env` in the project root and fill in your values:

```bash
cp .env.example .env
```

Required variables include `DATABASE_URL` (Supabase Postgres URI), `OPENAI_API_KEY`, and Supabase auth keys. Docker Compose loads `.env` automatically for variable substitution.

Run `backend/migrations/supabase-migration.sql` in the Supabase SQL editor before first use.

```bash
docker compose up --build
```

- App: [http://localhost:3000](http://localhost:3000)
- API: [http://localhost:8000](http://localhost:8000)
- Health: [http://localhost:8000/health](http://localhost:8000/health)

### Local dev without Docker

```bash
# Terminal 1 — search and API
docker compose up opensearch api

# Terminal 2 — frontend
cd frontend
npm install
npm run dev
```

Set in `frontend/.env.local` (copy from `frontend/.env.example`). Next.js does **not** read the repo root `.env` when you run `npm run dev` from `frontend/`:

```bash
cp frontend/.env.example frontend/.env.local
# then edit frontend/.env.local with your Supabase values
```

If you previously applied the old pgvector hybrid-search migration, run `backend/migrations/supabase-chat-search-migration.sql` to drop the unused RPC and indexes.

---

## Deployment

| Target | Directory | Notes |
|--------|-----------|-------|
| **Vercel** | `frontend/` | Set Root Directory to `frontend` in project settings |
| **AWS (ECS/Fargate, etc.)** | `backend/` | `docker build -t inventory-api ./backend` |

---

## Production auth

Disable mock auth and set the JWT secret:

```bash
ALLOW_MOCK_AUTH=false
NEXT_PUBLIC_ALLOW_MOCK_AUTH=false
SUPABASE_JWT_SECRET=your-jwt-secret
```

Set `DATABASE_URL` in `.env` to your Supabase PostgreSQL URI so `user_id` values match authenticated users.

---

## License

MIT
