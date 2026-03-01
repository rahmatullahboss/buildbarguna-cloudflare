# Security Fixes - Implementation Guide

## Quick Fix Checklist

### Priority 1: Authentication (CRITICAL)
- [ ] Migrate tokens to httpOnly cookies
- [ ] Remove all localStorage token access
- [ ] Implement server-side admin verification

### Priority 2: Input Validation (CRITICAL)  
- [ ] Add backend validation for share quantities
- [ ] Validate all numeric inputs strictly
- [ ] Implement idempotency keys for purchases

### Priority 3: CSRF Protection (HIGH)
- [ ] Add CSRF tokens to all requests
- [ ] Validate tokens on backend
- [ ] Set SameSite=Strict on cookies

---

## File-by-File Fixes

### 1. lib/auth.ts - Remove Client-Side Role Checks

**BEFORE (VULNERABLE):**
```typescript
export function isAdmin(): boolean {
  return getUser()?.role === 'admin'
}
```

**AFTER (SECURE):**
```typescript
// DELETE the isAdmin() function entirely
// Only use for UI/UX routing, NOT security

// Optional: Keep for UI purposes only
export function getAdminUI(): boolean {
  // This is ONLY for hiding/showing UI elements
  // NEVER rely on this for actual security
  return getUser()?.role === 'admin'
}
```

---

### 2. lib/api.ts - Add CSRF & Request Improvements

**BEFORE (VULNERABLE):**
```typescript
const BASE = '/api'

function getToken() { return localStorage.getItem('bb_token') }

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
```

**AFTER (SECURE):**
```typescript
const BASE = process.env.REACT_APP_API_URL || '/api'

// DEPRECATED: Remove token from localStorage
function getToken() { 
  // Token now comes from httpOnly cookie set by server
  // Browser automatically includes it in requests
  return null 
}

let csrfToken: string | null = null

export function setCSRFToken(token: string) {
  csrfToken = token
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000) // 30s timeout

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>)
  }

  // Add CSRF token for state-changing operations
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method?.toUpperCase() || '')) {
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken
    }
  }

  try {
    const res = await fetch(`${BASE}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
      credentials: 'include' // Include cookies (httpOnly tokens)
    })

    clearTimeout(timeoutId)

    if (!res.ok && res.status === 401) {
      // Token expired, redirect to login
      window.location.href = '/login'
      return { success: false, error: 'Session expired' }
    }

    const json = await res.json()
    return json
  } catch (error) {
    clearTimeout(timeoutId)
    
    if (error instanceof TypeError && error.message.includes('abort')) {
      return { success: false, error: 'Request timeout - please try again' }
    }
    
    console.error(`Request failed [${path}]:`, error)
    return { success: false, error: 'Network error' }
  }
}

export const authApi = {
  register: (body: { name: string; phone: string; password: string; referral_code?: string }) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: { phone: string; password: string }) =>
    request<{ token?: string; user: UserProfile; csrf_token?: string }>('/auth/login', { 
      method: 'POST', 
      body: JSON.stringify(body),
      credentials: 'include'
    }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request<UserProfile & { balance_paisa: number }>('/auth/me')
}

// ... rest of exports unchanged ...
```

---

### 3. pages/Login.tsx - Store CSRF Token After Login

**BEFORE:**
```typescript
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault()
  setError('')
  setLoading(true)
  const res = await authApi.login(form)
  setLoading(false)
  if (!res.success) { setError(res.error); return }
  setToken(res.data.token)
  saveUser(res.data.user)
  navigate('/')
}
```

**AFTER:**
```typescript
import { setCSRFToken } from '../lib/api'

async function handleSubmit(e: React.FormEvent) {
  e.preventDefault()
  setError('')
  setLoading(true)
  const res = await authApi.login(form)
  setLoading(false)
  if (!res.success) { setError(res.error); return }
  
  // Token now comes from httpOnly cookie automatically
  // Don't use setToken() anymore
  
  // Store CSRF token if provided
  if (res.data.csrf_token) {
    setCSRFToken(res.data.csrf_token)
  }
  
  saveUser(res.data.user)
  navigate('/')
}
```

---

### 4. components/ProtectedRoute.tsx - Don't Check Role Client-Side

**BEFORE (VULNERABLE):**
```typescript
export function AdminRoute({ children }: { children: React.ReactNode }) {
  if (!isLoggedIn()) return <Navigate to="/login" replace />
  if (!isAdmin()) return <Navigate to="/" replace />  // ← Bypassable!
  return <>{children}</>
}
```

**AFTER (SECURE - UI Only):**
```typescript
import { Navigate } from 'react-router-dom'
import { isLoggedIn } from '../lib/auth'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  if (!isLoggedIn()) return <Navigate to="/login" replace />
  return <>{children}</>
}

