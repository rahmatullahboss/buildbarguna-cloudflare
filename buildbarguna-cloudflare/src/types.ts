export type Bindings = {
  DB: D1Database
  SESSIONS: KVNamespace
  FILES?: R2Bucket        // Optional — not used in current setup
  JWT_SECRET: string
  R2_PUBLIC_URL: string   // Public R2 bucket URL e.g. https://pub-xxxx.r2.dev
  R2_ACCOUNT_ID: string   // Cloudflare Account ID for R2 S3 API
  R2_ACCESS_KEY_ID: string
  R2_SECRET_ACCESS_KEY: string
  R2_BUCKET_NAME: string
}

export type Variables = {
  userId: number
  userRole: 'member' | 'admin'
  userPhone: string
}

// DB Row types
export type User = {
  id: number
  name: string
  phone: string
  password_hash: string
  role: 'member' | 'admin'
  referral_code: string
  referred_by: string | null
  is_active: number
  created_at: string
}

export type Project = {
  id: number
  title: string
  description: string | null
  image_url: string | null
  total_capital: number  // paisa
  total_shares: number
  share_price: number    // paisa
  status: 'draft' | 'active' | 'closed'
  created_at: string
}

export type SharePurchase = {
  id: number
  user_id: number
  project_id: number
  quantity: number
  total_amount: number   // paisa
  bkash_txid: string | null
  payment_method: 'bkash' | 'manual'
  status: 'pending' | 'approved' | 'rejected'
  admin_note: string | null
  created_at: string
  updated_at: string
}

export type UserShare = {
  user_id: number
  project_id: number
  quantity: number
}

export type ProfitRate = {
  id: number
  project_id: number
  month: string
  rate: number           // basis points
  created_at: string
}

export type Earning = {
  id: number
  user_id: number
  project_id: number
  month: string
  shares: number
  rate: number           // basis points
  amount: number         // paisa
  created_at: string
}

export type DailyTask = {
  id: number
  title: string
  destination_url: string
  platform: 'facebook' | 'youtube' | 'telegram' | 'other'
  is_active: number
  created_at: string
}

export type TaskCompletion = {
  id: number
  user_id: number
  task_id: number
  clicked_at: string | null
  completed_at: string
  date: string
}

// API response helpers
export type ApiSuccess<T> = { success: true; data: T }
export type ApiError = { success: false; error: string }
export type ApiResponse<T> = ApiSuccess<T> | ApiError

