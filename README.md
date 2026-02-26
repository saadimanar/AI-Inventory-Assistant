# Inventra

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20pgvector-3ECF8E?logo=supabase)](https://supabase.com/)

**AI-powered inventory platform with semantic + hybrid search.**

Inventra is a production-ready inventory management system that combines structured CRUD with natural-language search. Users manage items and folders in a modern UI while querying inventory in plain language—semantic vector search and full-text search run inside PostgreSQL via a single, secure RPC.

---

## 🌐 Live Demo

**[→ Try Inventra (production)](https://ai-personal-assistant-lilac.vercel.app)**

| | |
|---|---|
| **URL** | https://ai-personal-assistant-lilac.vercel.app |
| **Stack** | Next.js, Supabase, pgvector, OpenAI |

<!-- Screenshots: dashboard, item grid, AI Search panel -->
*Add screenshots or a short GIF here for maximum impact.*

---

## 🚀 Highlights

- **Production-style AI search pipeline** — LLM intent/filter extraction → query embedding → hybrid retrieval in one request; no toy demos.
- **Hybrid vector + FTS in PostgreSQL** — Single `search_items_hybrid` RPC: cosine similarity (pgvector) when embeddings exist, full-text search fallback; both use the same `search_text` column.
- **Secure multi-tenant model** — Supabase Auth + Row Level Security; every query scoped by server-side `user_id`; RPC is `SECURITY DEFINER` with `p_user_id` from the API only.
- **Async embedding indexing** — Embeddings and `search_text` updated via dedicated API after item save (fire-and-forget); write path stays fast and failures don’t block users.
- **Single RPC for filtering + ranking** — All filters (price, quantity, tags, folder, SKU, name/description) and vector or FTS ranking in one database round-trip.
- **Graceful degradation** — Works without OpenAI: filter-only and FTS search remain available when `OPENAI_API_KEY` is unset.

---

## 📦 Features

- **Authentication** — Supabase Auth (email/password, RLS-protected).
- **Full CRUD** — Create, read, update, delete inventory items with rich metadata (name, description, quantity, min quantity, price, SKU, tags, image).
- **Folder organization** — Hierarchical folders with colors and item counts.
- **AI Chat Search** — Natural-language queries with:
  - **Intent & filter extraction** via LLM (search vs. inventory questions vs. clarification).
  - **Semantic vector search** over item name, description, and tags (OpenAI embeddings + pgvector).
  - **Hybrid retrieval** — vector similarity when embeddings exist, full-text search (FTS) fallback when not.
  - **Structured filters** — price range, quantity, tags, folder, SKU, name/description substring.
- **Smart filtering** — Combine semantic meaning with exact filters (e.g. *"round wooden tables under $100"*).
- **Responsive UI** — Mobile and desktop with sidebar, grid, and slide-out panels.
- **Modern UX** — Dark/light theme, dialogs, toasts, and consistent design (Tailwind + Radix UI).

---

## 💬 Use Cases

Example natural-language queries the system supports:

| Query | Behavior |
|-------|----------|
| *"oak tables under $200"* | Semantic match on "oak tables" + structured filter `max_price ≤ 200`. |
| *"low stock items"* | Filter by `quantity ≤ min_quantity`. |
| *"how many items do I have?"* | Intent `inventory_question` → aggregate total items, value, folders, low-stock count. |
| *"rounded wooden desk"* | Semantic search over name, description, tags (no explicit filter fields for shape/material). |
| *"items in Office folder"* | Folder filter + optional semantic query. |
| *"filter by color"* | Unsupported dimension → LLM returns `needs_clarification` with a short follow-up question. |

---

## 🛠 Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Framework** | Next.js 16 (App Router), React 19 |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS 4, Radix UI, Lucide icons |
| **Backend / Data** | Supabase (Auth, PostgreSQL, Storage) |
| **Search / AI** | pgvector, OpenAI (embeddings + chat for extraction) |
| **API** | Next.js Route Handlers (`app/api`) |
| **State** | React state, Supabase client (server components where applicable) |

- **Embeddings:** OpenAI `text-embedding-3-small` (1536 dimensions).
- **LLM for extraction:** OpenAI `gpt-4o-mini` with JSON mode.
- **Vector DB:** PostgreSQL + pgvector (HNSW index for approximate nearest neighbor).

---

## 🏗 Architecture Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Next.js App   │────▶│  API Routes      │────▶│  Supabase       │
│   (React, TS)   │     │  /api/chat/search│     │  (Postgres +     │
│                 │     │  /api/items/     │     │   pgvector, RLS) │
│                 │     │    [id]/embedding│     │                 │
└────────┬────────┘     └────────┬─────────┘     └────────┬────────┘
         │                       │                        │
         │                       │  OpenAI (optional)     │
         │                       │  • Embeddings API      │
         │                       │  • Chat (extraction)   │
         │                       └────────────────────────┘
         │
         │  Auth: Supabase getUser() server-side; all queries scoped by user_id
         ▼
  RLS policies enforce per-user access on folders + items
```

- **Frontend** — App Router pages and client components; chat search panel posts to `/api/chat/search`.
- **API layer** — Validates auth, runs LLM extraction, computes query embedding, and invokes the Supabase RPC or fallback filter logic.
- **Database** — PostgreSQL with RLS; pgvector and `search_items_hybrid` RPC for hybrid search; embeddings and `search_text` updated via a dedicated embedding API after item create/update.

---

## 🔍 AI Search (Deep Dive)

**TL;DR** — User message → API auth → LLM extracts intent, filters, and a semantic phrase → clarify / inventory answer / search. For search: query is embedded (OpenAI), then Supabase RPC `search_items_hybrid` runs with that vector (or FTS query) plus filters; results are ranked by similarity or FTS score. Item embeddings are indexed asynchronously after each create/update.

### End-to-end pipeline

1. **User message** → `POST /api/chat/search` with `{ message, appliedFilters? }`.
2. **Auth** — Server creates Supabase client and uses `getUser()`; every subsequent operation is scoped to that user.
3. **LLM extraction** (`lib/chat-search-llm.ts`) — Message is sent to OpenAI with a strict system prompt. The model returns JSON:
   - **`intent`** — `search_items` | `inventory_question` | `other`
   - **`filters`** — Only fields that exist on `items` (e.g. `name_contains`, `max_price`, `tags`, `folder_id`)
   - **`semantic_query`** — Short phrase for vector/FTS (e.g. *"rounded oak table"*)
   - **`needs_clarification`** / **`clarifying_question`** — Set when the user asks to filter by unsupported dimensions (e.g. color, size) or the request is too vague
4. **Response branching**
   - **Clarify** → Return `{ type: "clarify", question }`.
   - **Inventory question** → Aggregate data (total items, value, low stock, folder count) and return `{ type: "answer", message }`.
   - **Search** → Continue to hybrid retrieval.
5. **Query embedding** — If `OPENAI_API_KEY` is set and `semantic_query` is non-empty, the API calls `getEmbedding(semantic_query)` (OpenAI `text-embedding-3-small`). Result is a 1536-dim vector.
6. **Hybrid RPC** — Server calls Supabase RPC `search_items_hybrid` with:
   - `p_user_id` (from auth; never from client)
   - `p_query_embedding` (vector) or `p_fts_query` (text)—at least one required so the RPC never returns “all items”
   - Filter parameters (name ilike, price range, tags, folder_id, etc.)
   - `p_limit` (e.g. 20)
7. **Inside the RPC (Postgres)**
   - **Vector path** — Cosine similarity `1 - (embedding <=> p_query_embedding)`; rows below 0.65 similarity are filtered out; results ordered by score.
   - **FTS path** — When no embedding is provided (or for rows with null embedding), `search_text` is searched with `websearch_to_tsquery` and ranked with `ts_rank`.
   - All filters are applied in the same query.
8. **Response** — `{ type: "results", items, appliedFilters }`. Frontend shows result cards and can sync selection with the main inventory view.

### Embedding pipeline (indexing)

- **When:** After each item create or update (from the item form).
- **Where:** Client fires `POST /api/items/[id]/embedding` after a successful save (fire-and-forget).
- **What:** Server loads the item (with `user_id` check), builds **`search_text`** = `name + " " + description + " " + tags.join(" ")`, then:
  - Calls OpenAI Embeddings API and stores the vector in `items.embedding`.
  - Writes `items.search_text` (for FTS and as the source for future re-embedding).
- **Graceful degradation:** If `OPENAI_API_KEY` is missing, only `search_text` is updated; FTS and filter-only search still work.

### Why this is robust and scalable

- **Separation of concerns:** Frontend only sends the message; all parsing, embedding, and search logic live in the API and DB.
- **Security:** RPC is `SECURITY DEFINER` but receives `p_user_id` from the server (authenticated user). RLS still applies to base tables; the RPC enforces `user_id` in its `WHERE` clause.
- **Hybrid design:** Vector search for semantic relevance; FTS when embeddings are missing or as a fallback; structured filters narrow results in one round-trip.
- **Indexing:** HNSW on `embedding` (vector_cosine_ops) and GIN on `to_tsvector('english', search_text)` keep search fast at scale.

---

## 📊 Database Schema (High Level)

### Core tables (from `supabase-migration.sql`)

- **`folders`** — `id`, `name`, `parent_id`, `color`, `item_count`, `created_at`, `user_id`. RLS: user-scoped.
- **`items`** — `id`, `name`, `description`, `quantity`, `min_quantity`, `price`, `sku`, `folder_id`, `tags`, `image_url`, `created_at`, `updated_at`, `user_id`. RLS: user-scoped.

### Search extension (from `supabase-chat-search-migration.sql`)

- **`items.search_text`** (TEXT) — Concatenation of name, description, and tags; used for FTS and as input to embeddings.
- **`items.embedding`** (vector(1536)) — OpenAI `text-embedding-3-small` vector.
- **Extension:** `vector` (pgvector).
- **Indexes:** GIN on `to_tsvector('english', search_text)`; HNSW on `embedding` with `vector_cosine_ops`.
- **Function:** `search_items_hybrid(...)` — Applies filters + optional vector similarity or FTS ranking; returns rows with a `score`; requires at least one of `p_query_embedding` or `p_fts_query`.

---

## ⚡ Quickstart

```bash
git clone https://github.com/<your-org>/AI-Personal-Assistant.git
cd AI-Personal-Assistant
npm install
# Create .env.local with required vars (see Environment Variables below)
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000). You must configure Supabase (and optionally OpenAI) before the app is fully functional—see **Installation & Setup** and **Environment Variables** below.

---

## 📋 Installation & Setup

### Prerequisites

- Node.js 18+
- npm or pnpm
- Supabase account
- (Optional) OpenAI API key for AI search and embeddings

### Steps

1. **Clone and install**

   ```bash
   git clone https://github.com/<your-org>/AI-Personal-Assistant.git
   cd AI-Personal-Assistant
   npm install
   ```

2. **Supabase project**
   - Create a project at [supabase.com](https://supabase.com).
   - In the SQL Editor, run `supabase-migration.sql` (creates `folders`, `items`, RLS, triggers).
   - Then run `supabase-chat-search-migration.sql` (adds `search_text`, `embedding`, pgvector, and `search_items_hybrid`).
   - Create a storage bucket `item-images` and configure policies (see `SUPABASE_STORAGE_SETUP.md` if present).

3. **Environment variables**  
   Create `.env.local` in the project root (see **Environment Variables** below).

4. **Run the app**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

---

## 🔑 Environment Variables

Create `.env.local` with:

```env
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# OpenAI (optional but recommended for AI search)
# If missing: no embeddings, no LLM extraction; FTS and filter-only search still work
OPENAI_API_KEY=sk-...
```

- **Supabase:** From Project Settings → API in the dashboard.
- **OpenAI:** From [platform.openai.com](https://platform.openai.com). Used for query/item embeddings and for intent/filter extraction in chat search.

---

## Running Locally

```bash
npm run dev   # Development (Next.js dev server)
npm run build # Production build
npm run start # Start production server
npm run lint  # ESLint
```

---

## 🔐 Security Model

- **Authentication** — Supabase Auth (email/password). Server-side route handlers use `createClient()` and `getUser()`; unauthenticated requests receive 401.
- **Row Level Security (RLS)** — Enabled on `folders` and `items`. Policies restrict all operations to rows where `user_id = auth.uid()`.
- **Server-side user scoping** — The API never trusts client-supplied user IDs. For chat search, `p_user_id` passed to `search_items_hybrid` is always the authenticated user’s id from `getUser()`.
- **RPC** — `search_items_hybrid` is `SECURITY DEFINER` with `search_path = public`; it receives `p_user_id` from the application layer only and enforces it in the `WHERE` clause. No schema changes bypass RLS on the base tables.

---

## 📁 Project Structure

```
├── app/
│   ├── api/
│   │   ├── chat/search/route.ts    # AI chat search: auth → LLM → embedding → RPC
│   │   └── items/[id]/embedding/   # POST: update search_text + embedding for one item
│   ├── auth/                       # Login, signup, callback, verify-email
│   ├── ai-search/page.tsx          # AI Search full-page entry
│   ├── setup/page.tsx
│   ├── page.tsx
│   └── layout.tsx
├── components/
│   ├── inventory/                  # Dashboard, sidebar, item grid, forms, chat search panel
│   └── ui/                         # Radix-based primitives (dialog, button, input, etc.)
├── lib/
│   ├── embedding.ts                # buildSearchText, getEmbedding (OpenAI)
│   ├── chat-search-llm.ts          # extractSearchParams (OpenAI JSON extraction)
│   ├── chat-search-types.ts        # ExtractedFilters, ChatSearchResponse, etc.
│   ├── use-chat-search.ts         # Chat state, sendMessage, persistence
│   ├── inventory-store.ts         # Supabase CRUD + real-time for items/folders
│   └── inventory-types.ts
├── utils/
│   └── supabase/                   # createClient (client + server), middleware
├── supabase-migration.sql          # Base schema: folders, items, RLS
├── supabase-chat-search-migration.sql  # search_text, embedding, search_items_hybrid
└── package.json
```

---

## ⚡ Performance & Optimization

- **Vector index:** HNSW (`vector_cosine_ops`) for fast approximate nearest-neighbor search without full table scan.
- **FTS index:** GIN on `to_tsvector('english', search_text)` for fast full-text search.
- **Embedding on write:** Embeddings and `search_text` updated asynchronously after save so the main write path stays fast.
- **Single RPC:** Hybrid search runs in one database round-trip (filters + vector or FTS ranking).
- **Similarity threshold:** 0.65 minimum cosine similarity in the RPC to reduce noise.
- **Limit cap:** RPC limits results (e.g. top 20) to keep response size bounded.

---

## 🔧 Troubleshooting

| Issue | What to check |
|-------|----------------|
| **Items or folders not appearing** | Confirm you’re logged in; verify RLS policies in Supabase (Table Editor → Policies). |
| **AI search returns nothing** | Ensure `supabase-chat-search-migration.sql` was run; if using embeddings, confirm `OPENAI_API_KEY` is set and items have been saved (embedding runs after create/update). |
| **"Search failed" or 500 on chat search** | Check API logs for LLM or embedding errors; verify Supabase RPC `search_items_hybrid` exists and has correct signature. |
| **Images not uploading** | Ensure storage bucket `item-images` exists, is public for read, and has policies allowing authenticated upload/update/delete. |
| **Env vars not loading** | Use `.env.local` in the project root; restart the dev server after changing env. |

---

## 🔮 Future Improvements

- **Re-ranking:** Optional second-stage reranker (e.g. cross-encoder) on top of vector + filter results.
- **Caching:** Cache query embeddings or frequent search results (e.g. short TTL) to reduce OpenAI and DB load.
- **Batch re-embedding:** Background job to backfill or refresh embeddings when the embedding model or `search_text` logic changes.
- **Analytics:** Log anonymized query patterns to tune prompts and similarity thresholds.
- **Multi-tenant scale:** Connection pooling (e.g. Supabase Pooler) and read replicas for high concurrency.

---

## Why This Project Is Technically Interesting

- **Production-style RAG** — Real auth, RLS, and a single RPC that combine vector similarity, FTS, and structured filters; built for multi-user use, not a toy demo.
- **Clear layering** — UI → API route → LLM/embedding → Supabase RPC; each layer has a single responsibility; the frontend never sees embeddings or raw SQL.
- **Graceful degradation** — Works without OpenAI (filter + FTS); embeddings are optional and updated in the background so the product remains usable.
- **Modern stack** — Next.js App Router, React 19, TypeScript, Tailwind 4, Supabase, and pgvector in one cohesive application.
- **Semantic + structured** — Users mix natural language (“round wooden table”) with explicit filters (“under $100”), matching how real inventory and product search systems behave.

---

## 📋 Engineering Decisions

| Decision | Rationale |
|----------|-----------|
| **LLM for extraction** | Converts free-form queries into structured filters + semantic phrase; avoids brittle regex and supports follow-up context. |
| **pgvector in Postgres** | Keeps search in the same DB as items; no separate vector store to operate; RLS and filters stay in one place. |
| **Hybrid (vector + FTS)** | Vector covers semantic similarity; FTS covers exact phrases and when embeddings are missing; both use the same `search_text`. |
| **Embedding after save** | Keeps create/update fast; indexing is async and failure doesn’t block the user. |
| **SECURITY DEFINER RPC** | RPC needs to read `items` with filters and vector op; `p_user_id` is passed from the authenticated API so the app stays in control of scope. |
| **Strict JSON from LLM** | Typed extraction (intent, filters, semantic_query) makes the API contract clear and the frontend simple. |

---

## License

MIT (or specify your preferred license).
