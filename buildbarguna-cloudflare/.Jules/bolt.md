## 2025-03-08 - Optimize D1 Queries with db.batch() in company-expenses.ts
**Learning:** Cloudflare D1 performance is heavily impacted by per-query HTTP network roundtrips. Executing multiple queries in a loop or with `Promise.all` causes significant network overhead (O(N) latency).
**Action:** Always refactor sequential or parallel independent D1 queries into a single `db.batch()` execution. When iterating through mapped structures, check for empty arrays before calling `db.batch()` to prevent `D1_BATCH_MUTATION_ERROR`, and safely extract single-row responses using `.results?.[0]`.
