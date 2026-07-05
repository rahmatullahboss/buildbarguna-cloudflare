## 2025-03-05 - D1 query parallelism
**Learning:** In Cloudflare D1, using `Promise.all` for parallel database queries results in per-query HTTP network overhead.
**Action:** Always replace `Promise.all` read queries with `db.batch()` for independent read statements to mitigate network latency in D1. Ensure single-row responses are safely extracted using `.results?.[0]` as `db.batch()` returns an array. Check for empty arrays before calling `db.batch()` to prevent `D1_BATCH_MUTATION_ERROR`.
## 2025-03-05 - D1 query parallelism with db.batch()
**Learning:** In Cloudflare D1, independent read queries wrapped in `Promise.all` trigger multiple HTTP network requests, leading to increased latency. Replacing them with `db.batch()` reduces this to a single HTTP roundtrip.
**Action:** When making multiple independent `SELECT` queries (e.g. for pagination count alongside main data), pass them to `c.env.DB.batch()` instead of `Promise.all` to avoid the per-query overhead.
