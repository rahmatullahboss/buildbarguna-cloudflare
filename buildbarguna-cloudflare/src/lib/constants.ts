/**
 * Application Constants
 * Centralized configuration for magic numbers and default values
 */

// Task System Defaults
export const TASK_DEFAULTS = {
  POINTS: 5,
  COOLDOWN_SECONDS: 30,
  DAILY_LIMIT: 20,
} as const

// Points & Withdrawal System Defaults
export const POINTS_SYSTEM = {
  MIN_WITHDRAWAL_POINTS: 200,
  POINTS_TO_TAKA_DIVISOR: 10, // 10 points = 1 taka (500 points = 50 taka)
  MAX_WITHDRAWALS_PER_MONTH: 3,
  WITHDRAWAL_COOLDOWN_HOURS: 24,
} as const

// Rate Limiting
export const RATE_LIMITS = {
  LEADERBOARD: {
    MAX_REQUESTS: 30,
    WINDOW_MINUTES: 1,
  },
  EXPORT: {
    MAX_REQUESTS: 3,
    WINDOW_HOURS: 1,
  },
  TASK_COMPLETION: {
    MAX_PER_MINUTE: 10,
  },
  REWARD_REDEEM: {
    MAX_PER_HOUR: 5,
  },
  POINTS_WITHDRAW: {
    MAX_PER_HOUR: 3,
    MAX_PER_DAY: 5,
  },
  POINTS_HISTORY: {
    MAX_PER_MINUTE: 20,
  },
  NOTIFICATIONS: {
    MAX_PER_MINUTE: 30,
  },
  LOGIN: {
    MAX_ATTEMPTS: 5,
    WINDOW_MINUTES: 15,
  },
  REGISTRATION: {
    MAX_ATTEMPTS: 3,
    WINDOW_HOURS: 1,
  },
  REFERRAL_CHECK: {
    MAX_PER_MINUTE: 10,
  },
  RESET_PASSWORD: {
    MAX_ATTEMPTS: 5,
    WINDOW_MINUTES: 15,
  },
} as const

// Rate limit endpoint names (for consistent database storage)
export const RATE_LIMIT_ENDPOINTS = {
  LEADERBOARD: 'leaderboard',
  EXPORT: 'export',
  TASK_COMPLETION: 'task_completion',
  REWARD_REDEEM: 'reward_redeem',
  POINTS_WITHDRAW: 'points_withdraw',
  POINTS_HISTORY: 'points_history',
  NOTIFICATIONS: 'notifications',
  RESET_PASSWORD: 'reset_password',
} as const

// Fraud Detection
export const FRAUD_THRESHOLDS = {
  MIN_COMPLETIONS_FOR_CHECK: 5,
  SUSPICIOUS_AVG_TIME_SECONDS: 5,
  AUTO_BLOCK_COMPLETIONS: 10,
  AUTO_BLOCK_AVG_TIME_SECONDS: 3,
} as const

// Cooldown & Timing
export const TIMING = {
  MIGRATION_FLAG_TTL_SECONDS: 86400, // 24 hours
  MIGRATION_LOCK_TIMEOUT_MS: 300000, // 5 minutes
  MIGRATION_DEFAULT_TIMEOUT_MS: 30000, // 30 seconds
  MIGRATION_LONG_TIMEOUT_MS: 180000, // 3 minutes
  KV_POLL_INTERVAL_SECONDS: 2,
  KV_POLL_MAX_ATTEMPTS: 15,
  DEPLOYMENT_PROPAGATION_WAIT_SECONDS: 10,
} as const

// Pagination & Limits
export const PAGINATION = {
  DEFAULT_LIMIT: 50,
  MAX_LIMIT: 100,
  LEADERBOARD_DEFAULT: 10,
  NOTIFICATIONS_DEFAULT: 50,
} as const

// Export Types
export const EXPORT_TYPES = [
  'point_history',
  'task_history', 
  'redemption_history',
  'all_data',
] as const

// Badge Thresholds
export const BADGE_THRESHOLDS = {
  FIRST_TASK: 1,
  TEN_TASKS: 10,
  FIFTY_TASKS: 50,
  HUNDRED_TASKS: 100,
} as const

// Reward Status
export const REWARD_STATUS = [
  'pending',
  'approved',
  'fulfilled',
  'rejected',
  'cancelled',
] as const

// Transaction Types
export const TRANSACTION_TYPES = [
  'earned',
  'redeemed',
  'expired',
  'adjusted',
  'refunded',
  'withdrawn',
] as const

// Notification Types
export const NOTIFICATION_TYPES = [
  'points_earned',
  'reward_redeemed',
  'redemption_approved',
  'redemption_rejected',
  'reward_fulfilled',
  'task_completed',
  'fraud_alert',
  'redemption_pending',
  'withdrawal_request',
  'withdrawal_approved',
  'withdrawal_rejected',
  'withdrawal_completed',
] as const

// Platform Types
export const PLATFORMS = [
  'facebook',
  'youtube',
  'telegram',
  'other',
] as const

// User Roles
export const USER_ROLES = {
  MEMBER: 'member',
  ADMIN: 'admin',
} as const

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_ERROR: 500,
} as const

// Error Messages (English)
export const ERROR_MESSAGES = {
  INVALID_ID: 'Invalid ID',
  NOT_FOUND: 'Not found',
  UNAUTHORIZED: 'Unauthorized',
  FORBIDDEN: 'Forbidden',
  RATE_LIMIT_EXCEEDED: 'Too many requests. Please wait.',
  INVALID_INPUT: 'Invalid input',
} as const

// Error Messages (Bengali)
export const ERROR_MESSAGES_BN = {
  INVALID_ID: 'অকার্যক আইডি',
  NOT_FOUND: 'পাওয়া যায়নি',
  UNAUTHORIZED: 'অননুমোদিত',
  FORBIDDEN: 'নিষিদ্ধ',
  RATE_LIMIT_EXCEEDED: 'অনেক বেশি request. অনুগ্রহ করে অপেক্ষা করুন।',
  INVALID_INPUT: 'অকার্যক ইনপুট',
  INSUFFICIENT_BALANCE: 'পর্যাপ্ত ব্যালেন্স নেই',
  ALREADY_PENDING: 'ইতিমধ্যে একটি অনুরোধ অপেক্ষমান',
  MINIMUM_REQUIRED: 'ন্যূনতম {required} প্রয়োজন',
  INVALID_BKASH_NUMBER: 'সঠিক bKash নম্বর দিন (01XXXXXXXXX)',
} as const
