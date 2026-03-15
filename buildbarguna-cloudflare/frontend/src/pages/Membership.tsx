import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { memberApi, getToken } from '../lib/api'
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
  CreditCard,
  Edit,
  X,
  Send,
  ArrowLeftRight,
  Settings
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

interface MemberStatusDetail {
  registered: boolean
  id?: number
  form_number?: string
  name_english?: string
  name_bangla?: string
  status?: string
  payment_status?: string
  payment_method?: string
  payment_amount?: number
  created_at?: string
  verified_at?: string
  cancelled_at?: string
  cancellation_reason?: string
  previous_form_number?: string
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
  },
  active: { 
    label: 'সক্রিয়', 
    color: 'text-green-600', 
    bg: 'bg-green-100', 
    icon: BadgeCheck,
    desc: 'আপনার মেম্বারশিপ সক্রিয়'
  },
  cancelled: { 
    label: 'বাতিল', 
    color: 'text-red-600', 
    bg: 'bg-red-100', 
    icon: XCircle,
    desc: 'আপনার মেম্বারশিপ বাতিল হয়েছে'
  }
}

export default function Membership() {
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState('')
  const [showEditModal, setShowEditModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [editForm, setEditForm] = useState<Partial<MyRegistrationDetails>>({})
  const [cancelReason, setCancelReason] = useState('')
  const queryClient = useQueryClient()

  // Fetch membership details
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['my-registration'],
    queryFn: () => memberApi.getMyRegistration(),
    staleTime: 30_000
  })

  // Fetch detailed status (includes cancellation info)
  const { data: statusDetail } = useQuery({
    queryKey: ['member-status-detail'],
    queryFn: () => memberApi.getStatusDetail(),
    staleTime: 30_000
  })

  const memberStatus = statusDetail?.success ? statusDetail.data : null as MemberStatusDetail | null

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => memberApi.updateRegistration(data as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-registration'] })
      queryClient.invalidateQueries({ queryKey: ['member-status-detail'] })
      setShowEditModal(false)
      setEditForm({})
    }
  })

  // Cancel membership mutation
  const cancelMutation = useMutation({
    mutationFn: (reason: string) => memberApi.cancelMembership(reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-registration'] })
      queryClient.invalidateQueries({ queryKey: ['member-status-detail'] })
      setShowCancelModal(false)
      setCancelReason('')
    }
  })

  // Reapply mutation
  const reapplyMutation = useMutation({
    mutationFn: () => memberApi.reapply(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-registration'] })
      queryClient.invalidateQueries({ queryKey: ['member-status-detail'] })
    }
  })

  const registration = (data?.success ? data.data : null) as MyRegistrationDetails | null

  async function handleDownloadCertificate(formNumber: string) {
    setDownloading(true)
    setDownloadError('')
    try {
      const token = getToken()
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

      {/* Edit / Cancel / Reapply Buttons */}
      {memberStatus && memberStatus.registered && memberStatus.status === 'active' && (
        <div className="card">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Settings size={18} />
            মেম্বারশিপ পরিচালনা
          </h3>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => {
                setEditForm({
                  name_english: registration?.name_english,
                  name_bangla: registration?.name_bangla,
                  father_name: registration?.father_name,
                  mother_name: registration?.mother_name,
                  date_of_birth: registration?.date_of_birth,
                  blood_group: registration?.blood_group,
                  present_address: registration?.present_address,
                  permanent_address: registration?.permanent_address,
                  facebook_id: registration?.facebook_id,
                  mobile_whatsapp: registration?.mobile_whatsapp,
                  emergency_contact: registration?.emergency_contact,
                  email: registration?.email,
                  skills_interests: registration?.skills_interests
                })
                setShowEditModal(true)
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
            >
              <Edit size={18} />
              তথ্য সম্পাদনা
            </button>
            <button
              onClick={() => setShowCancelModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
            >
              <X size={18} />
              মেম্বারশিপ বাতিল
            </button>
          </div>
        </div>
      )}

      {/* Reapply Button for Cancelled Members */}
      {memberStatus && memberStatus.registered && memberStatus.status === 'cancelled' && (
        <div className="card border-2 border-red-200">
          <div className="text-center py-4">
            <XCircle size={48} className="text-red-500 mx-auto mb-3" />
            <h3 className="font-bold text-gray-900 mb-2">মেম্বারশিপ বাতিল হয়েছে</h3>
            <p className="text-gray-600 mb-4">
              বাতিলের কারণ: {memberStatus.cancellation_reason || 'উল্লেখ নেই'}
            </p>
            {memberStatus.previous_form_number && (
              <p className="text-sm text-gray-500 mb-4">
                পূর্বের ফর্ম নাম্বার: {memberStatus.previous_form_number}
              </p>
            )}
            <button
              onClick={() => reapplyMutation.mutate()}
              disabled={reapplyMutation.isPending}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 mx-auto"
            >
              <Send size={18} />
              {reapplyMutation.isPending ? 'আবেদন হচ্ছে...' : 'পুনরায় আবেদন করুন'}
            </button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">তথ্য সম্পাদনা</h2>
                <button onClick={() => setShowEditModal(false)} aria-label="মডেল বন্ধ করুন" className="p-2 hover:bg-gray-100 rounded-lg">
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">নাম (ইংরেজি)</label>
                  <input
                    type="text"
                    value={editForm.name_english || ''}
                    onChange={(e) => setEditForm({ ...editForm, name_english: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">নাম (বাংলা)</label>
                  <input
                    type="text"
                    value={editForm.name_bangla || ''}
                    onChange={(e) => setEditForm({ ...editForm, name_bangla: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">পিতার নাম</label>
                  <input
                    type="text"
                    value={editForm.father_name || ''}
                    onChange={(e) => setEditForm({ ...editForm, father_name: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">মাতার নাম</label>
                  <input
                    type="text"
                    value={editForm.mother_name || ''}
                    onChange={(e) => setEditForm({ ...editForm, mother_name: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">জন্ম তারিখ</label>
                  <input
                    type="text"
                    value={editForm.date_of_birth || ''}
                    onChange={(e) => setEditForm({ ...editForm, date_of_birth: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">রক্তের গ্রুপ</label>
                  <input
                    type="text"
                    value={editForm.blood_group || ''}
                    onChange={(e) => setEditForm({ ...editForm, blood_group: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">বর্তমান ঠিকানা</label>
                  <input
                    type="text"
                    value={editForm.present_address || ''}
                    onChange={(e) => setEditForm({ ...editForm, present_address: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">স্থায়ী ঠিকানা</label>
                  <input
                    type="text"
                    value={editForm.permanent_address || ''}
                    onChange={(e) => setEditForm({ ...editForm, permanent_address: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">মোবাইল (WhatsApp)</label>
                  <input
                    type="text"
                    value={editForm.mobile_whatsapp || ''}
                    onChange={(e) => setEditForm({ ...editForm, mobile_whatsapp: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">জরুরি যোগাযোগ</label>
                  <input
                    type="text"
                    value={editForm.emergency_contact || ''}
                    onChange={(e) => setEditForm({ ...editForm, emergency_contact: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">ইমেইল</label>
                  <input
                    type="email"
                    value={editForm.email || ''}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Facebook ID</label>
                  <input
                    type="text"
                    value={editForm.facebook_id || ''}
                    onChange={(e) => setEditForm({ ...editForm, facebook_id: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">দক্ষতা ও আগ্রহ</label>
                  <textarea
                    value={editForm.skills_interests || ''}
                    onChange={(e) => setEditForm({ ...editForm, skills_interests: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                    rows={3}
                  />
                </div>
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-6 py-2 border rounded-lg hover:bg-gray-50"
              >
                বাতিল
              </button>
              <button
                onClick={() => updateMutation.mutate(editForm)}
                disabled={updateMutation.isPending}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {updateMutation.isPending ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-red-600">মেম্বারশিপ বাতিল</h2>
                <button onClick={() => setShowCancelModal(false)} aria-label="মডেল বন্ধ করুন" className="p-2 hover:bg-gray-100 rounded-lg">
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="p-6">
              <p className="text-gray-600 mb-4">
                আপনি কি নিশ্চিত যে আপনি মেম্বারশিপ বাতিল করতে চান?
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">বাতিলের কারণ (কমপক্ষে ১০ অক্ষর)</label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
                  rows={4}
                  placeholder="আপনি কেন মেম্বারশিপ বাতিল করতে চান?"
                />
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="px-6 py-2 border rounded-lg hover:bg-gray-50"
              >
                না, রাখুন
              </button>
              <button
                onClick={() => cancelMutation.mutate(cancelReason)}
                disabled={cancelReason.length < 10 || cancelMutation.isPending}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {cancelMutation.isPending ? 'বাতিল হচ্ছে...' : 'হ্যাঁ, বাতিল করুন'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}