export function AdminRoute({ children }: { children: React.ReactNode }) {
  // This is JUST for UX - we CANNOT enforce security here
  // The server will reject requests from non-admins with 403
  
  if (!isLoggedIn()) return <Navigate to="/login" replace />
  
  // Don't check role - show content and let server reject if needed
  // Handle 403 errors in the component itself
  return <>{children}</>
}
```

---

### 5. pages/ProjectDetail.tsx - Add Input Validation

**BEFORE (VULNERABLE):**
```typescript
const buyMutation = useMutation({
  mutationFn: () => sharesApi.buy({ 
    project_id: Number(id), 
    quantity: qty, 
    bkash_txid: txid 
  }),
  // ... rest
})

// Form input with no real validation:
<input className="input" type="number" min={1} max={p.available_shares}
  value={qty} onChange={e => { setQty(Number(e.target.value)); setError('') }} />
```

**AFTER (SECURE):**
```typescript
const [qty, setQty] = useState(1)
const [txid, setTxid] = useState('')
const [msg, setMsg] = useState('')
const [error, setError] = useState('')

// Validate quantity strictly
const validateQuantity = (value: number): string | null => {
  if (!Number.isInteger(value)) return 'Quantity must be a whole number'
  if (value < 1) return 'Minimum 1 share required'
  if (value > (p?.available_shares || 0)) return `Maximum ${p?.available_shares || 0} shares available`
  if (value > 1000000) return 'Quantity too large'
  return null
}

// Validate bKash ID
const validateTxid = (value: string): string | null => {
  const trimmed = value.trim()
  if (trimmed.length < 3) return 'Invalid Transaction ID'
  if (trimmed.length > 100) return 'Transaction ID too long'
  if (!/^[A-Z0-9]+$/i.test(trimmed)) return 'Transaction ID contains invalid characters'
  return null
}

const handleQtyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const value = Number(e.target.value)
  setQty(value)
  const err = validateQuantity(value)
  setError(err || '')
}

const handleTxidChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const value = e.target.value.trim()
  setTxid(value)
  const err = validateTxid(value)
  setError(err || '')
}

const handleBuyClick = () => {
  // Re-validate before submission
  const qtyErr = validateQuantity(qty)
  const txidErr = validateTxid(txid)
  
  if (qtyErr) {
    setError(qtyErr)
    return
  }
  if (txidErr) {
    setError(txidErr)
    return
  }
  
  // All good - submit
  buyMutation.mutate()
}

const buyMutation = useMutation({
  mutationFn: () => sharesApi.buy({
    project_id: Number(id),
    quantity: qty,
    bkash_txid: txid.trim()
  }),
  onSuccess: (res) => {
    if (res.success) {
      setMsg('শেয়ার কেনার অনুরোধ জমা হয়েছে! অ্যাডমিন অনুমোদন করলে পোর্টফোলিওতে যোগ হবে।')
      setTxid('')
      setQty(1)
      qc.invalidateQueries({ queryKey: ['projects'] })
    } else {
      setError(res.error)
    }
  },
  onError: () => {
    setError('Failed to submit request - please try again')
  }
})

return (
  // ... existing JSX until the form input ...
  
  <input 
    className="input" 
    type="number" 
    min={1} 
    max={p.available_shares}
    value={qty} 
    onChange={handleQtyChange}
  />
  
  <input 
    className="input" 
    type="text" 
    placeholder="TxID যেমন: 8N4K2M..."
    value={txid} 
    onChange={handleTxidChange}
  />
  
  <button
    onClick={handleBuyClick}
    disabled={buyMutation.isPending || !!error || qty < 1 || !txid}
    className="btn-primary w-full py-3"
  >
    {buyMutation.isPending ? 'জমা হচ্ছে...' : 'অনুরোধ জমা দিন'}
  </button>
)
```

---

### 6. pages/DailyTasks.tsx - Validate Task URLs

**BEFORE (VULNERABLE):**
```typescript
function handleClick(task: TaskItem) {
  window.open(`/api/tasks/${task.id}/redirect`, '_blank')
}
```

**AFTER (SECURE):**
```typescript
function handleClick(task: TaskItem) {
  const url = `/api/tasks/${task.id}/redirect`
  
  // Validate URL format
  try {
    const urlObj = new URL(url, window.location.origin)
    
    // Only allow our own domain
    if (urlObj.hostname !== window.location.hostname) {
      console.error('Invalid URL domain')
      return
    }
    
    // Only allow http/https
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      console.error('Invalid URL protocol')
      return
    }
    
    window.open(urlObj.toString(), '_blank')
  } catch (error) {
    console.error('Invalid URL:', error)
  }
}

// For displaying user-submitted content (admin notes, etc):
import DOMPurify from 'dompurify'

// In render:
{r.admin_note && (
  <p className="text-xs text-red-500 mt-1">
    নোট: {r.admin_note}  {/* React auto-escapes text, safe */}
  </p>
)}
```

---

### 7. Install DOMPurify for XSS Protection

```bash
npm install dompurify
npm install --save-dev @types/dompurify
```

**Usage in components:**
```typescript
import DOMPurify from 'dompurify'

