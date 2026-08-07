---
name: View count — fire-and-forget with IP dedup
description: View increment is async; response shows the pre-increment count. Same IP is deduped for 30 min via in-memory cache.
---

`incrementViewCount(companyId)` is called with `.catch(() => {})` (fire-and-forget). The HTTP response is sent before the DB update completes, so the returned `viewCount` is the value from before this request. The next request by any client will reflect the updated count.

**Dedup:** Before incrementing, a `view:{ip}:{companyId}` key is checked in the in-memory TtlCache (TTL = 30 min). If the key exists, the increment is skipped. This prevents page refreshes or bot crawls from inflating counts.

**Why:** Prevents DB write-per-request on popular pages while still tracking genuine new visitors reasonably.

**How to apply:** If extending to logged-in users, also add a `view:{userId}:{companyId}` dedup key alongside the IP key.
