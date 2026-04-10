## 2026-04-10 - D1 Promise.all vs db.batch() Network Overhead
**Learning:** In Cloudflare D1, using `Promise.all` for parallel database queries incurs significant per-query HTTP network overhead.
**Action:** Always replace `Promise.all` with `db.batch()` for independent read statements to minimize network round-trips and improve latency. Note that `batch()` does not support `.first()` or `.all()` chaining, so results must be safely extracted using `.results?.[0]`.
