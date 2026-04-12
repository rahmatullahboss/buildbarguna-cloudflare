import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { env } from 'cloudflare:test'

/**
 * API Integration Tests: Earnings Endpoints
 * Tests: /api/earnings/* routes
 * 
 * Coverage:
 * - GET /api/earnings/summary - Total balance
 * - GET /api/earnings/portfolio - Full portfolio summary
 * - GET /api/earnings - Earnings history (paginated)
 */

describe('Earnings API', () => {
  const testUser = {
    id: 1,
    phone: '01700000001',
    name: 'Test User'
  }

  const testProject = {
    id: 1,
    title: 'Test Project',
    share_price: 100000, // ৳1,000 per share
    total_shares: 100,
    status: 'active'
  }

  beforeEach(async () => {
    // Setup test data
    await env.DB.prepare('DELETE FROM earnings').bind().run()
    await env.DB.prepare('DELETE FROM user_shares').bind().run()
    await env.DB.prepare('DELETE FROM projects').bind().run()
    await env.DB.prepare('DELETE FROM users').bind().run()

    // Create test user
    await env.DB.prepare(
      'INSERT INTO users (id, phone, name, password_hash, is_admin) VALUES (?, ?, ?, ?, ?)'
    ).bind(testUser.id, testUser.phone, testUser.name, 'hash123', 0).run()

    // Create test project
    await env.DB.prepare(
      'INSERT INTO projects (id, title, share_price, total_shares, status) VALUES (?, ?, ?, ?, ?)'
    ).bind(testProject.id, testProject.title, testProject.share_price, testProject.total_shares, testProject.status).run()

    // Create user shares
    await env.DB.prepare(
      'INSERT INTO user_shares (user_id, project_id, quantity) VALUES (?, ?, ?)'
    ).bind(testUser.id, testProject.id, 10).run()
  })

  afterEach(async () => {
    // Cleanup
    await env.DB.prepare('DELETE FROM earnings').bind().run()
    await env.DB.prepare('DELETE FROM user_shares').bind().run()
    await env.DB.prepare('DELETE FROM projects').bind().run()
    await env.DB.prepare('DELETE FROM users').bind().run()
  })

  describe('GET /api/earnings/summary', () => {
    it('returns zero balance for user with no earnings', async () => {
      const response = await env.app.fetch('/api/earnings/summary', {
        headers: { 'x-user-id': String(testUser.id) }
      })

      expect(response.status).toBe(200)
      const json = await response.json() as any
      expect(json.success).toBe(true)
      expect(json.data.total_paisa).toBe(0)
      expect(json.data.this_month_paisa).toBe(0)
    })

    it('returns correct total balance', async () => {
      // Add earnings
      await env.DB.prepare(
        'INSERT INTO earnings (user_id, project_id, month, amount) VALUES (?, ?, ?, ?)'
      ).bind(testUser.id, testProject.id, '2026-03', 50000).run()

      await env.DB.prepare(
        'INSERT INTO earnings (user_id, project_id, month, amount) VALUES (?, ?, ?, ?)'
      ).bind(testUser.id, testProject.id, '2026-02', 30000).run()

      const response = await env.app.fetch('/api/earnings/summary', {
        headers: { 'x-user-id': String(testUser.id) }
      })

      expect(response.status).toBe(200)
      const json = await response.json() as any
      expect(json.success).toBe(true)
      expect(json.data.total_paisa).toBe(80000)
      expect(json.data.this_month_paisa).toBe(50000)
    })

    it('excludes capital refunds from profit summary totals', async () => {
      await env.DB.prepare(
        'INSERT INTO earnings (user_id, project_id, month, amount) VALUES (?, ?, ?, ?)'
      ).bind(testUser.id, testProject.id, '2026-03', 7000).run()

      await env.DB.prepare(
        'INSERT INTO earnings (user_id, project_id, month, amount) VALUES (?, ?, ?, ?)'
      ).bind(testUser.id, testProject.id, 'refund-2026-04', 10000).run()

      const response = await env.app.fetch('/api/earnings/summary', {
        headers: { 'x-user-id': String(testUser.id) }
      })

      const json = await response.json() as any
      expect(json.success).toBe(true)
      expect(json.data.total_paisa).toBe(7000)
    })

    it('requires authentication', async () => {
      const response = await env.app.fetch('/api/earnings/summary')
      expect(response.status).toBe(401)
    })
  })

  describe('GET /api/earnings/portfolio', () => {
    it('returns empty portfolio for user with no shares', async () => {
      // Remove shares
      await env.DB.prepare('DELETE FROM user_shares').bind().run()

      const response = await env.app.fetch('/api/earnings/portfolio', {
        headers: { 'x-user-id': String(testUser.id) }
      })

      expect(response.status).toBe(200)
      const json = await response.json() as any
      expect(json.success).toBe(true)
      expect(json.data.projects_count).toBe(0)
      expect(json.data.total_invested_paisa).toBe(0)
    })

    it('returns portfolio summary with single project', async () => {
      // Add earnings
      await env.DB.prepare(
        'INSERT INTO earnings (user_id, project_id, month, amount, rate) VALUES (?, ?, ?, ?, ?)'
      ).bind(testUser.id, testProject.id, '2026-03', 50000, 5000).run()

      const response = await env.app.fetch('/api/earnings/portfolio', {
        headers: { 'x-user-id': String(testUser.id) }
      })

      expect(response.status).toBe(200)
      const json = await response.json() as any
      expect(json.success).toBe(true)
      expect(json.data.projects_count).toBe(1)
      expect(json.data.total_invested_paisa).toBe(1_000_000) // 10 shares × ৳1,000
      expect(json.data.total_earned_paisa).toBe(50000)
      expect(json.data.projects[0].project_id).toBe(testProject.id)
      expect(json.data.projects[0].shares_owned).toBe(10)
    })

    it('includes monthly history for each project', async () => {
      // Add multiple months of earnings
      await env.DB.prepare(
        'INSERT INTO earnings (user_id, project_id, month, amount, rate) VALUES (?, ?, ?, ?, ?)'
      ).bind(testUser.id, testProject.id, '2026-03', 50000, 5000).run()

      await env.DB.prepare(
        'INSERT INTO earnings (user_id, project_id, month, amount, rate) VALUES (?, ?, ?, ?, ?)'
      ).bind(testUser.id, testProject.id, '2026-02', 45000, 4500).run()

      await env.DB.prepare(
        'INSERT INTO earnings (user_id, project_id, month, amount, rate) VALUES (?, ?, ?, ?, ?)'
      ).bind(testUser.id, testProject.id, '2026-01', 40000, 4000).run()

      const response = await env.app.fetch('/api/earnings/portfolio', {
        headers: { 'x-user-id': String(testUser.id) }
      })

      expect(response.status).toBe(200)
      const json = await response.json() as any
      expect(json.data.projects[0].monthly_history.length).toBeGreaterThan(0)
      expect(json.data.projects[0].monthly_history[0].month).toBe('2026-03')
    })

    it('calculates ROI correctly', async () => {
      await env.DB.prepare(
        'INSERT INTO earnings (user_id, project_id, month, amount, rate) VALUES (?, ?, ?, ?, ?)'
      ).bind(testUser.id, testProject.id, '2026-03', 50000, 5000).run()

      const response = await env.app.fetch('/api/earnings/portfolio', {
        headers: { 'x-user-id': String(testUser.id) }
      })

      const json = await response.json() as any
      // ROI = 50,000 / 1,000,000 = 5%
      expect(json.data.roi_percent).toBeCloseTo(5, 1)
    })

    it('excludes capital refunds from portfolio earnings and ROI', async () => {
      await env.DB.prepare(
        'INSERT INTO earnings (user_id, project_id, month, amount, rate) VALUES (?, ?, ?, ?, ?)'
      ).bind(testUser.id, testProject.id, '2026-03', 7000, 700).run()

      await env.DB.prepare(
        'INSERT INTO earnings (user_id, project_id, month, amount, rate) VALUES (?, ?, ?, ?, ?)'
      ).bind(testUser.id, testProject.id, 'refund-2026-04', 10000, 0).run()

      const response = await env.app.fetch('/api/earnings/portfolio', {
        headers: { 'x-user-id': String(testUser.id) }
      })

      const json = await response.json() as any
      expect(json.success).toBe(true)
      expect(json.data.total_earned_paisa).toBe(7000)
      expect(json.data.roi_percent).toBeCloseTo(0.7, 2)
      expect(json.data.projects[0].total_earned_paisa).toBe(7000)
      expect(json.data.projects[0].monthly_history).toHaveLength(1)
      expect(json.data.projects[0].monthly_history[0].month).toBe('2026-03')
    })

    it('calculates concentration risk for single project', async () => {
      const response = await env.app.fetch('/api/earnings/portfolio', {
        headers: { 'x-user-id': String(testUser.id) }
      })

      const json = await response.json() as any
      // Single project = 100% concentration risk
      expect(json.data.concentration_risk_percent).toBe(100)
    })

    it('requires authentication', async () => {
      const response = await env.app.fetch('/api/earnings/portfolio')
      expect(response.status).toBe(401)
    })
  })

  describe('GET /api/earnings', () => {
    beforeEach(async () => {
      // Add test earnings
      for (let i = 0; i < 25; i++) {
        const month = `2026-${String(i % 12 + 1).padStart(2, '0')}`
        await env.DB.prepare(
          'INSERT INTO earnings (user_id, project_id, month, amount) VALUES (?, ?, ?, ?)'
        ).bind(testUser.id, testProject.id, month, 10000 * (i + 1)).run()
      }
    })

    it('returns paginated earnings list', async () => {
      const response = await env.app.fetch('/api/earnings?page=1&limit=10', {
        headers: { 'x-user-id': String(testUser.id) }
      })

      expect(response.status).toBe(200)
      const json = await response.json() as any
      expect(json.success).toBe(true)
      expect(json.data.items.length).toBe(10)
      expect(json.data.total).toBe(25)
      expect(json.data.page).toBe(1)
      expect(json.data.limit).toBe(10)
      expect(json.data.hasMore).toBe(true)
    })

    it('returns second page', async () => {
      const response = await env.app.fetch('/api/earnings?page=2&limit=10', {
        headers: { 'x-user-id': String(testUser.id) }
      })

      const json = await response.json() as any
      expect(json.data.items.length).toBe(10)
      expect(json.data.page).toBe(2)
      expect(json.data.hasMore).toBe(true)
    })

    it('returns last page with hasMore false', async () => {
      const response = await env.app.fetch('/api/earnings?page=3&limit=10', {
        headers: { 'x-user-id': String(testUser.id) }
      })

      const json = await response.json() as any
      expect(json.data.items.length).toBe(5)
      expect(json.data.page).toBe(3)
      expect(json.data.hasMore).toBe(false)
    })

    it('includes project title in each item', async () => {
      const response = await env.app.fetch('/api/earnings?page=1&limit=5', {
        headers: { 'x-user-id': String(testUser.id) }
      })

      const json = await response.json() as any
      expect(json.data.items[0].project_title).toBe(testProject.title)
    })

    it('orders by month DESC', async () => {
      const response = await env.app.fetch('/api/earnings?page=1&limit=5', {
        headers: { 'x-user-id': String(testUser.id) }
      })

      const json = await response.json() as any
      const months = json.data.items.map((item: any) => item.month)
      expect(months).toEqual([...months].sort().reverse())
    })

    it('requires authentication', async () => {
      const response = await env.app.fetch('/api/earnings')
      expect(response.status).toBe(401)
    })
  })
})
