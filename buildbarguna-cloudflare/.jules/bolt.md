## 2024-04-23 - Optimize sequential database inserts with `db.batch()`
**Learning:** In Cloudflare D1, making independent sequential DB calls within `Promise.all` causes unnecessary per-query HTTP network roundtrip latency.
**Action:** Always utilize `db.batch()` for grouping multiple independent write queries (e.g. INSERTs) or independent read queries to eliminate O(N) network overhead and bundle them into a single HTTP request.
