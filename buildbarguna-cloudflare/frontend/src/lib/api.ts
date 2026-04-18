// In Capacitor app, window.location is file:// — relative URLs won't work
// Use absolute Worker URL for native app, relative for web
const isNativeApp = typeof window !== 'undefined' &&
  (window.location.protocol === 'capacitor:' ||
   window.location.protocol === 'file:' ||
   window.location.hostname === 'localhost' && (window as any).Capacitor?.isNativePlatform?.())

const WORKER_URL = import.meta.env.VITE_WORKER_URL ?? 'https://buildbarguna-worker.rahmatullahzisan01.workers.dev'

const BASE = isNativeApp ? `${WORKER_URL}/api` : '/api'

/**
 * Token stored in memory only — NOT localStorage.
 * localStorage is vulnerable to XSS: any injected script can read it.
 * Memory storage is cleared on page refresh (user must log in again),
 * which is the correct security tradeoff for a financial platform.
 *
 * Token is managed via apiToken.ts to avoid circular imports with ImageUpload.
 */
import { getToken as _getToken, setMemoryToken } from './apiToken'

// Same native detection as apiToken.ts — must stay in sync
const _isNative: boolean =
  typeof window !== 'undefined' &&
  (window.location.protocol === 'capacitor:' ||
    window.location.protocol === 'file:' ||
    (window as any)?.Capacitor?.isNativePlatform?.() === true)

// localStorage on native (persists across restarts), sessionStorage on web
const _storage: Storage =
  typeof window !== 'undefined'
    ? (_isNative ? localStorage : sessionStorage)
    : sessionStorage

export function getToken(): string | null { return _getToken() }

export function setToken(token: string) {
  setMemoryToken(token)
  _storage.setItem('bb_logged_in', '1')
}

export function clearToken() {
  setMemoryToken(null)
  _storage.removeItem('bb_logged_in')
  _storage.removeItem('bb_user')
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
  
  // If the response is an error, ensure error is always a string
  if (json.success === false && json.error) {
    // Handle Zod validation errors that might slip through
    if (typeof json.error === 'object' && json.error.issues) {
      // Extract the first error message from Zod issues
      const firstIssue = json.error.issues[0]
      json.error = firstIssue?.message || 'Invalid input'
    }
  }
  
  return json
}

// Auth
export const authApi = {
  register: (body: { name: string; email: string; phone?: string; password: string; referral_code?: string }) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: { identifier: string; password: string }) =>
    request<{ token: string; user: UserProfile }>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request<UserProfile & { balance_paisa: number }>('/auth/me'),
  forgotPassword: (email: string) =>
    request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (token: string, password: string) =>
    request('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) }),
  completeProfile: (body: { phone: string; referral_code?: string }) =>
    request<{ token?: string; user: UserProfile }>('/auth/complete-profile', { method: 'POST', body: JSON.stringify(body) }),
  updateProfile: (body: { name?: string; phone?: string; referral_code?: string }) =>
    request<{ user: UserProfile }>('/auth/profile', { method: 'PUT', body: JSON.stringify(body) })
}

// Projects
export const projectsApi = {
  list: (page = 1, limit = 20) => request<Paginated<ProjectItem>>(`/projects?page=${page}&limit=${limit}`),
  get: (id: number) => request<ProjectDetail>(`/projects/${id}`),
  getCompliance: (id: number) => request<ProjectComplianceDisclosureResponse>(`/projects/${id}/compliance`),
  getUpdates: (id: number) => request<ProjectUpdate[]>(`/project-data/${id}/updates`),
  getGallery: (id: number) => request<GalleryImage[]>(`/project-data/${id}/gallery`)
}

// Shares
export const sharesApi = {
  buy: (body: { project_id: number; quantity: number; payment_method: 'bkash' | 'manual'; bkash_txid?: string }) =>
    request('/shares/buy', { method: 'POST', body: JSON.stringify(body) }),
  my: (page = 1) => request<Paginated<MyShare>>(`/shares/my?page=${page}`),
  requests: (page = 1) => request<Paginated<ShareRequest>>(`/shares/requests?page=${page}`),
  
  // Share certificate download
  downloadCertificate: (purchaseId: number): string => `${BASE}/shares/certificate/${purchaseId}`,
  previewCertificate: (purchaseId: number): string => `${BASE}/shares/certificate/${purchaseId}/preview`
}

// Withdrawal types
export type WithdrawalStatus = 'pending' | 'approved' | 'completed' | 'rejected'
export type WithdrawalMethod = 'bkash' | 'nagad' | 'cash'

