export interface FinancialSnapshot {
  totalRevenue: number
  directExpense: number
  companyExpenseAllocation: number
  previouslyDistributed: number
}

export interface ProfitDistributionSummary {
  totalRevenue: number
  directExpense: number
  companyExpenseAllocation: number
  totalExpense: number
  netProfit: number
  previouslyDistributed: number
  availableProfit: number
  companyShareAmount: number
  investorPool: number
  effectivePct: number
}

export function normalizeCompanySharePct(rawPct: number | null | undefined): number {
  if (rawPct == null || Number.isNaN(rawPct)) return 30
  return Math.max(0, Math.min(100, Math.floor(rawPct)))
}

export function resolveEffectiveCompanySharePct(inputPct: number | null | undefined, projectDefaultPctBps?: number | null): number {
  if (inputPct != null && !Number.isNaN(inputPct)) return normalizeCompanySharePct(inputPct)
  if (projectDefaultPctBps == null || Number.isNaN(projectDefaultPctBps)) return 30
  return normalizeCompanySharePct(projectDefaultPctBps / 100)
}

export function buildProfitDistributionSummary(
  snapshot: FinancialSnapshot,
  effectivePct: number
): ProfitDistributionSummary {
  const totalExpense = snapshot.directExpense + snapshot.companyExpenseAllocation
  const netProfit = snapshot.totalRevenue - totalExpense
  const rawAvailableProfit = netProfit - snapshot.previouslyDistributed
  const availableProfit = Math.max(0, rawAvailableProfit)
  const normalizedPct = normalizeCompanySharePct(effectivePct)
  const companyShareAmount = Math.floor((availableProfit * normalizedPct) / 100)
  const investorPool = availableProfit - companyShareAmount

  return {
    totalRevenue: snapshot.totalRevenue,
    directExpense: snapshot.directExpense,
    companyExpenseAllocation: snapshot.companyExpenseAllocation,
    totalExpense,
    netProfit,
    previouslyDistributed: snapshot.previouslyDistributed,
    availableProfit,
    companyShareAmount,
    investorPool,
    effectivePct: normalizedPct
  }
}

