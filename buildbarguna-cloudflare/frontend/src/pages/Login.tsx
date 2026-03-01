import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi, setToken } from '../lib/api'
import { saveUser } from '../lib/auth'
import { Eye, EyeOff } from 'lucide-react'

export default function Login() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ phone: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)

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
    <div className="min-h-screen bg-gradient-to-br from-primary-900 to-primary-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        {/* Logo + title */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🏗️</div>
          <h1 className="text-2xl font-bold text-gray-900">বিল্ড বরগুনা</h1>
          <p className="text-gray-500 text-sm mt-1">হালাল গ্রুপ ইনভেস্টমেন্ট প্ল্যাটফর্ম</p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm flex items-start gap-2">
            <span className="flex-shrink-0 mt-0.5">⚠️</span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Phone */}
          <div>
            <label className="label" htmlFor="phone">মোবাইল নম্বর</label>
            <input
              id="phone"
              className="input"
              type="tel"
              placeholder="01XXXXXXXXX"
              value={form.phone}
              onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
              autoComplete="tel"
              inputMode="tel"
              required
            />
          </div>

          {/* Password with show/hide */}
          <div>
            <label className="label" htmlFor="password">পাসওয়ার্ড</label>
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
                onClick={() => setShowPass(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary w-full py-3 text-base"
            disabled={loading}
            aria-label="লগইন করুন"
          >
            {loading
              ? <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  লগইন হচ্ছে...
                </span>
              : 'লগইন করুন'}
          </button>
        </form>

        {/* Trust badge */}
        <div className="mt-5 bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
          <p className="text-xs text-emerald-700">✅ সম্পূর্ণ হালাল বিনিয়োগ প্ল্যাটফর্ম — সুদমুক্ত, মুশারাকা নীতি</p>
        </div>

        <p className="text-center text-sm text-gray-500 mt-5">
          অ্যাকাউন্ট নেই?{' '}
          <Link to="/register" className="text-primary-600 font-medium hover:underline">রেজিস্ট্রেশন করুন</Link>
        </p>
      </div>
    </div>
  )
}
