## 2025-03-05 - D1 query parallelism
**Learning:** In Cloudflare D1, using `Promise.all` for parallel database queries results in per-query HTTP network overhead.
**Action:** Always replace `Promise.all` read queries with `db.batch()` for independent read statements to mitigate network latency in D1. Ensure single-row responses are safely extracted using `.results?.[0]` as `db.batch()` returns an array. Check for empty arrays before calling `db.batch()` to prevent `D1_BATCH_MUTATION_ERROR`.

## 2025-03-09 - D1 Promise.all Replacement
**Learning:** In Cloudflare D1 architectures, using `Promise.all` for parallel independent reads results in multiple concurrent HTTP requests to the database, causing significant network latency overhead.
**Action:** Combine parallel independent read queries into a single `c.env.DB.batch()` call to eliminate multiple HTTP network roundtrips, extracting results safely via `results?.[0]`.
