import { Hono } from 'hono'
import { ok, err, getPagination, paginate } from '../lib/response'
import type { Bindings, Variables, Project } from '../types'

export const projectRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// GET /api/projects — public, paginated
// FIX: Single JOIN + GROUP BY instead of N+1 subqueries (one per project row)
projectRoutes.get('/', async (c) => {
  const { page, limit, offset } = getPagination(c.req.query())

  // ⚡ Bolt: Consolidated parallel queries using db.batch() instead of Promise.all()
  // Reduces multiple D1 HTTP round-trips into a single request, improving I/O latency.
  const [rowsData, countData] = await c.env.DB.batch([
    c.env.DB.prepare(
      `SELECT p.*,
        COALESCE(SUM(us.quantity), 0) as sold_shares
       FROM projects p
       LEFT JOIN user_shares us ON us.project_id = p.id
       WHERE p.status = 'active'
       GROUP BY p.id
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`
    ).bind(limit, offset),
    c.env.DB.prepare(
      `SELECT COUNT(*) as total FROM projects WHERE status = 'active'`
    )
  ])

  const rows = (rowsData?.results || []) as Array<Project & { sold_shares: number }>
  const total = (countData?.results?.[0] as { total: number })?.total ?? 0

  return ok(c, paginate(rows, total, page, limit))
})

// GET /api/projects/:id — public
projectRoutes.get('/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  if (isNaN(id)) return err(c, 'অকার্যকর প্রজেক্ট আইডি')

  // ⚡ Bolt: Optimized query dispatching with db.batch() to avoid HTTP overhead
  const [projectData, soldData] = await c.env.DB.batch([
    c.env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(id),
    c.env.DB.prepare(
      'SELECT COALESCE(SUM(quantity), 0) as sold FROM user_shares WHERE project_id = ?'
    ).bind(id)
  ])

  const project = projectData?.results?.[0] as Project | undefined
  const sold = (soldData?.results?.[0] as { sold: number })?.sold ?? 0

  if (!project) return err(c, 'প্রজেক্ট পাওয়া যায়নি', 404)

  return ok(c, {
    ...project,
    sold_shares: sold,
    available_shares: project.total_shares - sold
  })
})
