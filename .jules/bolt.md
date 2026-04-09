## 2025-03-05 - D1 query parallelism
**Learning:** In Cloudflare D1, using `Promise.all` for parallel database queries results in per-query HTTP network overhead.
**Action:** Always replace `Promise.all` read queries with `db.batch()` for independent read statements to mitigate network latency in D1. Ensure single-row responses are safely extracted using `.results?.[0]` as `db.batch()` returns an array. Check for empty arrays before calling `db.batch()` to prevent `D1_BATCH_MUTATION_ERROR`.

## 2024-05-19 - D1 Batch Querying Optimization
**Learning:** In Cloudflare D1 (SQLite over HTTP), using `Promise.all` to run parallel database queries causes per-query network overhead. D1 provides a `db.batch()` function specifically to run multiple independent statements in a single HTTP request.
**Action:** Replace `Promise.all` read queries with `db.batch()` for related independent queries (like getting a `COUNT(*)` and a paginated list simultaneously). Ensure single-row responses are safely extracted using `.results?.[0]` and empty array checks are in place.
