-- AddressBay company-directory performance indexes.
--
-- IMPORTANT FOR THE 1.7 CRORE-ROW VPS DATABASE:
-- 1. Run each CREATE INDEX CONCURRENTLY statement outside a transaction.
-- 2. Run during a lower-traffic window. CONCURRENTLY keeps reads/writes available,
--    but each index build still uses CPU, disk I/O, and temporary disk space.
-- 3. Run ANALYZE after all indexes finish.

-- Fast country landing pages:
-- WHERE country_code = ? ORDER BY id DESC LIMIT ?
CREATE INDEX CONCURRENTLY IF NOT EXISTS companies_country_id_desc_idx
  ON companies (country_code, id DESC);

-- Company IDs were imported in large country-sized blocks. PostgreSQL otherwise
-- underestimates how far it must scan the primary key to reach an older country.
-- These smaller partial indexes make first-page country lookups deterministic.
CREATE INDEX CONCURRENTLY IF NOT EXISTS companies_in_id_desc_idx
  ON companies (id DESC) WHERE country_code = 'IN';

CREATE INDEX CONCURRENTLY IF NOT EXISTS companies_au_id_desc_idx
  ON companies (id DESC) WHERE country_code = 'AU';

CREATE INDEX CONCURRENTLY IF NOT EXISTS companies_gb_id_desc_idx
  ON companies (id DESC) WHERE country_code = 'GB';

CREATE INDEX CONCURRENTLY IF NOT EXISTS companies_sg_id_desc_idx
  ON companies (id DESC) WHERE country_code = 'SG';

CREATE INDEX CONCURRENTLY IF NOT EXISTS companies_us_id_desc_idx
  ON companies (id DESC) WHERE country_code = 'US';

-- Fast state/region aggregation and state company pages.
CREATE INDEX CONCURRENTLY IF NOT EXISTS companies_country_state_id_desc_idx
  ON companies (country_code, state, id DESC)
  WHERE state IS NOT NULL AND state <> '';

-- Fast city pages inside a state.
CREATE INDEX CONCURRENTLY IF NOT EXISTS companies_country_state_city_id_desc_idx
  ON companies (country_code, state, city, id DESC)
  WHERE city IS NOT NULL AND city <> '';

-- Fast A-Z filtering within a country.
CREATE INDEX CONCURRENTLY IF NOT EXISTS companies_country_lower_name_pattern_idx
  ON companies (country_code, lower(name) text_pattern_ops);

-- Fast country-aware SEO company detail routes.
CREATE INDEX CONCURRENTLY IF NOT EXISTS companies_country_slug_idx
  ON companies (country_code, slug)
  WHERE slug IS NOT NULL;

-- Fast country-specific trending cards.
CREATE INDEX CONCURRENTLY IF NOT EXISTS companies_country_views_id_desc_idx
  ON companies (country_code, view_count DESC, id DESC);

ANALYZE companies;