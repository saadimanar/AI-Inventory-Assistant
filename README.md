# AI-Inventory-Assistant

**AI-powered inventory platform with semantic + hybrid search.**

Manage items and folders in a modern UI, then query inventory in plain language. Semantic vector search (OpenAI embeddings + pgvector) and structured filters run in PostgreSQL via a Python API.

---

## Repository layout

```
├── frontend/          # Next.js UI (deploy to Vercel)
├── backend/           # FastAPI API (containerize for AWS)
├── docker/            # Local Postgres init scripts
├── docker-compose.yml # Full local stack
└── scripts/           # Repo maintenance scripts
```

---

## Highlights

- **AI natural-language search** — Query inventory in plain language; intent and filters extracted by LLM.
- **Hybrid vector (pgvector) + FTS** — Cosine similarity when embeddings exist, full-text fallback on `search_text`.
- **Python backend** — FastAPI service handles CRUD, embeddings, LLM extraction, hybrid search, and JWT auth.
- **Supabase Auth** — Browser session tokens validated by the Python API (`SUPABASE_JWT_SECRET`).
- **Async embedding indexing** — Embeddings refreshed after item save (fire-and-forget).

---

## Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript, Tailwind, Radix UI |
| **Backend** | Python FastAPI (`backend/`), SQLAlchemy, OpenAI |
| **Database** | PostgreSQL + pgvector (local Docker or Supabase) |
| **Auth** | Supabase Auth (JWT validated in Python) |

---

## Architecture

```
Browser (Next.js UI)
    → frontend/lib/api-client.ts  (Authorization: Bearer <supabase_token>)
    → Python API :8000
    → PostgreSQL + pgvector (search_items_hybrid RPC)
```

- **Frontend** — UI only; no server actions or Next.js API routes for inventory data.
- **Python API** — All persistence, embeddings, chat search orchestration, and auth.
- **Auth** — Supabase login in the browser; Python verifies JWT and scopes every query by `sub`.

---

## Quickstart (Docker)

```bash
git clone https://github.com/<your-org>/AI-Inventory-Assistant.git
cd AI-Inventory-Assistant
```

Create `.env` in the project root:

```bash
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
# Optional for production auth (Supabase Dashboard → API → JWT Secret):
SUPABASE_JWT_SECRET=your-jwt-secret
```

Local dev uses mock auth by default (`ALLOW_MOCK_AUTH=true` in `docker-compose.yml`).

```bash
docker compose up --build
```

- App: [http://localhost:3000](http://localhost:3000)
- API: [http://localhost:8000](http://localhost:8000)
- Health: [http://localhost:8000/health](http://localhost:8000/health)

### Local dev without Docker

```bash
# Terminal 1 — database + API
docker compose up postgres-dev api

# Terminal 2 — frontend
cd frontend
npm install
npm run dev
```

Set in `frontend/.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_ALLOW_MOCK_AUTH=true
```

Run Supabase migrations (`backend/migrations/supabase-migration.sql`, then `backend/migrations/supabase-chat-search-migration.sql`) when using Supabase-hosted Postgres.

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

Point `DATABASE_URL` at Supabase PostgreSQL so `user_id` values match authenticated users.

---

## License

MIT
