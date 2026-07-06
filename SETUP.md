# Setup & Deployment

## Prerequisites

| Software | Version | Purpose |
|----------|---------|---------|
| [Docker](https://docs.docker.com/get-docker/) & Docker Compose | Latest | Run full local stack |
| [Node.js](https://nodejs.org/) | 20+ | Frontend development |
| [Python](https://www.python.org/) | 3.11+ | Backend development (optional if using Docker) |
| [Supabase](https://app.supabase.com) account | — | PostgreSQL database and authentication |
| [OpenAI](https://platform.openai.com) API key | — | Embeddings and chat intent extraction |

## Installation

```bash
git clone https://github.com/<your-org>/AI-Inventory-Assistant-AWS.git
cd AI-Inventory-Assistant-AWS
```

1. Create a Supabase project and run `backend/migrations/supabase-migration.sql` in the SQL editor.
2. Copy Project URL, anon key, and JWT secret from **Project Settings → API**.
3. Add redirect URLs under **Authentication → URL Configuration**: `http://localhost:3000/auth/callback` and `https://www.inventorygent.com/auth/callback`.

See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for detailed auth setup.

Create a `.env` in the project root:

```bash
DATABASE_URL=postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_JWT_SECRET=your-jwt-secret
```

For frontend-only local dev, create `frontend/.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

```bash
cd frontend && npm install
```

## Running

**Full stack:**

```bash
docker compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | [http://localhost:3000](http://localhost:3000) |
| API | [http://localhost:8000](http://localhost:8000) |
| API health | [http://localhost:8000/health](http://localhost:8000/health) |
| OpenSearch | [http://localhost:9200](http://localhost:9200) |

**Split terminals (hot reload):**

```bash
docker compose up opensearch api          # Terminal 1
cd frontend && npm run dev                # Terminal 2
```

**Production builds:**

```bash
cd frontend && npm run build && npm start
docker build -t inventory-api ./backend
docker run -p 8000:8000 --env-file .env inventory-api
```

**Linting:**

```bash
cd frontend && npm run lint
```

## Deployment

| Target | Directory | Notes |
|--------|-----------|-------|
| **Vercel** | `frontend/` | Set Root Directory to `frontend`. Configure `NEXT_PUBLIC_API_URL` to point to the production API. |
| **AWS ECS/Fargate** | `backend/` | `docker build -t inventory-api ./backend`. Push to ECR and deploy as a service. Set `OPENSEARCH_URL` to your Amazon OpenSearch Service endpoint. |

Production auth:

```bash
ALLOW_MOCK_AUTH=false
NEXT_PUBLIC_ALLOW_MOCK_AUTH=false
SUPABASE_JWT_SECRET=<your-jwt-secret>
SUPABASE_URL=https://<ref>.supabase.co
```
