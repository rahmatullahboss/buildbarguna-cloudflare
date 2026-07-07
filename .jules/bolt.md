## 2025-03-06 - Batching D1 queries
**Learning:** Promise.all for D1 parallel query execution creates unnecessary per-query HTTP network overhead in Cloudflare Workers.
**Action:** Use c.env.DB.batch() instead of Promise.all to combine parallel read queries into a single HTTP roundtrip to reduce latency.
