import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { authApi, referralsApi } from '../lib/api'
import { Gift, User, Mail, Phone, Lock, CheckCircle } from 'lucide-react'
import LottieIcon from '../components/LottieIcon'

export default function Register() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', referral_code: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [refValid, setRefValid] = useState<boolean | null>(null) // null=unchecked, true=valid, false=invalid
  const [refChecking, setRefChecking] = useState(false)
  const [referrerName, setReferrerName] = useState<string | null>(null)

  // Pre-fill referral code from URL ?ref=XXXX
  useEffect(() => {
    const ref = searchParams.get('ref')
    if (ref) setForm(p => ({ ...p, referral_code: ref.toUpperCase() }))
  }, [searchParams])

  // Live validation: REAL API check as user types (debounced 600ms)
  useEffect(() => {
    if (!form.referral_code) { setRefValid(null); setReferrerName(null); return }
    setRefChecking(true)
    const timer = setTimeout(async () => {
      const res = await referralsApi.checkCode(form.referral_code)
      setRefChecking(false)
      if (res.success) {
        setRefValid(true)
        setReferrerName(res.data.referrer_name)
      } else {
        setRefValid(false)
        setReferrerName(null)
      }
    }, 600)
    return () => clearTimeout(timer)
  }, [form.referral_code])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const body = { ...form, referral_code: form.referral_code || undefined, phone: form.phone || undefined }
    const res = await authApi.register(body)
    setLoading(false)
    if (!res.success) {
      // If backend rejects referral code, highlight it
      if ((res as { error: string }).error?.includes('রেফারেল')) setRefValid(false)
      setError((res as { error: string }).error)
      return
    }
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-teal-700 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative circles */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 relative z-10">
        <div className="text-center mb-7">
          <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg overflow-hidden">
            <img src="/bbi logo.jpg" alt="BBI Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">নতুন অ্যাকাউন্ট</h1>
          <p className="text-gray-500 text-sm mt-1">বিল্ড বরগুনায় যোগ দিন</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3 mb-4 text-sm flex items-start gap-2">
            <LottieIcon name="warning" className="w-5 h-5" /><span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label"><User size={16} className="inline-block mr-1" /> পূর্ণ নাম</label>
            <input className="input" type="text" placeholder="আপনার নাম" value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
          </div>
          <div>
            <label className="label"><Mail size={16} className="inline-block mr-1" /> ইমেইল ঠিকানা <span className="text-red-500">*</span></label>
            <input className="input" type="email" placeholder="আপনার ইমেইল দিন" value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
          </div>
          <div>
            <label className="label"><Phone size={16} className="inline-block mr-1" /> মোবাইল নম্বর <span className="text-gray-400 font-normal text-xs">(ঐচ্ছিক)</span></label>
            <input className="input" type="tel" placeholder="01XXXXXXXXX" value={form.phone}
              onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
              pattern="01[3-9][0-9]{8}"
              title="সঠিক বাংলাদেশি মোবাইল নম্বর দিন (যেমন: 01712345678)" />
          </div>
          <div>
            <label className="label"><Lock size={16} className="inline-block mr-1" /> পাসওয়ার্ড</label>
            <input className="input" type="password" placeholder="কমপক্ষে ৬ অক্ষর" value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required minLength={6} />
          </div>
          <div>
            <label className="label"><Gift size={16} className="inline-block mr-1" /> রেফারেল কোড <span className="text-gray-400 font-normal text-xs">(ঐচ্ছিক)</span></label>
            <div className="relative">
              <input
                className={`input pr-10 font-mono tracking-widest ${refValid === false ? 'border-red-400 focus:ring-red-300' : refValid === true ? 'border-green-400 focus:ring-green-300' : ''}`}
                type="text" placeholder="রেফারেল কোড থাকলে দিন"
                value={form.referral_code}
                onChange={e => setForm(p => ({ ...p, referral_code: e.target.value.toUpperCase() }))}
              />
              {refValid === true && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500 text-lg">✓</span>}
              {refValid === false && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500 text-lg">✗</span>}
            </div>
            {refChecking && (
              <p className="text-gray-400 text-xs mt-1 flex items-center gap-1">
                <span className="animate-spin inline-block w-3 h-3 border border-gray-300 border-t-gray-500 rounded-full" /> যাচাই করা হচ্ছে...
              </p>
            )}
            {!refChecking && refValid === true && (
              <p className="text-green-600 text-xs mt-1 flex items-center gap-1">
                <Gift size={12} /> {referrerName} এর কোড — প্রথম বিনিয়োগে তিনি বোনাস পাবেন! <LottieIcon name="gift" className="w-4 h-4" />
              </p>
            )}
            {!refChecking && refValid === false && form.referral_code && (
              <p className="text-red-500 text-xs mt-1">❌ রেফারেল কোড সঠিক নয়</p>
            )}
          </div>
          <button type="submit" className="btn-primary w-full py-3.5 text-base mt-2" disabled={loading}>
            {loading
              ? <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />রেজিস্ট্রেশন হচ্ছে...
                </span>
              : <><CheckCircle size={18} className="inline-block mr-1" /> রেজিস্ট্রেশন করুন</>}
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

        {/* Google Sign-Up Button */}
        <button
          type="button"
          onClick={() => {
            const isNative = window.location.protocol === 'capacitor:' || window.location.protocol === 'file:'
            const baseUrl = isNative
              ? (import.meta.env.VITE_WORKER_URL ?? 'https://buildbarguna-worker.rahmatullahzisan01.workers.dev')
              : window.location.origin
            window.location.href = `${baseUrl}/api/auth/google`
          }}
          className="w-full py-3.5 px-4 border-2 border-gray-300 rounded-xl flex items-center justify-center gap-3 text-gray-700 font-medium hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          aria-label="Google দিয়ে রেজিস্ট্রেশন করুন"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span>Google দিয়ে রেজিস্ট্রেশন করুন</span>
        </button>

        {/* Trust badge */}
        <div className="mt-5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-3 text-center">
          <p className="text-xs font-semibold text-emerald-800 flex items-center justify-center gap-1"><LottieIcon name="halal" className="w-4 h-4" /> সম্পূর্ণ হালাল বিনিয়োগ</p>
          <p className="text-xs text-emerald-600 mt-0.5">সুদমুক্ত • মুশারাকা নীতি • শরিয়াহ সম্মত</p>
        </div>

        <p className="text-center text-sm text-gray-500 mt-5">
          আগে থেকেই আছেন?{' '}
          <Link to="/login" className="text-primary-600 font-semibold hover:underline">লগইন করুন →</Link>
        </p>
      </div>
    </div>
  )
}
