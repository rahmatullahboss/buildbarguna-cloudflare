## 2025-03-05 - D1 query parallelism
**Learning:** In Cloudflare D1, using `Promise.all` for parallel database queries results in per-query HTTP network overhead.
**Action:** Always replace `Promise.all` read queries with `db.batch()` for independent read statements to mitigate network latency in D1. Ensure single-row responses are safely extracted using `.results?.[0]` as `db.batch()` returns an array. Check for empty arrays before calling `db.batch()` to prevent `D1_BATCH_MUTATION_ERROR`.

## 2025-03-05 - D1 Batch Query Efficiency
**Learning:** Using `Promise.all` for parallel database queries (including `.run()` mutations mapped from arrays) results in per-query HTTP network overhead in Cloudflare D1.
**Action:** Always replace `Promise.all` read queries and mapped parallel mutations with `db.batch()` to mitigate network latency. Check for empty arrays before calling `db.batch()`.
