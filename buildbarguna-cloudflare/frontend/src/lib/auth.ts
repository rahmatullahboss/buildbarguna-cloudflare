import type { UserProfile } from './api'
import { isTokenInMemory } from './api'

/**
 * Detect Capacitor native platform (Android/iOS).
 * On native, sessionStorage is cleared when the app is backgrounded/killed.
 * localStorage persists across app restarts and is safe in the isolated
 * Capacitor WebView. On web, sessionStorage is preferred for security.
 */
const isNative: boolean =
  typeof window !== 'undefined' &&
  (window.location.protocol === 'capacitor:' ||
    window.location.protocol === 'file:' ||
    (window as any)?.Capacitor?.isNativePlatform?.() === true)

/** Returns localStorage on native, sessionStorage on web. */
const storage: Storage =
  typeof window !== 'undefined'
    ? (isNative ? localStorage : sessionStorage)
    : sessionStorage

export function saveUser(user: UserProfile) {
  // storage: sessionStorage on web (cleared on tab close, not cross-tab),
  // localStorage on native (persists across app restarts).
  // Still only non-sensitive profile data — token is in memory only.
  storage.setItem('bb_user', JSON.stringify(user))
}

export function getUser(): UserProfile | null {
  try {
    const raw = storage.getItem('bb_user')
    if (!raw) return null
    const user = JSON.parse(raw) as UserProfile
    // Validate shape — never trust storage blindly
    if (!user.id || !user.role) return null
    if (!['member', 'admin'].includes(user.role)) return null
    return user
  } catch {
    return null
  }
}

export function isAdmin(): boolean {
  // NOTE: This is UI-only gating. The real admin check is always on the server.
  // If someone tampers with storage, the server will reject their requests.
  return isTokenInMemory() && getUser()?.role === 'admin'
}

export function isLoggedIn(): boolean {
  // Must have token in memory AND a valid session flag
  return isTokenInMemory() && storage.getItem('bb_logged_in') === '1'
}

export function formatTaka(paisa: number): string {
  return `৳${(paisa / 100).toLocaleString('bn-BD', { minimumFractionDigits: 2 })}`
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('bn-BD', {
    year: 'numeric', month: 'long', day: 'numeric'
  })
}

export function currentMonth(): string {
  return new Date().toISOString().slice(0, 7)
}
