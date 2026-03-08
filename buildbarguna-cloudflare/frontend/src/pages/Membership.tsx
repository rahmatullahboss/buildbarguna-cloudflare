import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { memberApi } from '../lib/api'
import { formatDate } from '../lib/auth'
import { 
  FileText, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Download, 
  RefreshCw, 
  AlertCircle,
  User,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Heart
} from 'lucide-react'

export default function Membership() {
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState('')

  // Fetch membership details
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['my-registration'],
    queryFn: () => memberApi.getMyRegistration(),
    staleTime: 30_000
  })

  const registration = data?.success ? data.data : null

  async function handleDownloadCertificate(formNumber: string) {
    setDownloading(true)
    setDownloadError('')
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
      link.download = `BBI_Member_Certificate_${formNumber}.pdf`
      link.click()
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      setDownloadError(err.message || 'ডাউনলোড ব্যর্থ হয়েছে')
    } finally {
      setDownloading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">তথ্য লোড হচ্ছে...</p>
        </div>
      </div>
    )
  }

  // Not registered
  if (!registration?.registered) {
    return (
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        <div className="card bg-gradient-to-r from-primary-800 via-primary-700 to-teal-700 text-white">
          <div className="flex items-center gap-3">
            <FileText size={32} />
            <div>
              <h1 className="text-2xl font-bold">মেম্বারশিপ</h1>
              <p className="text-primary-100 text-sm">আপনার মেম্বারশিপ স্ট্যাটাস দেখুন</p>
            </div>
          </div>
        </div>

        <div className="card text-center py-12">
          <User size={48} className="mx-auto text-gray-300 mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">আপনি এখনো মেম্বার নন</h2>
          <p className="text-gray-500 mb-6">মেম্বারশিপের জন্য রেজিস্ট্রেশন করুন</p>
          <a 
            href="/member-registration" 
            className="inline-flex items-center gap-2 bg-primary-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-primary-700 transition-colors"
          >
            <FileText size={18} />
            রেজিস্ট্রেশন করুন
          </a>
        </div>
      </div>
    )
  }

  const isVerified = registration.payment_status === 'verified'
  const isPending = registration.payment_status === 'pending'
  const isRejected = registration.payment_status === 'rejected'

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="card bg-gradient-to-r from-primary-800 via-primary-700 to-teal-700 text-white">
        <div className="flex items-center gap-3">
          <FileText size={32} />
          <div>
            <h1 className="text-2xl font-bold">মেম্বারশিপ</h1>
            <p className="text-primary-100 text-sm">আপনার মেম্বারশিপ স্ট্যাটাস</p>
          </div>
        </div>
      </div>

      {/* Status Card */}
      <div className="card">
        {/* Status Badge */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            {isVerified && <CheckCircle className="text-green-500" size={24} />}
            {isPending && <Clock className="text-yellow-500" size={24} />}
            {isRejected && <XCircle className="text-red-500" size={24} />}
            <span className={`text-lg font-bold ${
              isVerified ? 'text-green-600' :
              isPending ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {isVerified ? 'যাচাইকৃত' : isPending ? 'অপেক্ষায়' : 'প্রত্যাখ্যাত'}
            </span>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 text-primary-600 hover:bg-primary-50 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
          >
            <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
            রিফ্রেশ
          </button>
        </div>

        {/* Form Number */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-500">ফর্ম নাম্বার</p>
          <p className="text-2xl font-bold text-gray-900">{registration.form_number}</p>
        </div>

        {/* Personal Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="flex items-start gap-3">
            <User size={18} className="text-gray-400 mt-0.5" />
            <div>
              <p className="text-xs text-gray-500">নাম</p>
              <p className="font-medium">{registration.name_english}</p>
              {registration.name_bangla && (
                <p className="text-sm text-gray-600">{registration.name_bangla}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <Calendar size={18} className="text-gray-400 mt-0.5" />
            <div>
              <p className="text-xs text-gray-500">জন্ম তারিখ</p>
              <p className="font-medium">{registration.date_of_birth}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <User size={18} className="text-gray-400 mt-0.5" />
            <div>
              <p className="text-xs text-gray-500">পিতার নাম</p>
              <p className="font-medium">{registration.father_name}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Heart size={18} className="text-gray-400 mt-0.5" />
            <div>
              <p className="text-xs text-gray-500">মাতার নাম</p>
              <p className="font-medium">{registration.mother_name}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Phone size={18} className="text-gray-400 mt-0.5" />
            <div>
              <p className="text-xs text-gray-500">মোবাইল</p>
              <p className="font-medium">{registration.mobile_whatsapp}</p>
            </div>
          </div>

          {registration.email && (
            <div className="flex items-start gap-3">
              <Mail size={18} className="text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500">ইমেইল</p>
                <p className="font-medium">{registration.email}</p>
              </div>
            </div>
          )}

          <div className="flex items-start gap-3 md:col-span-2">
            <MapPin size={18} className="text-gray-400 mt-0.5" />
            <div>
              <p className="text-xs text-gray-500">ঠিকানা</p>
              <p className="font-medium">
                {registration.present_address}
                {registration.permanent_address && ` (স্থায়ী: ${registration.permanent_address})`}
              </p>
            </div>
          </div>
        </div>

        {/* Payment Info */}
        <div className="border-t pt-4 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500">পেমেন্ট পদ্ধতি</p>
              <p className="font-medium capitalize">{registration.payment_method}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">রেজিস্ট্রেশন তারিখ</p>
              <p className="font-medium">{registration.created_at ? formatDate(registration.created_at) : '-'}</p>
            </div>
            {registration.verified_at && (
              <div>
                <p className="text-xs text-gray-500">যাচাই তারিখ</p>
                <p className="font-medium">{formatDate(registration.verified_at)}</p>
              </div>
            )}
            {registration.verified_by_name && (
              <div>
                <p className="text-xs text-gray-500">যাচাই করেছেন</p>
                <p className="font-medium">{registration.verified_by_name}</p>
              </div>
            )}
          </div>
        </div>

        {/* Payment Note (for rejected) */}
        {isRejected && registration.payment_note && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-2">
              <AlertCircle className="text-red-500 mt-0.5" size={18} />
              <div>
                <p className="font-medium text-red-800">প্রত্যাখ্যানের কারণ</p>
                <p className="text-red-700 text-sm">{registration.payment_note}</p>
              </div>
            </div>
          </div>
        )}

        {/* Download Button or Pending Message */}
        {isVerified ? (
          <div className="space-y-3">
            {downloadError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                {downloadError}
              </div>
            )}
            <button
              onClick={() => handleDownloadCertificate(registration.form_number!)}
              disabled={downloading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <Download size={18} />
              {downloading ? 'ডাউনলোড হচ্ছে...' : 'মেম্বারশিপ সার্টিফিকেট ডাউনলোড করুন'}
            </button>
          </div>
        ) : isPending ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Clock className="text-yellow-600 mt-0.5" size={20} />
              <div>
                <p className="font-medium text-yellow-800">পেমেন্ট যাচাইয়ের অপেক্ষায়</p>
                <p className="text-yellow-700 text-sm mt-1">
                  অ্যাডমিন আপনার পেমেন্ট যাচাই করার পর সার্টিফিকেট ডাউনলোড করতে পারবেন।
                </p>
                <p className="text-yellow-600 text-xs mt-2">
                  সাধারণত ২৪-৪৮ ঘণ্টার মধ্যে যাচাই সম্পন্ন হয়।
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <XCircle className="text-red-600 mt-0.5" size={20} />
              <div>
                <p className="font-medium text-red-800">মেম্বারশিপ প্রত্যাখ্যাত</p>
                <p className="text-red-700 text-sm mt-1">
                  অনুগ্রহ করে অ্যাডমিনের সাথে যোগাযোগ করুন।
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
