---
name: Admin auth design
description: How AddressBay local admin auth (addressbay_admin cookie) works and its invariants
---
Local admin auth uses a signed `addressbay_admin` HttpOnly cookie (not express-session).
- Token = base64url(JSON{e:email,exp}) + "." + HMAC-SHA256(SESSION_SECRET, payload + "." + passwordHash).
- **Why:** binding the signature to the current bcrypt hash means any password change or `ADMIN_INIT_FORCE=true` startup reset instantly invalidates all outstanding admin cookies; expiry prevents indefinite replay. Verification uses `timingSafeEqual`.
- **How to apply:** don't add a session dependency to admin routes; server startup throws in production if SESSION_SECRET unset (keep fail-closed). Login/logout live at both `/api/admin/login`+`/api/admin/logout-local` (frontend) and `/api/admin/auth/login`+`/api/admin/auth/logout` (ops-doc aliases) — keep both. Seeder in server/index.ts: ADMIN_INIT_EMAIL/PASS create hash only if missing; overwrite only when ADMIN_INIT_FORCE === "true".
- Logout only clears the cookie client-side; true server-side revocation happens via password change.
