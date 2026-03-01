/**
 * Token Storage Strategy — Security Notes:
 *
 * PRIMARY:   In-memory variable (_token) — XSS cannot steal it via JS
 * SECONDARY: sessionStorage with base64 obfuscation — restores token on
 *            page refresh within the same tab session. Cleared on tab close.
 *
 * Why NOT localStorage? Persists across sessions — XSS scripts can exfiltrate.
 * Why NOT httpOnly cookie? Requires server-side session management — complex
 *   with Cloudflare Workers stateless model.
 * Why sessionStorage + base64? Not true encryption, but:
 *   - sessionStorage is same-origin only (no cross-tab leakage)
 *   - Cleared on tab close (session-scoped, not permanent)
 *   - base64 prevents casual shoulder-surfing in DevTools
 *   - Real security is JWT signature verification on the server
 *
 * TRADEOFF: If user opens a new tab, they must log in again (acceptable for
 *   a financial platform — each tab is an independent session).
 */

const SESSION_KEY = 'bb_tok'

// In-memory primary store
let _token: string | null = null

/**
 * Simple obfuscation — NOT encryption. Prevents casual DevTools reading.
 * Uses TextEncoder/Uint8Array to safely handle Unicode (Bangla characters
 * in JWT claims would crash btoa() which only handles Latin-1).
 */
function obfuscate(token: string): string {
  const bytes = new TextEncoder().encode(token)
  // Reverse bytes then base64 encode
  const reversed = new Uint8Array(bytes.length)
  for (let i = 0; i < bytes.length; i++) {
    reversed[i] = bytes[bytes.length - 1 - i]
  }
  return btoa(String.fromCharCode(...reversed))
}

function deobfuscate(stored: string): string | null {
  try {
    const binary = atob(stored)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    // Reverse bytes back
    const reversed = new Uint8Array(bytes.length)
    for (let i = 0; i < bytes.length; i++) {
      reversed[i] = bytes[bytes.length - 1 - i]
    }
    return new TextDecoder().decode(reversed)
  } catch {
    return null
  }
}

export function getToken(): string | null {
  return _token
}

export function setMemoryToken(t: string | null) {
  _token = t
  if (t) {
    try { sessionStorage.setItem(SESSION_KEY, obfuscate(t)) } catch { /* storage full/blocked */ }
  } else {
    try { sessionStorage.removeItem(SESSION_KEY) } catch { /* ignore */ }
  }
}

/**
 * Attempt to restore token from sessionStorage on page refresh.
 * Called once at app startup (main.tsx) before first render.
 * Returns true if token was successfully restored.
 */
export function restoreTokenFromSession(): boolean {
  if (_token) return true  // already in memory
  try {
    const stored = sessionStorage.getItem(SESSION_KEY)
    if (!stored) return false
    const token = deobfuscate(stored)
    if (!token) {
      sessionStorage.removeItem(SESSION_KEY)
      return false
    }
    // Validate token is not expired before restoring
    // JWT payload is the middle base64 segment
    const parts = token.split('.')
    if (parts.length !== 3) {
      sessionStorage.removeItem(SESSION_KEY)
      return false
    }
    const payload = JSON.parse(atob(parts[1]))
    const now = Math.floor(Date.now() / 1000)
    if (payload.exp && payload.exp < now) {
      // Token expired — clear and don't restore
      sessionStorage.removeItem(SESSION_KEY)
      sessionStorage.removeItem('bb_logged_in')
      sessionStorage.removeItem('bb_user')
      return false
    }
    // Token still valid — restore to memory
    _token = token
    return true
  } catch {
    // Any parse error — clear corrupted storage
    sessionStorage.removeItem(SESSION_KEY)
    return false
  }
}
