import { Navigate } from 'react-router-dom'
import { isLoggedIn, isAdmin } from '../lib/auth'

/**
 * IMPORTANT SECURITY NOTE:
 * These route guards are UI-only convenience — they prevent rendering admin
 * pages for non-admin users in the browser.
 *
 * The REAL security enforcement is on the server:
 * - authMiddleware verifies JWT signature on every /api/* request
 * - adminMiddleware checks role='admin' in JWT payload on every /api/admin/* request
 * - Even if someone bypasses these client-side guards, all API calls will return 403
 *
 * Client-side role is read from sessionStorage which users can tamper with,
 * but the JWT token in memory is what the server trusts — and it is signed.
 */

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  if (!isLoggedIn()) return <Navigate to="/login" replace />
  return <>{children}</>
}

export function AdminRoute({ children }: { children: React.ReactNode }) {
  if (!isLoggedIn()) return <Navigate to="/login" replace />
  // isAdmin() checks both memory token presence AND sessionStorage role
  // Server will still reject any request with a non-admin JWT regardless
  if (!isAdmin()) return <Navigate to="/" replace />
  return <>{children}</>
}
