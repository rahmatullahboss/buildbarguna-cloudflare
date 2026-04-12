export type ComplianceContractType = 'musharakah' | 'mudarabah' | 'other'
export type ShariahScreeningStatus = 'pending' | 'approved' | 'rejected' | 'needs_revision'
export type OpsReconciliationStatus = 'pending' | 'completed' | 'blocked'
export type LossSettlementStatus = 'not_applicable' | 'pending_review' | 'resolved' | 'blocked'

export type ProjectComplianceProfile = {
  project_id: number
  contract_type: ComplianceContractType
  shariah_screening_status: ShariahScreeningStatus
  ops_reconciliation_status: OpsReconciliationStatus
  loss_settlement_status: LossSettlementStatus
  prohibited_activities_screened: number
  asset_backing_confirmed: number
  profit_ratio_disclosed: number
  loss_sharing_clause_confirmed: number
  principal_risk_notice_confirmed: number
  use_of_proceeds: string | null
  profit_loss_policy: string | null
  principal_risk_notice: string | null
  shariah_notes: string | null
  ops_notes: string | null
  loss_settlement_notes: string | null
  external_reviewer_name: string | null
  approved_by: number | null
  approved_at: string | null
  updated_by: number | null
  updated_at: string | null
}

export type ComplianceCloseoutBlockerCode =
  | 'OPS_RECONCILIATION_PENDING'
  | 'LOSS_SETTLEMENT_UNRESOLVED'

export type ComplianceCloseoutBlocker = {
  code: ComplianceCloseoutBlockerCode
  message: string
}

export function defaultComplianceProfile(projectId: number): ProjectComplianceProfile {
  return {
    project_id: projectId,
    contract_type: 'musharakah',
    shariah_screening_status: 'pending',
    ops_reconciliation_status: 'pending',
    loss_settlement_status: 'not_applicable',
    prohibited_activities_screened: 0,
    asset_backing_confirmed: 0,
    profit_ratio_disclosed: 0,
    loss_sharing_clause_confirmed: 0,
    principal_risk_notice_confirmed: 0,
    use_of_proceeds: '',
    profit_loss_policy: '',
    principal_risk_notice: '',
    shariah_notes: '',
    ops_notes: '',
    loss_settlement_notes: '',
    external_reviewer_name: '',
    approved_by: null,
    approved_at: null,
    updated_by: null,
    updated_at: null
  }
}

function hasDisclosureText(value: string | null | undefined) {
  return Boolean(value && value.trim())
}

export function isProjectInvestmentEligible(profile: ProjectComplianceProfile): { eligible: true } | { eligible: false; reason: string } {
  if (profile.shariah_screening_status !== 'approved') {
    return { eligible: false, reason: 'PROJECT_COMPLIANCE_REVIEW_PENDING' }
  }

  if (!profile.prohibited_activities_screened || !profile.asset_backing_confirmed) {
    return { eligible: false, reason: 'PROJECT_SHARIAH_CHECKLIST_INCOMPLETE' }
  }

  if (!profile.profit_ratio_disclosed || !profile.loss_sharing_clause_confirmed || !profile.principal_risk_notice_confirmed) {
    return { eligible: false, reason: 'PROJECT_DISCLOSURE_CHECKLIST_INCOMPLETE' }
  }

  if (!hasDisclosureText(profile.use_of_proceeds) || !hasDisclosureText(profile.profit_loss_policy) || !hasDisclosureText(profile.principal_risk_notice)) {
    return { eligible: false, reason: 'PROJECT_DISCLOSURES_MISSING' }
  }

  return { eligible: true }
}

export function evaluateComplianceForCloseout(input: { profile: ProjectComplianceProfile; netProfit: number }): ComplianceCloseoutBlocker[] {
  const blockers: ComplianceCloseoutBlocker[] = []

  if (input.profile.ops_reconciliation_status !== 'completed') {
    blockers.push({
      code: 'OPS_RECONCILIATION_PENDING',
      message: 'Ops reconciliation সম্পন্ন না করে project closeout করা যাবে না'
    })
  }

  if (input.netProfit < 0 && input.profile.loss_settlement_status !== 'resolved') {
    blockers.push({
      code: 'LOSS_SETTLEMENT_UNRESOLVED',
      message: 'লস settlement review resolved না করে project closeout করা যাবে না'
    })
  }

  return blockers
}

export function toPublicComplianceDisclosure(profile: ProjectComplianceProfile) {
  return {
    project_id: profile.project_id,
    contract_type: profile.contract_type,
    shariah_screening_status: profile.shariah_screening_status,
    ops_reconciliation_status: profile.ops_reconciliation_status,
    loss_settlement_status: profile.loss_settlement_status,
    prohibited_activities_screened: Boolean(profile.prohibited_activities_screened),
    asset_backing_confirmed: Boolean(profile.asset_backing_confirmed),
    profit_ratio_disclosed: Boolean(profile.profit_ratio_disclosed),
    loss_sharing_clause_confirmed: Boolean(profile.loss_sharing_clause_confirmed),
    principal_risk_notice_confirmed: Boolean(profile.principal_risk_notice_confirmed),
    use_of_proceeds: profile.use_of_proceeds || '',
    profit_loss_policy: profile.profit_loss_policy || '',
    principal_risk_notice: profile.principal_risk_notice || '',
    external_reviewer_name: profile.external_reviewer_name || '',
    approved_at: profile.approved_at
  }
}
