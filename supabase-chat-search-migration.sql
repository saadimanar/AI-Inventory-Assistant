-- Chat / semantic search: minimal schema additions (no renames, no drops)
-- Run this AFTER the original supabase-migration.sql

-- 1) Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- 2) Add search_text and embedding to items (new columns only)
ALTER TABLE items
  ADD COLUMN IF NOT EXISTS search_text TEXT,
  ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- 3) Optional: GIN index for full-text fallback when embedding is null
CREATE INDEX IF NOT EXISTS idx_items_search_text_gin
  ON items USING gin(to_tsvector('english', coalesce(search_text, '')));

-- 4) Vector index for similarity search (HNSW is faster for approximate search)
CREATE INDEX IF NOT EXISTS idx_items_embedding_hnsw
  ON items USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- 5) RLS: no change (embedding/search_text are just columns; existing policies apply)

-- 6) Hybrid search function: filters + optional vector similarity (user-scoped).
--    Safeguards: requires at least one of query_embedding or fts_query; similarity threshold; FTS match filter.
CREATE OR REPLACE FUNCTION search_items_hybrid(
  p_user_id UUID,
  p_query_embedding vector(1536),
  p_limit INT DEFAULT 20,
  p_name_ilike TEXT DEFAULT NULL,
  p_description_ilike TEXT DEFAULT NULL,
  p_tags_contain TEXT[] DEFAULT NULL,
  p_folder_id UUID DEFAULT NULL,
  p_max_price DECIMAL DEFAULT NULL,
  p_min_price DECIMAL DEFAULT NULL,
  p_max_quantity INT DEFAULT NULL,
  p_min_quantity INT DEFAULT NULL,
  p_fts_query TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  quantity INT,
  min_quantity INT,
  price DECIMAL,
  sku TEXT,
  folder_id UUID,
  tags TEXT[],
  image_url TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  user_id UUID,
  search_text TEXT,
  score FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id,
    i.name,
    i.description,
    i.quantity,
    i.min_quantity,
    i.price,
    i.sku,
    i.folder_id,
    i.tags,
    i.image_url,
    i.created_at,
    i.updated_at,
    i.user_id,
    i.search_text,
    (CASE
      WHEN p_query_embedding IS NOT NULL AND i.embedding IS NOT NULL
      THEN (1 - (i.embedding <=> p_query_embedding))::FLOAT
      WHEN p_fts_query IS NOT NULL AND length(trim(p_fts_query)) > 0 AND i.search_text IS NOT NULL
      THEN ts_rank(to_tsvector('english', coalesce(i.search_text, '')), websearch_to_tsquery('english', trim(p_fts_query)))::FLOAT
      ELSE 1.0
    END) AS score
  FROM items i
  WHERE i.user_id = p_user_id
    -- Require at least one query input (never return "all items" for normal search).
    AND (p_query_embedding IS NOT NULL OR (p_fts_query IS NOT NULL AND length(trim(p_fts_query)) > 0))
    -- Cosine similarity threshold when using embedding (filter irrelevant matches).
    AND (p_query_embedding IS NULL OR i.embedding IS NULL OR (1 - (i.embedding <=> p_query_embedding)) >= 0.65)
    -- FTS: only return rows that actually match the query (websearch_to_tsquery is safer for natural phrases).
    AND (p_fts_query IS NULL OR length(trim(p_fts_query)) = 0 OR (to_tsvector('english', coalesce(i.search_text, '')) @@ websearch_to_tsquery('english', trim(p_fts_query))))
    AND (p_name_ilike IS NULL OR i.name ILIKE '%' || p_name_ilike || '%')
    AND (p_description_ilike IS NULL OR i.description ILIKE '%' || p_description_ilike || '%')
    AND (p_folder_id IS NULL OR i.folder_id = p_folder_id)
    AND (p_max_price IS NULL OR i.price <= p_max_price)
    AND (p_min_price IS NULL OR i.price >= p_min_price)
    AND (p_max_quantity IS NULL OR i.quantity <= p_max_quantity)
    AND (p_min_quantity IS NULL OR i.quantity >= p_min_quantity)
    AND (
      p_tags_contain IS NULL
      OR p_tags_contain = '{}'
      OR i.tags && p_tags_contain
    )
  ORDER BY score DESC NULLS LAST, i.updated_at DESC
  LIMIT greatest(1, least(coalesce(p_limit, 20), 100));
END;
$$;

-- Grant execute to authenticated users (RLS still enforced via p_user_id from auth.uid() in app)
GRANT EXECUTE ON FUNCTION search_items_hybrid TO authenticated;
GRANT EXECUTE ON FUNCTION search_items_hybrid TO service_role;

-- ---------------------------------------------------------------------------
-- Sanity checks (run in Supabase SQL Editor to verify RAG/vector setup)
-- ---------------------------------------------------------------------------
-- How many items have NULL embeddings (will use FTS only for those rows):
--   SELECT count(*) AS total, count(embedding) AS with_embedding, count(*) - count(embedding) AS null_embedding FROM items;
--
-- Whether search_text is populated (required for FTS):
--   SELECT count(*) AS total, count(search_text) AS with_search_text FROM items;
--
-- Example RPC call with FTS only (no embedding; replace YOUR_USER_ID and adjust query):
--   SELECT id, name, score FROM search_items_hybrid(
--     'YOUR_USER_ID'::uuid,
--     NULL,
--     20,
--     NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
--     'oak table'
--   );
--
-- Example with a dummy embedding (1536 zeros; real usage comes from the API):
--   SELECT id, name, score FROM search_items_hybrid(
--     'YOUR_USER_ID'::uuid,
--     array_fill(0, ARRAY[1536])::vector(1536),
--     20,
--     NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
--     NULL
--   );
