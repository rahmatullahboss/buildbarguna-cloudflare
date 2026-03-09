import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { env } from 'cloudflare:test'

/**
 * API Integration Tests: Profit Distribution Endpoints
 * Tests: /api/profit/* routes
 * 
 * Coverage:
 * - GET /api/profit/preview/:projectId - Preview distribution
 * - POST /api/profit/distribute/:projectId - Execute distribution
 * - GET /api/profit/history/:projectId - Distribution history
 * - GET /api/profit/distribution/:id - Distribution details
 * - GET /api/profit/my-profits - User's profit history
 */

describe('Profit Distribution API', () => {
  const adminUser = {
    id: 1,
    phone: '01700000000',
    name: 'Admin User',
    isAdmin: true
  }

  const investorUser = {
    id: 2,
    phone: '01700000001',
    name: 'Investor User',
    isAdmin: false
  }

  const testProject = {
    id: 1,
    title: 'Test Project',
    share_price: 100000,
    total_shares: 100,
    status: 'active',
    total_capital: 1000000
  }

  beforeEach(async () => {
    // Setup test data
    await env.DB.prepare('DELETE FROM shareholder_profits').bind().run()
    await env.DB.prepare('DELETE FROM profit_distributions').bind().run()
    await env.DB.prepare('DELETE FROM earnings').bind().run()
    await env.DB.prepare('DELETE FROM user_shares').bind().run()
    await env.DB.prepare('DELETE FROM project_transactions').bind().run()
    await env.DB.prepare('DELETE FROM expense_allocations').bind().run()
    await env.DB.prepare('DELETE FROM projects').bind().run()
    await env.DB.prepare('DELETE FROM users').bind().run()

    // Create users
    await env.DB.prepare(
      'INSERT INTO users (id, phone, name, password_hash, is_admin) VALUES (?, ?, ?, ?, ?)'
    ).bind(adminUser.id, adminUser.phone, adminUser.name, 'hash123', 1).run()

    await env.DB.prepare(
      'INSERT INTO users (id, phone, name, password_hash, is_admin) VALUES (?, ?, ?, ?, ?)'
    ).bind(investorUser.id, investorUser.phone, investorUser.name, 'hash123', 0).run()

    // Create project
    await env.DB.prepare(
      'INSERT INTO projects (id, title, share_price, total_shares, status, total_capital) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(testProject.id, testProject.title, testProject.share_price, testProject.total_shares, testProject.status, testProject.total_capital).run()

    // Create user shares (investor owns 50 shares)
    await env.DB.prepare(
      'INSERT INTO user_shares (user_id, project_id, quantity) VALUES (?, ?, ?)'
    ).bind(investorUser.id, testProject.id, 50).run()
  })

  afterEach(async () => {
    await env.DB.prepare('DELETE FROM shareholder_profits').bind().run()
    await env.DB.prepare('DELETE FROM profit_distributions').bind().run()
    await env.DB.prepare('DELETE FROM earnings').bind().run()
    await env.DB.prepare('DELETE FROM user_shares').bind().run()
    await env.DB.prepare('DELETE FROM project_transactions').bind().run()
    await env.DB.prepare('DELETE FROM expense_allocations').bind().run()
    await env.DB.prepare('DELETE FROM projects').bind().run()
    await env.DB.prepare('DELETE FROM users').bind().run()
  })

  describe('GET /api/profit/preview/:projectId', () => {
    beforeEach(async () => {
      // Add revenue to create profit
      await env.DB.prepare(
        'INSERT INTO project_transactions (project_id, transaction_type, amount, category, created_by) VALUES (?, ?, ?, ?, ?)'
      ).bind(testProject.id, 'revenue', 1000000, 'Sales', adminUser.id).run()

      // Add expense
      await env.DB.prepare(
        'INSERT INTO project_transactions (project_id, transaction_type, amount, category, created_by) VALUES (?, ?, ?, ?, ?)'
      ).bind(testProject.id, 'expense', 200000, 'Operational', adminUser.id).run()
    })

    it('returns profit distribution preview', async () => {
      const response = await env.app.fetch('/api/profit/preview/1?company_pct=30', {
        headers: { 'x-user-id': String(adminUser.id) }
      })

      expect(response.status).toBe(200)
      const json = await response.json() as any
      expect(json.success).toBe(true)
      expect(json.data.has_available_profit).toBe(true)
      expect(json.data.summary.available_profit).toBe(800000) // 1M - 200k
      expect(json.data.summary.company_share_pct).toBe(30)
      expect(json.data.summary.company_share_amount).toBe(240000) // 30% of 800k
      expect(json.data.summary.investor_pool).toBe(560000) // 70% of 800k
    })

    it('includes shareholder breakdown', async () => {
      const response = await env.app.fetch('/api/profit/preview/1?company_pct=30', {
        headers: { 'x-user-id': String(adminUser.id) }
      })

      const json = await response.json() as any
      expect(json.data.shareholders.length).toBe(1)
      expect(json.data.shareholders[0].user_id).toBe(investorUser.id)
      expect(json.data.shareholders[0].shares_held).toBe(50)
      expect(json.data.shareholders[0].ownership_percentage).toBe(100) // Only one investor
      expect(json.data.shareholders[0].profit_amount).toBe(560000)
    })

    it('calculates ownership percentage for multiple shareholders', async () => {
      // Add another investor with 50 shares
      await env.DB.prepare(
        'INSERT INTO users (id, phone, name, password_hash, is_admin) VALUES (?, ?, ?, ?, ?)'
      ).bind(3, '01700000002', 'Investor 2', 'hash123', 0).run()

      await env.DB.prepare(
        'INSERT INTO user_shares (user_id, project_id, quantity) VALUES (?, ?, ?)'
      ).bind(3, testProject.id, 50).run()

      const response = await env.app.fetch('/api/profit/preview/1?company_pct=30', {
        headers: { 'x-user-id': String(adminUser.id) }
      })

      const json = await response.json() as any
      expect(json.data.shareholders.length).toBe(2)
      expect(json.data.shareholders[0].ownership_percentage).toBe(50)
      expect(json.data.shareholders[1].ownership_percentage).toBe(50)
    })

    it('returns no profit available when net profit is negative', async () => {
      // Add more expenses than revenue
      await env.DB.prepare(
        'INSERT INTO project_transactions (project_id, transaction_type, amount, category, created_by) VALUES (?, ?, ?, ?, ?)'
      ).bind(testProject.id, 'expense', 1500000, 'Operational', adminUser.id).run()

      const response = await env.app.fetch('/api/profit/preview/1?company_pct=30', {
        headers: { 'x-user-id': String(adminUser.id) }
      })

      const json = await response.json() as any
      expect(json.data.has_available_profit).toBe(false)
      expect(json.data.summary.available_profit).toBe(0)
    })

    it('returns no profit available when previously distributed', async () => {
      // Create a previous distribution
      await env.DB.prepare(
        'INSERT INTO profit_distributions (project_id, total_revenue, total_expense, net_profit, distributable_amount, company_share_percentage, investor_share_percentage, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(testProject.id, 1000000, 200000, 800000, 560000, 3000, 7000, 'distributed', adminUser.id).run()

      const response = await env.app.fetch('/api/profit/preview/1?company_pct=30', {
        headers: { 'x-user-id': String(adminUser.id) }
      })

      const json = await response.json() as any
      expect(json.data.has_available_profit).toBe(false)
    })

    it('returns 404 for non-existent project', async () => {
      const response = await env.app.fetch('/api/profit/preview/999?company_pct=30', {
        headers: { 'x-user-id': String(adminUser.id) }
      })

      expect(response.status).toBe(404)
    })

    it('requires authentication', async () => {
      const response = await env.app.fetch('/api/profit/preview/1?company_pct=30')
      expect(response.status).toBe(401)
    })
  })

  describe('POST /api/profit/distribute/:projectId', () => {
    beforeEach(async () => {
      // Setup profit for distribution
      await env.DB.prepare(
        'INSERT INTO project_transactions (project_id, transaction_type, amount, category, created_by) VALUES (?, ?, ?, ?, ?)'
      ).bind(testProject.id, 'revenue', 1000000, 'Sales', adminUser.id).run()

      await env.DB.prepare(
        'INSERT INTO project_transactions (project_id, transaction_type, amount, category, created_by) VALUES (?, ?, ?, ?, ?)'
      ).bind(testProject.id, 'expense', 200000, 'Operational', adminUser.id).run()
    })

    it('distributes profit to shareholders', async () => {
      const distribution = {
        company_share_percentage: 30,
        period_start: '2026-03-01',
        period_end: '2026-03-31'
      }

      const response = await env.app.fetch('/api/profit/distribute/1', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': String(adminUser.id)
        },
        body: JSON.stringify(distribution)
      })

      expect(response.status).toBe(201)
      const json = await response.json() as any
      expect(json.success).toBe(true)
      expect(json.data.shareholders_count).toBe(1)
      expect(json.data.total_distributed).toBe(560000) // 70% of 800k
    })

    it('creates shareholder profit records', async () => {
      const distribution = { company_share_percentage: 30 }

      await env.app.fetch('/api/profit/distribute/1', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': String(adminUser.id)
        },
        body: JSON.stringify(distribution)
      })

      const profits = await env.DB.prepare(
        'SELECT * FROM shareholder_profits WHERE project_id = ?'
      ).bind(testProject.id).all()

      expect(profits.results.length).toBe(1)
      expect(profits.results[0].user_id).toBe(investorUser.id)
      expect(profits.results[0].profit_amount).toBe(560000)
      expect(profits.results[0].status).toBe('credited')
    })

    it('creates earnings records for shareholders', async () => {
      const distribution = { company_share_percentage: 30 }

      await env.app.fetch('/api/profit/distribute/1', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': String(adminUser.id)
        },
        body: JSON.stringify(distribution)
      })

      const earnings = await env.DB.prepare(
        'SELECT * FROM earnings WHERE user_id = ? AND project_id = ?'
      ).bind(investorUser.id, testProject.id).first() as any

      expect(earnings).toBeDefined()
      expect(earnings.amount).toBe(560000)
      expect(earnings.rate).toBe(7000) // 70% in basis points
    })

    it('rejects distribution with no profit', async () => {
      await env.DB.prepare(
        'INSERT INTO project_transactions (project_id, transaction_type, amount, category, created_by) VALUES (?, ?, ?, ?, ?)'
      ).bind(testProject.id, 'expense', 1500000, 'Operational', adminUser.id).run()

      const distribution = { company_share_percentage: 30 }

      const response = await env.app.fetch('/api/profit/distribute/1', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': String(adminUser.id)
        },
        body: JSON.stringify(distribution)
      })

      expect(response.status).toBe(400)
      const json = await response.json() as any
      expect(json.error).toContain('ডিস্ট্রিবিউট করার মতো লাভ নেই')
    })

    it('rejects distribution with no shareholders', async () => {
      await env.DB.prepare('DELETE FROM user_shares').bind().run()

      const distribution = { company_share_percentage: 30 }

      const response = await env.app.fetch('/api/profit/distribute/1', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': String(adminUser.id)
        },
        body: JSON.stringify(distribution)
      })

      expect(response.status).toBe(400)
      const json = await response.json() as any
      expect(json.error).toContain('কোনো শেয়ারহোল্ডার নেই')
    })

    it('requires authentication', async () => {
      const distribution = { company_share_percentage: 30 }

      const response = await env.app.fetch('/api/profit/distribute/1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(distribution)
      })

      expect(response.status).toBe(401)
    })
  })

  describe('GET /api/profit/history/:projectId', () => {
    beforeEach(async () => {
      // Create distribution history
      for (let i = 0; i < 15; i++) {
        await env.DB.prepare(
          'INSERT INTO profit_distributions (project_id, total_revenue, total_expense, net_profit, distributable_amount, company_share_percentage, investor_share_percentage, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).bind(testProject.id, 1000000, 200000, 800000, 560000, 3000, 7000, 'distributed', adminUser.id).run()
      }
    })

    it('returns paginated distribution history', async () => {
      const response = await env.app.fetch('/api/profit/history/1?page=1&limit=10', {
        headers: { 'x-user-id': String(adminUser.id) }
      })

      expect(response.status).toBe(200)
      const json = await response.json() as any
      expect(json.success).toBe(true)
      expect(json.data.items.length).toBe(10)
      expect(json.data.total).toBe(15)
      expect(json.data.hasMore).toBe(true)
    })

    it('includes shareholder count', async () => {
      const response = await env.app.fetch('/api/profit/history/1?page=1&limit=5', {
        headers: { 'x-user-id': String(adminUser.id) }
      })

      const json = await response.json() as any
      expect(json.data.items[0].shareholders_count).toBeDefined()
    })

    it('orders by created_at DESC', async () => {
      const response = await env.app.fetch('/api/profit/history/1?page=1&limit=5', {
        headers: { 'x-user-id': String(adminUser.id) }
      })

      const json = await response.json() as any
      const dates = json.data.items.map((item: any) => item.created_at)
      expect(dates).toEqual([...dates].sort().reverse())
    })

    it('requires authentication', async () => {
      const response = await env.app.fetch('/api/profit/history/1')
      expect(response.status).toBe(401)
    })
  })

  describe('GET /api/profit/distribution/:id', () => {
    beforeEach(async () => {
      // Create distribution with shareholder profits
      const distResult = await env.DB.prepare(
        'INSERT INTO profit_distributions (project_id, total_revenue, total_expense, net_profit, distributable_amount, company_share_percentage, investor_share_percentage, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(testProject.id, 1000000, 200000, 800000, 560000, 3000, 7000, 'distributed', adminUser.id).run()

      const distributionId = distResult.meta.last_row_id

      await env.DB.prepare(
        'INSERT INTO shareholder_profits (distribution_id, project_id, user_id, shares_held, total_shares, ownership_percentage, profit_amount, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(distributionId, testProject.id, investorUser.id, 50, 50, 10000, 560000, 'credited').run()
    })

    it('returns distribution details', async () => {
      const response = await env.app.fetch('/api/profit/distribution/1', {
        headers: { 'x-user-id': String(adminUser.id) }
      })

      expect(response.status).toBe(200)
      const json = await response.json() as any
      expect(json.success).toBe(true)
      expect(json.data.distribution.project_title).toBe(testProject.title)
    })

    it('includes shareholder list', async () => {
      const response = await env.app.fetch('/api/profit/distribution/1', {
        headers: { 'x-user-id': String(adminUser.id) }
      })

      const json = await response.json() as any
      expect(json.data.shareholders.length).toBe(1)
      expect(json.data.shareholders[0].user_name).toBe(investorUser.name)
      expect(json.data.shareholders[0].profit_amount).toBe(560000)
    })

    it('returns 404 for non-existent distribution', async () => {
      const response = await env.app.fetch('/api/profit/distribution/999', {
        headers: { 'x-user-id': String(adminUser.id) }
      })

      expect(response.status).toBe(404)
    })

    it('requires authentication', async () => {
      const response = await env.app.fetch('/api/profit/distribution/1')
      expect(response.status).toBe(401)
    })
  })

  describe('GET /api/profit/my-profits', () => {
    beforeEach(async () => {
      // Create distribution
      const distResult = await env.DB.prepare(
        'INSERT INTO profit_distributions (project_id, total_revenue, total_expense, net_profit, distributable_amount, company_share_percentage, investor_share_percentage, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(testProject.id, 1000000, 200000, 800000, 560000, 3000, 7000, 'distributed', adminUser.id).run()

      const distributionId = distResult.meta.last_row_id

      // Create shareholder profit for investor
      await env.DB.prepare(
        'INSERT INTO shareholder_profits (distribution_id, project_id, user_id, shares_held, total_shares, ownership_percentage, profit_amount, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(distributionId, testProject.id, investorUser.id, 50, 50, 10000, 560000, 'credited').run()
    })

    it('returns user profit history', async () => {
      const response = await env.app.fetch('/api/profit/my-profits', {
        headers: { 'x-user-id': String(investorUser.id) }
      })

      expect(response.status).toBe(200)
      const json = await response.json() as any
      expect(json.success).toBe(true)
      expect(json.data.profits.length).toBe(1)
      expect(json.data.profits[0].profit_amount).toBe(560000)
      expect(json.data.profits[0].project_title).toBe(testProject.title)
    })

    it('includes summary statistics', async () => {
      const response = await env.app.fetch('/api/profit/my-profits', {
        headers: { 'x-user-id': String(investorUser.id) }
      })

      const json = await response.json() as any
      expect(json.data.summary.total_distributions).toBe(1)
      expect(json.data.summary.total_profit_earned).toBe(560000)
      expect(json.data.summary.projects_count).toBe(1)
    })

    it('requires authentication', async () => {
      const response = await env.app.fetch('/api/profit/my-profits')
      expect(response.status).toBe(401)
    })
  })
})
