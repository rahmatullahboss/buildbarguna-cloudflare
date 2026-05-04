## 2024-05-04 - DB Batching for Task History
**Learning:** Replaced `Promise.all` with `db.batch()` in `/api/tasks/history` endpoint to eliminate N+1 network roundtrips to Cloudflare D1. D1 operates over HTTP, making `Promise.all` inefficient for multiple independent queries.
**Action:** Always prefer `db.batch()` over `Promise.all` for sequential/parallel independent query execution in Cloudflare D1 to minimize HTTP network overhead.
