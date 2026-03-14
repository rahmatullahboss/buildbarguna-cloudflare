## 2026-03-13 - Cloudflare D1 Query Consolidation
**Learning:** In Cloudflare D1, even when queries are fired concurrently (e.g., via `Promise.all` mapping over rows), each individual query execution incurs HTTP/network overhead due to D1's architecture. N parallel queries can still perform significantly worse than a single query.
**Action:** Always consolidate N database queries into a single SQL statement where possible, utilizing `IN` clauses or window functions like `ROW_NUMBER() OVER (...)` to handle per-group limits, thereby minimizing round-trips to D1.
