const BASE = '/api'

/**
 * Token stored in memory only — NOT localStorage.
 * localStorage is vulnerable to XSS: any injected script can read it.
 * Memory storage is cleared on page refresh (user must log in again),
 * which is the correct security tradeoff for a financial platform.
 *
 * Token is managed via apiToken.ts to avoid circular imports with ImageUpload.
 */
import { getToken as _getToken, setMemoryToken } from './apiToken'

export function getToken(): string | null { return _getToken() }

export function setToken(token: string) {
  setMemoryToken(token)
  sessionStorage.setItem('bb_logged_in', '1')
}

export function clearToken() {
  setMemoryToken(null)
  sessionStorage.removeItem('bb_logged_in')
  sessionStorage.removeItem('bb_user')
}

export function isTokenInMemory(): boolean {
  return _getToken() !== null
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>)
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, { ...options, headers })
  const json = await res.json()
  return json
}

// Auth
export const authApi = {
  register: (body: { name: string; phone: string; password: string; referral_code?: string }) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: { phone: string; password: string }) =>
    request<{ token: string; user: UserProfile }>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request<UserProfile & { balance_paisa: number }>('/auth/me')
}

// Projects
export const projectsApi = {
  list: (page = 1, limit = 20) => request<Paginated<ProjectItem>>(`/projects?page=${page}&limit=${limit}`),
  get: (id: number) => request<ProjectDetail>(`/projects/${id}`)
}

// Shares
export const sharesApi = {
  buy: (body: { project_id: number; quantity: number; bkash_txid: string }) =>
    request('/shares/buy', { method: 'POST', body: JSON.stringify(body) }),
  my: (page = 1) => request<Paginated<MyShare>>(`/shares/my?page=${page}`),
  requests: (page = 1) => request<Paginated<ShareRequest>>(`/shares/requests?page=${page}`)
}

// Withdrawal types
export type WithdrawalStatus = 'pending' | 'approved' | 'completed' | 'rejected'

export type Withdrawal = {
  id: number
  user_id: number
  amount_paisa: number
  bkash_number: string
  status: WithdrawalStatus
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
  total_withdrawn_paisa: number
  pending_paisa: number
  available_paisa: number
  settings: WithdrawalSettings
}

// Withdrawal API
export const withdrawalsApi = {
  balance: () => request<AvailableBalance>('/withdrawals/balance'),
  history: (page = 1) => request<Paginated<Withdrawal>>(`/withdrawals/history?page=${page}`),
  request: (amount_paisa: number, bkash_number: string) =>
    request<{ message: string; withdrawal_id: number; amount_paisa: number }>(
      '/withdrawals/request', {
        method: 'POST',
        body: JSON.stringify({ amount_paisa, bkash_number })
      }
    )
}

