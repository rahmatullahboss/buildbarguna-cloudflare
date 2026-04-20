import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { env } from 'cloudflare:test'
import { createToken } from '../lib/jwt'

describe('Withdrawals Balance + Breakdown Integration', () => {
  const adminUser = {
    id: 1,
    name: 'Admin User',
    phone: '01700000000',
    email: 'admin@example.com',
    role: 'admin' as const,
  }

  const memberUser = {
    id: 2,
    name: 'Member User',
    phone: '01700000001',
    email: 'member@example.com',
    role: 'member' as const,
  }

  async function authHeader(user: typeof adminUser | typeof memberUser) {
    const token = await createToken(
      {
        sub: String(user.id),
        phone: user.phone,
        email: user.email,
        role: user.role,
        jti: `${user.role}-${user.id}-${crypto.randomUUID()}`
      },
      env.JWT_SECRET
    )

    return { Authorization: `Bearer ${token}` }
  }

  async function cleanup() {
    const tables = [
      'project_settlement_entries',
      'project_closeout_runs',
      'project_members',
      'withdrawals',
      'balance_audit_log',
      'user_balances',
      'shareholder_profits',
      'profit_distributions',
      'earnings',
      'project_transactions',
      'expense_allocations',
      'share_purchases',
      'user_shares',
      'member_registrations',
      'referral_bonuses',
      'projects',
      'users'
    ]

    for (const table of tables) {
      await env.DB.prepare(`DELETE FROM ${table}`).run()
    }
  }

  beforeEach(async () => {
    await cleanup()

    await env.DB.prepare(
      `INSERT INTO users (id, name, phone, email, password_hash, role, is_active)
       VALUES (?, ?, ?, ?, ?, ?, 1)`
    ).bind(adminUser.id, adminUser.name, adminUser.phone, adminUser.email, 'hash123', adminUser.role).run()

    await env.DB.prepare(
      `INSERT INTO users (id, name, phone, email, password_hash, role, is_active)
       VALUES (?, ?, ?, ?, ?, ?, 1)`
    ).bind(memberUser.id, memberUser.name, memberUser.phone, memberUser.email, 'hash123', memberUser.role).run()

    await env.DB.prepare(
      `INSERT INTO member_registrations (
         form_number, name_english, father_name, mother_name, date_of_birth,
         present_address, permanent_address, mobile_whatsapp, declaration_accepted,
         payment_method, payment_amount, payment_status, status, user_id
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 'cash', 10000, 'verified', 'active', ?)`
    ).bind(
      'FORM-TEST-001',
      memberUser.name,
      'Father',
      'Mother',
      '1990-01-01',
      'Dhaka',
      'Dhaka',
      memberUser.phone,
      memberUser.id
    ).run()
  })

  afterEach(async () => {
    await cleanup()
  })

  it('runs the full project -> share -> finance -> distribution -> withdrawal balance flow without a discrepancy', async () => {
    const adminAuth = await authHeader(adminUser)
    const memberAuth = await authHeader(memberUser)

    const projectResponse = await env.app.fetch('/api/admin/projects', {
      method: 'POST',
      headers: {
        ...adminAuth,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: 'Trial Project',
        total_capital: 10_000_000,
        total_shares: 100,
        share_price: 100_000,
        status: 'active'
      })
    })

    expect(projectResponse.status).toBe(201)
    const projectJson = await projectResponse.json() as any
    const projectId = projectJson.data.id as number

    await env.DB.prepare(
      `INSERT INTO user_balances (user_id, total_earned_paisa, total_withdrawn_paisa, reserved_paisa)
       VALUES (?, 0, 0, 0)`
    ).bind(memberUser.id).run()

    const buyResponse = await env.app.fetch('/api/shares/buy', {
      method: 'POST',
      headers: {
        ...memberAuth,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        project_id: projectId,
        quantity: 10,
        payment_method: 'manual'
      })
    })

    expect(buyResponse.status).toBe(201)
    const buyJson = await buyResponse.json() as any
    const purchaseId = buyJson.data.purchase_id as number

    const approveResponse = await env.app.fetch(`/api/admin/shares/${purchaseId}/approve`, {
      method: 'PATCH',
      headers: adminAuth
    })

    expect(approveResponse.status).toBe(200)

    const revenueResponse = await env.app.fetch('/api/finance/transactions', {
      method: 'POST',
      headers: {
        ...adminAuth,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        project_id: projectId,
        transaction_type: 'revenue',
        amount: 1_000_000,
        category: 'Sales'
      })
    })
    expect(revenueResponse.status).toBe(201)

    const expenseResponse = await env.app.fetch('/api/finance/transactions', {
      method: 'POST',
      headers: {
        ...adminAuth,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        project_id: projectId,
        transaction_type: 'expense',
        amount: 200_000,
        category: 'Operational'
      })
    })
    expect(expenseResponse.status).toBe(201)

    const distributeResponse = await env.app.fetch(`/api/profit/distribute/${projectId}`, {
      method: 'POST',
      headers: {
        ...adminAuth,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        company_share_percentage: 30,
        period_start: '2026-04-01',
        period_end: '2026-04-30'
      })
    })

    expect(distributeResponse.status).toBe(201)

    const earningsRow = await env.DB.prepare(
      `SELECT amount FROM earnings WHERE user_id = ? AND project_id = ?`
    ).bind(memberUser.id, projectId).first<{ amount: number }>()

    expect(earningsRow?.amount).toBe(560_000)

    const balanceResponse = await env.app.fetch('/api/withdrawals/balance', {
      headers: memberAuth
    })
    expect(balanceResponse.status).toBe(200)

    const balanceJson = await balanceResponse.json() as any
    expect(balanceJson.data.total_earned_paisa).toBe(560_000)
    expect(balanceJson.data.available_paisa).toBe(560_000)

    const breakdownResponse = await env.app.fetch('/api/withdrawals/balance/breakdown', {
      headers: memberAuth
    })
    expect(breakdownResponse.status).toBe(200)

    const breakdownJson = await breakdownResponse.json() as any
    expect(breakdownJson.data.total_earned_paisa).toBe(560_000)
    expect(breakdownJson.data.breakdown).toHaveLength(1)
    expect(breakdownJson.data.breakdown[0]).toMatchObject({
      source: 'project_earnings',
      project_title: 'Trial Project',
      amount_paisa: 560_000
    })
  })

  it('returns a labeled other bucket when explicit balance contains unexplained extra money', async () => {
    await env.DB.prepare(
      `INSERT INTO projects (id, title, total_capital, total_shares, share_price, status)
       VALUES (1, 'Mismatch Project', 1000000, 10, 100000, 'active')`
    ).run()

    await env.DB.prepare(
      `INSERT INTO earnings (user_id, project_id, month, shares, rate, amount)
       VALUES (?, 1, '2026-04', 1, 0, 560000)`
    ).bind(memberUser.id).run()

    await env.DB.prepare(
      `INSERT INTO user_balances (user_id, total_earned_paisa, total_withdrawn_paisa, reserved_paisa)
       VALUES (?, 570000, 0, 0)`
    ).bind(memberUser.id).run()

    const memberAuth = await authHeader(memberUser)
    const response = await env.app.fetch('/api/withdrawals/balance/breakdown', {
      headers: memberAuth
    })

    expect(response.status).toBe(200)
    const json = await response.json() as any
    expect(json.data.total_earned_paisa).toBe(570_000)
    expect(json.data.breakdown).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: 'other',
          label: 'অন্যান্য',
          amount_paisa: 10_000,
          detail: 'সিস্টেম সমন্বয়'
        })
      ])
    )
  })

  it('does not double count capital refunds in the breakdown', async () => {
    await env.DB.prepare(
      `INSERT INTO projects (id, title, total_capital, total_shares, share_price, status)
       VALUES (1, 'Refund Project', 1000000, 10, 100000, 'closed')`
    ).run()

    await env.DB.prepare(
      `INSERT INTO earnings (user_id, project_id, month, shares, rate, amount)
       VALUES (?, 1, 'refund-2026-04', 1, 0, 10_000)`
    ).bind(memberUser.id).run()

    await env.DB.prepare(
      `INSERT INTO balance_audit_log (user_id, amount_paisa, change_type, reference_type, reference_id, note)
       VALUES (?, 10_000, 'earn', 'capital_refund', 1, 'Capital refund mirror log')`
    ).bind(memberUser.id).run()

    await env.DB.prepare(
      `INSERT INTO user_balances (user_id, total_earned_paisa, total_withdrawn_paisa, reserved_paisa)
       VALUES (?, 10_000, 0, 0)`
    ).bind(memberUser.id).run()

    const memberAuth = await authHeader(memberUser)
    const response = await env.app.fetch('/api/withdrawals/balance/breakdown', {
      headers: memberAuth
    })

    expect(response.status).toBe(200)
    const json = await response.json() as any
    expect(json.data.total_earned_paisa).toBe(10_000)
    expect(
      json.data.breakdown.filter((item: any) => item.source === 'capital_refund')
    ).toHaveLength(0)
    expect(
      json.data.breakdown.reduce((sum: number, item: any) => sum + item.amount_paisa, 0)
    ).toBe(10_000)
  })

  it('uses settlement ledger for closeout breakdown and reserves entries on withdrawal request', async () => {
    await env.DB.prepare(
      `INSERT INTO projects (id, title, total_capital, total_shares, share_price, status)
       VALUES (1, 'Settlement Project', 1000000, 10, 100000, 'completed')`
    ).run()

    await env.DB.prepare(
      `INSERT INTO user_balances (user_id, total_earned_paisa, total_withdrawn_paisa, reserved_paisa)
       VALUES (?, 150000, 0, 0)`
    ).bind(memberUser.id).run()

    await env.DB.prepare(
      `INSERT INTO project_closeout_runs (
         id, project_id, mode, status, net_profit_paisa, capital_refund_total_paisa,
         final_profit_pool_paisa, shareholders_count, executed_by
       ) VALUES (1, 1, 'completed', 'completed', 50000, 100000, 50000, 1, ?)`
    ).bind(adminUser.id).run()

    await env.DB.prepare(
      `INSERT INTO project_settlement_entries (
         project_id, user_id, closeout_run_id, entry_type, amount_paisa,
         shares_held_snapshot, total_shares_snapshot, ownership_bps_snapshot, claim_status, created_by
       ) VALUES
         (1, ?, 1, 'principal_refund', 100000, 1, 1, 10000, 'claimable', ?),
         (1, ?, 1, 'final_profit_payout', 50000, 1, 1, 10000, 'claimable', ?)`
    ).bind(memberUser.id, adminUser.id, memberUser.id, adminUser.id).run()

    const memberAuth = await authHeader(memberUser)

    const breakdownResponse = await env.app.fetch('/api/withdrawals/balance/breakdown', {
      headers: memberAuth
    })
    expect(breakdownResponse.status).toBe(200)
    const breakdownJson = await breakdownResponse.json() as any
    expect(breakdownJson.data.breakdown).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: 'closeout_principal_refund', amount_paisa: 100_000 }),
        expect.objectContaining({ source: 'closeout_final_profit', amount_paisa: 50_000 })
      ])
    )

    const requestResponse = await env.app.fetch('/api/withdrawals/request', {
      method: 'POST',
      headers: {
        ...memberAuth,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount_paisa: 100_000,
        bkash_number: memberUser.phone,
        withdrawal_method: 'bkash'
      })
    })
    expect(requestResponse.status).toBe(201)
    const requestJson = await requestResponse.json() as any
    expect(requestJson.data.reserved_settlement_amount).toBe(100_000)

    const reservedEntries = await env.DB.prepare(
      `SELECT claim_status, withdrawal_id
       FROM project_settlement_entries
       WHERE user_id = ? AND entry_type = 'principal_refund'`
    ).bind(memberUser.id).first<{ claim_status: string; withdrawal_id: number }>()
    expect(reservedEntries?.claim_status).toBe('reserved')
    expect(reservedEntries?.withdrawal_id).toBe(requestJson.data.withdrawal_id)
  })

  it('counts closeout final profit as withdrawable when it exists only in settlement ledger', async () => {
    await env.DB.prepare(
      `INSERT INTO projects (id, title, total_capital, total_shares, share_price, status)
       VALUES (1, 'Settlement Profit Project', 1000000, 10, 100000, 'completed')`
    ).run()

    await env.DB.prepare(
      `INSERT INTO user_balances (user_id, total_earned_paisa, total_withdrawn_paisa, reserved_paisa)
       VALUES (?, 100000, 0, 0)`
    ).bind(memberUser.id).run()

    await env.DB.prepare(
      `INSERT INTO project_closeout_runs (
         id, project_id, mode, status, net_profit_paisa, capital_refund_total_paisa,
         final_profit_pool_paisa, shareholders_count, executed_by
       ) VALUES (1, 1, 'completed', 'completed', 40000, 100000, 40000, 1, ?)`
    ).bind(adminUser.id).run()

    await env.DB.prepare(
      `INSERT INTO project_settlement_entries (
         project_id, user_id, closeout_run_id, entry_type, amount_paisa,
         shares_held_snapshot, total_shares_snapshot, ownership_bps_snapshot, claim_status, created_by
       ) VALUES
         (1, ?, 1, 'principal_refund', 100000, 1, 1, 10000, 'claimable', ?),
         (1, ?, 1, 'final_profit_payout', 40000, 1, 1, 10000, 'claimable', ?)`
    ).bind(memberUser.id, adminUser.id, memberUser.id, adminUser.id).run()

    const memberAuth = await authHeader(memberUser)
    const response = await env.app.fetch('/api/withdrawals/balance', {
      headers: memberAuth
    })

    expect(response.status).toBe(200)
    const json = await response.json() as any
    expect(json.data.total_earned_paisa).toBe(140_000)
    expect(json.data.available_paisa).toBe(140_000)
  })
})
