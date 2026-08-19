-- Country-specific company fields (USA, Australia, UK, Singapore)
-- Idempotent — safe to run multiple times. Apply on the VPS production DB
-- before deploying the matching frontend/server build.
--   psql "$DATABASE_URL" -f migrations/2026-08-19_country_specific_company_fields.sql

ALTER TABLE companies
  -- USA
  ADD COLUMN IF NOT EXISTS public_private text,
  ADD COLUMN IF NOT EXISTS location_type text,
  ADD COLUMN IF NOT EXISTS firm_individual text,
  ADD COLUMN IF NOT EXISTS web_address text,
  -- Australia
  ADD COLUMN IF NOT EXISTS company_type text,
  ADD COLUMN IF NOT EXISTS deregistration_date date,
  ADD COLUMN IF NOT EXISTS previous_state_of_registration text,
  ADD COLUMN IF NOT EXISTS state_registration_number text,
  ADD COLUMN IF NOT EXISTS abn text,
  ADD COLUMN IF NOT EXISTS current_name text,
  -- UK (Companies House)
  ADD COLUMN IF NOT EXISTS care_of text,
  ADD COLUMN IF NOT EXISTS po_box text,
  ADD COLUMN IF NOT EXISTS address_line_2 text,
  ADD COLUMN IF NOT EXISTS sub_city text,
  ADD COLUMN IF NOT EXISTS country_of_origin text,
  ADD COLUMN IF NOT EXISTS account_category text,
  ADD COLUMN IF NOT EXISTS sic_code_1 text,
  ADD COLUMN IF NOT EXISTS sic_code_2 text,
  ADD COLUMN IF NOT EXISTS sic_code_3 text,
  ADD COLUMN IF NOT EXISTS sic_code_4 text,
  ADD COLUMN IF NOT EXISTS uri text,
  -- Singapore (ACRA)
  ADD COLUMN IF NOT EXISTS issuance_agency_id text,
  ADD COLUMN IF NOT EXISTS entity_type text,
  ADD COLUMN IF NOT EXISTS business_constitution text,
  ADD COLUMN IF NOT EXISTS paf_constitution text,
  ADD COLUMN IF NOT EXISTS block text,
  ADD COLUMN IF NOT EXISTS street_name text,
  ADD COLUMN IF NOT EXISTS level_no text,
  ADD COLUMN IF NOT EXISTS unit_no text,
  ADD COLUMN IF NOT EXISTS building_name text,
  ADD COLUMN IF NOT EXISTS primary_ssic_code text,
  ADD COLUMN IF NOT EXISTS primary_ssic_description text,
  ADD COLUMN IF NOT EXISTS secondary_ssic_code text,
  ADD COLUMN IF NOT EXISTS secondary_ssic_description text;
