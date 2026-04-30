## 2025-05-01 - Replace Promise.all with db.batch() in D1 queries
**Learning:** In Cloudflare D1, running independent database statements inside `Promise.all` causes significant performance bottlenecks due to the O(N) HTTP network roundtrips for each individual query.
**Action:** Always refactor sequential queries inside `Promise.all` into an array of prepared statements and execute them with a single `db.batch()` call to reduce network overhead to O(1). Check for empty arrays before calling to prevent `D1_BATCH_MUTATION_ERROR`.
