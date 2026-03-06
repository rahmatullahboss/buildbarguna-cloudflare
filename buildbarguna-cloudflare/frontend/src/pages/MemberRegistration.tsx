import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { memberApi } from '../lib/api'
import { authApi } from '../lib/api'
import { FileText, CheckCircle, AlertCircle, Download } from 'lucide-react'

export default function MemberRegistration() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<{ formNumber: string; name: string } | null>(null)
  const [downloading, setDownloading] = useState(false)

  // Check if already registered
  useEffect(() => {
    async function checkStatus() {
      const res = await memberApi.status()
      if (res.success && res.data.registered && res.data.form_number && res.data.name) {
        setSuccess({ formNumber: res.data.form_number, name: res.data.name })
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
    declaration_accepted: false
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

    const res = await memberApi.register(form)
    setLoading(false)

    if (!res.success) {
      setError((res as { error: string }).error)
      return
    }

    setSuccess({ formNumber: res.data.form_number, name: form.name_english })
    
    // Auto-download PDF after 1 second
    setTimeout(() => {
      downloadPDF(res.data.form_number)
    }, 1000)
  }

  async function downloadPDF(formNumber: string) {
    setDownloading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/member/certificate/${formNumber}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) throw new Error('পিডিএফ তৈরি করা যায়নি')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `BBI_Member_${formNumber}_${form.name_english.replace(/\s+/g, '_')}.pdf`
      link.click()
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setDownloading(false)
    }
  }

  function handleChange(field: string, value: string | boolean) {
    setForm(p => ({ ...p, [field]: value }))
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-teal-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <CheckCircle className="w-12 h-12 text-white" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">নিবন্ধন সফল হয়েছে!</h1>
          <p className="text-gray-600 mb-6">আপনার সদস্যপদ নিশ্চিত করা হয়েছে</p>

          <div className="bg-gradient-to-r from-primary-50 to-teal-50 rounded-2xl p-6 mb-6">
            <p className="text-sm text-gray-600 mb-1">ফর্ম নম্বর</p>
            <p className="text-2xl font-bold text-primary-700">{success.formNumber}</p>
            <p className="text-sm text-gray-500 mt-2">সদস্যের নাম: {success.name}</p>
          </div>

          <button
            onClick={() => downloadPDF(success.formNumber)}
            disabled={downloading}
            className="w-full bg-gradient-to-r from-primary-600 to-teal-600 text-white font-semibold py-4 rounded-2xl hover:from-primary-700 hover:to-teal-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Download className="w-5 h-5" />
            {downloading ? 'ডাউনলোড হচ্ছে...' : 'সদস্যপদ সার্টিফিকেট ডাউনলোড করুন'}
          </button>

          <button
            onClick={() => navigate('/dashboard')}
            className="w-full mt-4 text-primary-600 font-semibold py-3 hover:bg-primary-50 rounded-xl transition-all"
          >
            ড্যাশবোর্ডে যান
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-teal-700 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <FileText className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">সদস্য নিবন্ধন ফর্ম</h1>
          <p className="text-primary-100">বিল্ড বরগুনায় যোগ দিন এবং পরিবর্তনের অংশ হোন</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-4 mb-6 text-sm flex items-start gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information */}
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span>👤</span> ব্যক্তিগত তথ্য
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">নাম (ইংরেজি) *</label>
                  <input
                    className="input"
                    type="text"
                    placeholder="English Name"
                    value={form.name_english}
                    onChange={(e) => handleChange('name_english', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="label">নাম (বাংলা)</label>
                  <input
                    className="input"
                    type="text"
                    placeholder="বাংলা নাম"
                    value={form.name_bangla}
                    onChange={(e) => handleChange('name_bangla', e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">পিতার নাম *</label>
                  <input
                    className="input"
                    type="text"
                    placeholder="Father's Name"
                    value={form.father_name}
                    onChange={(e) => handleChange('father_name', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="label">মাতার নাম *</label>
                  <input
                    className="input"
                    type="text"
                    placeholder="Mother's Name"
                    value={form.mother_name}
                    onChange={(e) => handleChange('mother_name', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="label">জন্ম তারিখ *</label>
                  <input
                    className="input"
                    type="date"
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
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span>📞</span> যোগাযোগের তথ্য
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">মোবাইল নম্বর (WhatsApp) *</label>
                  <input
                    className="input"
                    type="tel"
                    placeholder="01XXX XXXXXX"
                    value={form.mobile_whatsapp}
                    onChange={(e) => handleChange('mobile_whatsapp', e.target.value)}
                    pattern="01[3-9]\d{8}"
                    required
                  />
                </div>
                <div>
                  <label className="label">ইমেইল</label>
                  <input
                    className="input"
                    type="email"
                    placeholder="email@example.com"
                    value={form.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">ফেসবুক আইডি</label>
                  <input
                    className="input"
                    type="text"
                    placeholder="Facebook ID Name"
                    value={form.facebook_id}
                    onChange={(e) => handleChange('facebook_id', e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">জরুরি যোগাযোগ</label>
                  <input
                    className="input"
                    type="tel"
                    placeholder="Guardian/Emergency Contact"
                    value={form.emergency_contact}
                    onChange={(e) => handleChange('emergency_contact', e.target.value)}
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="label">বর্তমান ঠিকানা *</label>
                <textarea
                  className="input"
                  rows={2}
                  placeholder="Present Address"
                  value={form.present_address}
                  onChange={(e) => handleChange('present_address', e.target.value)}
                  required
                />
              </div>
              <div className="mt-4">
                <label className="label">স্থায়ী ঠিকানা *</label>
                <textarea
                  className="input"
                  rows={2}
                  placeholder="Permanent Address"
                  value={form.permanent_address}
                  onChange={(e) => handleChange('permanent_address', e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Skills & Interests */}
            <div>
              <label className="label">দক্ষতা ও আগ্রহ</label>
              <textarea
                className="input"
                rows={3}
                placeholder="আপনার দক্ষতা এবং আগ্রহের ক্ষেত্র সম্পর্কে লিখুন..."
                value={form.skills_interests}
                onChange={(e) => handleChange('skills_interests', e.target.value)}
              />
            </div>

            {/* Declaration */}
            <div className="bg-gradient-to-r from-primary-50 to-teal-50 rounded-2xl p-6">
              <h3 className="font-bold text-gray-900 mb-3">ঘোষণা ও অঙ্গীকার</h3>
              <p className="text-sm text-gray-700 mb-4">
                আমি ঘোষণা করছি যে প্রদত্ত তথ্য সঠিক। বিল্ড বরগুনা ইনিশিয়েটিভ (BBI) এর সদস্য হিসেবে, আমি অঙ্গীকার করছি:
              </p>
              <ul className="text-sm text-gray-700 space-y-2 mb-4 list-disc list-inside">
                <li>সংগঠনের নিয়ম, বিধি এবং সিদ্ধান্ত মেনে চলব</li>
                <li>সর্বোচ্চ নৈতিক মান এবং শৃঙ্খলা বজায় রাখব</li>
                <li>প্রচারের উদ্দেশ্যে BBI-কে আমার ছবি/ভিডিও ব্যবহারের অনুমতি প্রদান করব</li>
                <li>অসদাচরণের জন্য Governing Body-এর পূর্ণ কর্তৃত্ব মেনে নেব</li>
              </ul>
              
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.declaration_accepted}
                  onChange={(e) => handleChange('declaration_accepted', e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500 mt-0.5"
                  required
                />
                <span className="text-sm text-gray-700">
                  আমি উপরের ঘোষণা ও অঙ্গীকার পাঠ করেছি এবং মেনে চলতে রাজি আছি *
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-primary-600 to-teal-600 text-white font-bold py-4 rounded-2xl hover:from-primary-700 hover:to-teal-700 transition-all text-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {loading ? 'জমা দেওয়া হচ্ছে...' : 'নিবন্ধন সম্পন্ন করুন'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-primary-100 text-sm mt-6">
          প্রশ্ন থাকলে যোগাযোগ করুন: bbi.official2025@gmail.com | 01971951960
        </p>
      </div>
    </div>
  )
}
