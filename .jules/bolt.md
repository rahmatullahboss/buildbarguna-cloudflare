## 2025-03-05 - D1 query parallelism
**Learning:** In Cloudflare D1, using `Promise.all` for parallel database queries results in per-query HTTP network overhead.
**Action:** Always replace `Promise.all` read queries with `db.batch()` for independent read statements to mitigate network latency in D1. Ensure single-row responses are safely extracted using `.results?.[0]` as `db.batch()` returns an array. Check for empty arrays before calling `db.batch()` to prevent `D1_BATCH_MUTATION_ERROR`.

## 2026-06-18 - Optimize D1 parallel queries with batch()
**Learning:** Chained methods like `.first()` or `.all()` cannot be passed to `c.env.DB.batch()`. The result is an array of `D1Result` objects, and data should be accessed using optional chaining `batchResults[0].results?.[0]`.
**Action:** Always prefer `db.batch()` over `Promise.all()` for concurrent database queries in D1 to prevent per-query HTTP network overhead, and properly parse the array of D1 results.
