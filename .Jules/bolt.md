## 2024-05-19 - Consolidate Sequential Database Queries
**Learning:** In Cloudflare D1, parallel queries executed via `Promise.all` still suffer from per-query HTTP network roundtrip latency.
**Action:** Always use `db.batch()` to consolidate sequential queries (both independent SELECTs and bulk UPDATEs/INSERTs), replacing `Promise.all` patterns to reduce network roundtrips from O(N) to O(1). Be sure to check for empty arrays before calling `db.batch()` to avoid `D1_BATCH_MUTATION_ERROR`. Ensure single results from batched read statements are safely extracted using `.results?.[0]`.
