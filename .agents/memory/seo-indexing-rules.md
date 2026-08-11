---
name: SEO indexing-control system
description: How index/noindex + sitemap eligibility decisions work and the sync rule between shared logic and SQL predicates
---

The rule: page-quality decisions live in `shared/seo.ts` (used by client Helmet robots tags), and are **mirrored as SQL predicates** in storage's sitemap helpers (`sitemapEligible*`) so sitemap generation stays memory-efficient at millions of rows.

**Why:** running the JS quality function per row would require loading full records; the SQL mirror keeps counts, sitemap rows, and the admin SEO report consistent without full-table loads.

**How to apply:** whenever an SEO quality threshold or qualifying field changes, update BOTH `shared/seo.ts` and the matching `sitemapEligible*` SQL predicate in `server/storage.ts`, or robots tags and sitemaps will disagree. Noindex pages must never enter sitemaps; noindex is always "noindex, follow" (never nofollow).
