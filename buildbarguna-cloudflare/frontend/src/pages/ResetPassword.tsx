import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { authApi } from '../lib/api'
import { Eye, EyeOff, Lock, CheckCircle, AlertTriangle } from 'lucide-react'
import LottieIcon from '../components/LottieIcon'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [token, setToken] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [showConfirmPass, setShowConfirmPass] = useState(false)

  useEffect(() => {
    const tokenParam = searchParams.get('token')
    if (!tokenParam) {
      setError('অবৈধ রিসেট লিঙ্ক। অনুগ্রহ করে আবার চেষ্টা করুন।')
      return
    }
    setToken(tokenParam)
  }, [searchParams])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('পাসওয়ার্ড দুটি মিলছে না')
      return
    }

    // Validate password length
    if (password.length < 6) {
      setError('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে')
      return
    }

    setLoading(true)

    const res = await authApi.resetPassword(token, password)
    setLoading(false)

    if (!res.success) {
      setError((res as { error: string }).error)
      setTimeout(() => setError(''), 5000)
      return
    }

    setSuccess(true)
    // Redirect to login after 3 seconds
    setTimeout(() => navigate('/login'), 3000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-teal-700 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background circles */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 relative z-10">
        {/* Logo + title */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg overflow-hidden">
            <img src="/bbi logo.jpg" alt="BBI Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">নতুন পাসওয়ার্ড</h1>
          <p className="text-gray-500 text-sm mt-2">আপনার নতুন পাসওয়ার্ড দিন</p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-2xl px-4 py-4 mb-6 text-sm">
            <div className="flex items-start gap-3">
              <LottieIcon name="checkmark" className="w-6 h-6" />
              <div>
                <p className="font-semibold">পাসওয়ার্ড রিসেট সফল!</p>
                <p className="mt-1">
                  আপনার পাসওয়ার্ড সফলভাবে রিসেট হয়েছে। আপনি শীঘ্রই লগইন পেজে নিয়ে যাওয়া হবে।
                </p>
                <p className="mt-2 text-xs text-green-600 flex items-center gap-1">
                  <LottieIcon name="warning" className="w-4 h-4" /> ৩ সেকেন্ডের মধ্যে লগইন পেজে ফিরে যাবে...
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3 mb-6 text-sm flex items-start gap-2">
            <LottieIcon name="warning" className="w-5 h-5" />
            {error}
          </div>
        )}

        {!success && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* New Password */}
            <div>
              <label className="label" htmlFor="password"><Lock size={16} className="inline-block mr-1" /> নতুন পাসওয়ার্ড</label>
              <div className="relative">
                <input
                  id="password"
                  className="input pr-11"
                  type={showPass ? 'text' : 'password'}
                  placeholder="কমপক্ষে ৬ অক্ষর"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="new-password"
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

            {/* Confirm Password */}
            <div>
              <label className="label" htmlFor="confirmPassword"><Lock size={16} className="inline-block mr-1" /> পাসওয়ার্ড নিশ্চিত করুন</label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  className="input pr-11"
                  type={showConfirmPass ? 'text' : 'password'}
                  placeholder="পাসওয়ার্ড আবার দিন"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  aria-label={showConfirmPass ? 'পাসওয়ার্ড লুকান' : 'পাসওয়ার্ড দেখুন'}
                  title={showConfirmPass ? 'পাসওয়ার্ড লুকান' : 'পাসওয়ার্ড দেখুন'}
                  onClick={() => setShowConfirmPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-primary-500 rounded-md p-1"
                >
                  {showConfirmPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Password requirements */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3">
              <p className="text-xs font-semibold text-blue-800">পাসওয়ার্ড রিকোয়ারমেন্ট:</p>
              <ul className="text-xs text-blue-700 mt-2 space-y-1">
                <li className={password.length >= 6 ? 'text-green-600' : ''}>
                  {password.length >= 6 ? '✓' : '○'} কমপক্ষে ৬ অক্ষর
                </li>
                <li className={password === confirmPassword && password.length > 0 ? 'text-green-600' : ''}>
                  {password === confirmPassword && password.length > 0 ? '✓' : '○'} পাসওয়ার্ড মিলছে
                </li>
              </ul>
            </div>

            <button
              type="submit"
              className="btn-primary w-full py-3.5 text-base mt-2"
              disabled={loading || !token}
              aria-label="পাসওয়ার্ড রিসেট করুন"
            >
              {loading
                ? <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    রিসেট হচ্ছে...
                  </span>
                : <><Lock size={18} className="inline-block mr-1" /> পাসওয়ার্ড রিসেট করুন</>}
            </button>
          </form>
        )}

        {/* Trust badge */}
        <div className="mt-6 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-3 text-center">
          <p className="text-xs font-semibold text-emerald-800 flex items-center justify-center gap-1"><Lock size={14} /> নিরাপদ পাসওয়ার্ড রিসেট</p>
          <p className="text-xs text-emerald-600 mt-0.5">আপনার অ্যাকাউন্ট সুরক্ষিত রাখতে আমরা সর্বোচ্চ চেষ্টা করি</p>
        </div>
      </div>
    </div>
  )
}
