import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { env } from 'cloudflare:test'

describe('Admin Project Closeout API', () => {
  const adminUser = {
    id: 1,
    phone: '01700000000',
    name: 'Admin User'
  }

  const investorUser = {
    id: 2,
    phone: '01700000001',
    name: 'Investor User'
  }

  const project = {
    id: 1,
    title: 'Closeout Test Project',
    share_price: 10_000,
    total_shares: 100,
    total_capital: 1_000_000,
    status: 'active'
  }

  beforeEach(async () => {
    await env.DB.prepare('DELETE FROM project_settlement_entries').bind().run()
    await env.DB.prepare('DELETE FROM project_closeout_runs').bind().run()
    await env.DB.prepare('DELETE FROM project_members').bind().run()
    await env.DB.prepare('DELETE FROM shareholder_profits').bind().run()
    await env.DB.prepare('DELETE FROM profit_distributions').bind().run()
    await env.DB.prepare('DELETE FROM balance_audit_log').bind().run()
    await env.DB.prepare('DELETE FROM earnings').bind().run()
    await env.DB.prepare('DELETE FROM user_balances').bind().run()
    await env.DB.prepare('DELETE FROM expense_allocations').bind().run()
    await env.DB.prepare('DELETE FROM company_expenses').bind().run()
    await env.DB.prepare('DELETE FROM share_purchases').bind().run()
    await env.DB.prepare('DELETE FROM user_shares').bind().run()
    await env.DB.prepare('DELETE FROM project_transactions').bind().run()
    await env.DB.prepare('DELETE FROM projects').bind().run()
    await env.DB.prepare('DELETE FROM users').bind().run()

    await env.DB.prepare(
      'INSERT INTO users (id, phone, name, password_hash, role, is_active) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(adminUser.id, adminUser.phone, adminUser.name, 'hash123', 'admin', 1).run()

    await env.DB.prepare(
      'INSERT INTO users (id, phone, name, password_hash, role, is_active) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(investorUser.id, investorUser.phone, investorUser.name, 'hash123', 'member', 1).run()

    await env.DB.prepare(
      'INSERT INTO projects (id, title, share_price, total_shares, status, total_capital) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(project.id, project.title, project.share_price, project.total_shares, project.status, project.total_capital).run()

    await env.DB.prepare(
      'INSERT INTO user_shares (user_id, project_id, quantity) VALUES (?, ?, ?)'
    ).bind(investorUser.id, project.id, 10).run()

    await env.DB.prepare(
      'INSERT INTO user_balances (user_id, total_earned_paisa, total_withdrawn_paisa, reserved_paisa) VALUES (?, 0, 0, 0)'
    ).bind(investorUser.id).run()
  })

  afterEach(async () => {
    await env.DB.prepare('DELETE FROM project_settlement_entries').bind().run()
    await env.DB.prepare('DELETE FROM project_closeout_runs').bind().run()
    await env.DB.prepare('DELETE FROM project_members').bind().run()
    await env.DB.prepare('DELETE FROM shareholder_profits').bind().run()
    await env.DB.prepare('DELETE FROM profit_distributions').bind().run()
    await env.DB.prepare('DELETE FROM balance_audit_log').bind().run()
    await env.DB.prepare('DELETE FROM earnings').bind().run()
    await env.DB.prepare('DELETE FROM user_balances').bind().run()
    await env.DB.prepare('DELETE FROM expense_allocations').bind().run()
    await env.DB.prepare('DELETE FROM company_expenses').bind().run()
    await env.DB.prepare('DELETE FROM share_purchases').bind().run()
    await env.DB.prepare('DELETE FROM user_shares').bind().run()
    await env.DB.prepare('DELETE FROM project_transactions').bind().run()
    await env.DB.prepare('DELETE FROM projects').bind().run()
    await env.DB.prepare('DELETE FROM users').bind().run()
  })

  it('shows profit-distribution blocker in closeout preview when undistributed profit exists', async () => {
    await env.DB.prepare(
      'INSERT INTO project_transactions (project_id, transaction_type, amount, category, created_by) VALUES (?, ?, ?, ?, ?)'
    ).bind(project.id, 'revenue', 170_000, 'Sales', adminUser.id).run()

    await env.DB.prepare(
      'INSERT INTO project_transactions (project_id, transaction_type, amount, category, created_by) VALUES (?, ?, ?, ?, ?)'
    ).bind(project.id, 'expense', 100_000, 'Operational', adminUser.id).run()

    const response = await env.app.fetch('/api/admin/projects/1/closeout-preview?mode=completed', {
      headers: { 'x-user-id': String(adminUser.id) }
    })

    expect(response.status).toBe(200)
    const json = await response.json() as any
    expect(json.success).toBe(true)
    expect(json.data.can_closeout).toBe(false)
    expect(json.data.blockers.some((item: any) => item.code === 'UNDISTRIBUTED_PROFIT')).toBe(true)
    expect(json.data.financials.available_profit).toBe(70_000)
  })

  it('blocks direct terminal status change and requires closeout workflow', async () => {
    const response = await env.app.fetch('/api/admin/projects/1/status', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': String(adminUser.id)
      },
      body: JSON.stringify({ status: 'completed' })
    })

    expect(response.status).toBe(409)
    const json = await response.json() as any
    expect(json.success).toBe(false)
    expect(json.error).toContain('closeout')
  })

  it('completes closeout after settlement checks pass', async () => {
    const response = await env.app.fetch('/api/admin/projects/1/closeout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': String(adminUser.id)
      },
      body: JSON.stringify({
        mode: 'completed',
        confirm_closeout: true,
        checklist: {
          pending_purchases_resolved: true,
          pending_expenses_resolved: true,
          profits_resolved: true,
          losses_resolved: true
        }
      })
    })

    expect(response.status).toBe(200)
    const json = await response.json() as any
    expect(json.success).toBe(true)
    expect(json.data.status).toBe('completed')

    const updatedProject = await env.DB.prepare(
      'SELECT status, completed_at FROM projects WHERE id = ?'
    ).bind(project.id).first<{ status: string; completed_at: string | null }>()
    expect(updatedProject?.status).toBe('completed')
    expect(updatedProject?.completed_at).toBeTruthy()

    const refundEntry = await env.DB.prepare(
      `SELECT amount FROM earnings WHERE user_id = ? AND project_id = ? AND month LIKE 'refund-%'`
    ).bind(investorUser.id, project.id).first<{ amount: number }>()
    expect(refundEntry?.amount).toBe(100_000)

    const closeoutRun = await env.DB.prepare(
      `SELECT capital_refund_total_paisa, shareholders_count
       FROM project_closeout_runs
       WHERE project_id = ?`
    ).bind(project.id).first<{ capital_refund_total_paisa: number; shareholders_count: number }>()
    expect(closeoutRun?.capital_refund_total_paisa).toBe(100_000)
    expect(closeoutRun?.shareholders_count).toBe(1)

    const settlementRows = await env.DB.prepare(
      `SELECT entry_type, amount_paisa, claim_status
       FROM project_settlement_entries
       WHERE project_id = ?
       ORDER BY id ASC`
    ).bind(project.id).all<{ entry_type: string; amount_paisa: number; claim_status: string }>()
    expect(settlementRows.results).toHaveLength(1)
    expect(settlementRows.results[0]).toMatchObject({
      entry_type: 'principal_refund',
      amount_paisa: 100_000,
      claim_status: 'claimable'
    })
  })
})
