// All money stored as INTEGER paisa (1 taka = 100 paisa)
// Rate stored as INTEGER basis points (1% = 100 bps)
// RULE: Never use floating-point arithmetic for monetary values.
//       Always use integer arithmetic + Math.floor for rounding.

// ─── Unit Conversions ─────────────────────────────────────────────────────────

export const toPaisa = (taka: number): number => Math.round(taka * 100)
export const toTaka = (paisa: number): number => paisa / 100
export const formatTaka = (paisa: number): string => `৳${(paisa / 100).toFixed(2)}`
export const toBps = (percent: number): number => Math.round(percent * 100)
export const toPercent = (bps: number): number => bps / 100

// ─── Core Earning Calculation ─────────────────────────────────────────────────

/**
 * Calculate member earning for a project in a given month.
 *
 * Formula: floor((userShares / totalShares) × capitalPaisa × rateBps / 10000)
 *
 * Why Math.floor? Users receive floor value; remainder stays in platform.
 * This is the industry standard — never round UP earned amounts.
 *
 * Example: 10 shares / 100 total × 10,000,000 paisa capital × 500 bps / 10000
 *          = 0.1 × 10,000,000 × 0.05 = 50,000 paisa = ৳500
 *
 * @param userShares   - number of shares the member holds
 * @param totalShares  - total shares issued for this project
 * @param capitalPaisa - total project capital in paisa
 * @param rateBps      - monthly profit rate in basis points (e.g. 500 = 5%)
 * @returns earned amount in paisa (always >= 0)
 */
export function calcEarning(
  userShares: number,
  totalShares: number,
  capitalPaisa: number,
  rateBps: number
): number {
  if (totalShares <= 0 || userShares <= 0 || rateBps <= 0) return 0
  // Integer-safe: multiply in correct order to minimise float error
  return Math.floor((userShares * capitalPaisa * rateBps) / (totalShares * 10000))
}

/**
 * Simpler per-share earning when share_price is known directly.
 *
 * Formula: floor(shares × sharePricePaisa × rateBps / 10000)
 *
 * Use this variant when you have share_price from the projects table
 * rather than computing the user's proportion of total_capital.
 *
 * @param shares         - number of shares held
 * @param sharePricePaisa - price per share in paisa
 * @param rateBps         - monthly profit rate in basis points
 * @returns earned amount in paisa
 */
export function calcEarningBySharePrice(
  shares: number,
  sharePricePaisa: number,
  rateBps: number
): number {
  if (shares <= 0 || sharePricePaisa <= 0 || rateBps <= 0) return 0
  return Math.floor((shares * sharePricePaisa * rateBps) / 10000)
}

// ─── Investment Value ─────────────────────────────────────────────────────────

/**
 * Calculate total investment value for a user's position in a project.
 * @param shares          - quantity of shares held
 * @param sharePricePaisa - price per share in paisa
 * @returns investment value in paisa
 */
export function calcInvestmentValue(shares: number, sharePricePaisa: number): number {
  if (shares <= 0 || sharePricePaisa <= 0) return 0
  return shares * sharePricePaisa
}

// ─── Return Metrics ───────────────────────────────────────────────────────────

/**
 * Calculate ROI percentage.
 * ROI = (totalEarned / totalInvested) × 100
 *
 * Returns 0 if nothing invested (avoids division by zero).
 * Result rounded to 2 decimal places.
 *
 * @param totalEarnedPaisa   - cumulative earnings in paisa
 * @param totalInvestedPaisa - total amount invested in paisa
 * @returns ROI as percentage (e.g. 12.50 means 12.50%)
 */
export function calcROI(totalEarnedPaisa: number, totalInvestedPaisa: number): number {
  if (totalInvestedPaisa <= 0) return 0
  return Math.round((totalEarnedPaisa / totalInvestedPaisa) * 100 * 100) / 100
}

/**
 * Calculate annualized ROI by extrapolating from months active.
 *
 * Formula: (roi / monthsActive) × 12
 * Gives a projected annual return if the same rate continued.
 *
 * Returns 0 if monthsActive is 0 (no history yet).
 *
 * @param roiPercent   - actual ROI so far (from calcROI)
 * @param monthsActive - number of months earnings have been recorded
 * @returns annualized ROI as percentage
 */
export function calcAnnualizedROI(roiPercent: number, monthsActive: number): number {
  if (monthsActive <= 0) return 0
  return Math.round((roiPercent / monthsActive) * 12 * 100) / 100
}

/**
 * Calculate portfolio concentration risk.
 * = (largest single position value / total portfolio value) × 100
 *
 * Industry rule of thumb:
 *  > 50% → high concentration risk
 *  20–50% → moderate
 *  < 20%  → well diversified
 *
 * @param largestPositionPaisa - investment value of the biggest single project
 * @param totalPortfolioPaisa  - total investment across all projects
 * @returns concentration as percentage (0–100)
 */
export function calcConcentrationRisk(
  largestPositionPaisa: number,
  totalPortfolioPaisa: number
): number {
  if (totalPortfolioPaisa <= 0) return 0
  return Math.round((largestPositionPaisa / totalPortfolioPaisa) * 100 * 100) / 100
}

/**
 * Calculate portfolio weight of a single position.
 * weight = (positionValue / totalPortfolioValue) × 100
 *
 * @param positionPaisa       - investment value of this project position
 * @param totalPortfolioPaisa - total portfolio investment value
 * @returns weight as percentage (0–100)
 */
export function calcWeight(positionPaisa: number, totalPortfolioPaisa: number): number {
  if (totalPortfolioPaisa <= 0) return 0
  return Math.round((positionPaisa / totalPortfolioPaisa) * 100 * 100) / 100
}

// ─── Safety ───────────────────────────────────────────────────────────────────

/**
 * Validate that a multiplication won't overflow JavaScript's safe integer range.
 * SQLite INTEGER max = 9007199254740991 (Number.MAX_SAFE_INTEGER).
 * Use before storing large multiplication results in D1.
 *
 * @returns product if safe, null if overflow risk
 */
export function safeMultiply(a: number, b: number): number | null {
  const result = a * b
  if (!Number.isSafeInteger(result)) return null
  return result
}
