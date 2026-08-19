-- Optional but recommended for fast substring search on the 1.7 crore-row VPS DB.
--
-- These GIN indexes can be large. Check free disk space first, then run each
-- CREATE INDEX CONCURRENTLY outside a transaction during a lower-traffic window.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX CONCURRENTLY IF NOT EXISTS companies_name_trgm_idx
  ON companies USING GIN (name gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS companies_cin_trgm_idx
  ON companies USING GIN (cin gin_trgm_ops)
  WHERE cin IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS companies_email_trgm_idx
  ON companies USING GIN (email gin_trgm_ops)
  WHERE email IS NOT NULL;

ANALYZE companies;