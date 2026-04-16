## 2025-03-05 - D1 query parallelism
**Learning:** In Cloudflare D1, using `Promise.all` for parallel database queries results in per-query HTTP network overhead.
**Action:** Always replace `Promise.all` read queries with `db.batch()` for independent read statements to mitigate network latency in D1. Ensure single-row responses are safely extracted using `.results?.[0]` as `db.batch()` returns an array. Check for empty arrays before calling `db.batch()` to prevent `D1_BATCH_MUTATION_ERROR`.

## 2024-05-18 - Optimized D1 Queries in Profit Distribution
**Learning:** Cloudflare D1 incurs high network latency for individual queries. Using `Promise.all` to run multiple `db.prepare(...).first()` or `.all()` statements results in an N+1 HTTP request pattern, blocking performance.
**Action:** Replaced `Promise.all` with `db.batch()` which sends a single HTTP request for all queries, retrieving results via `.results?.[0]` and `.results`. This changed O(N) network overhead to O(1) in the profit distribution route.
