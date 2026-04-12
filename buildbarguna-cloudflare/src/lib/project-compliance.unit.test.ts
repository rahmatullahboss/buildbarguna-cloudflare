import { describe, expect, it } from 'vitest'
import {
  defaultComplianceProfile,
  evaluateComplianceForCloseout,
  isProjectInvestmentEligible,
  toPublicComplianceDisclosure
} from './project-compliance'

describe('project compliance governance', () => {
  it('blocks investment by default until shariah screening and disclosures are complete', () => {
    const profile = defaultComplianceProfile(7)

    expect(isProjectInvestmentEligible(profile)).toEqual({
      eligible: false,
      reason: 'PROJECT_COMPLIANCE_REVIEW_PENDING'
    })
  })

  it('allows investment after required screening and disclosures are completed', () => {
    const profile = {
      ...defaultComplianceProfile(7),
      shariah_screening_status: 'approved' as const,
      prohibited_activities_screened: 1,
      asset_backing_confirmed: 1,
      profit_ratio_disclosed: 1,
      loss_sharing_clause_confirmed: 1,
      principal_risk_notice_confirmed: 1,
      use_of_proceeds: 'Halal trading inventory only',
      profit_loss_policy: 'Profit agreed ratio অনুযায়ী, loss capital share অনুযায়ী।',
      principal_risk_notice: 'মূলধন ঝুঁকির মধ্যে আছে।'
    }

    expect(isProjectInvestmentEligible(profile)).toEqual({
      eligible: true
    })
  })

  it('blocks closeout when ops reconciliation has not been completed', () => {
    const blockers = evaluateComplianceForCloseout({
      profile: {
        ...defaultComplianceProfile(4),
        shariah_screening_status: 'approved',
        ops_reconciliation_status: 'pending'
      },
      netProfit: 0
    })

    expect(blockers).toContainEqual({
      code: 'OPS_RECONCILIATION_PENDING',
      message: 'Ops reconciliation সম্পন্ন না করে project closeout করা যাবে না'
    })
  })

  it('blocks closeout when a loss exists but loss settlement is not resolved', () => {
    const blockers = evaluateComplianceForCloseout({
      profile: {
        ...defaultComplianceProfile(4),
        loss_settlement_status: 'pending_review'
      },
      netProfit: -10_000
    })

    expect(blockers).toContainEqual({
      code: 'LOSS_SETTLEMENT_UNRESOLVED',
      message: 'লস settlement review resolved না করে project closeout করা যাবে না'
    })
  })

  it('returns only investor-facing disclosure fields for project detail pages', () => {
    const disclosure = toPublicComplianceDisclosure({
      ...defaultComplianceProfile(9),
      shariah_screening_status: 'approved',
      ops_reconciliation_status: 'completed',
      use_of_proceeds: 'Working capital',
      profit_loss_policy: 'Profit-loss sharing applies.',
      principal_risk_notice: 'Capital is at risk.',
      shariah_notes: 'Internal note',
      ops_notes: 'Internal ops note',
      external_reviewer_name: 'Shariah Advisor'
    })

    expect(disclosure).toMatchObject({
      project_id: 9,
      shariah_screening_status: 'approved',
      ops_reconciliation_status: 'completed',
      use_of_proceeds: 'Working capital',
      profit_loss_policy: 'Profit-loss sharing applies.',
      principal_risk_notice: 'Capital is at risk.',
      external_reviewer_name: 'Shariah Advisor'
    })
    expect((disclosure as Record<string, unknown>).shariah_notes).toBeUndefined()
    expect((disclosure as Record<string, unknown>).ops_notes).toBeUndefined()
  })
})
