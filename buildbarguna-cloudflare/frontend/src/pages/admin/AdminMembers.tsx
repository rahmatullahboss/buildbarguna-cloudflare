import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { memberApi } from '../../lib/api'
import { formatDate } from '../../lib/auth'
import { 
  CheckCircle, 
  XCircle, 
  Download, 
  Eye, 
  FileText, 
  Users,
  Search,
  Clock,
  AlertTriangle,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CreditCard,
  Filter,
  MoreVertical,
  ChevronDown,
  ChevronUp,
  BadgeCheck,
  UserCheck,
  UserX,
  FileCheck,
  History,
  TrendingUp,
  Building2
} from 'lucide-react'

// Status badges
const statusConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  pending: { label: 'অপেক্ষমাণ', color: 'text-yellow-600', bg: 'bg-yellow-100', icon: Clock },
  verified: { label: 'যাচাইকৃত', color: 'text-green-600', bg: 'bg-green-100', icon: BadgeCheck },
  rejected: { label: 'প্রত্যাখ্যাত', color: 'text-red-600', bg: 'bg-red-100', icon: UserX },
  paid: { label: 'পরিশোধিত', color: 'text-blue-600', bg: 'bg-blue-100', icon: CreditCard }
}

interface Member {
  id: number
  form_number: string
  name_english: string
  name_bangla?: string
  father_name: string
  mother_name: string
  date_of_birth: string
  blood_group?: string
  present_address: string
  permanent_address: string
  mobile_whatsapp: string
  emergency_contact?: string
  email?: string
  facebook_id?: string
  skills_interests?: string
  payment_method: string
  payment_amount: number
  payment_status: string
  payment_note?: string
  bkash_number?: string
  bkash_trx_id?: string
  created_at: string
  verified_at?: string
  verified_by_name?: string
  user_phone?: string
  user_id?: number
}

