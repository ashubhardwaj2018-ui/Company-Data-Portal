---
name: Country listing indexes
description: Why country directory queries ordered by newest ID require per-country partial indexes at AddressBay scale.
---

For country-scoped company lists ordered by descending ID, retain a descending partial index for every supported country in addition to the general country/ID index.

**Why:** Company imports arrive in large country-sized ID blocks. PostgreSQL assumes a more uniform distribution and may choose the primary-key index, scanning millions of newer rows from other countries before finding a match. A general composite country/ID index improved counts but did not prevent this bad row-fetch plan; the smaller partial index made the correct plan unambiguously cheaper.

**How to apply:** Add the partial index whenever a country is added, build production indexes concurrently outside transactions, run `ANALYZE companies` afterward, and verify with `EXPLAIN (ANALYZE, BUFFERS)` rather than trusting index existence alone.