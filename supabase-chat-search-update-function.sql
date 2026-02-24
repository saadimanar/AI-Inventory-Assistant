-- Run this in Supabase SQL Editor if you already ran supabase-chat-search-migration.sql.
-- Updates only search_items_hybrid with safeguards (no duplicate extension/columns/indexes).

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
    AND (p_query_embedding IS NOT NULL OR (p_fts_query IS NOT NULL AND length(trim(p_fts_query)) > 0))
    AND (p_query_embedding IS NULL OR i.embedding IS NULL OR (1 - (i.embedding <=> p_query_embedding)) >= 0.3)
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

GRANT EXECUTE ON FUNCTION search_items_hybrid TO authenticated;
GRANT EXECUTE ON FUNCTION search_items_hybrid TO service_role;
