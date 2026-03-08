import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { memberApi } from '../../lib/api'
import { formatDate } from '../../lib/auth'
import { CheckCircle, XCircle, Download, Eye, FileText, Users } from 'lucide-react'

export default function AdminMembers() {
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState<'pending' | 'verified' | 'all'>('pending')
  const [selectedMember, setSelectedMember] = useState<any>(null)
  const [verifyNote, setVerifyNote] = useState('')

  // Fetch pending/verified payments
  const { data: paymentsData, isLoading: paymentsLoading } = useQuery({
    queryKey: ['member-payments', activeTab],
    queryFn: () => memberApi.getPayments(activeTab === 'all' ? 'pending' : activeTab)
  })

  // Fetch member list with pagination
  const { data: membersData, isLoading: membersLoading } = useQuery({
    queryKey: ['member-list', activeTab],
    queryFn: () => memberApi.getMemberList(activeTab, 1, 50)
  })

  // Verify payment mutation
  const verifyMutation = useMutation({
    mutationFn: ({ id, action, note }: { id: number; action: 'approve' | 'reject'; note?: string }) =>
      memberApi.verifyPayment(id, action, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['member-payments'] })
      qc.invalidateQueries({ queryKey: ['member-list'] })
      setSelectedMember(null)
      setVerifyNote('')
    }
  })

  // Bulk certificate generation mutation
  const bulkCertMutation = useMutation({
    mutationFn: () => memberApi.bulkGenerateCertificates(),
    onSuccess: (data) => {
      if (data.success && data.data) {
        alert(`সফল! ${data.data.generated_count}টি সার্টিফিকেট তৈরি করা হয়েছে।`)
      }
    }
  })

  const payments = paymentsData?.success ? paymentsData.data : []
  const members = membersData?.success ? membersData.data.members : []
  const pagination = membersData?.success ? membersData.data.pagination : null

  const handleVerify = (id: number, action: 'approve' | 'reject') => {
    if (action === 'reject' && !verifyNote) {
      alert('প্রত্যাখ্যানের কারণ উল্লেখ করুন')
      return
    }
    if (confirm(`${action === 'approve' ? 'অনুমোদন' : 'প্রত্যাখ্যান'} করতে চান?`)) {
      verifyMutation.mutate({ id, action, note: verifyNote || undefined })
    }
  }

  const handleDownloadCertificate = (formNumber: string) => {
    const url = memberApi.downloadCertificate(formNumber)
    window.open(url, '_blank')
  }

  const handlePreviewCertificate = (formNumber: string) => {
    const url = memberApi.previewCertificate(formNumber)
    window.open(url, '_blank')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-700 via-purple-600 to-indigo-600 rounded-3xl p-5 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/15 p-2.5 rounded-2xl text-2xl">🎓</div>
            <div>
              <h1 className="text-2xl font-bold">মেম্বারশিপ ম্যানেজমেন্ট</h1>
              <p className="text-purple-100 text-sm mt-0.5">মেম্বার রেজিস্ট্রেশন ও সার্টিফিকেট</p>
            </div>
          </div>
          <button
            onClick={() => bulkCertMutation.mutate()}
            disabled={bulkCertMutation.isPending}
            className="bg-white/20 hover:bg-white/30 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
          >
            <FileText size={16} />
            {bulkCertMutation.isPending ? 'তৈরি হচ্ছে...' : 'বাল্ক সার্টিফিকেট'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'pending'
              ? 'border-yellow-500 text-yellow-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          pending ({payments.length})
        </button>
        <button
          onClick={() => setActiveTab('verified')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'verified'
              ? 'border-green-500 text-green-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          যাচাইকৃত
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'all'
              ? 'border-purple-500 text-purple-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          সকল মেম্বার
        </button>
      </div>

      {/* Pending Payments Tab */}
      {activeTab === 'pending' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">pending পেমেন্ট যাচাই</h2>
            <span className="text-sm text-gray-500">{payments.length} pending</span>
          </div>

          {paymentsLoading ? (
            <p className="text-gray-400 text-sm">লোড হচ্ছে...</p>
          ) : payments.length === 0 ? (
            <div className="card text-center py-8">
              <CheckCircle className="mx-auto text-green-500 mb-2" size={48} />
              <p className="text-gray-600">কোনো pending ভেরিফিকেশন নেই</p>
            </div>
          ) : (
            <div className="space-y-3">
              {payments.map((payment: any) => (
                <div key={payment.id} className="card border-l-4 border-l-yellow-500">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-gray-900">{payment.form_number}</span>
                        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">pending</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-gray-500">নাম (ইংরেজি)</p>
                          <p className="font-medium">{payment.name_english}</p>
                        </div>
                        {payment.name_bangla && (
                          <div>
                            <p className="text-gray-500">নাম (বাংলা)</p>
                            <p className="font-medium">{payment.name_bangla}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-gray-500">মোবাইল</p>
                          <p className="font-medium">{payment.user_phone}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">পেমেন্ট পদ্ধতি</p>
                          <p className="font-medium capitalize">{payment.payment_method}</p>
                        </div>
                        {payment.payment_method === 'bkash' && (
                          <>
                            <div>
                              <p className="text-gray-500">bKash নাম্বার</p>
                              <p className="font-mono text-sm">{payment.bkash_number}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Transaction ID</p>
                              <p className="font-mono text-sm">{payment.bkash_trx_id}</p>
                            </div>
                          </>
                        )}
                        {payment.payment_note && (
                          <div className="col-span-2">
                            <p className="text-gray-500">নোট</p>
                            <p className="text-sm">{payment.payment_note}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-gray-500">রেজিস্ট্রেশন তারিখ</p>
                          <p className="text-sm">{formatDate(payment.created_at)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">ফি</p>
                          <p className="font-medium">৳{payment.payment_amount / 100}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => handleVerify(payment.id, 'approve')}
                        disabled={verifyMutation.isPending}
                        className="flex items-center gap-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                      >
                        <CheckCircle size={16} />
                        অনুমোদন
                      </button>
                      <button
                        onClick={() => handleVerify(payment.id, 'reject')}
                        disabled={verifyMutation.isPending}
                        className="flex items-center gap-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                      >
                        <XCircle size={16} />
                        প্রত্যাখ্যান
                      </button>
                    </div>
                  </div>

                  {/* Reject note input */}
                  {selectedMember?.id === payment.id && (
                    <div className="mt-3 pt-3 border-t">
                      <input
                        type="text"
                        value={verifyNote}
                        onChange={(e) => setVerifyNote(e.target.value)}
                        placeholder="প্রত্যাখ্যানের কারণ..."
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Verified Members Tab */}
      {activeTab === 'verified' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">যাচাইকৃত মেম্বার</h2>
            <span className="text-sm text-gray-500">{members.filter((m: any) => m.payment_status === 'verified').length} যাচাইকৃত</span>
          </div>

          {membersLoading ? (
            <p className="text-gray-400 text-sm">লোড হচ্ছে...</p>
          ) : (
            <div className="space-y-2">
              {members.filter((m: any) => m.payment_status === 'verified').map((member: any) => (
                <div key={member.id} className="card border-l-4 border-l-green-500 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{member.name_english}</span>
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Verified</span>
                    </div>
                    <p className="text-sm text-gray-500">{member.form_number} • {member.user_phone}</p>
                    {member.verified_by_name && (
                      <p className="text-xs text-gray-400">Verified by: {member.verified_by_name} on {formatDate(member.verified_at)}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handlePreviewCertificate(member.form_number)}
                      className="flex items-center gap-1 text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                    >
                      <Eye size={16} />
                      Preview
                    </button>
                    <button
                      onClick={() => handleDownloadCertificate(member.form_number)}
                      className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                    >
                      <Download size={16} />
                      Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* All Members Tab */}
      {activeTab === 'all' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">সকল মেম্বার</h2>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Users size={16} />
              <span>{pagination?.total || 0} মোট</span>
            </div>
          </div>

          {membersLoading ? (
            <p className="text-gray-400 text-sm">লোড হচ্ছে...</p>
          ) : (
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">ফর্ম নং</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">নাম</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">মোবাইল</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">পেমেন্ট</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">স্ট্যাটাস</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">তারিখ</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member: any) => (
                    <tr key={member.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs">{member.form_number}</td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">{member.name_english}</p>
                          {member.name_bangla && <p className="text-xs text-gray-500">{member.name_bangla}</p>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{member.user_phone}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs capitalize">{member.payment_method}</span>
                        <p className="text-xs text-gray-500">৳{member.payment_amount / 100}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          member.payment_status === 'verified' ? 'bg-green-100 text-green-700' :
                          member.payment_status === 'rejected' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {member.payment_status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(member.created_at)}</td>
                      <td className="px-4 py-3">
                        {member.payment_status === 'verified' && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handlePreviewCertificate(member.form_number)}
                              className="text-blue-600 hover:bg-blue-50 p-1.5 rounded"
                              title="Preview"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              onClick={() => handleDownloadCertificate(member.form_number)}
                              className="text-blue-600 hover:bg-blue-50 p-1.5 rounded"
                              title="Download"
                            >
                              <Download size={14} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
