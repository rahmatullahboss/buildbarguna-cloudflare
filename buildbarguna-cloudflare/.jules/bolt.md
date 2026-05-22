## 2024-05-23 - D1 Query Batching for Performance
**Learning:** In Cloudflare D1 architectures, executing concurrent database queries using `Promise.all` adds severe performance overhead as each `prepare().run()` or `prepare().first()` creates a separate HTTP REST request to the D1 API.
**Action:** Always group related queries into a single `c.env.DB.batch()` array to minimize backend-to-database network latency. Remember that chained methods like `.first()` or `.all()` cannot be passed to `batch()`, and results are accessed via the `.results` array of the specific index.
