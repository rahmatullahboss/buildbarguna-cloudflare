import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi, setToken } from '../lib/api'
import { saveUser, getUser } from '../lib/auth'
import { Phone, Gift, CheckCircle, User } from 'lucide-react'
import LottieIcon from '../components/LottieIcon'

export default function EditProfile() {
  const navigate = useNavigate()
  const user = getUser()
  const [form, setForm] = useState({ 
    name: user?.name || '', 
    phone: user?.phone || '', 
    referral_code: '' 
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (!user) {
      navigate('/login')
    }
  }, [user, navigate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    const res = await authApi.updateProfile({ 
      name: form.name,
      phone: form.phone, 
      referral_code: form.referral_code || undefined 
    })
    setLoading(false)
    
    if (!res.success) {
      setError((res as { error: string }).error)
      setTimeout(() => setError(''), 5000)
      return
    }

    // Update stored user
    if (res.data.user) {
      saveUser(res.data.user)
    }
    
    setSuccess('প্রোফাইল সফলভাবে আপডেট হয়েছে!')
    setTimeout(() => setSuccess(''), 3000)
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
          <h1 className="text-2xl font-bold text-gray-900">প্রোফাইল এডিট</h1>
          <p className="text-gray-500 text-sm mt-2">আপনার তথ্য আপডেট করুন</p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3 mb-4 text-sm flex items-start gap-2">
            <LottieIcon name="warning" className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-2xl px-4 py-3 mb-4 text-sm flex items-start gap-2">
            <CheckCircle size={20} className="flex-shrink-0" />
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="label" htmlFor="name">
              <User size={16} className="inline-block mr-1" /> নাম
            </label>
            <input
              id="name"
              className="input"
              type="text"
              placeholder="আপনার নাম"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              required
              minLength={2}
            />
          </div>

          {/* Phone Number */}
          <div>
            <label className="label" htmlFor="phone">
              <Phone size={16} className="inline-block mr-1" /> মোবাইল নম্বর
            </label>
            <input
              id="phone"
              className="input"
              type="tel"
              placeholder="01XXXXXXXXX"
              value={form.phone}
              onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
              pattern="01[3-9]\d{8}"
              title="সঠিক বাংলাদেশি মোবাইল নম্বর দিন"
              required
            />
            <p className="text-xs text-gray-500 mt-1">উদাহরণ: 01712345678</p>
          </div>

          {/* Referral Code (Optional) */}
          <div>
            <label className="label" htmlFor="referral_code">
              <Gift size={16} className="inline-block mr-1" /> রেফারেল কোড <span className="text-gray-400 font-normal">(ঐচ্ছিক)</span>
            </label>
            <input
              id="referral_code"
              className="input"
              type="text"
              placeholder="রেফারেল কোড দিন (যদি থাকে)"
              value={form.referral_code}
              onChange={e => setForm(p => ({ ...p, referral_code: e.target.value.toUpperCase() }))}
            />
            <p className="text-xs text-gray-500 mt-1">আপনার রেফারেল কোড: <span className="font-mono font-bold text-primary-600">{user?.referral_code}</span></p>
          </div>

          <button
            type="submit"
            className="btn-primary w-full py-3.5 text-base mt-2"
            disabled={loading}
            aria-label="সংরক্ষণ করুন"
          >
            {loading
              ? <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  সংরক্ষণ হচ্ছে...
                </span>
              : <><CheckCircle size={18} className="inline-block mr-1" /> সংরক্ষণ করুন</>}
          </button>
        </form>

        <button
          aria-label="আগের পেজে ফিরে যান"
          onClick={() => navigate(-1)}
          className="w-full py-3 mt-4 text-gray-600 hover:text-gray-800 text-sm"
        >
          ← ফিরে যান
        </button>
      </div>
    </div>
  )
}
