## 2025-03-05 - D1 query parallelism
**Learning:** In Cloudflare D1, using `Promise.all` for parallel database queries results in per-query HTTP network overhead.
**Action:** Always replace `Promise.all` read queries with `db.batch()` for independent read statements to mitigate network latency in D1. Ensure single-row responses are safely extracted using `.results?.[0]` as `db.batch()` returns an array. Check for empty arrays before calling `db.batch()` to prevent `D1_BATCH_MUTATION_ERROR`.
## 2025-03-05 - Batching Cloudflare D1 Queries
**Learning:** The primary performance bottleneck in Cloudflare D1 is the network roundtrip latency for each individual query. Using `Promise.all()` to run parallel database queries incurs O(N) HTTP network overhead.
**Action:** Always use `db.batch()` for independent read/write statements to consolidate sequential queries. This reduces the number of roundtrips from O(N) to O(1) per batch. Remove `.first()` or `.all()` from the batched prepared statements, and safely extract single-row responses using `.results?.[0]`. Remember to check for empty arrays before calling `db.batch()`.
