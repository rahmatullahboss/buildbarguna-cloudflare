## 2024-03-05 - Cloudflare D1 Query Batching
**Learning:** In Cloudflare D1, avoiding `Promise.all` for parallel database queries reduces per-query HTTP network overhead. The database is remote, so firing 3 separate HTTP requests via `Promise.all` adds round-trips. `db.batch()` allows sending multiple statements in a single HTTP request to the D1 worker.
**Action:** Replace `Promise.all([db.prepare(...), db.prepare(...)])` with `db.batch([db.prepare(...), db.prepare(...)])` where read queries are independent to optimize network latency.
