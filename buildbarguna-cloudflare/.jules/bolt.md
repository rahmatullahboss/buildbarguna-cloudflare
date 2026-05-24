## 2024-05-24 - D1 Batch Execution Optimization
**Learning:** Executing concurrent database queries in Cloudflare D1 using `Promise.all` adds severe performance overhead. Since D1 communicates over HTTP, each `prepare().run()` or `prepare().first()` creates a separate HTTP REST request to the D1 API, multiplying network latency.
**Action:** Always group related queries (such as multiple SELECTs, multiple INSERTs, or combined pagination count/data fetching) into a single `c.env.DB.batch()` array to minimize backend-to-database network latency.
