export type CloseoutMode = 'completed' | 'closed'

export type CloseoutBlockerCode =
  | 'PROJECT_NOT_ACTIVE'
  | 'PENDING_SHARE_PURCHASES'
  | 'PENDING_EXPENSE_ALLOCATIONS'
  | 'UNDISTRIBUTED_PROFIT'
  | 'LOSS_SETTLEMENT_REQUIRED'
  | 'OPS_RECONCILIATION_PENDING'
  | 'LOSS_SETTLEMENT_UNRESOLVED'
  | 'CAPITAL_ALREADY_REFUNDED'

export type CloseoutBlocker = {
  code: CloseoutBlockerCode
  message: string
  amount_paisa?: number
  count?: number
}

export type CloseoutEvaluationInput = {
  projectStatus: string
  pendingSharePurchases: number
  pendingExpenseAllocations: number
  availableProfit: number
  netProfit: number
  capitalAlreadyRefunded: boolean
}

export function evaluateCloseout(input: CloseoutEvaluationInput) {
  const blockers: CloseoutBlocker[] = []

  if (input.projectStatus !== 'active') {
    blockers.push({
      code: 'PROJECT_NOT_ACTIVE',
      message: 'শুধু সক্রিয় প্রজেক্ট closeout করা যাবে'
    })
  }

  if (input.pendingSharePurchases > 0) {
    blockers.push({
      code: 'PENDING_SHARE_PURCHASES',
      message: 'অনুমোদনের অপেক্ষায় থাকা শেয়ার ক্রয় অনুরোধ আছে',
      count: input.pendingSharePurchases
    })
  }

  if (input.pendingExpenseAllocations > 0) {
    blockers.push({
      code: 'PENDING_EXPENSE_ALLOCATIONS',
      message: 'বরাদ্দ বাকি থাকা কোম্পানি খরচ আছে',
      count: input.pendingExpenseAllocations
    })
  }

  if (input.availableProfit > 0) {
    blockers.push({
      code: 'UNDISTRIBUTED_PROFIT',
      message: 'অবিতরিত মুনাফা আছে, আগে profit distribution সম্পন্ন করুন',
      amount_paisa: input.availableProfit
    })
  }

  if (input.netProfit < 0) {
    blockers.push({
      code: 'LOSS_SETTLEMENT_REQUIRED',
      message: 'এই প্রজেক্টে লস আছে। loss settlement workflow ছাড়া closeout করা যাবে না',
      amount_paisa: Math.abs(input.netProfit)
    })
  }

  if (input.capitalAlreadyRefunded) {
    blockers.push({
      code: 'CAPITAL_ALREADY_REFUNDED',
      message: 'এই প্রজেক্টের মূলধন ইতিমধ্যে ফেরত দেওয়া হয়েছে'
    })
  }

  return {
    blockers,
    canCloseout: blockers.length === 0
  }
}
