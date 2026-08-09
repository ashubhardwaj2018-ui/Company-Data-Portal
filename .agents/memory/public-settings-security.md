---
name: Public settings endpoint security
description: GET /api/settings is unauthenticated — never return secret values from site_settings
---
Rule: `GET /api/settings` is public. Secret values stored in site_settings (e.g. `openai_key`) must never appear in its key list. If the admin UI needs to know a key is configured, return a boolean-style flag (`openai_key_set: "true" | ""`).

**Why:** A code review caught the stored OpenAI API key being served to any anonymous visitor after the key list was extended.

**How to apply:** When extending the public settings key list or adding new stored credentials, keep secrets out of any unauthenticated response; also keep multer temp filenames random (never `originalname`, path traversal) and disallow SVG in same-origin upload endpoints.