// If you absolutely must render HTML:
<div dangerouslySetInnerHTML={{ 
  __html: DOMPurify.sanitize(userContent) 
}} />

// Better: Just use text (React escapes automatically)
<p>{userContent}</p>
```

---

### 8. Add Content Security Policy Header

**In vite.config.ts or backend:**
```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    headers: {
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https:",
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block'
    }
  }
})
```

**Better (backend headers):**
```javascript
// Express example
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self'")
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  next()
})
```

---

### 9. Environment Variables

**Create .env.local:**
```env
REACT_APP_API_URL=https://api.yourdomain.com
REACT_APP_ENVIRONMENT=production
```

**Create .env.development:**
```env
REACT_APP_API_URL=http://localhost:3000/api
REACT_APP_ENVIRONMENT=development
```

---

## Backend Requirements

### 1. Implement httpOnly Cookie Token Storage

```javascript
// Express + passport example
app.post('/auth/login', async (req, res) => {
  const user = await User.findOne({ phone: req.body.phone })
  if (!user || !user.validatePassword(req.body.password)) {
    return res.status(401).json({ success: false, error: 'Invalid credentials' })
  }
  
  const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: '7d'
  })
  
  // Set httpOnly cookie (not accessible via JS)
  res.cookie('bb_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  })
  
  // Generate CSRF token
  const csrfToken = crypto.randomBytes(32).toString('hex')
  res.cookie('_csrf', csrfToken, {
    httpOnly: false, // JS needs to read this
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  })
  
  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        referral_code: user.referral_code
      },
      csrf_token: csrfToken
    }
  })
})
```

### 2. Validate Admin Role on Every Endpoint

```javascript
// Middleware
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Not authenticated' })
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' })
  }
  next()
}

// Usage
app.post('/admin/projects', authenticate, requireAdmin, async (req, res) => {
  // ... create project
})
```

### 3. Validate CSRF Tokens

```javascript
// Middleware
function verifyCsrfToken(req, res, next) {
  const csrfToken = req.headers['x-csrf-token'] || req.body._csrf
  const cookieCsrf = req.cookies._csrf
  
  if (!csrfToken || !cookieCsrf || csrfToken !== cookieCsrf) {
    return res.status(403).json({ success: false, error: 'CSRF validation failed' })
  }
  next()
}

// Apply to state-changing endpoints
app.post('/api/*', verifyCsrfToken)
app.put('/api/*', verifyCsrfToken)
app.patch('/api/*', verifyCsrfToken)
app.delete('/api/*', verifyCsrfToken)
```

### 4. Strict Input Validation on Share Purchase

```javascript
app.post('/api/shares/buy', authenticate, verifyCsrfToken, async (req, res) => {
  const { project_id, quantity, bkash_txid } = req.body
  const userId = req.user.id
  
  // Validate quantity
  if (!Number.isInteger(quantity)) {
    return res.status(400).json({ success: false, error: 'Invalid quantity format' })
  }
  if (quantity < 1 || quantity > 1000000) {
    return res.status(400).json({ success: false, error: 'Quantity out of range' })
  }
  
  // Validate project exists and has shares
  const project = await Project.findById(project_id)
  if (!project) {
    return res.status(404).json({ success: false, error: 'Project not found' })
  }
  if (project.status !== 'active') {
    return res.status(400).json({ success: false, error: 'Project not active' })
  }
  if (quantity > project.available_shares) {
    return res.status(400).json({ success: false, error: 'Not enough shares available' })
  }
  
  // Validate bKash TxID
  if (typeof bkash_txid !== 'string' || bkash_txid.length < 3 || bkash_txid.length > 100) {
    return res.status(400).json({ success: false, error: 'Invalid bKash TxID' })
  }
  
  // Check if TxID already used (prevent duplicates)
  const existing = await ShareRequest.findOne({ bkash_txid })
  if (existing && existing.user_id === userId && existing.project_id === project_id) {
    return res.status(400).json({ success: false, error: 'This transaction already submitted' })
  }
  
  // Create share request
  const request = await ShareRequest.create({
    user_id: userId,
    project_id,
    quantity,
    total_amount: quantity * project.share_price,
    bkash_txid,
    status: 'pending'
  })
  
  res.json({ success: true, data: { id: request.id } })
})
```

---

## Testing Checklist

- [ ] Test with localStorage devtools disabled (check if app breaks)
- [ ] Try to modify role in localStorage and access admin routes (should fail with 403)
- [ ] Try to submit negative/huge share quantities (should be rejected)
- [ ] Test CSRF token validation (try request without token)
- [ ] Verify httpOnly cookies aren't accessible from JS
- [ ] Test XSS payloads in user inputs
- [ ] Verify CSP headers prevent inline scripts
- [ ] Test request timeout (slow network simulation)
- [ ] Verify sensitive data not in URL query strings

