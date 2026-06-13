1. **Batch D1 Queries in `src/routes/tasks.ts`**
   - In `GET /api/tasks/history`, replace `Promise.all` with `c.env.DB.batch()` to combine the total count query and the paginated results query into a single HTTP roundtrip.
   - In `GET /api/tasks`, combine the three sequential read queries (active tasks, today's completions, one-time completions) into a single `c.env.DB.batch()` call to eliminate two HTTP roundtrips.

2. **Run Tests and Verification**
   - Execute unit tests `pnpm test:unit` inside `buildbarguna-cloudflare`.
   - Execute integration tests `pnpm run test:integration:vitest` inside `buildbarguna-cloudflare`.
   - Run type checking and linting to ensure no regressions.

3. **Complete pre commit steps**
   - Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.

4. **Submit Pull Request**
   - Create a PR with the title `⚡ Bolt: [performance improvement]` and the expected structure containing `💡 What`, `🎯 Why`, `📊 Impact`, and `🔬 Measurement`.
