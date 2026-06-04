-- Local PostgreSQL bootstrap (no Supabase auth.users dependency)
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  parent_id UUID REFERENCES folders(id) ON DELETE SET NULL,
  color TEXT NOT NULL DEFAULT '#6366F1',
  item_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID NOT NULL
);

CREATE TABLE IF NOT EXISTS items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  quantity INTEGER NOT NULL DEFAULT 0,
  min_quantity INTEGER NOT NULL DEFAULT 0,
  price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  sku TEXT NOT NULL,
  folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  image_url TEXT,
  search_text TEXT,
  embedding vector(1536),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_items_user_id ON items(user_id);
CREATE INDEX IF NOT EXISTS idx_items_folder_id ON items(folder_id);
CREATE INDEX IF NOT EXISTS idx_items_updated_at ON items(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_folders_user_id ON folders(user_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders(parent_id);

CREATE OR REPLACE FUNCTION update_folder_item_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.folder_id IS NOT NULL THEN
      UPDATE folders SET item_count = item_count + 1 WHERE id = NEW.folder_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.folder_id IS DISTINCT FROM NEW.folder_id THEN
      IF OLD.folder_id IS NOT NULL THEN
        UPDATE folders SET item_count = item_count - 1 WHERE id = OLD.folder_id;
      END IF;
      IF NEW.folder_id IS NOT NULL THEN
        UPDATE folders SET item_count = item_count + 1 WHERE id = NEW.folder_id;
      END IF;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.folder_id IS NOT NULL THEN
      UPDATE folders SET item_count = item_count - 1 WHERE id = OLD.folder_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_folder_item_count ON items;
CREATE TRIGGER trigger_update_folder_item_count
  AFTER INSERT OR UPDATE OR DELETE ON items
  FOR EACH ROW
  EXECUTE FUNCTION update_folder_item_count();

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_items_updated_at ON items;
CREATE TRIGGER trigger_update_items_updated_at
  BEFORE UPDATE ON items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_items_search_text_gin
  ON items USING gin(to_tsvector('english', coalesce(search_text, '')));

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
