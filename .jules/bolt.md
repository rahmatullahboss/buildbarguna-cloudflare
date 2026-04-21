## 2025-03-05 - D1 query parallelism
**Learning:** In Cloudflare D1, using `Promise.all` for parallel database queries results in per-query HTTP network overhead.
**Action:** Always replace `Promise.all` read queries with `db.batch()` for independent read statements to mitigate network latency in D1. Ensure single-row responses are safely extracted using `.results?.[0]` as `db.batch()` returns an array. Check for empty arrays before calling `db.batch()` to prevent `D1_BATCH_MUTATION_ERROR`.

## 2026-04-21 - Group By for DB aggregates
**Learning:** In Cloudflare D1/SQLite, iterating through a list of IDs and executing a SELECT SUM query for each ID sequentially causes significant network latency and O(N) database queries (N+1 problem).
**Action:** Always replace sequential queries inside a loop with a single query using `GROUP BY` and an `IN` clause. Map the results back to the source objects using a `Map` to maintain O(1) lookup efficiency and handle items with zero/null values correctly. Also, include an explicit guard (e.g., `if (ids.length > 0)`) before executing the query to avoid SQL syntax errors (like `IN ()`).
