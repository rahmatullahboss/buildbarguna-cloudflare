## 2025-03-05 - D1 query parallelism
**Learning:** In Cloudflare D1, using `Promise.all` for parallel database queries results in per-query HTTP network overhead.
**Action:** Always replace `Promise.all` read queries with `db.batch()` for independent read statements to mitigate network latency in D1. Ensure single-row responses are safely extracted using `.results?.[0]` as `db.batch()` returns an array. Check for empty arrays before calling `db.batch()` to prevent `D1_BATCH_MUTATION_ERROR`.

## 2024-04-09 - Overcoming N+1 and HTTP Network Overhead in Cloudflare D1
**Learning:** Cloudflare D1's architecture adds HTTP network latency to every query. Standard async execution paradigms like `Promise.all` mapping over arrays create severe, independent N+1 HTTP bottlenecks even for mutations. Consolidating read queries into a single `IN (...)` guarded statement grouped by ID, and migrating mutative inserts to `c.env.DB.batch()`, drastically reduces this latency profile, shifting the network bottleneck away from the worker script.
**Action:** Default to `c.env.DB.batch()` for mutative loops and explicit `GROUP BY` aggregations over sequential `first()` or `all()` iterations whenever D1 is the database, to align execution overhead with edge worker optimization constraints.
