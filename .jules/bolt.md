## 2025-03-05 - D1 query parallelism
**Learning:** In Cloudflare D1, using `Promise.all` for parallel database queries results in per-query HTTP network overhead.
**Action:** Always replace `Promise.all` read queries with `db.batch()` for independent read statements to mitigate network latency in D1. Ensure single-row responses are safely extracted using `.results?.[0]` as `db.batch()` returns an array. Check for empty arrays before calling `db.batch()` to prevent `D1_BATCH_MUTATION_ERROR`.
## 2025-03-05 - O(N) Query Consolidation
**Learning:** To optimize O(N) database reads for aggregated values (e.g., summing revenue per project), sequential queries inside a loop should be replaced with a single query using `GROUP BY` and an `IN` clause.
**Action:** Always map the results back to the source objects using a `Map` to maintain O(1) lookup efficiency and handle items with zero/null values correctly. Ensure that the `IN` clause includes an explicit array length guard (`if (ids.length > 0)`) to avoid SQL syntax errors.
