## 2024-05-19 - Cloudflare D1 query batching optimization
**Learning:** In Cloudflare D1, executing independent read queries sequentially (using `.all()` or `.first()`) or via `Promise.all()` introduces significant per-query HTTP network overhead, acting as a major performance bottleneck.
**Action:** Always consolidate independent D1 read queries within route handlers using `c.env.DB.batch()`. Remove `.first()` or `.all()` from the prepared statements passed to `batch()`, and extract the results safely using `.results?.[0]` or iterating over `.results`.
