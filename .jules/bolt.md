## 2025-03-05 - D1 query parallelism
**Learning:** In Cloudflare D1, using `Promise.all` for parallel database queries results in per-query HTTP network overhead.
**Action:** Always replace `Promise.all` read queries with `db.batch()` for independent read statements to mitigate network latency in D1. Ensure single-row responses are safely extracted using `.results?.[0]` as `db.batch()` returns an array. Check for empty arrays before calling `db.batch()` to prevent `D1_BATCH_MUTATION_ERROR`.

## 2024-05-18 - Cloudflare D1 Query Batching
**Learning:** Sequential DB calls and `Promise.all` with Cloudflare D1 incur significant HTTP network overhead per query because D1 communicates over HTTP API, which introduces network latency not present in traditional persistent connection databases like Postgres or MySQL.
**Action:** When executing independent sequential queries or parallelizing reads in Cloudflare Workers using D1, combine them using `c.env.DB.batch()` to send a single HTTP request containing all the queries.
