import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { env } from 'cloudflare:test'

/**
 * API Integration Tests: Company Expenses Endpoints
 * Tests: /api/company-expenses/* routes
 * 
 * Coverage:
 * - POST /api/company-expenses/admin/add - Add company expense
 * - POST /api/company-expenses/admin/allocate - Allocate expense to projects
 * - GET /api/company-expenses/admin/list - List expenses
 * - GET /api/company-expenses/admin/summary - Expense summary
 * - GET /api/company-expenses/admin/:id - Expense details
 * - GET /api/company-expenses/categories - List categories
 */

describe('Company Expenses API', () => {
  const adminUser = {
    id: 1,
    phone: '01700000000',
    name: 'Admin User',
    isAdmin: true
  }

  const testProjects = [
    { id: 1, title: 'Project A', share_price: 100000, total_shares: 100, status: 'active', total_capital: 1000000 },
    { id: 2, title: 'Project B', share_price: 100000, total_shares: 100, status: 'active', total_capital: 2000000 },
    { id: 3, title: 'Project C', share_price: 100000, total_shares: 100, status: 'active', total_capital: 3000000 }
  ]

  beforeEach(async () => {
    // Setup test data
    await env.DB.prepare('DELETE FROM expense_allocations').bind().run()
    await env.DB.prepare('DELETE FROM company_expenses').bind().run()
    await env.DB.prepare('DELETE FROM company_expense_categories').bind().run()
    await env.DB.prepare('DELETE FROM projects').bind().run()
    await env.DB.prepare('DELETE FROM users').bind().run()

    // Create admin user
    await env.DB.prepare(
      'INSERT INTO users (id, phone, name, password_hash, is_admin) VALUES (?, ?, ?, ?, ?)'
    ).bind(adminUser.id, adminUser.phone, adminUser.name, 'hash123', 1).run()

    // Create test projects
    for (const project of testProjects) {
      await env.DB.prepare(
        'INSERT INTO projects (id, title, share_price, total_shares, status, total_capital) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(project.id, project.title, project.share_price, project.total_shares, project.status, project.total_capital).run()
    }

    // Create expense categories
    await env.DB.prepare(
      'INSERT INTO company_expense_categories (name, is_active) VALUES (?, ?)'
    ).bind('Office Rent', 1).run()

    await env.DB.prepare(
      'INSERT INTO company_expense_categories (name, is_active) VALUES (?, ?)'
    ).bind('Utilities', 1).run()
  })

  afterEach(async () => {
    await env.DB.prepare('DELETE FROM expense_allocations').bind().run()
    await env.DB.prepare('DELETE FROM company_expenses').bind().run()
    await env.DB.prepare('DELETE FROM company_expense_categories').bind().run()
    await env.DB.prepare('DELETE FROM projects').bind().run()
    await env.DB.prepare('DELETE FROM users').bind().run()
  })

  describe('POST /api/company-expenses/admin/add', () => {
    it('adds company expense with by_project_value allocation', async () => {
      const expense = {
        amount: 300000,
        category_id: 1,
        category_name: 'Office Rent',
        description: 'Monthly rent',
        expense_date: '2026-03-01',
        allocation_method: 'by_project_value' as const
      }

      const response = await env.app.fetch('/api/company-expenses/admin/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': String(adminUser.id)
        },
        body: JSON.stringify(expense)
      })

      expect(response.status).toBe(201)
      const json = await response.json() as any
      expect(json.success).toBe(true)
      expect(json.data.message).toContain('সফলভাবে যোগ করা হয়েছে')
      expect(json.data.allocation_pending).toBe(true)
    })

    it('adds company expense with company_only allocation', async () => {
      const expense = {
        amount: 50000,
        category_name: 'Miscellaneous',
        allocation_method: 'company_only' as const
      }

      const response = await env.app.fetch('/api/company-expenses/admin/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': String(adminUser.id)
        },
        body: JSON.stringify(expense)
      })

      expect(response.status).toBe(201)
      const json = await response.json() as any
      expect(json.data.allocation_pending).toBe(false)
    })

    it('adds expense with equal allocation method', async () => {
      const expense = {
        amount: 90000,
        category_name: 'Utilities',
        allocation_method: 'equal' as const
      }

      const response = await env.app.fetch('/api/company-expenses/admin/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': String(adminUser.id)
        },
        body: JSON.stringify(expense)
      })

      expect(response.status).toBe(201)
    })

    it('rejects expense with invalid category', async () => {
      const expense = {
        amount: 100000,
        category_id: 999,
        category_name: 'Invalid',
        allocation_method: 'by_project_value' as const
      }

      const response = await env.app.fetch('/api/company-expenses/admin/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': String(adminUser.id)
        },
        body: JSON.stringify(expense)
      })

      expect(response.status).toBe(404)
      const json = await response.json() as any
      expect(json.error).toContain('ক্যাটাগরি পাওয়া যায়নি')
    })

    it('rejects expense with zero amount', async () => {
      const expense = {
        amount: 0,
        category_name: 'Test',
        allocation_method: 'by_project_value' as const
      }

      const response = await env.app.fetch('/api/company-expenses/admin/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': String(adminUser.id)
        },
        body: JSON.stringify(expense)
      })

      expect(response.status).toBe(400)
    })

    it('requires authentication', async () => {
      const expense = {
        amount: 100000,
        category_name: 'Test',
        allocation_method: 'by_project_value' as const
      }

      const response = await env.app.fetch('/api/company-expenses/admin/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expense)
      })

      expect(response.status).toBe(401)
    })
  })

  describe('POST /api/company-expenses/admin/allocate', () => {
    it('allocates expense by project value', async () => {
      // Add expense first
      const expenseResult = await env.DB.prepare(
        'INSERT INTO company_expenses (amount, category_name, allocation_method, created_by) VALUES (?, ?, ?, ?)'
      ).bind(600000, 'Office Rent', 'by_project_value', adminUser.id).run()

      const expenseId = expenseResult.meta.last_row_id

      const allocate = {
        expense_id: expenseId,
        project_ids: [1, 2, 3]
      }

      const response = await env.app.fetch('/api/company-expenses/admin/allocate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': String(adminUser.id)
        },
        body: JSON.stringify(allocate)
      })

      expect(response.status).toBe(200)
      const json = await response.json() as any
      expect(json.success).toBe(true)
      expect(json.data.allocations.length).toBe(3)

      // Check proportional allocation (1:2:3 ratio)
      const totalCapital = 6000000
      const proj1Alloc = Math.floor((600000 * 1000000) / totalCapital)
      const proj2Alloc = Math.floor((600000 * 2000000) / totalCapital)
      const proj3Alloc = Math.floor((600000 * 3000000) / totalCapital)

      expect(json.data.allocations.find((a: any) => a.project_id === 1).amount).toBe(proj1Alloc)
      expect(json.data.allocations.find((a: any) => a.project_id === 2).amount).toBe(proj2Alloc)
      expect(json.data.allocations.find((a: any) => a.project_id === 3).amount).toBe(proj3Alloc)
    })

    it('allocates expense equally', async () => {
      const expenseResult = await env.DB.prepare(
        'INSERT INTO company_expenses (amount, category_name, allocation_method, created_by) VALUES (?, ?, ?, ?)'
      ).bind(90000, 'Utilities', 'equal', adminUser.id).run()

      const expenseId = expenseResult.meta.last_row_id

      const allocate = {
        expense_id: expenseId,
        project_ids: [1, 2, 3]
      }

      const response = await env.app.fetch('/api/company-expenses/admin/allocate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': String(adminUser.id)
        },
        body: JSON.stringify(allocate)
      })

      const json = await response.json() as any
      // Equal split: 90000 / 3 = 30000 each
      expect(json.data.allocations.every((a: any) => a.amount === 30000)).toBe(true)
    })

    it('allocates by revenue (last 30 days)', async () => {
      // Add revenue to projects
      await env.DB.prepare(
        'INSERT INTO project_transactions (project_id, transaction_type, amount, category, transaction_date, created_by) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(1, 'revenue', 100000, 'Sales', '2026-03-01', adminUser.id).run()

      await env.DB.prepare(
        'INSERT INTO project_transactions (project_id, transaction_type, amount, category, transaction_date, created_by) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(2, 'revenue', 200000, 'Sales', '2026-03-01', adminUser.id).run()

      await env.DB.prepare(
        'INSERT INTO project_transactions (project_id, transaction_type, amount, category, transaction_date, created_by) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(3, 'revenue', 300000, 'Sales', '2026-03-01', adminUser.id).run()

      const expenseResult = await env.DB.prepare(
        'INSERT INTO company_expenses (amount, category_name, allocation_method, created_by) VALUES (?, ?, ?, ?)'
      ).bind(600000, 'Marketing', 'by_revenue', adminUser.id).run()

      const expenseId = expenseResult.meta.last_row_id

      const allocate = {
        expense_id: expenseId,
        project_ids: [1, 2, 3]
      }

      const response = await env.app.fetch('/api/company-expenses/admin/allocate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': String(adminUser.id)
        },
        body: JSON.stringify(allocate)
      })

      const json = await response.json() as any
      // Revenue ratio 1:2:3, total = 600k
      // Proj1: 600k * 100k/600k = 100k
      // Proj2: 600k * 200k/600k = 200k
      // Proj3: 600k * 300k/600k = 300k
      expect(json.data.allocations.find((a: any) => a.project_id === 1).amount).toBe(100000)
      expect(json.data.allocations.find((a: any) => a.project_id === 2).amount).toBe(200000)
      expect(json.data.allocations.find((a: any) => a.project_id === 3).amount).toBe(300000)
    })

    it('falls back to equal allocation when no revenue', async () => {
      const expenseResult = await env.DB.prepare(
        'INSERT INTO company_expenses (amount, category_name, allocation_method, created_by) VALUES (?, ?, ?, ?)'
      ).bind(90000, 'Marketing', 'by_revenue', adminUser.id).run()

      const expenseId = expenseResult.meta.last_row_id

      const allocate = {
        expense_id: expenseId,
        project_ids: [1, 2, 3]
      }

      const response = await env.app.fetch('/api/company-expenses/admin/allocate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': String(adminUser.id)
        },
        body: JSON.stringify(allocate)
      })

      const json = await response.json() as any
      // Should fall back to equal split
      expect(json.data.allocations.every((a: any) => a.amount === 30000)).toBe(true)
    })

    it('rejects allocation for already allocated expense', async () => {
      const expenseResult = await env.DB.prepare(
        'INSERT INTO company_expenses (amount, category_name, allocation_method, is_allocated, created_by) VALUES (?, ?, ?, ?, ?)'
      ).bind(100000, 'Test', 'by_project_value', 1, adminUser.id).run()

      const allocate = {
        expense_id: expenseResult.meta.last_row_id,
        project_ids: [1]
      }

      const response = await env.app.fetch('/api/company-expenses/admin/allocate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': String(adminUser.id)
        },
        body: JSON.stringify(allocate)
      })

      expect(response.status).toBe(400)
      const json = await response.json() as any
      expect(json.error).toContain('ইতিমধ্যে বরাদ্দ করা হয়েছে')
    })

    it('rejects allocation for company_only expense', async () => {
      const expenseResult = await env.DB.prepare(
        'INSERT INTO company_expenses (amount, category_name, allocation_method, created_by) VALUES (?, ?, ?, ?)'
      ).bind(100000, 'Test', 'company_only', adminUser.id).run()

      const allocate = {
        expense_id: expenseResult.meta.last_row_id,
        project_ids: [1]
      }

      const response = await env.app.fetch('/api/company-expenses/admin/allocate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': String(adminUser.id)
        },
        body: JSON.stringify(allocate)
      })

      expect(response.status).toBe(400)
      const json = await response.json() as any
      expect(json.error).toContain('company_only খরচ প্রজেক্টে বরাদ্দ করা যায় না')
    })

    it('requires authentication', async () => {
      const allocate = {
        expense_id: 1,
        project_ids: [1]
      }

      const response = await env.app.fetch('/api/company-expenses/admin/allocate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(allocate)
      })

      expect(response.status).toBe(401)
    })
  })

  describe('GET /api/company-expenses/admin/list', () => {
    beforeEach(async () => {
      // Add test expenses
      for (let i = 0; i < 15; i++) {
        await env.DB.prepare(
          'INSERT INTO company_expenses (amount, category_name, allocation_method, is_allocated, created_by) VALUES (?, ?, ?, ?, ?)'
        ).bind(10000 * (i + 1), 'Category', 'by_project_value', i % 2, adminUser.id).run()
      }
    })

    it('returns paginated expenses', async () => {
      const response = await env.app.fetch('/api/company-expenses/admin/list?page=1&limit=10', {
        headers: { 'x-user-id': String(adminUser.id) }
      })

      expect(response.status).toBe(200)
      const json = await response.json() as any
      expect(json.success).toBe(true)
      expect(json.data.items.length).toBe(10)
      expect(json.data.total).toBe(15)
      expect(json.data.hasMore).toBe(true)
    })

    it('filters by allocated status', async () => {
      const response = await env.app.fetch('/api/company-expenses/admin/list?allocated=true&page=1&limit=10', {
        headers: { 'x-user-id': String(adminUser.id) }
      })

      const json = await response.json() as any
      expect(json.data.items.every((e: any) => e.is_allocated === 1)).toBe(true)
    })

    it('includes creator name', async () => {
      const response = await env.app.fetch('/api/company-expenses/admin/list?page=1&limit=5', {
        headers: { 'x-user-id': String(adminUser.id) }
      })

      const json = await response.json() as any
      expect(json.data.items[0].created_by_name).toBe(adminUser.name)
    })

    it('requires authentication', async () => {
      const response = await env.app.fetch('/api/company-expenses/admin/list')
      expect(response.status).toBe(401)
    })
  })

  describe('GET /api/company-expenses/admin/summary', () => {
    beforeEach(async () => {
      // Add test expenses
      await env.DB.prepare(
        'INSERT INTO company_expenses (amount, category_name, allocation_method, is_allocated, expense_date, created_by) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(300000, 'Rent', 'by_project_value', 1, '2026-03-01', adminUser.id).run()

      await env.DB.prepare(
        'INSERT INTO company_expenses (amount, category_name, allocation_method, is_allocated, expense_date, created_by) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(200000, 'Utilities', 'equal', 1, '2026-03-05', adminUser.id).run()

      await env.DB.prepare(
        'INSERT INTO company_expenses (amount, category_name, allocation_method, is_allocated, expense_date, created_by) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(100000, 'Rent', 'by_project_value', 0, '2026-03-10', adminUser.id).run()
    })

    it('returns expense summary for current month', async () => {
      const response = await env.app.fetch('/api/company-expenses/admin/summary?period=month', {
        headers: { 'x-user-id': String(adminUser.id) }
      })

      expect(response.status).toBe(200)
      const json = await response.json() as any
      expect(json.success).toBe(true)
      expect(json.data.total_expenses).toBe(600000)
      expect(json.data.total_allocated).toBe(500000)
      expect(json.data.pending_allocation).toBe(100000)
      expect(json.data.expenses_count).toBe(3)
    })

    it('includes category breakdown', async () => {
      const response = await env.app.fetch('/api/company-expenses/admin/summary', {
        headers: { 'x-user-id': String(adminUser.id) }
      })

      const json = await response.json() as any
      expect(json.data.by_category.length).toBeGreaterThan(0)
      const rentCategory = json.data.by_category.find((c: any) => c.category_name === 'Rent')
      expect(rentCategory.total_amount).toBe(400000)
    })

    it('filters by year period', async () => {
      const response = await env.app.fetch('/api/company-expenses/admin/summary?period=year', {
        headers: { 'x-user-id': String(adminUser.id) }
      })

      const json = await response.json() as any
      // Should include all expenses from current year
      expect(json.data.expenses_count).toBeGreaterThanOrEqual(3)
    })

    it('requires authentication', async () => {
      const response = await env.app.fetch('/api/company-expenses/admin/summary')
      expect(response.status).toBe(401)
    })
  })

  describe('GET /api/company-expenses/admin/:id', () => {
    beforeEach(async () => {
      const expenseResult = await env.DB.prepare(
        'INSERT INTO company_expenses (amount, category_name, allocation_method, created_by) VALUES (?, ?, ?, ?)'
      ).bind(300000, 'Office Rent', 'by_project_value', adminUser.id).run()

      const expenseId = expenseResult.meta.last_row_id

      // Add allocations
      await env.DB.prepare(
        'INSERT INTO expense_allocations (expense_id, project_id, amount, project_value_pct) VALUES (?, ?, ?, ?)'
      ).bind(expenseId, 1, 50000, 1667).run()

      await env.DB.prepare(
        'INSERT INTO expense_allocations (expense_id, project_id, amount, project_value_pct) VALUES (?, ?, ?, ?)'
      ).bind(expenseId, 2, 100000, 3333).run()

      await env.DB.prepare(
        'INSERT INTO expense_allocations (expense_id, project_id, amount, project_value_pct) VALUES (?, ?, ?, ?)'
      ).bind(expenseId, 3, 150000, 5000).run()
    })

    it('returns expense details with allocations', async () => {
      const response = await env.app.fetch('/api/company-expenses/admin/1', {
        headers: { 'x-user-id': String(adminUser.id) }
      })

      expect(response.status).toBe(200)
      const json = await response.json() as any
      expect(json.success).toBe(true)
      expect(json.data.amount).toBe(300000)
      expect(json.data.allocations.length).toBe(3)
    })

    it('includes project details in allocations', async () => {
      const response = await env.app.fetch('/api/company-expenses/admin/1', {
        headers: { 'x-user-id': String(adminUser.id) }
      })

      const json = await response.json() as any
      const proj1Alloc = json.data.allocations.find((a: any) => a.project_id === 1)
      expect(proj1Alloc.project_title).toBe('Project A')
      expect(proj1Alloc.amount).toBe(50000)
    })

    it('returns 404 for non-existent expense', async () => {
      const response = await env.app.fetch('/api/company-expenses/admin/999', {
        headers: { 'x-user-id': String(adminUser.id) }
      })

      expect(response.status).toBe(404)
    })

    it('requires authentication', async () => {
      const response = await env.app.fetch('/api/company-expenses/admin/1')
      expect(response.status).toBe(401)
    })
  })

  describe('GET /api/company-expenses/categories', () => {
    it('returns all active categories', async () => {
      const response = await env.app.fetch('/api/company-expenses/categories', {
        headers: { 'x-user-id': String(adminUser.id) }
      })

      expect(response.status).toBe(200)
      const json = await response.json() as any
      expect(json.success).toBe(true)
      expect(json.data.length).toBeGreaterThanOrEqual(2)
    })

    it('requires authentication', async () => {
      const response = await env.app.fetch('/api/company-expenses/categories')
      expect(response.status).toBe(401)
    })
  })

  describe('GET /api/company-expenses/project-summary/:projectId', () => {
    beforeEach(async () => {
      // Add direct project expense
      await env.DB.prepare(
        'INSERT INTO project_transactions (project_id, transaction_type, amount, category, created_by) VALUES (?, ?, ?, ?, ?)'
      ).bind(1, 'expense', 100000, 'Operational', adminUser.id).run()

      // Add company expense allocation
      await env.DB.prepare(
        'INSERT INTO expense_allocations (expense_id, project_id, amount, project_value_pct) VALUES (?, ?, ?, ?)'
      ).bind(1, 1, 50000, 1667).run()
    })

    it('returns project expense summary', async () => {
      const response = await env.app.fetch('/api/company-expenses/project-summary/1', {
        headers: { 'x-user-id': String(adminUser.id) }
      })

      expect(response.status).toBe(200)
      const json = await response.json() as any
      expect(json.success).toBe(true)
      expect(json.data.direct_expenses).toBe(100000)
      expect(json.data.company_expense_allocation).toBe(50000)
      expect(json.data.total_expenses).toBe(150000)
    })

    it('includes allocation percentage', async () => {
      const response = await env.app.fetch('/api/company-expenses/project-summary/1', {
        headers: { 'x-user-id': String(adminUser.id) }
      })

      const json = await response.json() as any
      // 50000 / 1000000 * 10000 = 500 basis points = 0.5%
      expect(json.data.allocation_percentage).toBe(500)
    })

    it('returns 404 for non-existent project', async () => {
      const response = await env.app.fetch('/api/company-expenses/project-summary/999', {
        headers: { 'x-user-id': String(adminUser.id) }
      })

      expect(response.status).toBe(404)
    })

    it('requires authentication', async () => {
      const response = await env.app.fetch('/api/company-expenses/project-summary/1')
      expect(response.status).toBe(401)
    })
  })
})
