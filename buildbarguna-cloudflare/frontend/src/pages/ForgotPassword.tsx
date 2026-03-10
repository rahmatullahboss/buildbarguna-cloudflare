import { useState } from 'react'
import { Link } from 'react-router-dom'
import { authApi } from '../lib/api'
import { ArrowLeft } from 'lucide-react'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await authApi.forgotPassword(email)
    setLoading(false)

    if (!res.success) {
      setError((res as { error: string }).error)
      setTimeout(() => setError(''), 5000)
      return
    }

    setSuccess(true)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-teal-700 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background circles */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 relative z-10">
        {/* Back button */}
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors mb-6"
        >
          <ArrowLeft size={16} />
          লগইন পেজে ফিরে যান
        </Link>

        {/* Logo + title */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg overflow-hidden">
            <img src="/bbi logo.jpg" alt="BBI Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">পাসওয়ার্ড রিসেট</h1>
          <p className="text-gray-500 text-sm mt-2">ইমেইল দিলে আমরা রিসেট লিঙ্ক পাঠাবো</p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-2xl px-4 py-4 mb-6 text-sm">
            <div className="flex items-start gap-3">
              <span className="text-xl">✅</span>
              <div>
                <p className="font-semibold">ইমেইল পাঠানো হয়েছে!</p>
                <p className="mt-1">
                  যদি আপনার ইমেইলটি রেজিস্টার্ড থাকে, তবে আপনি শীঘ্রই একটি পাসওয়ার্ড রিসেট লিঙ্ক পাবেন।
                </p>
                <p className="mt-2 text-xs text-green-600">
                  💡 ইনবক্স চেক করুন এবং স্প্যাম ফোল্ডারও দেখে নিন।
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3 mb-6 text-sm flex items-start gap-2">
            <span className="flex-shrink-0 mt-0.5">⚠️</span>
            {error}
          </div>
        )}

        {!success && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="label" htmlFor="email">📧 ইমেইল ঠিকানা</label>
              <input
                id="email"
                className="input"
                type="email"
                placeholder="আপনার ইমেইল দিন"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <button
              type="submit"
              className="btn-primary w-full py-3.5 text-base mt-2"
              disabled={loading}
              aria-label="রিসেট লিঙ্ক দিন"
            >
              {loading
                ? <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    পাঠানো হচ্ছে...
                  </span>
                : '📧 রিসেট লিঙ্ক দিন'}
            </button>
          </form>
        )}

        {/* Info box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <p className="text-xs text-blue-800">
            <span className="font-semibold">💡 মনে রাখবেন:</span>
          </p>
          <ul className="text-xs text-blue-700 mt-2 space-y-1">
            <li>• রিসেট লিঙ্কটি ১৫ মিনিটের জন্য বৈধ</li>
            <li>• লিঙ্কটি একবারই ব্যবহার করা যাবে</li>
            <li>• ইমেইল না পেলে স্প্যাম ফোল্ডার চেক করুন</li>
          </ul>
        </div>

        {/* Trust badge */}
        <div className="mt-6 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-3 text-center">
          <p className="text-xs font-semibold text-emerald-800">🔒 নিরাপদ পাসওয়ার্ড রিসেট</p>
          <p className="text-xs text-emerald-600 mt-0.5">আপনার অ্যাকাউন্ট সুরক্ষিত রাখতে আমরা সর্বোচ্চ চেষ্টা করি</p>
        </div>
      </div>
    </div>
  )
}
