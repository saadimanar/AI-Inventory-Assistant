-- MANUAL PRODUCTION STEP ONLY
-- Do not run this file from Docker build, container startup, GitHub Actions,
-- or the EC2 deploy script. Execute it in the Supabase SQL Editor after the
-- application code that no longer references these columns is deployed and
-- verified.
--
-- Purpose: drop leftover Postgres hybrid-search artifacts from an older
-- chat-search migration (search_items_hybrid, pgvector embedding column,
-- generated search_text, and related indexes). New projects that only ran
-- supabase-migration.sql do not need this file.
--
-- Prerequisites:
--   1. Back up the items table (or at least the embedding and search_text columns).
--   2. Confirm production API create/update/delete/search work without those columns.
--
-- This file contains no credentials. Use the Supabase Dashboard session; do not
-- put DATABASE_URL, service-role keys, or connection strings in this script.
--
-- Rollback: dropped columns and the RPC cannot be restored from this file.
-- Restore from the backup taken in step 1. Re-adding empty columns will not
-- recover embeddings or search_text values.

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
