## 2024-05-24 - D1 Pagination Query Optimization
**Learning:** Cloudflare D1 performance is heavily bottlenecked by per-query HTTP network roundtrip latency. Using `Promise.all` with individual `.first()` and `.all()` executions for pagination queries (fetching count and rows) creates multiple network requests (O(N) latency).
**Action:** Always consolidate sequential or parallel independent queries into `db.batch()`. Ensure to remove `.first()` or `.all()` from the prepared statements passed to `batch()`, and safely extract the results using `.results?.[0]` for single-row responses.
