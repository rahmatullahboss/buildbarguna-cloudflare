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
  Shield,
  BadgeCheck,
  Building2,
  ChevronRight,
  CreditCard
} from 'lucide-react'

interface MyRegistrationDetails {
  registered: boolean
  form_number?: string
  name_english?: string
  name_bangla?: string
  father_name?: string
  mother_name?: string
  date_of_birth?: string
  blood_group?: string
  present_address?: string
  permanent_address?: string
  facebook_id?: string
  mobile_whatsapp?: string
  emergency_contact?: string
  email?: string
  skills_interests?: string
  payment_status?: string
  payment_method?: string
  payment_amount?: number
  payment_note?: string
  created_at?: string
  verified_at?: string
  verified_by_name?: string
}

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: any; desc: string }> = {
  pending: { 
    label: 'অপেক্ষায়', 
    color: 'text-yellow-600', 
    bg: 'bg-yellow-100', 
    icon: Clock,
    desc: 'আপনার পেমেন্ট যাচাই হচ্ছে'
  },
  verified: { 
    label: 'যাচাইকৃত', 
    color: 'text-green-600', 
    bg: 'bg-green-100', 
    icon: BadgeCheck,
    desc: 'আপনি এখন সম্পূর্ণ মেম্বার'
  },
  rejected: { 
    label: 'প্রত্যাখ্যাত', 
    color: 'text-red-600', 
    bg: 'bg-red-100', 
    icon: XCircle,
    desc: 'অনুগ্রহ করে অ্যাডমিনের সাথে যোগাযোগ করুন'
  }
}

