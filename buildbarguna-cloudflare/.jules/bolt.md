## 2025-04-20 - Use db.batch for independent queries in D1
**Learning:** Promise.all() should not be used to run parallel database queries in Cloudflare D1 due to per-query HTTP network overhead.
**Action:** Always use db.batch() instead of Promise.all() for running independent read statements concurrently in D1 to optimize O(N) database reads to O(1) network roundtrips. Remove .first() or .all() from the batched prepared statements, and safely extract single-row responses using .results?.[0]. Ensure to check for empty arrays before calling db.batch().
