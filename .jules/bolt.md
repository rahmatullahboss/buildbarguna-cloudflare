## 2025-03-05 - D1 query parallelism
**Learning:** In Cloudflare D1, using `Promise.all` for parallel database queries results in per-query HTTP network overhead.
**Action:** Always replace `Promise.all` read queries with `db.batch()` for independent read statements to mitigate network latency in D1. Ensure single-row responses are safely extracted using `.results?.[0]` as `db.batch()` returns an array. Check for empty arrays before calling `db.batch()` to prevent `D1_BATCH_MUTATION_ERROR`.

## 2025-03-05 - Avoid Promise.all for Multiple Cloudflare D1 Queries
**Learning:** Cloudflare D1 database operations execute as HTTP requests. Using `Promise.all` to execute multiple independent queries concurrently triggers multiple separate HTTP requests, each incurring network latency and overhead.
**Action:** Always use `db.batch()` instead of `Promise.all` for multiple independent read statements. `db.batch()` bundles all queries into a single HTTP request, significantly reducing round-trip time and improving performance. Note that `batch()` returns an array of results where each result represents the output of a query, so data must be accessed safely via indices and `results` (or `results?.[0]` for `.first()` equivalents).
