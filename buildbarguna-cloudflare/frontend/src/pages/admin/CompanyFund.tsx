import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { profitApi, type CompanyFundTransaction } from '../../lib/api'
import { formatTaka, formatDate } from '../../lib/auth'
import { getUser } from '../../lib/auth'
import {
  Building2, TrendingUp, TrendingDown, Wallet, Plus, ChevronLeft, ChevronRight,
  CheckCircle, AlertTriangle, XCircle, Clock, Shield
} from 'lucide-react'

const TYPE_LABELS: Record<string, string> = {
  profit_share: 'প্রফিট শেয়ার',
  withdrawal: 'উত্তোলন',
  expense: 'খরচ',
  adjustment: 'সমন্বয়'
}

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: typeof CheckCircle }> = {
  completed: { label: 'সম্পন্ন', className: 'bg-green-100 text-green-700', icon: CheckCircle },
  approved: { label: 'অনুমোদিত', className: 'bg-green-100 text-green-700', icon: CheckCircle },
  pending_approval: { label: 'অনুমোদনের অপেক্ষায়', className: 'bg-amber-100 text-amber-700', icon: Clock },
  rejected: { label: 'প্রত্যাখ্যাত', className: 'bg-red-100 text-red-700', icon: XCircle }
}

export default function CompanyFund() {
  const qc = useQueryClient()
  const user = getUser()
  const [page, setPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [amount, setAmount] = useState('')
  const [desc, setDesc] = useState('')
  const [txnType, setTxnType] = useState<'withdrawal' | 'expense'>('withdrawal')
  const [msg, setMsg] = useState('')
  const [errMsg, setErrMsg] = useState('')
  const [rejectId, setRejectId] = useState<number | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['company-fund', page],
    queryFn: () => profitApi.companyFund(page)
  })

  const result = data?.success ? data.data : null
  const summary = result?.summary
  const transactions = result?.transactions ?? []
  const pagination = result?.pagination

  const withdrawMutation = useMutation({
    mutationFn: () => profitApi.withdrawFund({
      amount: Math.round(parseFloat(amount) * 100),
      description: desc,
      transaction_type: txnType
    }),
    onSuccess: (res) => {
      if (res.success) {
        setMsg(res.data.message)
        setErrMsg('')
        setShowForm(false)
        setAmount('')
        setDesc('')
        qc.invalidateQueries({ queryKey: ['company-fund'] })
      } else {
        setErrMsg((res as any).error || 'ব্যর্থ')
      }
    },
    onError: (e: any) => setErrMsg(e.message || 'ব্যর্থ')
  })

  const approveMutation = useMutation({
    mutationFn: (id: number) => profitApi.approveWithdrawal(id),
    onSuccess: (res) => {
      if (res.success) {
        setMsg(res.data.message)
        qc.invalidateQueries({ queryKey: ['company-fund'] })
      } else {
        setErrMsg((res as any).error || 'ব্যর্থ')
      }
    },
    onError: (e: any) => setErrMsg(e.message || 'ব্যর্থ')
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => profitApi.rejectWithdrawal(id, reason),
    onSuccess: (res) => {
      if (res.success) {
        setMsg(res.data.message)
        setRejectId(null)
        setRejectReason('')
        qc.invalidateQueries({ queryKey: ['company-fund'] })
      } else {
        setErrMsg((res as any).error || 'ব্যর্থ')
      }
    },
    onError: (e: any) => setErrMsg(e.message || 'ব্যর্থ')
  })

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="shimmer rounded-2xl h-20 w-full" />
        <div className="shimmer rounded-2xl h-40 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 rounded-3xl p-5 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Building2 size={24} /> কোম্পানি ফান্ড
            </h1>
            <p className="text-white/70 text-sm mt-1">কোম্পানির প্রফিট শেয়ার ও তহবিল ব্যবস্থাপনা</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-white/15 hover:bg-white/25 p-2.5 rounded-xl transition"
          >
            <Plus size={20} />
          </button>
        </div>
      </div>

      {/* Messages */}
      {msg && (
        <div className="flex items-start gap-2 bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm">
          <CheckCircle size={16} className="mt-0.5 shrink-0" /> {msg}
          <button onClick={() => setMsg('')} className="ml-auto text-green-400" aria-label="বার্তা বন্ধ করুন">✕</button>
        </div>
      )}
      {errMsg && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" /> {errMsg}
          <button onClick={() => setErrMsg('')} className="ml-auto text-red-400" aria-label="ত্রুটি বার্তা বন্ধ করুন">✕</button>
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="card bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100 text-center">
            <Wallet size={20} className="mx-auto text-blue-500 mb-1" />
            <p className="text-xs text-blue-600 font-medium">বর্তমান ব্যালেন্স</p>
            <p className="text-lg font-bold text-blue-700">{formatTaka(summary.current_balance)}</p>
          </div>
          <div className="card bg-gradient-to-br from-green-50 to-emerald-50 border-green-100 text-center">
            <TrendingUp size={20} className="mx-auto text-green-500 mb-1" />
            <p className="text-xs text-green-600 font-medium">মোট জমা</p>
            <p className="text-lg font-bold text-green-700">{formatTaka(summary.total_credited)}</p>
          </div>
          <div className="card bg-gradient-to-br from-red-50 to-orange-50 border-red-100 text-center">
            <TrendingDown size={20} className="mx-auto text-red-500 mb-1" />
            <p className="text-xs text-red-600 font-medium">মোট খরচ</p>
            <p className="text-lg font-bold text-red-700">{formatTaka(summary.total_debited)}</p>
          </div>
          <div className="card bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-100 text-center">
            <Clock size={20} className="mx-auto text-amber-500 mb-1" />
            <p className="text-xs text-amber-600 font-medium">অনুমোদন বাকি</p>
            <p className="text-lg font-bold text-amber-700">{summary.pending_approvals}</p>
          </div>
        </div>
      )}

      {/* Withdrawal Form */}
      {showForm && (
        <div className="card border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
          <h3 className="font-bold text-sm mb-3">ফান্ড থেকে উত্তোলন / খরচ</h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">ধরন</label>
              <select value={txnType} onChange={e => setTxnType(e.target.value as any)} className="input w-full text-sm">
                <option value="withdrawal">উত্তোলন</option>
                <option value="expense">খরচ</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">পরিমাণ (৳)</label>
              <input
                type="number" step="0.01" min="0" placeholder="0.00"
                value={amount} onChange={e => setAmount(e.target.value)}
                className="input w-full text-sm"
              />
            </div>
          </div>
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-600 mb-1">উদ্দেশ্য</label>
            <input
              type="text" placeholder="কেন উত্তোলন/খরচ করা হচ্ছে..."
              value={desc} onChange={e => setDesc(e.target.value)}
              className="input w-full text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => withdrawMutation.mutate()}
              disabled={!amount || !desc || withdrawMutation.isPending}
              className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition disabled:opacity-50"
            >
              {withdrawMutation.isPending ? '⏳ প্রসেসিং...' : 'অনুরোধ পাঠান'}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2.5 bg-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-300 transition">
              বাতিল
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
            <Shield size={12} /> অন্য একজন এডমিনের অনুমোদন লাগবে (যদি একাধিক এডমিন থাকে)
          </p>
        </div>
      )}

      {/* Transaction List */}
      <div className="card">
        <h2 className="font-bold text-lg mb-4">ট্রানজেকশন ইতিহাস</h2>

        {transactions.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Building2 size={48} className="mx-auto mb-3 opacity-40" />
            <p>কোনো ট্রানজেকশন নেই</p>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map((txn: CompanyFundTransaction) => {
              const statusCfg = STATUS_CONFIG[txn.status] || STATUS_CONFIG.completed
              const StatusIcon = statusCfg.icon
              const isPending = txn.status === 'pending_approval'
              const canApprove = isPending && user?.id !== txn.created_by

              return (
                <div key={txn.id} className={`p-3 rounded-xl border ${isPending ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-100'}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                          {TYPE_LABELS[txn.transaction_type] || txn.transaction_type}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${statusCfg.className}`}>
                          <StatusIcon size={11} /> {statusCfg.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mt-1">{txn.description}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                        <span>{txn.created_by_name || `#${txn.created_by}`}</span>
                        <span>•</span>
                        <span>{formatDate(txn.created_at)}</span>
                        {txn.project_title && <><span>•</span><span className="text-blue-500">{txn.project_title}</span></>}
                      </div>
                      {txn.approved_by_name && (
                        <p className="text-xs text-green-500 mt-0.5">
                          অনুমোদন: {txn.approved_by_name} — {txn.approved_at ? formatDate(txn.approved_at) : ''}
                        </p>
                      )}
                      {txn.rejection_reason && (
                        <p className="text-xs text-red-500 mt-0.5">কারণ: {txn.rejection_reason}</p>
                      )}
                    </div>
                    <span className={`text-sm font-bold ${txn.amount_paisa > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {txn.amount_paisa > 0 ? '+' : ''}{formatTaka(txn.amount_paisa)}
                    </span>
                  </div>

                  {/* Approval/Reject Actions */}
                  {canApprove && (
                    <div className="mt-3 pt-2 border-t border-amber-200">
                      {rejectId === txn.id ? (
                        <div className="space-y-2">
                          <input
                            type="text" placeholder="বাতিলের কারণ লিখুন..."
                            value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                            className="input w-full text-sm"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => rejectMutation.mutate({ id: txn.id, reason: rejectReason })}
                              disabled={!rejectReason || rejectMutation.isPending}
                              className="flex-1 py-2 bg-red-500 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                            >
                              প্রত্যাখ্যান করুন
                            </button>
                            <button onClick={() => { setRejectId(null); setRejectReason('') }} className="px-3 py-2 bg-gray-200 rounded-lg text-sm">
                              বাদ দিন
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => approveMutation.mutate(txn.id)}
                            disabled={approveMutation.isPending}
                            className="flex-1 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition disabled:opacity-50 flex items-center justify-center gap-1"
                          >
                            <CheckCircle size={14} /> অনুমোদন
                          </button>
                          <button
                            onClick={() => setRejectId(txn.id)}
                            className="flex-1 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition flex items-center justify-center gap-1"
                          >
                            <XCircle size={14} /> প্রত্যাখ্যান
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  {isPending && !canApprove && user?.id === txn.created_by && (
                    <p className="text-xs text-amber-500 mt-2 flex items-center gap-1">
                      <Clock size={12} /> আপনার অনুরোধ — অন্য এডমিনের অনুমোদনের অপেক্ষায়
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.total > pagination.limit && (
          <div className="flex items-center justify-between mt-4 pt-3 border-t">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="flex items-center gap-1 text-sm text-gray-600 disabled:opacity-40">
              <ChevronLeft size={16} /> আগের
            </button>
            <span className="text-sm text-gray-500">পৃষ্ঠা {page} / {Math.ceil(pagination.total / pagination.limit)}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={!pagination.hasMore} className="flex items-center gap-1 text-sm text-gray-600 disabled:opacity-40">
              পরের <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
