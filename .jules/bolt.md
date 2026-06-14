## 2025-03-05 - D1 query parallelism
**Learning:** In Cloudflare D1, using `Promise.all` for parallel database queries results in per-query HTTP network overhead.
**Action:** Always replace `Promise.all` read queries with `db.batch()` for independent read statements to mitigate network latency in D1. Ensure single-row responses are safely extracted using `.results?.[0]` as `db.batch()` returns an array. Check for empty arrays before calling `db.batch()` to prevent `D1_BATCH_MUTATION_ERROR`.

## 2025-02-18 - D1 Batch Optimization in Tasks History
**Learning:** Cloudflare D1 incurs per-query HTTP network overhead when using `Promise.all` with individual DB calls (like `.first()` or `.all()`). `c.env.DB.batch()` groups multiple prepared statements into a single network request. However, `batch()` does not support chained execution methods (like `.first()`); it returns an array of `D1Result` objects, requiring manual extraction from the `.results` array using optional chaining (e.g., `batchResults[0].results?.[0]`).
**Action:** Always replace `Promise.all` of parallel, independent read queries with `c.env.DB.batch()` in D1 contexts, and carefully update data access patterns to use `batchResults[index].results` to avoid runtime `TypeError`s.
