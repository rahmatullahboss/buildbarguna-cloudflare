## 2024-05-12 - Prevent Per-Query HTTP Network Overhead in Cloudflare D1
**Learning:** In Cloudflare D1 architectures, executing concurrent database queries using `Promise.all` adds severe performance overhead as each `prepare().run()` or `prepare().first()` creates a separate HTTP REST request to the D1 API.
**Action:** Always group related queries (such as multiple SELECTs combined pagination count/data fetching) into a single `c.env.DB.batch()` array to minimize backend-to-database network latency.
