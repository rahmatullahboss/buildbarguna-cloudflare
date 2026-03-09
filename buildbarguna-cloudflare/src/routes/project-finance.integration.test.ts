import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { env } from 'cloudflare:test'

/**
 * API Integration Tests: Project Finance Endpoints
 * Tests: /api/finance/* routes
 * 
 * Coverage:
 * - POST /api/finance/transactions - Add transaction
 * - GET /api/finance/transactions/:projectId - List transactions
 * - PUT /api/finance/transactions/:id - Update transaction
 * - DELETE /api/finance/transactions/:id - Delete transaction
 * - GET /api/finance/summary/:projectId - P&L summary
 * - GET /api/finance/categories - List categories
 */

describe('Project Finance API', () => {
  const testUser = {
    id: 1,
    phone: '01700000000',
    name: 'Admin User',
    isAdmin: true
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
    await env.DB.prepare('DELETE FROM project_transactions').bind().run()
    await env.DB.prepare('DELETE FROM transaction_categories').bind().run()
    await env.DB.prepare('DELETE FROM projects').bind().run()
    await env.DB.prepare('DELETE FROM users').bind().run()

    // Create test user (admin)
    await env.DB.prepare(
      'INSERT INTO users (id, phone, name, password_hash, is_admin) VALUES (?, ?, ?, ?, ?)'
    ).bind(testUser.id, testUser.phone, testUser.name, 'hash123', 1).run()

    // Create test project
    await env.DB.prepare(
      'INSERT INTO projects (id, title, share_price, total_shares, status, total_capital) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(testProject.id, testProject.title, testProject.share_price, testProject.total_shares, testProject.status, testProject.total_capital).run()

    // Create test categories
    await env.DB.prepare(
      'INSERT INTO transaction_categories (name, type, is_active) VALUES (?, ?, ?)'
    ).bind('Sales', 'revenue', 1).run()

    await env.DB.prepare(
      'INSERT INTO transaction_categories (name, type, is_active) VALUES (?, ?, ?)'
    ).bind('Operational', 'expense', 1).run()
  })

  afterEach(async () => {
    await env.DB.prepare('DELETE FROM project_transactions').bind().run()
    await env.DB.prepare('DELETE FROM transaction_categories').bind().run()
    await env.DB.prepare('DELETE FROM projects').bind().run()
    await env.DB.prepare('DELETE FROM users').bind().run()
  })

  describe('POST /api/finance/transactions', () => {
    it('creates a revenue transaction', async () => {
      const transaction = {
        project_id: testProject.id,
        transaction_type: 'revenue' as const,
        amount: 100000,
        category: 'Sales',
        description: 'Test revenue',
        transaction_date: '2026-03-01'
      }

      const response = await env.app.fetch('/api/finance/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': String(testUser.id)
        },
        body: JSON.stringify(transaction)
      })

      expect(response.status).toBe(201)
      const json = await response.json() as any
      expect(json.success).toBe(true)
      expect(json.data.message).toContain('সফলভাবে এন্ট্রি হয়েছে')
      expect(json.data.id).toBeDefined()
    })

    it('creates an expense transaction', async () => {
      const transaction = {
        project_id: testProject.id,
        transaction_type: 'expense' as const,
        amount: 50000,
        category: 'Operational',
        description: 'Test expense'
      }

      const response = await env.app.fetch('/api/finance/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': String(testUser.id)
        },
        body: JSON.stringify(transaction)
      })

      expect(response.status).toBe(201)
      const json = await response.json() as any
      expect(json.success).toBe(true)
    })

    it('rejects transaction for non-existent project', async () => {
      const transaction = {
        project_id: 999,
        transaction_type: 'revenue' as const,
        amount: 100000,
        category: 'Sales'
      }

      const response = await env.app.fetch('/api/finance/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': String(testUser.id)
        },
        body: JSON.stringify(transaction)
      })

      expect(response.status).toBe(404)
      const json = await response.json() as any
      expect(json.success).toBe(false)
      expect(json.error).toContain('প্রজেক্ট পাওয়া যায়নি')
    })

    it('rejects transaction with zero amount', async () => {
      const transaction = {
        project_id: testProject.id,
        transaction_type: 'revenue' as const,
        amount: 0,
        category: 'Sales'
      }

      const response = await env.app.fetch('/api/finance/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': String(testUser.id)
        },
        body: JSON.stringify(transaction)
      })

      expect(response.status).toBe(400)
    })

    it('requires authentication', async () => {
      const transaction = {
        project_id: testProject.id,
        transaction_type: 'revenue' as const,
        amount: 100000,
        category: 'Sales'
      }

      const response = await env.app.fetch('/api/finance/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transaction)
      })

      expect(response.status).toBe(401)
    })
  })

  describe('GET /api/finance/transactions/:projectId', () => {
    beforeEach(async () => {
      // Add test transactions
      for (let i = 0; i < 15; i++) {
        await env.DB.prepare(
          'INSERT INTO project_transactions (project_id, transaction_type, amount, category, description, transaction_date, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).bind(
          testProject.id,
          i % 2 === 0 ? 'revenue' : 'expense',
          10000 * (i + 1),
          i % 2 === 0 ? 'Sales' : 'Operational',
          `Transaction ${i + 1}`,
          '2026-03-01',
          testUser.id
        ).run()
      }
    })

    it('returns paginated transactions', async () => {
      const response = await env.app.fetch('/api/finance/transactions/1?page=1&limit=10', {
        headers: { 'x-user-id': String(testUser.id) }
      })

      expect(response.status).toBe(200)
      const json = await response.json() as any
      expect(json.success).toBe(true)
      expect(json.data.items.length).toBe(10)
      expect(json.data.total).toBe(15)
      expect(json.data.hasMore).toBe(true)
    })

    it('filters by transaction type', async () => {
      const response = await env.app.fetch('/api/finance/transactions/1?type=revenue&page=1&limit=10', {
        headers: { 'x-user-id': String(testUser.id) }
      })

      const json = await response.json() as any
      expect(json.data.items.every((t: any) => t.transaction_type === 'revenue')).toBe(true)
      expect(json.data.total).toBe(8) // 8 even numbers from 0-14
    })

    it('includes creator name', async () => {
      const response = await env.app.fetch('/api/finance/transactions/1?page=1&limit=5', {
        headers: { 'x-user-id': String(testUser.id) }
      })

      const json = await response.json() as any
      expect(json.data.items[0].created_by_name).toBe(testUser.name)
    })

    it('returns 404 for non-existent project', async () => {
      const response = await env.app.fetch('/api/finance/transactions/999', {
        headers: { 'x-user-id': String(testUser.id) }
      })

      expect(response.status).toBe(404)
    })

    it('requires authentication', async () => {
      const response = await env.app.fetch('/api/finance/transactions/1')
      expect(response.status).toBe(401)
    })
  })

  describe('PUT /api/finance/transactions/:id', () => {
    it('updates transaction amount', async () => {
      // Create transaction
      const result = await env.DB.prepare(
        'INSERT INTO project_transactions (project_id, transaction_type, amount, category, created_by) VALUES (?, ?, ?, ?, ?)'
      ).bind(testProject.id, 'revenue', 50000, 'Sales', testUser.id).run()

      const transactionId = result.meta.last_row_id

      const update = { amount: 75000 }

      const response = await env.app.fetch(`/api/finance/transactions/${transactionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': String(testUser.id)
        },
        body: JSON.stringify(update)
      })

      expect(response.status).toBe(200)
      const json = await response.json() as any
      expect(json.success).toBe(true)

      // Verify update
      const updated = await env.DB.prepare(
        'SELECT amount FROM project_transactions WHERE id = ?'
      ).bind(transactionId).first<{ amount: number }>()

      expect(updated?.amount).toBe(75000)
    })

    it('updates transaction category', async () => {
      const result = await env.DB.prepare(
        'INSERT INTO project_transactions (project_id, transaction_type, amount, category, created_by) VALUES (?, ?, ?, ?, ?)'
      ).bind(testProject.id, 'revenue', 50000, 'Sales', testUser.id).run()

      const transactionId = result.meta.last_row_id
      const update = { category: 'Other Revenue' }

      const response = await env.app.fetch(`/api/finance/transactions/${transactionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': String(testUser.id)
        },
        body: JSON.stringify(update)
      })

      expect(response.status).toBe(200)
    })

    it('rejects update for non-existent transaction', async () => {
      const update = { amount: 75000 }

      const response = await env.app.fetch('/api/finance/transactions/999', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': String(testUser.id)
        },
        body: JSON.stringify(update)
      })

      expect(response.status).toBe(404)
    })

    it('ignores invalid fields', async () => {
      const result = await env.DB.prepare(
        'INSERT INTO project_transactions (project_id, transaction_type, amount, category, created_by) VALUES (?, ?, ?, ?, ?)'
      ).bind(testProject.id, 'revenue', 50000, 'Sales', testUser.id).run()

      const transactionId = result.meta.last_row_id
      const update = { amount: 75000, invalid_field: 'should be ignored' }

      const response = await env.app.fetch(`/api/finance/transactions/${transactionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': String(testUser.id)
        },
        body: JSON.stringify(update)
      })

      expect(response.status).toBe(200)
    })

    it('requires authentication', async () => {
      const update = { amount: 75000 }

      const response = await env.app.fetch('/api/finance/transactions/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update)
      })

      expect(response.status).toBe(401)
    })
  })

  describe('DELETE /api/finance/transactions/:id', () => {
    it('deletes transaction', async () => {
      const result = await env.DB.prepare(
        'INSERT INTO project_transactions (project_id, transaction_type, amount, category, created_by) VALUES (?, ?, ?, ?, ?)'
      ).bind(testProject.id, 'revenue', 50000, 'Sales', testUser.id).run()

      const transactionId = result.meta.last_row_id

      const response = await env.app.fetch(`/api/finance/transactions/${transactionId}`, {
        method: 'DELETE',
        headers: { 'x-user-id': String(testUser.id) }
      })

      expect(response.status).toBe(200)
      const json = await response.json() as any
      expect(json.success).toBe(true)
      expect(json.data.message).toContain('সফল')

      // Verify deletion
      const deleted = await env.DB.prepare(
        'SELECT id FROM project_transactions WHERE id = ?'
      ).bind(transactionId).first()

      expect(deleted).toBeUndefined()
    })

    it('returns 404 for non-existent transaction', async () => {
      const response = await env.app.fetch('/api/finance/transactions/999', {
        method: 'DELETE',
        headers: { 'x-user-id': String(testUser.id) }
      })

      expect(response.status).toBe(404)
    })

    it('requires authentication', async () => {
      const response = await env.app.fetch('/api/finance/transactions/1', {
        method: 'DELETE'
      })

      expect(response.status).toBe(401)
    })
  })

  describe('GET /api/finance/summary/:projectId', () => {
    beforeEach(async () => {
      // Add revenue transactions
      await env.DB.prepare(
        'INSERT INTO project_transactions (project_id, transaction_type, amount, category, created_by) VALUES (?, ?, ?, ?, ?)'
      ).bind(testProject.id, 'revenue', 500000, 'Sales', testUser.id).run()

      await env.DB.prepare(
        'INSERT INTO project_transactions (project_id, transaction_type, amount, category, created_by) VALUES (?, ?, ?, ?, ?)'
      ).bind(testProject.id, 'revenue', 300000, 'Other', testUser.id).run()

      // Add expense transactions
      await env.DB.prepare(
        'INSERT INTO project_transactions (project_id, transaction_type, amount, category, created_by) VALUES (?, ?, ?, ?, ?)'
      ).bind(testProject.id, 'expense', 200000, 'Operational', testUser.id).run()

      await env.DB.prepare(
        'INSERT INTO project_transactions (project_id, transaction_type, amount, category, created_by) VALUES (?, ?, ?, ?, ?)'
      ).bind(testProject.id, 'expense', 100000, 'Marketing', testUser.id).run()
    })

    it('returns complete P&L summary', async () => {
      const response = await env.app.fetch('/api/finance/summary/1', {
        headers: { 'x-user-id': String(testUser.id) }
      })

      expect(response.status).toBe(200)
      const json = await response.json() as any
      expect(json.success).toBe(true)

      const summary = json.data.financials
      expect(summary.total_revenue).toBe(800000)
      expect(summary.total_expense).toBe(300000)
      expect(summary.net_profit).toBe(500000)
      expect(summary.revenue_count).toBe(2)
      expect(summary.expense_count).toBe(2)
    })

    it('includes project details', async () => {
      const response = await env.app.fetch('/api/finance/summary/1', {
        headers: { 'x-user-id': String(testUser.id) }
      })

      const json = await response.json() as any
      expect(json.data.project.id).toBe(testProject.id)
      expect(json.data.project.title).toBe(testProject.title)
      expect(json.data.project.status).toBe(testProject.status)
    })

    it('includes category breakdown', async () => {
      const response = await env.app.fetch('/api/finance/summary/1', {
        headers: { 'x-user-id': String(testUser.id) }
      })

      const json = await response.json() as any
      expect(json.data.category_breakdown.length).toBeGreaterThan(0)
      const sales = json.data.category_breakdown.find((c: any) => c.category === 'Sales')
      expect(sales.total_amount).toBe(500000)
    })

    it('includes monthly trend', async () => {
      const response = await env.app.fetch('/api/finance/summary/1', {
        headers: { 'x-user-id': String(testUser.id) }
      })

      const json = await response.json() as any
      expect(json.data.monthly_trend.length).toBeGreaterThan(0)
      expect(json.data.monthly_trend[0].month).toMatch(/^\d{4}-\d{2}$/)
    })

    it('calculates profit margin correctly', async () => {
      const response = await env.app.fetch('/api/finance/summary/1', {
        headers: { 'x-user-id': String(testUser.id) }
      })

      const json = await response.json() as any
      // Margin = (500000 / 800000) * 100 = 62.5%
      expect(json.data.financials.profit_margin_percent).toBeCloseTo(62.5, 1)
    })

    it('returns 404 for non-existent project', async () => {
      const response = await env.app.fetch('/api/finance/summary/999', {
        headers: { 'x-user-id': String(testUser.id) }
      })

      expect(response.status).toBe(404)
    })

    it('requires authentication', async () => {
      const response = await env.app.fetch('/api/finance/summary/1')
      expect(response.status).toBe(401)
    })
  })

  describe('GET /api/finance/categories', () => {
    it('returns all active categories', async () => {
      const response = await env.app.fetch('/api/finance/categories', {
        headers: { 'x-user-id': String(testUser.id) }
      })

      expect(response.status).toBe(200)
      const json = await response.json() as any
      expect(json.success).toBe(true)
      expect(json.data.length).toBeGreaterThanOrEqual(2)
    })

    it('filters by type', async () => {
      const response = await env.app.fetch('/api/finance/categories?type=revenue', {
        headers: { 'x-user-id': String(testUser.id) }
      })

      const json = await response.json() as any
      expect(json.data.every((c: any) => c.type === 'revenue')).toBe(true)
    })

    it('requires authentication', async () => {
      const response = await env.app.fetch('/api/finance/categories')
      expect(response.status).toBe(401)
    })
  })
})
