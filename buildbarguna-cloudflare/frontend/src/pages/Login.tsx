import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { authApi, setToken } from '../lib/api'
import { saveUser } from '../lib/auth'
import { Eye, EyeOff, Mail, Lock, CheckCircle } from 'lucide-react'
import LottieIcon from '../components/LottieIcon'
import SEO from '../components/SEO'

export default function Login() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [form, setForm] = useState({ identifier: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)

  // Handle Google OAuth callback
  useEffect(() => {
    const sessionId = searchParams.get('oauth_session')
    const authError = searchParams.get('error')

    if (authError) {
      setError('Google লগইন ব্যর্থ হয়েছে। আবার চেষ্টা করুন।')
      setTimeout(() => setError(''), 5000)
      return
    }

    if (sessionId) {
      // Fetch user data from backend using session ID
      const fetchSession = async () => {
        try {
          const WORKER_URL = import.meta.env.VITE_WORKER_URL ?? 'https://buildbargunainitiative.org'
          const res = await fetch(`${WORKER_URL}/api/auth/session/${sessionId}`, {
            credentials: 'include'
          })
          const json = await res.json()
          
          if (json.success && json.data) {
            setToken(json.data.token)
            saveUser(json.data.user)
            
            // Check if user needs to complete profile (Google signup without phone)
            if (json.data.needsProfileCompletion) {
              window.history.replaceState(null, '', '/login')
              navigate('/complete-profile', { replace: true })
              return
            }
            
            // Redirect to dashboard (single navigation, remove query params via state)
            const targetUrl = json.data.user.role === 'admin' ? '/admin' : '/dashboard'
            window.history.replaceState(null, '', '/login') // Clean URL without navigation
            navigate(targetUrl, { replace: true })
          } else {
            setError('সেশন এক্সপায়ার্ড হয়েছে। আবার লগইন করুন।')
            setTimeout(() => setError(''), 5000)
          }
        } catch (e) {
          console.error('Failed to fetch OAuth session:', e)
          setError('লগইন সম্পন্ন করা যায়নি')
          setTimeout(() => setError(''), 5000)
        }
      }
      
      fetchSession()
    }
  }, [searchParams, navigate])

  // Auto-dismiss error after 5s
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await authApi.login(form)
    setLoading(false)
    if (!res.success) {
      setError((res as { error: string }).error)
      setTimeout(() => setError(''), 5000)
      return
    }
    setToken(res.data.token)
    saveUser(res.data.user)
    // Admin → admin dashboard, member → member dashboard
    navigate(res.data.user.role === 'admin' ? '/admin' : '/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-teal-700 flex items-center justify-center p-4 relative overflow-hidden">
      <SEO title="লগইন" description="Build Barguna Initiative (BBI) - প্ল্যাটফর্মে লগইন করে আপনার বিনিয়োগ ড্যাশবোর্ড ও মুনাফা দেখুন।" />
      {/* Decorative background circles */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 relative z-10">
        {/* Logo + title */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg overflow-hidden">
            <img src="/bbi logo.jpg" alt="BBI Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">বিল্ড বরগুনা</h1>
          <p className="text-gray-500 text-sm mt-2">শরিয়াহ-সম্মত profit-sharing প্ল্যাটফর্ম</p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3 mb-4 text-sm flex items-start gap-2">
            <LottieIcon name="warning" className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email or Phone */}
          <div>
            <label className="label" htmlFor="identifier">
              <Mail size={16} className="inline-block mr-1" /> ইমেইল অথবা <Mail size={16} className="inline-block mr-1" /> মোবাইল নম্বর
            </label>
            <input
              id="identifier"
              className="input"
              type="text"
              placeholder="ইমেইল অথবা 01XXXXXXXXX"
              value={form.identifier}
              onChange={e => setForm(p => ({ ...p, identifier: e.target.value }))}
              autoComplete="username"
              required
            />
          </div>

          {/* Password with show/hide */}
          <div>
            <label className="label" htmlFor="password">
              <Lock size={16} className="inline-block mr-1" /> পাসওয়ার্ড
            </label>
            <div className="relative">
              <input
                id="password"
                className="input pr-11"
                type={showPass ? 'text' : 'password'}
                placeholder="পাসওয়ার্ড দিন"
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                aria-label={showPass ? 'পাসওয়ার্ড লুকান' : 'পাসওয়ার্ড দেখুন'}
                title={showPass ? 'পাসওয়ার্ড লুকান' : 'পাসওয়ার্ড দেখুন'}
                onClick={() => setShowPass(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-primary-500 rounded-md p-1"
              >
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Forgot Password Link */}
          <div className="text-right">
            <Link to="/forgot-password" className="text-sm text-primary-600 hover:underline">
              পাসওয়ার্ড ভুলে গেছেন?
            </Link>
          </div>

          <button
            type="submit"
            className="btn-primary w-full py-3.5 text-base mt-2"
            disabled={loading}
            aria-label="লগইন করুন"
          >
            {loading
              ? <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  লগইন হচ্ছে...
                </span>
              : <><CheckCircle size={18} className="inline-block mr-1" /> লগইন করুন</>}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white text-gray-500 text-xs">অথবা</span>
          </div>
        </div>

        {/* Google Sign-In Button */}
        <button
          type="button"
          onClick={() => {
            const WORKER_URL = import.meta.env.VITE_WORKER_URL ?? 'https://buildbargunainitiative.org'
            window.location.href = `${WORKER_URL}/api/auth/google`
          }}
          className="w-full py-3.5 px-4 border-2 border-gray-300 rounded-xl flex items-center justify-center gap-3 text-gray-700 font-medium hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          aria-label="Google দিয়ে লগইন করুন"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span>Google দিয়ে লগইন করুন</span>
        </button>

        {/* Trust badges */}
        <div className="mt-5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 justify-center">
            <LottieIcon name="halal" className="w-6 h-6" />
            <div className="text-center">
              <p className="text-xs font-semibold text-emerald-800">শরিয়াহ-সম্মত profit-sharing</p>
              <p className="text-xs text-emerald-600">সুদমুক্ত কাঠামো • মুশারাকা-ধাঁচ • governance review</p>
            </div>
          </div>
        </div>

        <p className="text-center text-sm text-gray-500 mt-5">
          অ্যাকাউন্ট নেই?{' '}
          <Link to="/register" className="text-primary-600 font-semibold hover:underline">রেজিস্ট্রেশন করুন →</Link>
        </p>
      </div>
    </div>
  )
}
