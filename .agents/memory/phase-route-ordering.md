---
name: Phase route ordering
description: Static sub-path API routes must precede parameterised ones at the same level to avoid string-as-ID mismatches.
---

# Route ordering rule for watchlist and similar patterns

## The rule
Register `/api/watchlist/check/:id` **before** `/api/watchlist/:id`. Express matches routes in declaration order — without this, "check" is treated as a numeric companyId and parsed as NaN.

## Why
Same root cause as the `/api/companies/suggest` vs `/api/companies/:id` issue (see route-ordering.md). Any time a static sub-path shares a prefix with a parameterised route, the static one must come first.

## How to apply
Whenever adding a new `GET /api/<resource>/<static-word>` alongside `GET /api/<resource>/:param`, always place the static route at least one line above the parameterised one in routes.ts.
