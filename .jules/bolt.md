
## 2024-05-19 - Cloudflare D1 db.batch() Optimization Pattern
**Learning:** Cloudflare D1 `Promise.all` causes separate HTTP requests for each query, increasing latency. Consolidating queries using `db.batch()` is a key performance pattern. However, `db.batch()` does not support `.first()` or `.all()` chaining on prepared statements, and always returns an array of result objects. Single-row queries in a batch must extract values safely using `.results?.[0]`.
**Action:** When converting `Promise.all` to `db.batch()` for D1, remember to drop `.first()`/`.all()` from the prepared statements, map the types carefully, and extract single-row values from the `.results` array (e.g. `(res.results?.[0] as { total: number })?.total`).