export type PaginatedResponse<T> = {
  items: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

// ─── Portfolio & Financial Types ─────────────────────────────────────────────

/** Per-month earning history for a single project */
export type ProjectMonthlyEarning = {
  month: string           // YYYY-MM
  rate_bps: number        // basis points that month (e.g. 500 = 5%)
  rate_percent: number    // human-readable (e.g. 5.00)
  earned_paisa: number    // amount earned that month
}

/** Full financial breakdown per project in a user's portfolio */
export type ProjectPortfolioItem = {
  project_id: number
  project_title: string
  project_status: 'draft' | 'active' | 'closed'
  share_price: number           // paisa per share
  shares_owned: number          // quantity held
  investment_value_paisa: number // shares_owned × share_price
  weight_percent: number         // % of total portfolio (0–100)
  total_earned_paisa: number     // Σ earnings from this project
  roi_percent: number            // (earned / invested) × 100
  latest_rate_bps: number        // most recent profit rate (0 if none set)
  expected_this_month_paisa: number // shares × share_price × latest_rate / 10000
  months_active: number          // how many months earnings recorded
  monthly_history: ProjectMonthlyEarning[]
}

/** Full portfolio summary for a user */
export type PortfolioSummary = {
  // Investment totals
  total_invested_paisa: number       // Σ(shares × share_price) all projects
  total_earned_paisa: number         // Σ all earnings ever
  this_month_earned_paisa: number    // earnings in current month
  last_month_earned_paisa: number    // earnings in previous month
  expected_this_month_paisa: number  // projected earnings if rates stay same

  // Return metrics
  roi_percent: number                // (total_earned / total_invested) × 100
  annualized_roi_percent: number     // extrapolated annual return

  // Portfolio health
  projects_count: number             // distinct projects invested in
  concentration_risk_percent: number // largest single position as % of portfolio

  // Per-project breakdown
  projects: ProjectPortfolioItem[]
}

// ─── Withdrawal Types ─────────────────────────────────────────────────────────

export type Withdrawal = {
  id: number
  user_id: number
  amount_paisa: number
  bkash_number: string
  status: 'pending' | 'approved' | 'completed' | 'rejected'
  admin_note: string | null
  approved_by: number | null
  bkash_txid: string | null
  requested_at: string
  approved_at: string | null
  completed_at: string | null
  rejected_at: string | null
}

export type WithdrawalWithUser = Withdrawal & {
  user_name: string
  user_phone: string
}

export type WithdrawalSettings = {
  min_paisa: number
  max_paisa: number
  cooldown_days: number
}

export type AvailableBalance = {
  total_earned_paisa: number
  total_withdrawn_paisa: number   // completed only
  pending_paisa: number           // pending + approved (reserved)
  available_paisa: number         // earned - withdrawn - pending
}

/** DB row shape returned from portfolio JOIN query */
export type PortfolioProjectRow = {
  project_id: number
  project_title: string
  project_status: string
  share_price: number
  shares_owned: number
  total_earned_paisa: number
  months_active: number
  latest_rate_bps: number | null
}

// ─── Project Finance & Profit Distribution Types ─────────────────────────────────

/** Project transaction (expense/revenue entry) */
export type ProjectTransaction = {
  id: number
  project_id: number
  transaction_type: 'expense' | 'revenue'
  amount: number           // paisa
  category: string
  description: string | null
  transaction_date: string
  created_by: number
  created_at: string
  updated_at: string
}

/** Transaction category */
export type TransactionCategory = {
  id: number
  name: string
  type: 'expense' | 'revenue'
  is_active: number
}

/** Profit distribution batch */
export type ProfitDistribution = {
  id: number
  project_id: number
  total_revenue: number        // paisa
  total_expense: number        // paisa
  net_profit: number          // paisa
  distributable_amount: number  // paisa (investor pool)
  company_share_percentage: number  // basis points (e.g. 3000 = 30%)
  investor_share_percentage: number // basis points (e.g. 7000 = 70%)
  period_start: string | null
  period_end: string | null
  status: 'pending' | 'approved' | 'distributed' | 'cancelled'
  distributed_at: string | null
  created_by: number
  created_at: string
}

/** Individual shareholder's profit from a distribution */
export type ShareholderProfit = {
  id: number
  distribution_id: number
  project_id: number
  user_id: number
  shares_held: number
  total_shares: number
  ownership_percentage: number  // basis points
  profit_amount: number         // paisa
  status: 'pending' | 'credited' | 'withdrawn'
  credited_at: string | null
  created_at: string
}

/** Financial summary for a project */
export type ProjectFinancialSummary = {
  project_id: number
  project_name: string
  total_revenue: number      // paisa
  total_expense: number      // paisa
  net_profit: number        // paisa
  profit_margin_percent: number
  total_distributed: number  // paisa
  undistributed_profit: number // paisa
  revenue_count: number
  expense_count: number
}

/** Profit preview before distribution */
export type ProfitPreview = {
  summary: {
    total_revenue: number
    total_expense: number
    net_profit: number
    company_expense_allocation: number  // NEW: company expenses allocated to this project
    adjusted_net_profit: number         // net_profit - company_expense_allocation
    previously_distributed: number
    available_profit: number
    company_share_pct: number
    company_share_amount: number
    investor_share_pct: number
    investor_pool: number
    total_shareholders: number
    total_shares_sold: number
  }
  shareholders: {
    user_id: number
    user_name: string
    phone: string
    shares_held: number
    total_shares: number
    ownership_percentage: number
    profit_amount: number
  }[]
}

// ─── Company Expenses Types ─────────────────────────────────────────────────────

/** Company expense category */
export type CompanyExpenseCategory = {
  id: number
  name: string
  description: string | null
  is_active: number
}

/** Company expense record */
export type CompanyExpense = {
  id: number
  amount: number                    // paisa
  category_id: number | null
  category_name: string
  description: string | null
  expense_date: string
  allocation_method: 'by_project_value' | 'by_revenue' | 'equal' | 'company_only'
  is_allocated: number              // 0 = not yet distributed to projects, 1 = allocated
  notes: string | null
  created_by: number
  created_at: string
}

/** Expense allocation to a specific project */
export type ExpenseAllocation = {
  id: number
  expense_id: number
  project_id: number
  amount: number                    // paisa (pro-rated)
  project_value_pct: number        // basis points
  created_at: string
}

/** Company expense with allocations (for detail view) */
export type CompanyExpenseWithAllocations = CompanyExpense & {
  allocations: (ExpenseAllocation & {
    project_title: string
    project_value: number
  })[]
}

/** Company expense summary for dashboard */
export type CompanyExpenseSummary = {
  total_expenses: number           // paisa (this month)
  total_allocated: number          // paisa
  pending_allocation: number      // paisa
  expenses_count: number
  by_category: {
    category_name: string
    total_amount: number
    count: number
  }[]
}

/** Project expense summary (includes direct + allocated company expenses) */
export type ProjectExpenseSummary = {
  project_id: number
  project_name: string
  direct_expenses: number         // paisa (from project_transactions)
  company_expense_allocation: number  // paisa (from expense_allocations)
  total_expenses: number          // direct + allocated
  project_value: number           // total_capital
  allocation_percentage: number   // basis points
}
