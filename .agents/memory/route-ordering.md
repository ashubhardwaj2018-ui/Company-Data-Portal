---
name: Route ordering — static paths before dynamic /:id
description: Express will match /api/companies/trending as /:id="trending" → NaN if the static route is registered after /:id.
---

All `/api/companies/<static-name>` routes (suggest, export, trending, etc.) must be registered **before** `GET /api/companies/:id`.

**Why:** Express matches routes in registration order. If /:id is registered first, strings like "trending" or "export" are parsed as the id param, producing NaN, which then fails DB integer validation.

**How to apply:** Keep a comment "── ALL static /api/companies/* paths BEFORE /:id ──" before the first fixed-name route. Any new endpoint under /api/companies/ must go above the /:id handler.
