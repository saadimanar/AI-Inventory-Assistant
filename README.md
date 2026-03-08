# AI-Inventory-Assistant

**AI-powered inventory platform with semantic + hybrid search.**

Full-stack inventory management with natural-language search: manage items and folders in a modern UI, then query in plain language. Semantic vector search (OpenAI embeddings + pgvector) and structured filters run in a single PostgreSQL RPC.

---

## 🚀 Highlights

- **AI natural-language search** — Query inventory in plain language; intent and filters extracted by LLM.
- **Hybrid vector (pgvector) + FTS** — Single RPC: cosine similarity when embeddings exist, full-text fallback; same `search_text` column for both.
- **OpenAI embeddings + structured filters** — `text-embedding-3-small` for semantics; filters for price, quantity, tags, folder, SKU.
- **Secure multi-user architecture** — Supabase Auth + RLS; every query scoped by server-side `user_id`; RPC receives `p_user_id` from API only.
- **Async embedding indexing** — Embeddings and `search_text` updated after item save (fire-and-forget); write path stays fast.
- **Modern Next.js full-stack** — App Router, React 19, TypeScript, Tailwind; API routes for chat search and embedding.

---

## 🌐 Demo

**Live:** [https://ai-personal-assistant-lilac.vercel.app](https://ai-personal-assistant-lilac.vercel.app)

*Screenshots: add dashboard / Advanced Search panel as needed.*

---

## 🛠 Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript, Tailwind, Radix UI |
| **Backend / Data** | Supabase (Auth, PostgreSQL, Storage) |
| **Search / AI** | pgvector, OpenAI (`text-embedding-3-small`, `gpt-4o-mini` for extraction) |
| **API** | Next.js Route Handlers (`/api/chat/search`, `/api/items/[id]/embedding`) |

---

## 🏗 Architecture

**Flow:** UI → API Route (auth) → LLM extraction (intent, filters, semantic query) → query embedding (OpenAI) → Supabase RPC `search_items_hybrid` → ranked results.

- Auth and all DB access scoped by `user_id` from `getUser()`.
- RPC combines vector similarity (or FTS) with structured filters in one round-trip; item embeddings indexed asynchronously after create/update.

---

## 🔍 Advanced Search (Brief)

- **Intent extraction** — LLM returns JSON: `search_items` | `inventory_question` | `other`, plus optional clarification.
- **Semantic query** — User phrase (e.g. “rounded oak table”) embedded via OpenAI; used for vector similarity or FTS when embedding is unavailable.
- **Hybrid retrieval** — RPC uses pgvector cosine similarity (with minimum score threshold) when embeddings exist; otherwise `search_text` + `websearch_to_tsquery` + `ts_rank`.
- **Structured filtering** — Price, quantity, tags, folder, SKU, name/description applied in the same query; single round-trip.

---

## ⚡ Quickstart

```bash
git clone https://github.com/<your-org>/AI-Inventory-Assistant.git
cd AI-Inventory-Assistant
npm install
```

Add `.env.local` with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and optionally `OPENAI_API_KEY`. Run Supabase migrations (`supabase-migration.sql`, then `supabase-chat-search-migration.sql`), then:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Why This Project Is Interesting

- **Production-style RAG** — Real auth, RLS, and one RPC combining vector similarity, FTS, and structured filters; built for multi-user use.
- **Clear layering** — UI → API → LLM/embedding → Supabase RPC; frontend never sees embeddings or SQL.
- **Graceful degradation** — Works without OpenAI (filter + FTS); embeddings optional, indexed in background.
- **Semantic + structured** — Natural language plus explicit filters in one flow, as in real product search systems.

---

## License

MIT (or specify your preferred license).
