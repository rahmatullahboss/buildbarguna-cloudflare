## 2024-05-18 - Replacing Promise.all with DB.batch
**Learning:** In Cloudflare D1 architectures, making concurrent database queries using `Promise.all` adds per-query HTTP network overhead as each `prepare(...).run()` is a separate REST request to the D1 API.
**Action:** Always group related queries in route handlers (especially multiple SELECTs inside a `.map`, multiple INSERTs for transactions, or separate main/count queries for pagination) into a single `c.env.DB.batch()` array. This combines multiple statements into a single D1 API call, dramatically reducing backend-to-database latency.
