import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { memberApi } from '../lib/api'
import { authApi } from '../lib/api'
import { FileText, CheckCircle, AlertCircle, Download, Wallet, Smartphone, Home, RefreshCw, ArrowLeft } from 'lucide-react'

export default function MemberRegistration() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<{ formNumber: string; name: string; paymentStatus: string } | null>(null)
  const [downloading, setDownloading] = useState(false)

  // Check if already registered
  useEffect(() => {
    async function checkStatus() {
      const res = await memberApi.status()
      if (res.success && res.data.registered && res.data.form_number) {
        setSuccess({ formNumber: res.data.form_number, name: '', paymentStatus: res.data.payment_status || 'pending' })
      }
    }
    checkStatus()
  }, [])

  const [form, setForm] = useState({
    name_english: '',
    name_bangla: '',
    father_name: '',
    mother_name: '',
    date_of_birth: '',
    blood_group: '',
    present_address: '',
    permanent_address: '',
    facebook_id: '',
    mobile_whatsapp: '',
    emergency_contact: '',
    email: '',
    skills_interests: '',
    declaration_accepted: false,
    payment_method: 'bkash' as 'bkash' | 'nagad' | 'cash',
    payment_number: '',
    payment_trx_id: '',
    payment_note: ''
  })

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!form.declaration_accepted) {
      setError('আপনাকে ঘোষণা অনুমোদন করতে হবে')
      setLoading(false)
      return
    }

    // Validate Mobile Banking payment
    if ((form.payment_method === 'bkash' || form.payment_method === 'nagad') && !form.payment_trx_id) {
      setError('অনুগ্রহ করে ট্রানজেকশন আইডি দিন')
      setLoading(false)
      return
    }

    // Validate payment number format
    if ((form.payment_method === 'bkash' || form.payment_method === 'nagad') && form.payment_number && !/^01[3-9]\d{8}$/.test(form.payment_number)) {
      setError('অকার্যকর নাম্বার। সঠিক ফরম্যাট: 01XXXXXXXXX')
      setLoading(false)
      return
    }

    // Build clean payload - remove empty strings and irrelevant payment fields
    const payload: any = {
      name_english: form.name_english,
      name_bangla: form.name_bangla || undefined,
      father_name: form.father_name,
      mother_name: form.mother_name,
      date_of_birth: form.date_of_birth,
      blood_group: form.blood_group || undefined,
      present_address: form.present_address,
      permanent_address: form.permanent_address,
      facebook_id: form.facebook_id || undefined,
      mobile_whatsapp: form.mobile_whatsapp,
      emergency_contact: form.emergency_contact || undefined,
      email: form.email || undefined,
      skills_interests: form.skills_interests || undefined,
      declaration_accepted: form.declaration_accepted,
      payment_method: form.payment_method,
      payment_note: form.payment_note || undefined
    }

    // Only include payment fields if method is mobile banking
    // We send payload.bkash_number to match the API and DB schema
    if (form.payment_method === 'bkash' || form.payment_method === 'nagad') {
      payload.bkash_number = form.payment_number || undefined
      payload.bkash_trx_id = form.payment_trx_id || undefined
    }

    const res = await memberApi.register(payload)
    setLoading(false)

    if (!res.success) {
      // Handle both string and object errors
      const errorMsg = typeof (res as any).error === 'string' 
        ? (res as { error: string }).error 
        : 'সঠিক তথ্য দিন এবং আবার চেষ্টা করুন'
      setError(errorMsg)
      return
    }

    setSuccess({ formNumber: res.data.form_number, name: form.name_english, paymentStatus: res.data.payment_status })

    // Don't auto-download - admin must verify first
    // User will be notified that they need to wait for admin verification
  }

  async function downloadPDF(formNumber: string) {
    setDownloading(true)
    try {
      const token = localStorage.getItem('token')
      // Fetch certificate data as JSON from preview endpoint
      const response = await fetch(`/api/member/certificate/${formNumber}/preview`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!response.ok) {
        const json = await response.json()
        throw new Error(json.error || 'পিডিএফ তৈরি করা যায়নি')
      }

      const json = await response.json()

      // Generate PDF in browser — zero server CPU cost
      const { downloadMemberCertificate } = await import('../lib/certificateGenerator')
      await downloadMemberCertificate(json.data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setDownloading(false)
    }
  }

  function handleChange(field: string, value: string | boolean) {
    setForm(p => ({ ...p, [field]: value }))
  }

  // If already registered, show success message
  if (success) {
    return (
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        <div className="card bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle size={32} className="text-green-600" />
            <h2 className="text-2xl font-bold text-green-900">রেজিস্ট্রেশন সফল!</h2>
          </div>
          
          <div className="space-y-3 text-green-800">
            <p><strong>ফর্ম নাম্বার:</strong> {success.formNumber}</p>
            <p><strong>নাম:</strong> {success.name}</p>
            <p><strong>পেমেন্ট স্ট্যাটাস:</strong> 
              <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                success.paymentStatus === 'verified' ? 'bg-green-200 text-green-800' :
                success.paymentStatus === 'paid' ? 'bg-blue-200 text-blue-800' :
                'bg-orange-200 text-orange-800'
              }`}>
                {success.paymentStatus === 'verified' ? 'যাচাই করা হয়েছে' :
                 success.paymentStatus === 'paid' ? 'পরিশোধিত' : 'অপরিশোধিত'}
              </span>
            </p>
          </div>

          {success.paymentStatus === 'verified' ? (
            <button
              onClick={() => downloadPDF(success.formNumber)}
              disabled={downloading}
              className="mt-4 btn-primary flex items-center gap-2 w-full justify-center"
            >
              <Download size={18} />
              {downloading ? 'ডাউনলোড হচ্ছে...' : 'মেম্বারশিপ সার্টিফিকেট ডাউনলোড করুন'}
            </button>
          ) : (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-800 font-medium">আপনার পেমেন্ট pending</p>
              <p className="text-blue-700 text-sm mt-1">
                অ্যাডমিন আপনার bKash TRX ID অথবা Cash পেমেন্ট যাচাই করার পর সার্টিফিকেট ডাউনলোড করতে পারবেন
              </p>
              <p className="text-blue-600 text-xs mt-2">
                অ্যাডমিন যাচাই করার পর এই পেজে এসে যেকোনো সময় ডাউনলোড করতে পারবেন
              </p>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="btn-primary flex items-center justify-center gap-2 flex-1"
          >
            <Home size={18} />
            ড্যাশবোর্ডে যান
          </button>
          <button
            onClick={() => window.location.reload()}
            className="btn-secondary flex items-center justify-center gap-2 flex-1"
          >
            <RefreshCw size={18} />
            স্ট্যাটাস রিফ্রেশ করুন
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="card bg-gradient-to-r from-primary-800 via-primary-700 to-teal-700 text-white">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors flex-shrink-0"
            aria-label="পিছনে যান"
          >
            <ArrowLeft size={20} />
          </button>
          <FileText size={32} />
          <div>
            <h1 className="text-2xl font-bold">BBI মেম্বার রেজিস্ট্রেশন</h1>
            <p className="text-primary-100 text-sm">রেজিস্ট্রেশন ফি: ৳100</p>
          </div>
        </div>
      </div>

      {/* Payment Info Box */}
      <div className="card bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <Wallet size={24} className="text-blue-600 mt-1" />
          <div>
            <h3 className="font-bold text-blue-900">পেমেন্ট তথ্য</h3>
            <div className="mt-2 text-blue-800 space-y-3">
              <div className="flex flex-col gap-1.5">
                <p><strong>bKash নাম্বার (Send Money):</strong> <span className="font-mono bg-blue-100 px-2 py-1 rounded select-all font-semibold text-lg tracking-wider">01635222142</span></p>
                <p><strong>Nagad নাম্বার (Send Money):</strong> <span className="font-mono bg-blue-100 px-2 py-1 rounded select-all font-semibold text-lg tracking-wider text-orange-600">01306410966</span></p>
              </div>
              <p><strong>পেমেন্ট পদ্ধতি:</strong> bKash, Nagad অথবা Cash</p>
              <p><strong>টাকা:</strong> ৳100 (একশত টাকা)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="card bg-red-50 border-red-200 flex items-center gap-3">
          <AlertCircle size={20} className="text-red-600" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Registration Form */}
      <form onSubmit={handleSubmit} className="card space-y-6">
        {/* Personal Information */}
        <div>
          <h3 className="font-bold text-lg mb-4">ব্যক্তিগত তথ্য</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">নাম (ইংরেজি) *</label>
              <input
                className="input"
                value={form.name_english}
                onChange={(e) => handleChange('name_english', e.target.value)}
                placeholder="English name as per NID"
                required
              />
            </div>
            <div>
              <label className="label">নাম (বাংলা)</label>
              <input
                className="input"
                value={form.name_bangla}
                onChange={(e) => handleChange('name_bangla', e.target.value)}
                placeholder="বাংলা নাম"
              />
            </div>
            <div>
              <label className="label">পিতার নাম *</label>
              <input
                className="input"
                value={form.father_name}
                onChange={(e) => handleChange('father_name', e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">মাতার নাম *</label>
              <input
                className="input"
                value={form.mother_name}
                onChange={(e) => handleChange('mother_name', e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">জন্ম তারিখ *</label>
              <input
                type="date"
                className="input"
                value={form.date_of_birth}
                onChange={(e) => handleChange('date_of_birth', e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">রক্তের গ্রুপ</label>
              <select
                className="input"
                value={form.blood_group}
                onChange={(e) => handleChange('blood_group', e.target.value)}
              >
                <option value="">নির্বাচন করুন</option>
                {bloodGroups.map(bg => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div>
          <h3 className="font-bold text-lg mb-4">যোগাযোগের তথ্য</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">বর্তমান ঠিকানা *</label>
              <textarea
                className="input"
                rows={2}
                value={form.present_address}
                onChange={(e) => handleChange('present_address', e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">স্থায়ী ঠিকানা *</label>
              <textarea
                className="input"
                rows={2}
                value={form.permanent_address}
                onChange={(e) => handleChange('permanent_address', e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">মোবাইল (WhatsApp) *</label>
              <input
                type="tel"
                className="input"
                value={form.mobile_whatsapp}
                onChange={(e) => handleChange('mobile_whatsapp', e.target.value)}
                placeholder="01XXX-XXXXXX"
                pattern="01[3-9]\d{8}"
                required
              />
            </div>
            <div>
              <label className="label">ইমেইল</label>
              <input
                type="email"
                className="input"
                value={form.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="example@email.com"
              />
            </div>
            <div>
              <label className="label">Facebook ID</label>
              <input
                className="input"
                value={form.facebook_id}
                onChange={(e) => handleChange('facebook_id', e.target.value)}
                placeholder="facebook.com/your.id"
              />
            </div>
            <div>
              <label className="label">জরুরি যোগাযোগ</label>
              <input
                type="tel"
                className="input"
                value={form.emergency_contact}
                onChange={(e) => handleChange('emergency_contact', e.target.value)}
                placeholder="01XXX-XXXXXX"
              />
            </div>
          </div>
        </div>

        {/* Skills & Interests */}
        <div>
          <label className="label">দক্ষতা ও আগ্রহ</label>
          <textarea
            className="input"
            rows={3}
            value={form.skills_interests}
            onChange={(e) => handleChange('skills_interests', e.target.value)}
            placeholder="আপনার দক্ষতা, শিক্ষাগত যোগ্যতা, এবং পেশাদার আগ্রহ সম্পর্কে লিখুন"
          />
        </div>

        {/* Payment Section */}
        <div className="border-t pt-6">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <Wallet size={20} />
            পেমেন্ট তথ্য (৳100)
          </h3>
          
          <div className="bg-blue-50 p-4 rounded-lg mb-4">
            <div className="flex items-center gap-2 text-blue-900 mb-3">
              <Smartphone size={18} />
              <strong>bKash / Nagad পেমেন্ট:</strong>
            </div>
            <div className="flex flex-col gap-2 mb-2 text-blue-800">
              <p>
                <strong>bKash (Send Money):</strong>{' '}
                <span className="font-mono bg-white px-2 py-1 rounded select-all font-semibold tracking-wider">01635222142</span>
              </p>
              <p>
                <strong>Nagad (Send Money):</strong>{' '}
                <span className="font-mono bg-white px-2 py-1 rounded select-all font-semibold tracking-wider text-orange-600">01306410966</span>
              </p>
            </div>
            <p className="text-blue-700 text-sm mt-2">
              উপরের যেকোনো একটি নাম্বারে ৳100 সেন্ড মানি করুন এবং পেমেন্ট করার পর নিচের ফর্মে আপনার নাম্বার ও ট্রানজেকশন আইডি দিন।
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">পেমেন্ট পদ্ধতি *</label>
              <select
                className="input"
                value={form.payment_method}
                onChange={(e) => handleChange('payment_method', e.target.value)}
                required
              >
                <option value="bkash">bKash</option>
                <option value="nagad">Nagad</option>
                <option value="cash">Cash</option>
              </select>
            </div>

            {(form.payment_method === 'bkash' || form.payment_method === 'nagad') ? (
              <>
                <div>
                  <label className="label">আপনার {form.payment_method === 'bkash' ? 'bKash' : 'Nagad'} নাম্বার</label>
                  <input
                    type="tel"
                    className="input"
                    value={form.payment_number}
                    onChange={(e) => handleChange('payment_number', e.target.value)}
                    placeholder="01XXX-XXXXXX"
                    pattern="01[3-9]\d{8}"
                  />
                </div>
                <div>
                  <label className="label">{form.payment_method === 'bkash' ? 'bKash' : 'Nagad'} ট্রানজেকশন আইডি *</label>
                  <input
                    className="input"
                    value={form.payment_trx_id}
                    onChange={(e) => handleChange('payment_trx_id', e.target.value)}
                    placeholder="e.g., 9H8G7F6E5D"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    পেমেন্ট করার পর প্রাপ্ত ট্রানজেকশন আইডি কপি করুন
                  </p>
                </div>
              </>
            ) : (
              <div className="md:col-span-2">
                <label className="label">ক্যাশ পেমেন্ট নোট</label>
                <textarea
                  className="input"
                  rows={2}
                  value={form.payment_note}
                  onChange={(e) => handleChange('payment_note', e.target.value)}
                  placeholder="ক্যাশ পেমেন্টের বিবরণ লিখুন (যেমন: অফিসে জমা দিয়েছেন, কার কাছে দিয়েছেন ইত্যাদি)"
                />
              </div>
            )}
          </div>
        </div>

        {/* Declaration */}
        <div className="border-t pt-6">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.declaration_accepted}
              onChange={(e) => handleChange('declaration_accepted', e.target.checked)}
              className="mt-1 w-5 h-5"
            />
            <span className="text-sm text-gray-700">
              আমি ঘোষণা করছি যে, উপরে প্রদত্ত তথ্যাবলী সত্য এবং সঠিক। আমি BuildBarguna Inc. (BBI) এর সদস্য হতে আগ্রহী।
            </span>
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full"
        >
          {loading ? 'জমা দেওয়া হচ্ছে...' : 'রেজিস্ট্রেশন জমা দিন (৳100)'}
        </button>
      </form>
    </div>
  )
}
