export type Bindings = {
  DB: D1Database
  SESSIONS: KVNamespace
  FILES: R2Bucket         // Native R2 binding — no S3 credentials needed
  JWT_SECRET: string
  R2_PUBLIC_URL: string   // Public R2 bucket URL e.g. https://pub-xxxx.r2.dev or custom domain
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
  bkash_txid: string
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
