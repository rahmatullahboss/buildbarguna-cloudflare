## 2024-03-17 - Optimize Cloudflare D1 Read Queries
**Learning:** Cloudflare D1 executes queries over HTTP, meaning each query within a `Promise.all()` incurs separate network latency round-trips. This represents a significant performance bottleneck for parallel database reads.
**Action:** Replace `Promise.all()` with `db.batch()` to consolidate multiple read operations into a single HTTP request, drastically improving I/O latency. Since `batch()` returns an array of results without supporting `.first()` or `.all()`, single rows must be safely extracted using `.results?.[0]`.