export default function Membership() {
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState('')

  // Fetch membership details
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['my-registration'],
    queryFn: () => memberApi.getMyRegistration(),
    staleTime: 30_000
  })

  const registration = (data?.success ? data.data : null) as MyRegistrationDetails | null

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

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">তথ্য লোড হচ্ছে...</p>
        </div>
      </div>
    )
  }

  // Not registered
  if (!registration?.registered) {
    return (
      <div className="space-y-6">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-primary-600 via-purple-600 to-pink-600 rounded-3xl p-8 text-white shadow-lg">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-white/20 p-4 rounded-2xl">
              <Building2 size={40} />
            </div>
            <div>
              <h1 className="text-3xl font-bold">মেম্বারশিপ</h1>
              <p className="text-white/80 text-lg mt-1">Build Barguna Initiative (BBI)</p>
            </div>
          </div>
          <p className="text-white/90">
            একজন মেম্বার হিসেবে আপনার সুবিধাসমূহ উপভোগ করতে আজই রেজিস্ট্রেশন করুন
          </p>
        </div>

        {/* Benefits Card */}
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 mb-4">মেম্বার হওয়ার সুবিধাসমূহ</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-4 bg-green-50 rounded-xl">
              <CheckCircle className="text-green-600 mt-1" size={20} />
              <div>
                <p className="font-medium text-green-900">অফিসিয়াল সার্টিফিকেট</p>
                <p className="text-sm text-green-700">যাচাইকৃত মেম্বার হিসেবে প্রমাণপত্র</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl">
              <Shield className="text-blue-600 mt-1" size={20} />
              <div>
                <p className="font-medium text-blue-900">বিশেষ সুবিধা</p>
                <p className="text-sm text-blue-700">প্রজেক্টে অগ্রাধিকার সুবিধা</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-xl">
              <User className="text-purple-600 mt-1" size={20} />
              <div>
                <p className="font-medium text-purple-900">কমিউনিটি অ্যাক্সেস</p>
                <p className="text-sm text-purple-700">বিশেষ মেম্বার গ্রুপে যোগদান</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl">
              <BadgeCheck className="text-amber-600 mt-1" size={20} />
              <div>
                <p className="font-medium text-amber-900">লাইফটাইম মেম্বারশিপ</p>
                <p className="text-sm text-amber-700">একবার মেম্বার সার্টিফিকেট, সারাজীবন</p>
              </div>
            </div>
          </div>
        </div>

        {/* Registration CTA */}
        <div className="card text-center py-12 bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText size={40} className="text-primary-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">আপনি এখনো মেম্বার নন</h2>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            মাত্র ১০০ টাকায় মেম্বার হোন এবং সকল সুবিধা উপভোগ করুন
          </p>
          <a 
            href="/member-registration" 
            className="inline-flex items-center gap-2 bg-primary-600 text-white px-8 py-3 rounded-xl font-medium hover:bg-primary-700 transition-colors shadow-lg"
          >
            <FileText size={20} />
            রেজিস্ট্রেশন করুন
            <ChevronRight size={20} />
          </a>
        </div>
      </div>
    )
  }

  const status = statusConfig[registration.payment_status || 'pending'] || statusConfig.pending
  const StatusIcon = status.icon
  const isVerified = registration.payment_status === 'verified'
  const isPending = registration.payment_status === 'pending'
  const isRejected = registration.payment_status === 'rejected'

  return (
    <div className="space-y-6 pb-20">
      {/* Header - Fixed */}
      <div className="bg-gradient-to-r from-primary-600 via-purple-600 to-pink-600 rounded-3xl p-6 text-white shadow-lg sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-3 rounded-2xl">
              <Building2 size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">মেম্বারশিপ</h1>
              <p className="text-white/80 text-sm">আপনার মেম্বারশিপ স্ট্যাটাস</p>
            </div>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="bg-white/20 hover:bg-white/30 disabled:opacity-50 px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
          >
            <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
            রিফ্রেশ
          </button>
        </div>
      </div>

      {/* Status Card */}
      <div className={`card border-l-4 ${
        isVerified ? 'border-l-green-500' : isPending ? 'border-l-yellow-500' : 'border-l-red-500'
      }`}>
        {/* Status Badge */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-full ${status.bg}`}>
              <StatusIcon className={status.color} size={28} />
            </div>
            <div>
              <h2 className={`text-xl font-bold ${status.color}`}>{status.label}</h2>
              <p className="text-gray-500 text-sm">{status.desc}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">ফর্ম নাম্বার</p>
            <p className="text-2xl font-bold text-gray-900 font-mono">{registration.form_number}</p>
          </div>
        </div>

        {/* Download Button or Message */}
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
              className="w-full btn-primary flex items-center justify-center gap-2 py-3"
            >
              <Download size={20} />
              {downloading ? 'ডাউনলোড হচ্ছে...' : 'মেম্বারশিপ সার্টিফিকেট ডাউনলোড করুন'}
            </button>
            <p className="text-center text-xs text-gray-500">
              আপনার সার্টিফিকেটটি সারাজীবনের জন্য বৈধ
            </p>
          </div>
        ) : isPending ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Clock className="text-yellow-600 mt-1" size={24} />
              <div className="flex-1">
                <p className="font-medium text-yellow-800">পেমেন্ট যাচাইয়ের অপেক্ষায়</p>
                <p className="text-yellow-700 text-sm mt-1">
                  অ্যাডমিন আপনার পেমেন্ট যাচাই করার পর সার্টিফিকেট ডাউনলোড করতে পারবেন।
                </p>
                <div className="mt-3 flex items-center gap-2 text-yellow-600 text-sm">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                  সাধারণত ২৪-৪৮ ঘণ্টার মধ্যে যাচাই সম্পন্ন হয়
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <XCircle className="text-red-600 mt-1" size={24} />
              <div className="flex-1">
                <p className="font-medium text-red-800">মেম্বারশিপ প্রত্যাখ্যাত</p>
                <p className="text-red-700 text-sm mt-1">
                  {registration.payment_note || 'অনুগ্রহ করে অ্যাডমিনের সাথে যোগাযোগ করুন।'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Member Info Card */}
      <div className="card">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <User size={18} />
          মেম্বার তথ্য
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Profile Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center text-white font-bold text-2xl">
                {registration.name_english?.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{registration.name_english}</p>
                {registration.name_bangla && (
                  <p className="text-gray-500">{registration.name_bangla}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">জন্ম তারিখ</p>
                <p className="font-medium">{registration.date_of_birth || '-'}</p>
              </div>
              {registration.blood_group && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">রক্তের গ্রুপ</p>
                  <p className="font-medium">{registration.blood_group}</p>
                </div>
              )}
            </div>
          </div>

          {/* Parents Info */}
          <div className="space-y-3">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">পিতার নাম</p>
              <p className="font-medium">{registration.father_name}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">মাতার নাম</p>
              <p className="font-medium">{registration.mother_name}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Info */}
      <div className="card">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Phone size={18} />
          যোগাযোগ তথ্য
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Phone size={18} className="text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">মোবাইল (WhatsApp)</p>
              <p className="font-medium">{registration.mobile_whatsapp}</p>
            </div>
          </div>
          
          {registration.email && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Mail size={18} className="text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">ইমেইল</p>
                <p className="font-medium">{registration.email}</p>
              </div>
            </div>
          )}

          {registration.emergency_contact && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <AlertCircle size={18} className="text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">জরুরি যোগাযোগ</p>
                <p className="font-medium">{registration.emergency_contact}</p>
              </div>
            </div>
          )}
        </div>

        {/* Address */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-start gap-3">
            <MapPin size={18} className="text-gray-400 mt-1" />
            <div>
              <p className="text-xs text-gray-500">ঠিকানা</p>
              <p className="font-medium">{registration.present_address}</p>
              {registration.permanent_address && (
                <p className="text-sm text-gray-500">স্থায়ী: {registration.permanent_address}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Payment Info */}
      <div className="card">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <CreditCard size={18} />
          পেমেন্ট তথ্য
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-xs text-blue-600">পেমেন্ট পদ্ধতি</p>
            <p className="font-medium capitalize">{registration.payment_method}</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-xs text-blue-600">ফি</p>
            <p className="font-medium">৳{(registration.payment_amount || 0) / 100}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">রেজিস্ট্রেশন তারিখ</p>
            <p className="font-medium">{registration.created_at ? formatDate(registration.created_at) : '-'}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">যাচাই তারিখ</p>
            <p className="font-medium">{registration.verified_at ? formatDate(registration.verified_at) : '-'}</p>
          </div>
        </div>

        {registration.verified_by_name && (
          <div className="mt-3 p-3 bg-green-50 rounded-lg">
            <p className="text-xs text-green-600">যাচাই করেছেন: <span className="font-medium">{registration.verified_by_name}</span></p>
          </div>
        )}
      </div>

      {/* Help Card */}
      <div className="card bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100">
        <h3 className="font-bold text-gray-900 mb-2">সাহায্য প্রয়োজন?</h3>
        <p className="text-sm text-gray-600 mb-3">
          যেকোনো প্রশ্ন বা সমস্যার জন্য আমাদের সাথে যোগাযোগ করুন
        </p>
        <div className="flex flex-wrap gap-2">
          <a 
            href="mailto:bbi.official2025@gmail.com" 
            className="inline-flex items-center gap-2 text-sm text-primary-600 hover:underline"
          >
            <Mail size={14} />
            bbi.official2025@gmail.com
          </a>
          <span className="text-gray-400">|</span>
          <span className="text-sm text-gray-600">মোবাইল: 01971951960</span>
        </div>
      </div>
    </div>
  )
}