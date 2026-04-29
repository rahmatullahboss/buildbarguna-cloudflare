
## 2024-04-29 - Optimize D1 sequential database queries with `db.batch()`
**Learning:** In Cloudflare D1, running sequential queries inside a `Promise.all` mapping block introduces significant latency due to per-query HTTP network overhead (O(N) network roundtrips).
**Action:** Replace `Promise.all(arr.map(a => c.env.DB.prepare(...)))` loops with `c.env.DB.batch(arr.map(a => c.env.DB.prepare(...)))` to reduce the network roundtrips to O(1) per batch.
