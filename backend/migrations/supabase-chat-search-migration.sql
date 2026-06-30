-- Legacy cleanup: Postgres hybrid search was replaced by OpenSearch.
-- Run this only if you previously applied the old chat-search migration that
-- added search_items_hybrid, pgvector columns, and related indexes.
-- New projects do not need this file.

DROP FUNCTION IF EXISTS search_items_hybrid(
  UUID,
  vector,
  INT,
  TEXT,
  TEXT,
  TEXT[],
  UUID,
  DECIMAL,
  DECIMAL,
  INT,
  INT,
  TEXT
);

DROP INDEX IF EXISTS idx_items_search_text_gin;
DROP INDEX IF EXISTS idx_items_embedding_hnsw;

ALTER TABLE items DROP COLUMN IF EXISTS search_text;
ALTER TABLE items DROP COLUMN IF EXISTS embedding;
