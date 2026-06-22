## 2025-03-05 - D1 query parallelism
**Learning:** In Cloudflare D1, using `Promise.all` for parallel database queries results in per-query HTTP network overhead.
**Action:** Always replace `Promise.all` read queries with `db.batch()` for independent read statements to mitigate network latency in D1. Ensure single-row responses are safely extracted using `.results?.[0]` as `db.batch()` returns an array. Check for empty arrays before calling `db.batch()` to prevent `D1_BATCH_MUTATION_ERROR`.
## 2025-02-14 - Batch Queries in Cloudflare D1
**Learning:** Using `Promise.all()` with individual D1 `.first()` or `.all()` calls results in multiple HTTP requests over the network, causing significant latency.
**Action:** Always use `c.env.DB.batch()` to send multiple queries in a single HTTP request, manually destructuring the `.results` arrays afterward.