export default function AdminMembers() {
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState<'pending' | 'verified' | 'rejected' | 'all'>('pending')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set())
  const [verifyNote, setVerifyNote] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const limit = 20

  // Fetch members with pagination
  const { data: membersData, isLoading: membersLoading, refetch } = useQuery({
    queryKey: ['member-list', activeTab, currentPage],
    queryFn: () => memberApi.getMemberList(activeTab, 'all', currentPage, limit)
  })

  // Stats query
  const { data: allMembersData } = useQuery({
    queryKey: ['member-list', 'all', 1, 1000],
    queryFn: () => memberApi.getMemberList('all', 'all', 1, 1000)
  })

  const members = membersData?.success ? membersData.data.members : []
  const allMembers = allMembersData?.success ? allMembersData.data.members : []
  const pagination = membersData?.success ? membersData.data.pagination : null

  // Calculate stats
  const stats = {
    total: allMembers?.length || 0,
    pending: allMembers?.filter((m: Member) => m.payment_status === 'pending').length || 0,
    verified: allMembers?.filter((m: Member) => m.payment_status === 'verified').length || 0,
    rejected: allMembers?.filter((m: Member) => m.payment_status === 'rejected').length || 0,
    totalRevenue: (allMembers?.filter((m: Member) => m.payment_status === 'verified').reduce((sum, m: Member) => sum + (m.payment_amount || 0), 0) || 0) / 100
  }

  // Verify mutation
  const verifyMutation = useMutation({
    mutationFn: ({ id, action, note }: { id: number; action: 'approve' | 'reject'; note?: string }) =>
      memberApi.verifyPayment(id, action, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['member-list'] })
      setSelectedMember(null)
      setVerifyNote('')
      setShowDetails(false)
    }
  })

  // Bulk certificate mutation
  const bulkCertMutation = useMutation({
    mutationFn: () => memberApi.bulkGenerateCertificates(),
    onSuccess: (data) => {
      if (data.success && data.data) {
        alert(`সফল! ${data.data.generated_count}টি সার্টিফিকেট তৈরি করা হয়েছে।`)
      }
    }
  })

  // Filter members
  const filteredMembers = members?.filter((m: Member) => 
    !searchTerm || 
    m.name_english?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.form_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.user_phone?.includes(searchTerm) ||
    m.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleVerify = (id: number, action: 'approve' | 'reject') => {
    if (action === 'reject' && !verifyNote) {
      alert('প্রত্যাখ্যানের কারণ উল্লেখ করুন')
      return
    }
    if (confirm(`${action === 'approve' ? 'অনুমোদন' : 'প্রত্যাখ্যান'} করতে চান?`)) {
      verifyMutation.mutate({ id, action, note: verifyNote || undefined })
    }
  }

  const handleDownloadCertificate = async (formNumber: string) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/member/certificate/${formNumber}/preview`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!response.ok) {
        const json = await response.json()
        throw new Error(json.error || 'ডাউনলোড ব্যর্থ')
      }
      const json = await response.json()
      const { downloadMemberCertificate } = await import('../../lib/certificateGenerator')
      await downloadMemberCertificate(json.data)
    } catch (err: any) {
      alert(err.message || 'সার্টিফিকেট ডাউনলোড ব্যর্থ হয়েছে')
    }
  }

  const handlePreviewCertificate = async (formNumber: string) => {
    // Preview = same as download (generates PDF and saves)
    await handleDownloadCertificate(formNumber)
  }

  const toggleExpand = (id: number) => {
    setExpandedCards(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Loading state
  if (membersLoading && !members?.length) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">তথ্য লোড হচ্ছে...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-3xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-3 rounded-2xl">
              <Building2 size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">মেম্বারশিপ ম্যানেজমেন্ট</h1>
              <p className="text-white/80 text-sm mt-1">সদস্য রেজিস্ট্রেশন ও যাচাই বাছাই</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => refetch()}
              className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            >
              রিফ্রেশ
            </button>
            <button
              onClick={() => bulkCertMutation.mutate()}
              disabled={bulkCertMutation.isPending}
              className="bg-white text-purple-600 hover:bg-white/90 px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
            >
              <FileCheck size={16} />
              {bulkCertMutation.isPending ? 'তৈরি হচ্ছে...' : 'বাল্ক সার্টিফিকেট'}
            </button>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="card bg-gradient-to-br from-gray-50 to-gray-100 border-l-4 border-gray-400">
          <div className="flex items-center gap-2 mb-2">
            <Users size={18} className="text-gray-500" />
            <span className="text-xs text-gray-500">মোট সদস্য</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="card bg-gradient-to-br from-yellow-50 to-amber-100 border-l-4 border-yellow-500">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={18} className="text-yellow-600" />
            <span className="text-xs text-yellow-700">অপেক্ষমাণ</span>
          </div>
          <p className="text-3xl font-bold text-yellow-700">{stats.pending}</p>
        </div>
        <div className="card bg-gradient-to-br from-green-50 to-emerald-100 border-l-4 border-green-500">
          <div className="flex items-center gap-2 mb-2">
            <BadgeCheck size={18} className="text-green-600" />
            <span className="text-xs text-green-700">যাচাইকৃত</span>
          </div>
          <p className="text-3xl font-bold text-green-700">{stats.verified}</p>
        </div>
        <div className="card bg-gradient-to-br from-red-50 to-rose-100 border-l-4 border-red-500">
          <div className="flex items-center gap-2 mb-2">
            <UserX size={18} className="text-red-600" />
            <span className="text-xs text-red-700">প্রত্যাখ্যাত</span>
          </div>
          <p className="text-3xl font-bold text-red-700">{stats.rejected}</p>
        </div>
        <div className="card bg-gradient-to-br from-purple-50 to-violet-100 border-l-4 border-purple-500">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={18} className="text-purple-600" />
            <span className="text-xs text-purple-700">মোট রাজস্ব</span>
          </div>
          <p className="text-2xl font-bold text-purple-700">৳{stats.totalRevenue.toLocaleString('bn-BD')}</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="নাম, ফর্ম নং, মোবাইল বা ইমেইল দিয়ে খুঁজুন..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setActiveTab('pending'); setCurrentPage(1) }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'pending' 
                  ? 'bg-yellow-100 text-yellow-700 border-2 border-yellow-400' 
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              অপেক্ষমাণ ({stats.pending})
            </button>
            <button
              onClick={() => { setActiveTab('verified'); setCurrentPage(1) }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'verified' 
                  ? 'bg-green-100 text-green-700 border-2 border-green-400' 
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              যাচাইকৃত ({stats.verified})
            </button>
            <button
              onClick={() => { setActiveTab('all'); setCurrentPage(1) }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'all' 
                  ? 'bg-purple-100 text-purple-700 border-2 border-purple-400' 
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              সকল
            </button>
          </div>
        </div>
      </div>

      {/* Members List */}
      <div className="space-y-3">
        {filteredMembers?.length === 0 ? (
          <div className="card text-center py-12">
            <Users className="mx-auto text-gray-300 mb-3" size={48} />
            <p className="text-gray-500 font-medium">কোনো মেম্বার পাওয়া যায়নি</p>
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="text-primary-600 text-sm mt-2 hover:underline">
                খুঁজুন মুছে দেখুন
              </button>
            )}
          </div>
        ) : (
          filteredMembers?.map((member: Member) => {
            const isExpanded = expandedCards.has(member.id)
            const status = statusConfig[member.payment_status] || statusConfig.pending
            
            return (
              <div 
                key={member.id} 
                className={`card border-l-4 transition-all ${
                  member.payment_status === 'pending' ? 'border-l-yellow-500' :
                  member.payment_status === 'verified' ? 'border-l-green-500' :
                  'border-l-red-500'
                }`}
              >
                {/* Main Row */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg shrink-0">
                      {member.name_english?.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900">{member.name_english}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${status.bg} ${status.color}`}>
                          {status.label}
                        </span>
                        <span className="font-mono text-xs text-gray-400">{member.form_number}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                        <span className="flex items-center gap-1">
                          <Phone size={12} /> {member.user_phone || member.mobile_whatsapp}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar size={12} /> {formatDate(member.created_at)}
                        </span>
                        <span>•</span>
                        <span className="capitalize">{member.payment_method}</span>
                        <span>•</span>
                        <span className="font-medium">৳{(member.payment_amount || 0) / 100}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {member.payment_status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleVerify(member.id, 'approve')}
                          disabled={verifyMutation.isPending}
                          className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          <CheckCircle size={16} />
                          অনুমোদন
                        </button>
                        <button
                          onClick={() => handleVerify(member.id, 'reject')}
                          disabled={verifyMutation.isPending}
                          className="flex items-center gap-1.5 bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          <XCircle size={16} />
                          প্রত্যাখ্যান
                        </button>
                      </>
                    )}
                    {member.payment_status === 'verified' && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handlePreviewCertificate(member.form_number)}
                          className="flex items-center gap-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-3 py-2 rounded-lg text-sm font-medium"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => handleDownloadCertificate(member.form_number)}
                          className="flex items-center gap-1.5 bg-green-100 hover:bg-green-200 text-green-700 px-3 py-2 rounded-lg text-sm font-medium"
                        >
                          <Download size={14} />
                        </button>
                      </div>
                    )}
                    <button
                      onClick={() => toggleExpand(member.id)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Personal Info */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">ব্যক্তিগত তথ্য</h4>
                        <div className="space-y-1 text-sm">
                          <p><span className="text-gray-500">পিতা:</span> <span className="font-medium">{member.father_name}</span></p>
                          <p><span className="text-gray-500">মাতা:</span> <span className="font-medium">{member.mother_name}</span></p>
                          <p><span className="text-gray-500">জন্ম:</span> <span className="font-medium">{member.date_of_birth}</span></p>
                          {member.blood_group && <p><span className="text-gray-500">রক্ত:</span> <span className="font-medium">{member.blood_group}</span></p>}
                        </div>
                      </div>

                      {/* Contact Info */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">যোগাযোগ</h4>
                        <div className="space-y-1 text-sm">
                          <p><span className="text-gray-500">মোবাইল:</span> <span className="font-medium">{member.mobile_whatsapp}</span></p>
                          {member.email && <p><span className="text-gray-500">ইমেইল:</span> <span className="font-medium">{member.email}</span></p>}
                          {member.facebook_id && <p><span className="text-gray-500">Facebook:</span> <span className="font-medium">{member.facebook_id}</span></p>}
                          {member.emergency_contact && <p><span className="text-gray-500">জরুরি:</span> <span className="font-medium">{member.emergency_contact}</span></p>}
                        </div>
                      </div>

                      {/* Address */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">ঠিকানা</h4>
                        <div className="space-y-1 text-sm">
                          <p><span className="text-gray-500">বর্তমান:</span> <span className="font-medium">{member.present_address}</span></p>
                          {member.permanent_address && <p><span className="text-gray-500">স্থায়ী:</span> <span className="font-medium">{member.permanent_address}</span></p>}
                        </div>
                      </div>

                      {/* Payment Details */}
                      <div className="md:col-span-2 lg:col-span-3 bg-blue-50 rounded-lg p-3">
                        <h4 className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-2">পেমেন্ট তথ্য</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div>
                            <p className="text-blue-600 text-xs">পদ্ধতি</p>
                            <p className="font-medium capitalize">{member.payment_method}</p>
                          </div>
                          <div>
                            <p className="text-blue-600 text-xs">ফি</p>
                            <p className="font-medium">৳{(member.payment_amount || 0) / 100}</p>
                          </div>
                          {member.payment_method === 'bkash' && member.bkash_number && (
                            <div>
                              <p className="text-blue-600 text-xs">bKash নং</p>
                              <p className="font-mono font-medium">{member.bkash_number}</p>
                            </div>
                          )}
                          {member.payment_method === 'bkash' && member.bkash_trx_id && (
                            <div>
                              <p className="text-blue-600 text-xs">TxID</p>
                              <p className="font-mono font-medium">{member.bkash_trx_id}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Verification Info */}
                      {member.verified_at && (
                        <div className="md:col-span-2 lg:col-span-3 bg-green-50 rounded-lg p-3">
                          <h4 className="text-xs font-semibold text-green-700 uppercase tracking-wider mb-2">যাচাই তথ্য</h4>
                          <div className="flex items-center gap-4 text-sm">
                            <span><span className="text-green-600">যাচাই তারিখ:</span> <span className="font-medium">{formatDate(member.verified_at)}</span></span>
                            {member.verified_by_name && <span><span className="text-green-600">যাচাইকারী:</span> <span className="font-medium">{member.verified_by_name}</span></span>}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.total > limit && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            দেখাচ্ছে {(currentPage - 1) * limit + 1} - {Math.min(currentPage * limit, pagination.total)} / {pagination.total}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 border rounded-lg text-sm disabled:opacity-50"
            >
              আগের
            </button>
            <button
              onClick={() => setCurrentPage(p => p + 1)}
              disabled={!pagination.hasMore}
              className="px-4 py-2 border rounded-lg text-sm disabled:opacity-50"
            >
              পরের
            </button>
          </div>
        </div>
      )}
    </div>
  )
}