// Admin Withdrawal API
export const adminWithdrawalsApi = {
  list: (status = 'pending', page = 1) =>
    request<Paginated<WithdrawalWithUser>>(`/admin/withdrawals?status=${status}&page=${page}`),
  approve: (id: number) =>
    request<{ message: string }>(`/admin/withdrawals/${id}/approve`, { method: 'PATCH' }),
  complete: (id: number, bkash_txid: string) =>
    request<{ message: string }>(`/admin/withdrawals/${id}/complete`, {
      method: 'PATCH',
      body: JSON.stringify({ bkash_txid })
    }),
  reject: (id: number, admin_note: string) =>
    request<{ message: string }>(`/admin/withdrawals/${id}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ admin_note })
    }),
  settings: () => request<WithdrawalSettings>('/admin/withdrawals/settings'),
  updateSettings: (data: Partial<WithdrawalSettings>) =>
    request<{ message: string }>('/admin/withdrawals/settings', {
      method: 'PATCH',
      body: JSON.stringify(data)
    })
}

// Earnings
export const earningsApi = {
  summary: () => request<{ total_paisa: number; this_month_paisa: number }>('/earnings/summary'),
  list: (page = 1) => request<Paginated<EarningItem>>(`/earnings?page=${page}`),
  portfolio: () => request<PortfolioSummary>('/earnings/portfolio')
}

// Referrals
export type ReferralStats = {
  referral_code: string
  share_link: string
  total_referred: number
  total_bonus_paisa: number
  bonuses_earned: number
  referrals: { name: string; joined_at: string; has_invested: boolean; bonus_credited: boolean }[]
}

export const referralsApi = {
  myCode: () => request<{ referral_code: string; share_link: string }>('/referrals/my-code'),
  stats: () => request<ReferralStats>('/referrals/stats'),
  checkCode: (code: string) => request<{ valid: boolean; referrer_name: string }>(`/referrals/check?code=${encodeURIComponent(code)}`),
}

export const adminReferralsApi = {
  settings: () => request<{ referral_bonus_paisa: number }>('/admin/referrals/settings'),
  updateSettings: (referral_bonus_paisa: number) =>
    request<{ message: string }>('/admin/referrals/settings', {
      method: 'PATCH',
      body: JSON.stringify({ referral_bonus_paisa })
    }),
  stats: () => request<{ total_bonuses_issued: number; total_bonus_paid_paisa: number; top_referrers: unknown[] }>('/admin/referrals/stats')
}

// Tasks
export const tasksApi = {
  list: () => request<TaskItem[]>('/tasks'),
  complete: (id: number) => request(`/tasks/${id}/complete`, { method: 'POST' })
}

// Admin
export const adminApi = {
  users: (page = 1) => request<Paginated<AdminUser>>(`/admin/users?page=${page}`),
  userDetail: (id: number) => request<AdminUserDetail>(`/admin/users/${id}`),
  toggleUser: (id: number) => request(`/admin/users/${id}/toggle`, { method: 'PATCH' }),

  projects: (page = 1) => request<Paginated<AdminProject>>(`/admin/projects?page=${page}`),
  createProject: (body: CreateProjectBody) =>
    request('/admin/projects', { method: 'POST', body: JSON.stringify(body) }),
  updateProject: (id: number, body: Partial<CreateProjectBody>) =>
    request(`/admin/projects/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  setProjectStatus: (id: number, status: string) =>
    request(`/admin/projects/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  pendingShares: (page = 1, status = 'pending') =>
    request<Paginated<AdminShareRequest>>(`/admin/shares/pending?page=${page}&status=${status}`),
  approveShare: (id: number) => request(`/admin/shares/${id}/approve`, { method: 'PATCH' }),
  rejectShare: (id: number, note?: string) =>
    request(`/admin/shares/${id}/reject`, { method: 'PATCH', body: JSON.stringify({ admin_note: note }) }),

  profitRates: () => request<ProfitRate[]>('/admin/profit-rates'),
  setProfitRate: (body: { project_id: number; month: string; rate_percent: number }) =>
    request('/admin/profit-rates', { method: 'POST', body: JSON.stringify(body) }),
  distributeEarnings: (month: string) =>
    request('/admin/distribute-earnings', { method: 'POST', body: JSON.stringify({ month }) }),

  r2Url: () => request<{ url: string }>('/admin/r2-url'),
  tasks: () => request<TaskItem[]>('/admin/tasks'),
  createTask: (body: { title: string; destination_url: string; platform?: string }) =>
    request('/admin/tasks', { method: 'POST', body: JSON.stringify(body) }),
  updateTask: (id: number, body: Partial<{ title: string; destination_url: string; platform: string }>) =>
    request(`/admin/tasks/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  toggleTask: (id: number) => request(`/admin/tasks/${id}/toggle`, { method: 'PATCH' })
}

// Types
export type UserProfile = { id: number; name: string; phone: string; role: 'member' | 'admin'; referral_code: string }
export type ProjectItem = { id: number; title: string; description: string; image_url: string; total_capital: number; total_shares: number; share_price: number; sold_shares: number; status: string; created_at: string }
export type ProjectDetail = ProjectItem & { available_shares: number }
export type MyShare = { user_id: number; project_id: number; quantity: number; title: string; share_price: number; status: string }
export type ShareRequest = { id: number; project_id: number; project_title: string; quantity: number; total_amount: number; bkash_txid: string; status: string; admin_note: string | null; created_at: string }
export type EarningItem = { id: number; project_id: number; project_title: string; month: string; shares: number; rate: number; amount: number; created_at: string }
export type TaskItem = { id: number; title: string; destination_url: string; platform: string; is_active: number; completed?: number }
export type AdminUser = { id: number; name: string; phone: string; role: string; is_active: number; referral_code: string; referred_by: string | null; created_at: string }
export type AdminUserDetail = AdminUser & { shares: MyShare[]; total_earnings_paisa: number }
export type AdminProject = ProjectItem & { sold_shares: number }
export type AdminShareRequest = ShareRequest & { user_name: string; user_phone: string }
export type ProfitRate = { id: number; project_id: number; month: string; rate: number; title: string }
export type CreateProjectBody = { title: string; description?: string; image_url?: string; total_capital: number; total_shares: number; share_price: number; status?: string }
export type Paginated<T> = { items: T[]; total: number; page: number; limit: number; hasMore: boolean }

// Portfolio types
export type ProjectMonthlyEarning = {
  month: string
  rate_bps: number
  rate_percent: number
  earned_paisa: number
}

export type ProjectPortfolioItem = {
  project_id: number
  project_title: string
  project_status: 'draft' | 'active' | 'closed'
  share_price: number
  shares_owned: number
  investment_value_paisa: number
  weight_percent: number
  total_earned_paisa: number
  roi_percent: number
  latest_rate_bps: number
  expected_this_month_paisa: number
  months_active: number
  monthly_history: ProjectMonthlyEarning[]
}

export type PortfolioSummary = {
  total_invested_paisa: number
  total_earned_paisa: number
  this_month_earned_paisa: number
  last_month_earned_paisa: number
  expected_this_month_paisa: number
  roi_percent: number
  annualized_roi_percent: number
  projects_count: number
  concentration_risk_percent: number
  projects: ProjectPortfolioItem[]
}
