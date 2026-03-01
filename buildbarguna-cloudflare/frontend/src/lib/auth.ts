import type { UserProfile } from './api'
import { isTokenInMemory } from './api'

export function saveUser(user: UserProfile) {
  // sessionStorage: cleared when tab closes, not accessible cross-tab
  // Still only non-sensitive profile data — token is in memory only
  sessionStorage.setItem('bb_user', JSON.stringify(user))
}

export function getUser(): UserProfile | null {
  try {
    const raw = sessionStorage.getItem('bb_user')
    if (!raw) return null
    const user = JSON.parse(raw) as UserProfile
    // Validate shape — never trust storage blindly
    if (!user.id || !user.phone || !user.role) return null
    if (!['member', 'admin'].includes(user.role)) return null
    return user
  } catch {
    return null
  }
}

export function isAdmin(): boolean {
  // NOTE: This is UI-only gating. The real admin check is always on the server.
  // If someone tampers with sessionStorage, the server will reject their requests.
  return isTokenInMemory() && getUser()?.role === 'admin'
}

export function isLoggedIn(): boolean {
  // Must have token in memory AND a valid session flag
  return isTokenInMemory() && sessionStorage.getItem('bb_logged_in') === '1'
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
