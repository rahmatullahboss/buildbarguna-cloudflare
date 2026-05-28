## 2025-03-05 - D1 query parallelism
**Learning:** In Cloudflare D1, using `Promise.all` for parallel database queries results in per-query HTTP network overhead.
**Action:** Always replace `Promise.all` read queries with `db.batch()` for independent read statements to mitigate network latency in D1. Ensure single-row responses are safely extracted using `.results?.[0]` as `db.batch()` returns an array. Check for empty arrays before calling `db.batch()` to prevent `D1_BATCH_MUTATION_ERROR`.

## 2024-05-28 - Cloudflare D1 Batching over Promise.all
**Learning:** In Cloudflare D1 architectures, executing concurrent database queries using `Promise.all` adds severe performance overhead as each `prepare().run()` or `prepare().first()` creates a separate HTTP REST request to the D1 API.
**Action:** Always group related queries (such as multiple SELECTs inside a `.map`, multiple INSERTs, or combined pagination count/data fetching) into a single `c.env.DB.batch()` array to minimize backend-to-database network latency.
