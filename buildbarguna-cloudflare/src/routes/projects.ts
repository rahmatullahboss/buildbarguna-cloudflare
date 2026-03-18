import { Hono } from 'hono'
import { ok, err, getPagination, paginate } from '../lib/response'
import type { Bindings, Variables, Project } from '../types'

export const projectRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// GET /api/projects — public, paginated (active + completed projects)
projectRoutes.get('/', async (c) => {
  const { page, limit, offset } = getPagination(c.req.query())

  const [rows, countRow] = await Promise.all([
    c.env.DB.prepare(
      `SELECT p.id, p.title, p.description, p.image_url, p.total_capital, p.total_shares,
              p.share_price, p.status, p.location, p.category, p.start_date,
              p.expected_end_date, p.progress_pct, p.completed_at, p.created_at,
              COALESCE(SUM(us.quantity), 0) as sold_shares
       FROM projects p
       LEFT JOIN user_shares us ON us.project_id = p.id
       WHERE p.status IN ('active', 'completed')
       GROUP BY p.id
       ORDER BY p.status ASC, p.created_at DESC
       LIMIT ? OFFSET ?`
    ).bind(limit, offset).all<Project & { sold_shares: number }>(),
    c.env.DB.prepare(
      `SELECT COUNT(*) as total FROM projects WHERE status IN ('active', 'completed')`
    ).first<{ total: number }>()
  ])

  return ok(c, paginate(rows.results, countRow?.total ?? 0, page, limit))
})

// GET /api/projects/:id — public
projectRoutes.get('/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  if (isNaN(id)) return err(c, 'অকার্যকর প্রজেক্ট আইডি')

  const [project, soldRow] = await Promise.all([
    c.env.DB.prepare(
      `SELECT id, title, description, image_url, total_capital, total_shares, share_price,
              status, location, category, start_date, expected_end_date, progress_pct,
              completed_at, created_at, updated_at
       FROM projects WHERE id = ?`
    ).bind(id).first<Project>(),
    c.env.DB.prepare(
      'SELECT COALESCE(SUM(quantity), 0) as sold FROM user_shares WHERE project_id = ?'
    ).bind(id).first<{ sold: number }>()
  ])

  if (!project) return err(c, 'প্রজেক্ট পাওয়া যায়নি', 404)

  return ok(c, {
    ...project,
    sold_shares: soldRow?.sold ?? 0,
    available_shares: project.total_shares - (soldRow?.sold ?? 0)
  })
})

