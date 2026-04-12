import { describe, expect, it } from 'vitest'
import { evaluateCloseout } from './project-closeout'

describe('project closeout business rules', () => {
  it('blocks closeout when undistributed profit exists', () => {
    const result = evaluateCloseout({
      projectStatus: 'active',
      pendingSharePurchases: 0,
      pendingExpenseAllocations: 0,
      availableProfit: 70_000,
      netProfit: 70_000,
      capitalAlreadyRefunded: false
    })

    expect(result.canCloseout).toBe(false)
    expect(result.blockers.some((item) => item.code === 'UNDISTRIBUTED_PROFIT')).toBe(true)
  })

  it('blocks closeout when loss settlement is required', () => {
    const result = evaluateCloseout({
      projectStatus: 'active',
      pendingSharePurchases: 0,
      pendingExpenseAllocations: 0,
      availableProfit: 0,
      netProfit: -25_000,
      capitalAlreadyRefunded: false
    })

    expect(result.canCloseout).toBe(false)
    expect(result.blockers.some((item) => item.code === 'LOSS_SETTLEMENT_REQUIRED')).toBe(true)
  })

  it('allows closeout only when no blockers remain', () => {
    const result = evaluateCloseout({
      projectStatus: 'active',
      pendingSharePurchases: 0,
      pendingExpenseAllocations: 0,
      availableProfit: 0,
      netProfit: 0,
      capitalAlreadyRefunded: false
    })

    expect(result.canCloseout).toBe(true)
    expect(result.blockers).toHaveLength(0)
  })
})
