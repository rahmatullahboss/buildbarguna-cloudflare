import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi, type PointWithdrawal } from '../../lib/api'
import { formatDate } from '../../lib/auth'
import { CheckCircle, XCircle, Send, Clock, Search, Filter, User, Phone, Wallet } from 'lucide-react'

// Status Badge
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700'
  }
  
  const labels: Record<string, string> = {
    pending: 'অপেক্ষায়',
    approved: 'অনুমোদিত',
    completed: 'সম্পন্ন',
    rejected: 'বাতিল'
  }
  
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100'}`}>
      {labels[status] || status}
    </span>
  )
}

export default function AdminPointWithdrawals() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<PointWithdrawal | null>(null)
  const [actionModal, setActionModal] = useState<'approve' | 'reject' | 'complete' | null>(null)
  const [adminNote, setAdminNote] = useState('')
  const [bkashTxId, setBkashTxId] = useState('')
  
  const { data, isLoading } = useQuery({
    queryKey: ['admin-point-withdrawals', statusFilter],
    queryFn: () => adminApi.pointWithdrawals(statusFilter || undefined)
  })
  
  const withdrawals: PointWithdrawal[] = data?.success ? data.data.items : []
  const total = data?.success ? data.data.total : 0
  
  const approveMutation = useMutation<unknown, Error, number, unknown>({
    mutationFn: (id: number) => adminApi.approvePointWithdrawal(id, adminNote || undefined),
    onSuccess: (res: unknown) => {
      if ((res as { success: boolean }).success) {
        queryClient.invalidateQueries({ queryKey: ['admin-point-withdrawals'] })
        setActionModal(null)
        setAdminNote('')
        setSelectedWithdrawal(null)
      }
    }
  })
  
  const rejectMutation = useMutation<unknown, Error, number, unknown>({
    mutationFn: (id: number) => adminApi.rejectPointWithdrawal(id, adminNote),
    onSuccess: (res: unknown) => {
      if ((res as { success: boolean }).success) {
        queryClient.invalidateQueries({ queryKey: ['admin-point-withdrawals'] })
        setActionModal(null)
        setAdminNote('')
        setSelectedWithdrawal(null)
      }
    }
  })
  
  const completeMutation = useMutation<unknown, Error, number, unknown>({
    mutationFn: (id: number) => adminApi.completePointWithdrawal(id, bkashTxId),
    onSuccess: (res: unknown) => {
      if ((res as { success: boolean }).success) {
        queryClient.invalidateQueries({ queryKey: ['admin-point-withdrawals'] })
        setActionModal(null)
        setBkashTxId('')
        setSelectedWithdrawal(null)
      }
    }
  })

  const handleAction = () => {
    if (!selectedWithdrawal) return
    
    if (actionModal === 'approve') {
      approveMutation.mutate(selectedWithdrawal.id)
    } else if (actionModal === 'reject') {
      rejectMutation.mutate(selectedWithdrawal.id)
    } else if (actionModal === 'complete') {
      completeMutation.mutate(selectedWithdrawal.id)
    }
  }

  const pendingCount = withdrawals.filter((w: PointWithdrawal) => w.status === 'pending').length
  const approvedCount = withdrawals.filter((w: PointWithdrawal) => w.status === 'approved').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">পয়েন্ট উত্তোলন</h1>
          <p className="text-gray-500">মেম্বারদের উত্তোলন অনুমোদন করুন</p>
        </div>
        
        {/* Stats */}
        <div className="flex gap-4">
          <div className="bg-yellow-50 rounded-xl px-4 py-2 border border-yellow-200">
            <p className="text-xs text-yellow-600">অপেক্ষায়</p>
            <p className="text-xl font-bold text-yellow-700">{pendingCount}</p>
          </div>
          <div className="bg-blue-50 rounded-xl px-4 py-2 border border-blue-200">
            <p className="text-xs text-blue-600">অনুমোদিত</p>
            <p className="text-xl font-bold text-blue-700">{approvedCount}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">ফিল্টার:</span>
          </div>
          <div className="flex gap-2">
            {['pending', 'approved', 'completed', 'rejected'].map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status === statusFilter ? '' : status)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                  ${statusFilter === status 
                    ? 'bg-primary-600 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {status === 'pending' && 'অপেক্ষায়'}
                {status === 'approved' && 'অনুমোদিত'}
                {status === 'completed' && 'সম্পন্ন'}
                {status === 'rejected' && 'বাতিল'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">মেম্বার</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">পয়েন্ট</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">টাকা</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">bKash</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">তারিখ</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">স্ট্যাটাস</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">অ্যাকশন</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center">
                  <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
                </td>
              </tr>
            ) : withdrawals.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  কোনো উত্তোলন নেই
                </td>
              </tr>
            ) : (
              withdrawals.map(withdrawal => (
                <tr key={withdrawal.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">{withdrawal.user_name || 'User #' + withdrawal.user_id}</p>
                        <p className="text-xs text-gray-500">{withdrawal.user_phone || 'N/A'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-gray-900">{withdrawal.amount_points}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-bold text-green-600">{withdrawal.amount_taka} টাকা</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600">{withdrawal.bkash_number}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-500">{formatDate(withdrawal.requested_at)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={withdrawal.status} />
                  </td>
                  <td className="px-4 py-3">
                    {withdrawal.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setSelectedWithdrawal(withdrawal); setActionModal('approve') }}
                          className="p-1.5 bg-green-100 text-green-600 rounded-lg hover:bg-green-200"
                          title="অনুমোদন"
                          aria-label="অনুমোদন"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { setSelectedWithdrawal(withdrawal); setActionModal('reject') }}
                          className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                          title="বাতিল"
                          aria-label="বাতিল"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    {withdrawal.status === 'approved' && (
                      <button
                        onClick={() => { setSelectedWithdrawal(withdrawal); setActionModal('complete') }}
                        className="px-3 py-1.5 bg-blue-100 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-200 flex items-center gap-1"
                      >
                        <Send className="w-3 h-3" />
                        সম্পন্ন
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Action Modal */}
      {actionModal && selectedWithdrawal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {actionModal === 'approve' && 'উত্তোলন অনুমোদন'}
              {actionModal === 'reject' && 'উত্তোলন বাতিল'}
              {actionModal === 'complete' && 'সম্পন্ন করুন'}
            </h2>
            
            {/* Withdrawal Details */}
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-3 mb-3">
                <User className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="font-medium">{selectedWithdrawal.user_name || 'User #' + selectedWithdrawal.user_id}</p>
                  <p className="text-sm text-gray-500">{selectedWithdrawal.user_phone}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-500">পয়েন্ট</p>
                  <p className="font-semibold">{selectedWithdrawal.amount_points}</p>
                </div>
                <div>
                  <p className="text-gray-500">টাকা</p>
                  <p className="font-semibold text-green-600">{selectedWithdrawal.amount_taka}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-gray-500">bKash</p>
                  <p className="font-medium">{selectedWithdrawal.bkash_number}</p>
                </div>
              </div>
            </div>

            {/* Form */}
            {actionModal === 'approve' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">নোট (অপশনাল)</label>
                <textarea
                  value={adminNote}
                  onChange={e => setAdminNote(e.target.value)}
                  placeholder="অনুমোদন নোট..."
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  rows={2}
                />
              </div>
            )}
            
            {actionModal === 'reject' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">বাতিলের কারণ *</label>
                <textarea
                  value={adminNote}
                  onChange={e => setAdminNote(e.target.value)}
                  placeholder="বাতিলের কারণ..."
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                  rows={3}
                  required
                />
              </div>
            )}
            
            {actionModal === 'complete' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">bKash ট্রানজেকশন আইডি *</label>
                <input
                  type="text"
                  value={bkashTxId}
                  onChange={e => setBkashTxId(e.target.value)}
                  placeholder="bKash TXID..."
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setActionModal(null); setAdminNote(''); setBkashTxId('') }}
                className="flex-1 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
              >
                বাতিল
              </button>
              <button
                onClick={handleAction}
                disabled={approveMutation.isPending || rejectMutation.isPending || completeMutation.isPending}
                className={`flex-1 py-2 text-white rounded-lg font-medium disabled:opacity-50
                  ${actionModal === 'approve' ? 'bg-green-600 hover:bg-green-700' : ''}
                  ${actionModal === 'reject' ? 'bg-red-600 hover:bg-red-700' : ''}
                  ${actionModal === 'complete' ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
              >
                {(approveMutation.isPending || rejectMutation.isPending || completeMutation.isPending) ? 'প্রসেসিং...' : 'নিশ্চিত করুন'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