export interface Withdrawal {
  id: number
  amount_paisa: number
  bkash_number: string
  withdrawal_method: WithdrawalMethod
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

export type IncomeBreakdownItem = {
  source: string
  label: string
  project_title?: string
  project_id?: number
  amount_paisa: number
  detail?: string
}

export type IncomeBreakdown = {
  total_earned_paisa: number
  breakdown: IncomeBreakdownItem[]
}

// Withdrawal API
export const withdrawalsApi = {
  balance: () => request<AvailableBalance>('/withdrawals/balance'),
  incomeBreakdown: () => request<IncomeBreakdown>('/withdrawals/balance/breakdown'),
  history: (page = 1) => request<Paginated<Withdrawal>>(`/withdrawals/history?page=${page}`),
  request: (amount_paisa: number, bkash_number?: string, withdrawal_method: 'bkash' | 'cash' | 'nagad' = 'bkash') =>
    request<{ message: string; withdrawal_id: number; amount_paisa: number; reserved_settlement_amount?: number }>(
      '/withdrawals/request', {
        method: 'POST',
        body: JSON.stringify({ amount_paisa, ...(bkash_number ? { bkash_number } : {}), withdrawal_method })
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

// Points (used by Rewards page)
export const pointsApi = {
  getBalance: () => request<UserPoints>('/points'),
  getHistory: (month?: string, page = 1, limit = 20) => request<Paginated<PointTransaction>>(`/points/history?${month ? `month=${month}&` : ''}page=${page}&limit=${limit}`),
  getMonthly: () => request<MonthlyPoints>('/points/monthly'),
  getLeaderboard: (timeframe = 'all', limit = 10) => request<LeaderboardEntry[]>(`/points/leaderboard?timeframe=${timeframe}&limit=${limit}`),
  requestExport: (type = 'point_history') => request(`/points/export?type=${type}`),
  getExportStatus: (id?: string) => request(`/points/export/status${id ? `?id=${id}` : ''}`),
  getBadges: () => request<BadgeResponse>('/points/badges'),
  withdraw: (amount_points: number, bkash_number: string) =>
    request<{ message: string; amount_points: number; amount_taka: number; status: string }>(
      '/points/withdraw',
      { method: 'POST', body: JSON.stringify({ amount_points, bkash_number }) }
    ),
  getWithdrawals: (page = 1) => request<Paginated<PointWithdrawal>>(`/points/withdrawals?page=${page}`)
}

// Notifications
export const notificationsApi = {
  getList: (unreadOnly = false, limit = 50) => request<NotificationList>(`/notifications?unread=${unreadOnly}&limit=${limit}`),
  markAsRead: (id: number) => request(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllAsRead: () => request('/notifications/read-all', { method: 'PATCH' }),
  delete: (id: number) => request(`/notifications/${id}`, { method: 'DELETE' }),
  getUnreadCount: () => request<{ unread_count: number }>('/notifications/unread/count')
}

// Rewards
export const rewardsApi = {
  list: () => request<RewardItem[]>('/rewards'),
  getDetail: (id: number) => request<RewardItem>(`/rewards/${id}`),
  redeem: (id: number) => request(`/rewards/${id}/redeem`, { method: 'POST' }),
  myRedemptions: () => request<RewardRedemption[]>('/rewards/my-redemptions')
}

// Tasks
export interface TaskListItem {
  id: number
  title: string
  platform: 'facebook' | 'youtube' | 'telegram' | 'other'
  destination_url: string
  points: number
  cooldown_seconds: number
  is_one_time: boolean
  completed_today: boolean
  completed_ever: boolean
  remaining_count: number
  can_complete: boolean
  wait_seconds?: number  // Remaining wait time from start API
}

export interface TaskListResponse {
  tasks: TaskListItem[]
  user_points: {
    available_points: number
    lifetime_earned: number
    monthly_earned: number
  }
}

export interface TaskStartResponse {
  task_id: number
  destination_url: string
  wait_seconds: number
  started_at: string
}

export interface TaskCompleteResponse {
  points_earned: number
  total_points: number
  completed_at: string
}

export interface TaskCompletionItem {
  id: number
  user_id: number
  task_id: number
  clicked_at: string | null
  completed_at: string
  task_date: string
  points_earned: number
  task_title: string
  platform: string
  points_awarded: number
}

export const tasksApi = {
  list: () => request<TaskListResponse>('/tasks'),
  getDetail: (id: number) => request<TaskListItem>(`/tasks/${id}`),
  start: (id: number) => request<TaskStartResponse>(`/tasks/${id}/start`, { method: 'POST' }),
  complete: (id: number) => request<TaskCompleteResponse>(`/tasks/${id}/complete`, { method: 'POST' }),
  history: (page = 1) => request<Paginated<TaskCompletionItem>>(`/tasks/history?page=${page}`)
}

// Wallet
export interface PointWallet {
  balance: number
  lifetime_added: number
  lifetime_withdrawn: number
  last_settled_at: string | null
}

export interface WalletResponse {
  wallet: PointWallet
  pending_withdrawals: Array<{
    id: number
    amount_points: number
    amount_taka: number
    requested_at: string
  }>
  available_for_withdrawal: number
}

export interface PointWithdrawal {
  id: number
  user_id: number
  amount_points: number
  amount_taka: number
  bkash_number: string
  status: 'pending' | 'approved' | 'rejected' | 'completed'
  admin_note: string | null
  approved_by: number | null
  requested_at: string
  processed_at: string | null
  // Admin view fields
  user_name?: string
  user_phone?: string
}

export interface WalletSettings {
  min_cashout_points: number
  points_to_taka_rate: number
}

export const walletApi = {
  get: () => request<WalletResponse>('/wallet'),
  withdraw: (amount_points: number, bkash_number: string) =>
    request<{ message: string; amount_points: number; amount_taka: number; status: string }>(
      '/wallet/withdraw',
      { method: 'POST', body: JSON.stringify({ amount_points, bkash_number }) }
    ),
  withdrawals: (page = 1) => request<Paginated<PointWithdrawal>>(`/wallet/withdrawals?page=${page}`),
  settings: () => request<WalletSettings>('/wallet/settings')
}

// Admin
export const adminApi = {
  users: (page = 1) => request<Paginated<AdminUser>>(`/admin/users?page=${page}`),
  userDetail: (id: number) => request<AdminUserDetail>(`/admin/users/${id}`),
  toggleUser: (id: number) => request(`/admin/users/${id}/toggle`, { method: 'PATCH' }),
  getUserPoints: (id: number) => request<UserPoints>(`/admin/users/${id}/points`),
  adjustUserPoints: (id: number, points: number, reason: string) =>
    request(`/admin/users/${id}/points/adjust`, { method: 'POST', body: JSON.stringify({ points, reason }) }),
  getUserPointsHistory: (id: number) => request<PointTransaction[]>(`/admin/users/${id}/points/history`),

  projects: (page = 1) => request<Paginated<AdminProject>>(`/admin/projects?page=${page}`),
  createProject: (body: CreateProjectBody) =>
    request('/admin/projects', { method: 'POST', body: JSON.stringify(body) }),
  updateProject: (id: number, body: Partial<CreateProjectBody>) =>
    request(`/admin/projects/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteProject: (id: number, force = false) =>
    request(`/admin/projects/${id}${force ? '?force=1' : ''}`, { method: 'DELETE' }),
  setProjectStatus: (id: number, status: string) =>
    request(`/admin/projects/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  getProjectCloseoutPreview: (id: number, mode: 'completed' | 'closed') =>
    request<ProjectCloseoutPreview>(`/admin/projects/${id}/closeout-preview?mode=${mode}`),
  executeProjectCloseout: (
    id: number,
    body: {
      mode: 'completed' | 'closed'
      confirm_closeout: true
      checklist: {
        pending_purchases_resolved: boolean
        pending_expenses_resolved: boolean
        profits_resolved: boolean
        losses_resolved: boolean
      }
    }
  ) => request<{ message: string; status: 'completed' | 'closed'; shareholders_count: number; total_refunded: number }>(
    `/admin/projects/${id}/closeout`,
    { method: 'POST', body: JSON.stringify(body) }
  ),
  getProjectMembers: (id: number) => request<ProjectMember[]>(`/admin/projects/${id}/members`),
  addProjectMember: (id: number, body: { user_id: number; role_label?: string; notes?: string }) =>
    request<{ message: string }>(`/admin/projects/${id}/members`, { method: 'POST', body: JSON.stringify(body) }),
  removeProjectMember: (projectId: number, memberId: number) =>
    request<{ message: string }>(`/admin/projects/${projectId}/members/${memberId}`, { method: 'DELETE' }),
  getProjectMonitor: (id: number) => request<ProjectMonitor>(`/admin/projects/${id}/monitor`),
  getProjectCompliance: (id: number) =>
    request<ProjectComplianceAdminResponse>(`/admin/projects/${id}/compliance`),
  updateProjectCompliance: (id: number, body: UpdateProjectComplianceBody) =>
    request<{ message: string }>(`/admin/projects/${id}/compliance`, { method: 'PUT', body: JSON.stringify(body) }),
  // Project updates
  getProjectUpdates: (projectId: number) => request<ProjectUpdate[]>(`/project-data/admin/${projectId}`),
  createProjectUpdate: (projectId: number, body: { title: string; content?: string; image_url?: string }) =>
    request(`/project-data/admin/${projectId}`, { method: 'POST', body: JSON.stringify(body) }),
  editProjectUpdate: (id: number, body: { title?: string; content?: string; image_url?: string }) =>
    request(`/project-data/admin/entry/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteProjectUpdate: (id: number) =>
    request(`/project-data/admin/entry/${id}`, { method: 'DELETE' }),
  // Project gallery
  getGallery: (projectId: number) => request<GalleryImage[]>(`/project-data/admin/gallery/${projectId}`),
  addGalleryImage: (projectId: number, body: { image_url: string; caption?: string; sort_order?: number }) =>
    request(`/project-data/admin/gallery/${projectId}`, { method: 'POST', body: JSON.stringify(body) }),
  deleteGalleryImage: (id: number) =>
    request(`/project-data/admin/gallery/entry/${id}`, { method: 'DELETE' }),

  pendingShares: (page = 1, status = 'pending') =>
    request<Paginated<AdminShareRequest>>(`/admin/shares/pending?page=${page}&status=${status}`),
  approveShare: (id: number) => request(`/admin/shares/${id}/approve`, { method: 'PATCH' }),
  rejectShare: (id: number, note?: string) =>
    request(`/admin/shares/${id}/reject`, { method: 'PATCH', body: JSON.stringify({ admin_note: note }) }),




  r2Url: () => request<{ url: string }>('/admin/r2-url'),

  rewards: () => request<RewardItem[]>('/admin/rewards'),
  createReward: (body: { name: string; description?: string; points_required: number; quantity?: number | null; image_url?: string }) =>
    request('/admin/rewards', { method: 'POST', body: JSON.stringify(body) }),
  updateReward: (id: number, body: Partial<{ name: string; description: string; points_required: number; quantity: number | null; image_url: string }>) =>
    request(`/admin/rewards/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  toggleReward: (id: number) => request(`/admin/rewards/${id}/toggle`, { method: 'PATCH' }),
  
  redemptions: (status = 'pending') => request<RedemptionItem[]>(`/admin/redemptions?status=${status}`),
  updateRedemptionStatus: (id: number, status: string, admin_note?: string) =>
    request(`/admin/redemptions/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, admin_note }) }),

  // Point Withdrawals
  pointWithdrawals: (status?: string, page = 1) =>
    request<Paginated<PointWithdrawal>>(`/admin/point-withdrawals?status=${status || ''}&page=${page}`),
  approvePointWithdrawal: (id: number, admin_note?: string) =>
    request(`/admin/point-withdrawals/${id}/approve`, { method: 'PATCH', body: JSON.stringify({ admin_note }) }),
  rejectPointWithdrawal: (id: number, admin_note: string) =>
    request(`/admin/point-withdrawals/${id}/reject`, { method: 'PATCH', body: JSON.stringify({ admin_note }) }),
  completePointWithdrawal: (id: number, bkash_txid: string) =>
    request(`/admin/point-withdrawals/${id}/complete`, { method: 'PATCH', body: JSON.stringify({ bkash_txid }) })
}

// Types
export type UserProfile = { id: number; name: string; phone: string | null; email: string | null; role: 'member' | 'admin'; referral_code: string }
export type ProjectItem = {
  id: number; title: string; description: string; image_url: string | null
  total_capital: number; total_shares: number; share_price: number; sold_shares: number
  status: 'draft' | 'active' | 'closed' | 'completed'; created_at: string
  // Optional enhanced fields (added in migration 032)
  location?: string | null; category?: string | null
  start_date?: string | null; expected_end_date?: string | null
  progress_pct?: number; completed_at?: string | null; updated_at?: string | null
}
export type ProjectDetail = ProjectItem & { available_shares: number }
export type ProjectUpdate = { id: number; project_id?: number; title: string; content: string | null; image_url: string | null; author_name: string; created_at: string; updated_at?: string }
export type GalleryImage = { id: number; image_url: string; caption: string | null; sort_order: number; created_at?: string }
export type MyShare = {
  user_id: number
  project_id: number
  quantity: number
  title: string
  share_price: number
  status: string
  principal_refund_paisa?: number
  final_profit_paisa?: number
  claimable_paisa?: number
  withdrawn_paisa?: number
}
export type ShareRequest = { id: number; project_id: number; project_title: string; quantity: number; total_amount: number; bkash_txid: string | null; payment_method: 'bkash' | 'manual'; status: string; admin_note: string | null; created_at: string }
export type EarningItem = { id: number; project_id: number; project_title: string; month: string; shares: number; rate: number; amount: number; created_at: string }

export type UserPoints = {
  user_id: number
  available_points: number
  lifetime_earned: number
  lifetime_redeemed: number
  monthly_earned: number
  monthly_redeemed: number
  current_month: string
  updated_at: string
}

export type PointTransaction = {
  id: number
  user_id: number
  task_id: number | null
  points: number
  transaction_type: 'earned' | 'redeemed' | 'expired' | 'adjusted' | 'refunded'
  description: string | null
  month_year: string
  created_at: string
  task_title?: string
}

export type MonthlyPoints = {
  month_year: string
  earned: number
  redeemed: number
  transaction_count: number
}

export type RewardItem = {
  id: number
  name: string
  description: string | null
  points_required: number
  quantity: number | null
  redeemed_count: number
  image_url: string | null
  is_active: number
}

export type RewardRedemption = {
  id: number
  user_id: number
  reward_id: number
  points_spent: number
  status: 'pending' | 'approved' | 'fulfilled' | 'rejected' | 'cancelled'
  admin_note: string | null
  fulfilled_at: string | null
  redeemed_at: string
  reward_name?: string
}

export type RedemptionItem = RewardRedemption & {
  user_name: string
  user_phone: string
}

export type LeaderboardEntry = {
  id: number
  name: string
  phone: string
  lifetime_earned?: number
  weekly_earned?: number
  monthly_earned?: number
  available_points: number
  tasks_completed: number
  rank?: number
}

export type Badge = {
  id: number
  user_id: number
  badge_type: string
  badge_name: string
  badge_description: string
  earned_at: string
  metadata?: string
}

export type BadgeResponse = {
  earned: Badge[]
  available: Array<{ badge_type: string; badge_name: string; badge_description: string }>
  total_earned: number
  total_available: number
}

export type Notification = {
  id: number
  user_id: number
  type: string
  title: string
  message: string | null
  reference_id: number | null
  reference_type: string | null
  is_read: number
  created_at: string
}

export type NotificationList = {
  notifications: Notification[]
  unread_count: number
}

export type DataExport = {
  id: number
  user_id: number
  export_type: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  file_url?: string
  expires_at?: string
  requested_at: string
  completed_at?: string
}
export type AdminUser = { id: number; name: string; phone: string; role: string; is_active: number; referral_code: string; referred_by: string | null; created_at: string }
export type AdminUserDetail = AdminUser & { shares: MyShare[]; total_earnings_paisa: number }
export type AdminProject = ProjectItem & { sold_shares: number }
export type ProjectMember = {
  id: number
  project_id: number
  user_id: number
  role_label: string | null
  status: 'active' | 'inactive' | 'removed'
  assigned_at: string
  user_name?: string
  user_phone?: string | null
}
export type ProjectMonitorShareholder = {
  user_id: number
  user_name: string
  user_phone: string | null
  quantity: number
  ownership_bps: number
  principal_generated: number
  final_profit_generated: number
  claimable_amount: number
  withdrawn_amount: number
}
export type ProjectMonitor = {
  project: AdminProject & { completed_at?: string | null }
  closeout_run: {
    id: number
    executed_at: string
    capital_refund_total_paisa: number
    final_profit_pool_paisa: number
  } | null
  members: ProjectMember[]
  summary: {
    shareholders_count: number
    sold_shares: number
    distributed_profit_total: number
    principal_refund_total: number
    final_profit_total: number
    claimable_total: number
    reserved_total: number
    withdrawn_total: number
  }
  shareholders: ProjectMonitorShareholder[]
}
export type ProjectCloseoutBlocker = {
  code: string
  message: string
  amount_paisa?: number
  count?: number
}

export type ProjectCloseoutPreview = {
  mode: 'completed' | 'closed'
  can_closeout: boolean
  blockers: ProjectCloseoutBlocker[]
  project: {
    id: number
    title: string
    status: 'draft' | 'active' | 'closed' | 'completed'
    share_price: number
    total_shares: number
    total_capital: number
    completed_at?: string | null
  }
  financials: {
    total_revenue: number
    direct_expense: number
    company_expense_allocation: number
    net_profit: number
    previously_distributed: number
    available_profit: number
  }
  settlement: {
    total_shares_sold: number
    capital_refund_total: number
    final_profit_pool: number
    pending_share_purchases: number
    pending_expense_allocations: number
  }
  existing_closeout_run: {
    id: number
    status: string
    executed_at: string
  } | null
  settlement_projection: {
    user_id: number
    user_name: string
    user_phone: string | null
    shares_held: number
    ownership_bps: number
    principal_refund_amount: number
    final_profit_amount: number
  }[]
  compliance: {
    contract_type: ProjectComplianceProfile['contract_type']
    shariah_screening_status: ProjectComplianceProfile['shariah_screening_status']
    ops_reconciliation_status: ProjectComplianceProfile['ops_reconciliation_status']
    loss_settlement_status: ProjectComplianceProfile['loss_settlement_status']
  }
}
export type ProjectComplianceProfile = {
  project_id: number
  contract_type: 'musharakah' | 'mudarabah' | 'other'
  shariah_screening_status: 'pending' | 'approved' | 'rejected' | 'needs_revision'
  ops_reconciliation_status: 'pending' | 'completed' | 'blocked'
  loss_settlement_status: 'not_applicable' | 'pending_review' | 'resolved' | 'blocked'
  prohibited_activities_screened: number | boolean
  asset_backing_confirmed: number | boolean
  profit_ratio_disclosed: number | boolean
  loss_sharing_clause_confirmed: number | boolean
  principal_risk_notice_confirmed: number | boolean
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
export type ProjectComplianceDisclosure = {
  project_id: number
  contract_type: ProjectComplianceProfile['contract_type']
  shariah_screening_status: ProjectComplianceProfile['shariah_screening_status']
  ops_reconciliation_status: ProjectComplianceProfile['ops_reconciliation_status']
  loss_settlement_status: ProjectComplianceProfile['loss_settlement_status']
  prohibited_activities_screened: boolean
  asset_backing_confirmed: boolean
  profit_ratio_disclosed: boolean
  loss_sharing_clause_confirmed: boolean
  principal_risk_notice_confirmed: boolean
  use_of_proceeds: string
  profit_loss_policy: string
  principal_risk_notice: string
  external_reviewer_name: string
  approved_at: string | null
}
export type ProjectComplianceAdminResponse = {
  project: {
    id: number
    title: string
    status: 'draft' | 'active' | 'closed' | 'completed'
  }
  profile: ProjectComplianceProfile
}
export type ProjectComplianceDisclosureResponse = {
  project: {
    id: number
    title: string
    status: 'draft' | 'active' | 'closed' | 'completed'
  }
  disclosure: ProjectComplianceDisclosure
}
export type UpdateProjectComplianceBody = {
  contract_type: ProjectComplianceProfile['contract_type']
  shariah_screening_status: ProjectComplianceProfile['shariah_screening_status']
  ops_reconciliation_status: ProjectComplianceProfile['ops_reconciliation_status']
  loss_settlement_status: ProjectComplianceProfile['loss_settlement_status']
  prohibited_activities_screened: boolean
  asset_backing_confirmed: boolean
  profit_ratio_disclosed: boolean
  loss_sharing_clause_confirmed: boolean
  principal_risk_notice_confirmed: boolean
  use_of_proceeds?: string
  profit_loss_policy?: string
  principal_risk_notice?: string
  shariah_notes?: string
  ops_notes?: string
  loss_settlement_notes?: string
  external_reviewer_name?: string
}
export type AdminShareRequest = ShareRequest & { user_name: string; user_phone: string }
export type ProfitRate = { id: number; project_id: number; month: string; rate: number; title: string }
export type CreateProjectBody = {
  title: string; description?: string; image_url?: string
  total_capital: number; total_shares: number; share_price: number; status?: string
  // Optional enhanced fields
  location?: string; category?: string; start_date?: string; expected_end_date?: string; progress_pct?: number
}
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

// ─── Project Finance & Profit Distribution Types ─────────────────────────────────

export type ProjectTransaction = {
  id: number
  project_id: number
  transaction_type: 'expense' | 'revenue'
  amount: number
  category: string
  description: string | null
  transaction_date: string
  created_by: number
  created_at: string
  updated_at: string
  created_by_name?: string
}

export type TransactionCategory = {
  id: number
  name: string
  type: 'expense' | 'revenue'
  is_active: number
}

export type ProjectFinancialSummary = {
  project_id: number
  project_name: string
  total_revenue: number
  total_expense: number
  net_profit: number
  profit_margin_percent: number
  total_distributed: number
  undistributed_profit: number
  revenue_count: number
  expense_count: number
}

export type ProfitDistribution = {
  id: number
  project_id: number
  total_revenue: number
  total_expense: number
  net_profit: number
  distributable_amount: number
  company_share_percentage: number
  investor_share_percentage: number
  period_start: string | null
  period_end: string | null
  status: 'pending' | 'approved' | 'distributed' | 'cancelled'
  distributed_at: string | null
  created_by: number
  created_at: string
  distributed_by_name?: string
  shareholders_count?: number
}

export type ShareholderProfit = {
  id: number
  distribution_id: number
  project_id: number
  user_id: number
  shares_held: number
  total_shares: number
  ownership_percentage: number
  profit_amount: number
  status: 'pending' | 'credited' | 'withdrawn'
  credited_at: string | null
  created_at: string
  user_name?: string
  phone?: string
}

// ─── Finance API ──────────────────────────────────────────────────────────────────

export const financeApi = {
  // Add transaction (expense/revenue)
  addTransaction: (body: {
    project_id: number
    transaction_type: 'expense' | 'revenue'
    amount: number
    category: string
    description?: string
    transaction_date?: string
  }) => request('/finance/transactions', { method: 'POST', body: JSON.stringify(body) }),

  // Get project transactions
  getTransactions: (projectId: number, params?: { type?: 'expense' | 'revenue'; page?: number; limit?: number }) => {
    const query = new URLSearchParams()
    if (params?.type) query.set('type', params.type)
    if (params?.page) query.set('page', String(params.page))
    if (params?.limit) query.set('limit', String(params.limit))
    return request<Paginated<ProjectTransaction>>(`/finance/transactions/${projectId}?${query}`)
  },

  // Update transaction
  updateTransaction: (id: number, body: Partial<{
    amount: number
    category: string
    description: string
    transaction_date: string
  }>) => request(`/finance/transactions/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  // Delete transaction
  deleteTransaction: (id: number) => request(`/finance/transactions/${id}`, { method: 'DELETE' }),

  // Get financial summary
  getSummary: (projectId: number) => request<{
    project: { id: number; title: string; status: string; share_price: number; total_shares: number; shares_sold: number; shareholders_count: number }
    financials: ProjectFinancialSummary
    category_breakdown: { transaction_type: string; category: string; total_amount: number; transaction_count: number }[]
    monthly_trend: { month: string; revenue: number; expense: number; profit: number }[]
  }>(`/finance/summary/${projectId}`),

  // Get categories
  getCategories: (type?: 'expense' | 'revenue') => {
    const query = type ? `?type=${type}` : ''
    return request<TransactionCategory[]>(`/finance/categories${query}`)
  }
}

// ─── Company Expenses Types ────────────────────────────────────────────────────────────

export type CompanyExpenseCategory = {
  id: number
  name: string
  description: string | null
  is_active: number
}

export type CompanyExpense = {
  id: number
  amount: number
  category_id: number | null
  category_name: string
  description: string | null
  expense_date: string
  allocation_method: 'by_project_value' | 'by_revenue' | 'equal' | 'company_only'
  is_allocated: number
  notes: string | null
  created_by: number
  created_at: string
  created_by_name?: string
}

export type ExpenseAllocation = {
  id: number
  expense_id: number
  project_id: number
  amount: number
  project_value_pct: number
  created_at: string
  project_title?: string
  project_value?: number
}

export type CompanyExpenseWithAllocations = CompanyExpense & {
  allocations: ExpenseAllocation[]
}

export type CompanyExpenseSummary = {
  total_expenses: number
  total_allocated: number
  pending_allocation: number
  expenses_count: number
  by_category: {
    category_name: string
    total_amount: number
    count: number
  }[]
}

export type ProjectExpenseSummary = {
  project_id: number
  project_name: string
  direct_expenses: number
  company_expense_allocation: number
  total_expenses: number
  project_value: number
  allocation_percentage: number
}

// ─── Company Expenses API ────────────────────────────────────────────────────────────

export const companyExpensesApi = {
  // Add company expense
  add: (body: {
    amount: number
    category_id?: number
    category_name: string
    description?: string
    expense_date?: string
    allocation_method?: 'by_project_value' | 'by_revenue' | 'equal' | 'company_only'
    notes?: string
  }) => request<{
    message: string
    expense_id: number
    allocation_pending: boolean
  }>('/company-expenses/admin/add', { method: 'POST', body: JSON.stringify(body) }),

  // Allocate expense to projects
  allocate: (body: {
    expense_id: number
    project_ids: number[]
  }) => request<{
    message: string
    expense_id: number
    allocations: {
      project_id: number
      project_title: string
      amount: number
      project_value_pct: number
    }[]
    remainder: number
  }>('/company-expenses/admin/allocate', { method: 'POST', body: JSON.stringify(body) }),

  // List company expenses
  list: (params?: { allocated?: boolean; page?: number; limit?: number }) => {
    const query = new URLSearchParams()
    if (params?.allocated !== undefined) query.set('allocated', String(params.allocated))
    if (params?.page) query.set('page', String(params.page))
    if (params?.limit) query.set('limit', String(params.limit))
    return request<Paginated<CompanyExpense>>(`/company-expenses/admin/list?${query}`)
  },

  // Get expense details
  get: (id: number) => request<CompanyExpenseWithAllocations>(`/company-expenses/admin/${id}`),

  // Delete expense
  delete: (id: number) => request<{ message: string }>(`/company-expenses/admin/${id}`, { method: 'DELETE' }),

  // Get categories
  categories: () => request<CompanyExpenseCategory[]>('/company-expenses/categories'),

  // Get summary
  summary: (period?: 'month' | 'year' | 'all') => {
    const query = period ? `?period=${period}` : ''
    return request<CompanyExpenseSummary>(`/company-expenses/admin/summary${query}`)
  },

  // Get project expense summary
  projectSummary: (projectId: number) => request<ProjectExpenseSummary>(`/company-expenses/project-summary/${projectId}`),

  // Recalculate allocations
  recalculate: () => request<{
    message: string
    processed: number
    errors?: string[]
  }>('/company-expenses/admin/recalculate', { method: 'POST' })
}

export type CompanyFundTransaction = {
  id: number
  project_id: number | null
  distribution_id: number | null
  amount_paisa: number
  transaction_type: 'profit_share' | 'withdrawal' | 'adjustment' | 'expense'
  description: string
  reference_type: string | null
  reference_id: number | null
  status: 'pending_approval' | 'approved' | 'rejected' | 'completed'
  created_by: number
  created_at: string
  approved_by: number | null
  approved_at: string | null
  rejection_reason: string | null
  project_title?: string
  created_by_name?: string
  approved_by_name?: string
}

export type FinancialAuditLogEntry = {
  id: number
  entity_type: string
  entity_id: number
  action: string
  old_values: string | null
  new_values: string | null
  amount_paisa: number | null
  description: string | null
  actor_id: number
  created_at: string
  actor_name?: string
}

export const profitApi = {
  // Preview profit distribution
  preview: (projectId: number, companyPct?: number) => {
    const query = companyPct ? `?company_pct=${companyPct}` : ''
    return request<{
      project: { id: number; title: string; default_company_share_pct: number }
      summary: {
        total_revenue: number
        direct_expense: number
        company_expense_allocation: number
        net_profit: number
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
        ownership_pct_bps: number
        profit_amount: number
      }[]
      has_available_profit: boolean
    }>(`/profit/preview/${projectId}${query}`)
  },

  // Distribute profit
  distribute: (projectId: number, body: {
    company_share_percentage?: number
    period_start?: string
    period_end?: string
    notes?: string
  }) => request<{
    message: string
    distribution_id: number
    investor_distributed: number
    company_fund_credited: number
    total_distributed: number
    failed_count: number
  }>(`/profit/distribute/${projectId}`, { method: 'POST', body: JSON.stringify(body) }),

  // Get distribution history
  getHistory: (projectId: number, page = 1, limit = 20) =>
    request<Paginated<ProfitDistribution>>(`/profit/history/${projectId}?page=${page}&limit=${limit}`),

  // Get distribution details
  getDistribution: (id: number) => request<{
    distribution: ProfitDistribution & { project_title: string; created_by_name: string }
    shareholders: (ShareholderProfit & { user_name: string; phone: string })[]
  }>(`/profit/distribution/${id}`),

  // Company fund: get summary + history
  companyFund: (page = 1) => request<{
    summary: { current_balance: number; total_credited: number; total_debited: number; pending_approvals: number }
    transactions: CompanyFundTransaction[]
    pagination: { page: number; limit: number; total: number; hasMore: boolean }
  }>(`/profit/company-fund?page=${page}`),

  // Company fund: admin withdraw
  withdrawFund: (body: { amount: number; description: string; transaction_type?: 'withdrawal' | 'expense' }) =>
    request<{ message: string; transaction_id: number; new_balance?: number; status: string }>(
      '/profit/company-fund/withdraw', { method: 'POST', body: JSON.stringify(body) }
    ),

  // Company fund: approve withdrawal (dual-admin)
  approveWithdrawal: (id: number) =>
    request<{ message: string; new_balance: number }>(
      `/profit/company-fund/approve/${id}`, { method: 'POST' }
    ),

  // Company fund: reject withdrawal
  rejectWithdrawal: (id: number, reason: string) =>
    request<{ message: string }>(
      `/profit/company-fund/reject/${id}`, { method: 'POST', body: JSON.stringify({ reason }) }
    ),

  // Financial audit log
  getAuditLog: (page = 1, entityType?: string, action?: string) => {
    const params = new URLSearchParams({ page: String(page) })
    if (entityType) params.set('entity_type', entityType)
    if (action) params.set('action', action)
    return request<{
      items: FinancialAuditLogEntry[]
      pagination: { page: number; limit: number; total: number; hasMore: boolean }
    }>(`/profit/audit-log?${params}`)
  },

  // Get my profits (user's profit history)
  myProfits: () => request<{
    profits: (ShareholderProfit & { project_title: string; distributed_at: string; distribution_notes: string | null; period_start: string | null; period_end: string | null })[]
    summary: {
      total_distributions: number
      total_profit_earned: number
      projects_count: number
    }
  }>('/profit/my-profits')
}

// Member Registration
export interface MemberRegistrationForm {
  name_english: string
  name_bangla?: string
  father_name: string
  mother_name: string
  date_of_birth: string
  blood_group?: string
  present_address: string
  permanent_address: string
  facebook_id?: string
  mobile_whatsapp: string
  emergency_contact?: string
  email?: string
  skills_interests?: string
  declaration_accepted: boolean
  payment_method: 'bkash' | 'cash'
  bkash_number?: string
  bkash_trx_id?: string
  payment_note?: string
}

export interface MemberPayment {
  id: number
  form_number: string
  name_english: string
  name_bangla?: string
  payment_method: 'bkash' | 'cash'
  payment_amount: number
  bkash_number?: string
  bkash_trx_id?: string
  payment_note?: string
  created_at: string
  user_phone: string
  user_name: string
  user_id: number
}

export interface MemberRegistrationStatus {
  registered: boolean
  form_number?: string
  payment_status?: string
  payment_method?: string
}

export interface MyRegistrationDetails {
  registered: boolean
  form_number?: string
  name_english?: string
  name_bangla?: string
  father_name?: string
  mother_name?: string
  date_of_birth?: string
  blood_group?: string
  present_address?: string
  permanent_address?: string
  facebook_id?: string
  mobile_whatsapp?: string
  emergency_contact?: string
  email?: string
  skills_interests?: string
  payment_status?: string
  payment_method?: string
  payment_amount?: number
  payment_note?: string
  created_at?: string
  verified_at?: string
  verified_by_name?: string
}

export const memberApi = {
  register: (body: MemberRegistrationForm) =>
    request<{ message: string; form_number: string; payment_status: string; payment_amount: number }>('/member/register', {
      method: 'POST',
      body: JSON.stringify(body)
    }),
  status: () => request<MemberRegistrationStatus>('/member/status'),
  getMyRegistration: () => request<MyRegistrationDetails>('/member/my-registration'),
  
  // Issue: 6.1 - Certificate download calls non-existent endpoint in frontend
  // Issue: 6.2 - Member API client incomplete
  downloadCertificate: (formNumber: string): string => `${BASE}/member/certificate/${formNumber}`,
  previewCertificate: (formNumber: string): string => `${BASE}/member/certificate/${formNumber}/preview`,
  
  // Admin member management APIs
  getPayments: (status: 'pending' | 'verified' | 'all' = 'pending') =>
    request<MemberPayment[]>(`/member/admin/payments?status=${status}`),
  verifyPayment: (id: number, action: 'approve' | 'reject', note?: string) =>
    request<{ message: string }>(`/member/admin/members/${id}/verify`, {
      method: 'POST',
      body: JSON.stringify({ action, note })
    }),
  getMemberList: (status: 'all' | 'pending' | 'verified' | 'rejected' = 'all', membershipStatus: 'all' | 'active' | 'cancelled' = 'all', page = 1, limit = 20) =>
    request<{ members: any[]; pagination: { page: number; limit: number; total: number; hasMore: boolean } }>(
      `/member/admin/list?status=${status}&membership_status=${membershipStatus}&page=${page}&limit=${limit}`
    ),
  bulkGenerateCertificates: () =>
    request<{ message: string; total_count: number; generated_count: number; certificates: Array<{ form_number: string; user_name: string }> }>(
      '/member/admin/certificates/bulk',
      { method: 'POST' }
    ),
    
  // Member self-management APIs (NEW)
  getStatusDetail: () => request<{
    registered: boolean;
    id?: number;
    form_number?: string;
    name_english?: string;
    name_bangla?: string;
    status?: string;
    payment_status?: string;
    payment_method?: string;
    payment_amount?: number;
    created_at?: string;
    verified_at?: string;
    cancelled_at?: string;
    cancellation_reason?: string;
    previous_form_number?: string;
  }>('/member/status-detail'),
    
  updateRegistration: (body: Partial<MemberRegistrationForm>) =>
    request<{ message: string }>('/member', {
      method: 'PUT',
      body: JSON.stringify(body)
    }),
    
  cancelMembership: (cancellation_reason: string) =>
    request<{ message: string; status: string }>('/member/cancel', {
      method: 'POST',
      body: JSON.stringify({ cancellation_reason })
    }),
    
  reapply: () =>
    request<{ message: string; form_number: string; payment_status: string; status: string }>('/member/reapply', {
      method: 'POST'
    })
}
