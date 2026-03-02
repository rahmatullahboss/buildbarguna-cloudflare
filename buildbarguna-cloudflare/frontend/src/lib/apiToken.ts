/**
 * Token Storage Strategy — Security Notes:
 *
 * PRIMARY:   In-memory variable (_token) — XSS cannot steal it via JS
 * SECONDARY: sessionStorage (web) or localStorage (Capacitor native) with
 *            base64 obfuscation — restores token on page refresh / app resume.
 *
 * Why sessionStorage on web? Cleared on tab close — session-scoped, more
 *   secure. XSS cannot persist the token across sessions.
 * Why localStorage on native? Capacitor Android clears sessionStorage when
 *   the app is backgrounded/killed, forcing re-login every time. localStorage
 *   persists across app restarts. Native apps don't share storage cross-tab
 *   and the WebView origin is isolated, so the XSS cross-session risk is
 *   greatly reduced compared to a public browser.
 * Why NOT httpOnly cookie? Requires server-side session management — complex
 *   with Cloudflare Workers stateless model.
 * Why base64 obfuscation? Not true encryption, but prevents casual
 *   shoulder-surfing in DevTools. Real security is JWT signature verification
 *   on the server.
 *
 * TRADEOFF (web): If user opens a new tab, they must log in again (acceptable
 *   for a financial platform — each tab is an independent session).
 */

const SESSION_KEY = 'bb_tok'

/**
 * Detect Capacitor native platform (Android/iOS).
 * On native, the WebView uses capacitor: or file: protocol, or exposes the
 * Capacitor global. Falls back to false in SSR / non-browser environments.
 */
const isNative: boolean =
  typeof window !== 'undefined' &&
  (window.location.protocol === 'capacitor:' ||
    window.location.protocol === 'file:' ||
    (window as any)?.Capacitor?.isNativePlatform?.() === true)

/** Returns localStorage on native, sessionStorage on web. */
function getStorage(): Storage {
  return isNative ? localStorage : sessionStorage
}

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
    try { getStorage().setItem(SESSION_KEY, obfuscate(t)) } catch { /* storage full/blocked */ }
  } else {
    try { getStorage().removeItem(SESSION_KEY) } catch { /* ignore */ }
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
    const storage = getStorage()
    const stored = storage.getItem(SESSION_KEY)
    if (!stored) return false
    const token = deobfuscate(stored)
    if (!token) {
      storage.removeItem(SESSION_KEY)
      return false
    }
    // Validate token is not expired before restoring
    // JWT payload is the middle base64 segment
    const parts = token.split('.')
    if (parts.length !== 3) {
      storage.removeItem(SESSION_KEY)
      return false
    }
    const payload = JSON.parse(atob(parts[1]))
    const now = Math.floor(Date.now() / 1000)
    if (payload.exp && payload.exp < now) {
      // Token expired — clear and don't restore
      storage.removeItem(SESSION_KEY)
      storage.removeItem('bb_logged_in')
      storage.removeItem('bb_user')
      return false
    }
    // Token still valid — restore to memory
    _token = token
    return true
  } catch {
    // Any parse error — clear corrupted storage
    getStorage().removeItem(SESSION_KEY)
    return false
  }
}
