import type { Context } from 'hono'

export function ok<T>(c: Context, data: T, status: 200 | 201 = 200) {
  return c.json({ success: true, data }, status)
}

export function err(c: Context, message: string, status: 400 | 401 | 403 | 404 | 409 | 429 | 500 = 400) {
  return c.json({ success: false, error: message }, status)
}

export function paginate<T>(
  items: T[],
  total: number,
  page: number,
  limit: number
) {
  return {
    items,
    total,
    page,
    limit,
    hasMore: page * limit < total
  }
}

export function getPagination(query: Record<string, string | undefined>) {
  const page = Math.max(1, parseInt(query.page ?? '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? '20', 10)))
  const offset = (page - 1) * limit
  return { page, limit, offset }
}
