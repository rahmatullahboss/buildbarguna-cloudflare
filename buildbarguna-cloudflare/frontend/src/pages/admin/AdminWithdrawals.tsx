import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminWithdrawalsApi } from '../../lib/api'
import { formatTaka, formatDate } from '../../lib/auth'
import type { WithdrawalWithUser, WithdrawalStatus } from '../../lib/api'
import {
  CheckCircle, XCircle, Clock, AlertTriangle, DollarSign, Filter
} from 'lucide-react'

function StatusBadge({ status }: { status: WithdrawalStatus }) {
  const map: Record<WithdrawalStatus, { label: string; cls: string }> = {
    pending:   { label: 'অপেক্ষমাণ',    cls: 'bg-yellow-100 text-yellow-700' },
    approved:  { label: 'অনুমোদিত',     cls: 'bg-blue-100 text-blue-700' },
    completed: { label: 'সম্পন্ন',      cls: 'bg-green-100 text-green-700' },
    rejected:  { label: 'প্রত্যাখ্যাত', cls: 'bg-red-100 text-red-700' }
  }
  const { label, cls } = map[status]
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>{label}</span>
}

export default function AdminWithdrawals() {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [rejectId, setRejectId] = useState<number | null>(null)
  const [rejectNote, setRejectNote] = useState('')
  const [completingWithdrawal, setCompletingWithdrawal] = useState<WithdrawalWithUser | null>(null)
  const [txid, setTxid] = useState('')
  const [msg, setMsg] = useState('')
  const [errMsg, setErrMsg] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-withdrawals', statusFilter],
    queryFn: () => adminWithdrawalsApi.list(statusFilter),
    staleTime: 30_000
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin-withdrawals'] })
  }

  const approveMutation = useMutation({
    mutationFn: (id: number) => adminWithdrawalsApi.approve(id),
    onSuccess: (res) => {
      if (res.success) { setMsg('✅ উত্তোলন অনুমোদন করা হয়েছে'); invalidate() }
      else setErrMsg((res as any).error)
    }
  })

  const completeMutation = useMutation({
    mutationFn: ({ id, bkash_txid }: { id: number; bkash_txid?: string }) =>
      adminWithdrawalsApi.complete(id, bkash_txid || 'CASH'),
    onSuccess: (res) => {
      if (res.success) {
        setMsg('✅ উত্তোলন সম্পন্ন হয়েছে')
        setCompletingWithdrawal(null)
        setTxid('')
        invalidate()
      } else setErrMsg((res as any).error)
    }
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, admin_note }: { id: number; admin_note: string }) =>
      adminWithdrawalsApi.reject(id, admin_note),
    onSuccess: (res) => {
      if (res.success) {
        setMsg('✅ উত্তোলন প্রত্যাখ্যান করা হয়েছে')
        setRejectId(null)
        setRejectNote('')
        invalidate()
      } else setErrMsg((res as any).error)
    }
  })

  const items = data?.success ? data.data.items : []

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-violet-700 via-purple-600 to-purple-700 rounded-3xl p-5 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 flex items-center gap-3">
          <div className="bg-white/15 p-2.5 rounded-2xl text-2xl">💸</div>
          <div>
            <h1 className="text-2xl font-bold">উত্তোলন ব্যবস্থাপনা</h1>
            <p className="text-purple-100 text-sm mt-0.5">সদস্যদের উত্তোলন অনুরোধ অনুমোদন ও প্রক্রিয়া করুন</p>
          </div>
        </div>
      </div>

      {msg && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm">
          <CheckCircle size={16} /> {msg}
          <button onClick={() => setMsg('')} className="ml-auto" aria-label="বার্তা বন্ধ করুন">✕</button>
        </div>
      )}
      {errMsg && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
          <AlertTriangle size={16} /> {errMsg}
          <button onClick={() => setErrMsg('')} className="ml-auto" aria-label="ত্রুটি বার্তা বন্ধ করুন">✕</button>
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter size={16} className="text-gray-400" />
        {(['pending','approved','completed','rejected','all'] as const).map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`text-sm px-3 py-1.5 rounded-full font-medium transition-colors ${
              statusFilter === s
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s === 'pending' ? 'অপেক্ষমাণ' :
             s === 'approved' ? 'অনুমোদিত' :
             s === 'completed' ? 'সম্পন্ন' :
             s === 'rejected' ? 'প্রত্যাখ্যাত' : 'সব'}
          </button>
        ))}
      </div>

      {/* Withdraw modal — Complete */}
      {completingWithdrawal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl space-y-4">
            <h3 className="font-bold text-lg">{completingWithdrawal.withdrawal_method === 'nagad' ? 'Nagad' : 'bKash'} TxID লিখুন</h3>
            <p className="text-sm text-gray-500">{completingWithdrawal.withdrawal_method === 'nagad' ? 'Nagad' : 'bKash'} এ টাকা পাঠানোর পরে Transaction ID লিখুন</p>
            <input
              className="input font-mono"
              placeholder="TxID (যেমন: 8N5OG3X7)"
              value={txid}
              onChange={e => setTxid(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                onClick={() => completeMutation.mutate({ id: completingWithdrawal.id, bkash_txid: txid })}
                disabled={txid.length < 5 || completeMutation.isPending}
                className="btn-primary flex-1"
              >
                {completeMutation.isPending ? 'সম্পন্ন হচ্ছে...' : '✓ সম্পন্ন করুন'}
              </button>
              <button onClick={() => { setCompletingWithdrawal(null); setTxid('') }} className="btn-secondary flex-1">
                বাতিল
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject modal */}
      {rejectId !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl space-y-4">
            <h3 className="font-bold text-lg text-red-700">প্রত্যাখ্যানের কারণ</h3>
            <textarea
              className="input min-h-[80px] resize-none"
              placeholder="সদস্যকে কারণ জানান..."
              value={rejectNote}
              onChange={e => setRejectNote(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                onClick={() => rejectMutation.mutate({ id: rejectId, admin_note: rejectNote })}
                disabled={!rejectNote.trim() || rejectMutation.isPending}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                {rejectMutation.isPending ? 'প্রত্যাখ্যান হচ্ছে...' : '✕ প্রত্যাখ্যান করুন'}
              </button>
              <button onClick={() => { setRejectId(null); setRejectNote('') }} className="btn-secondary flex-1">
                বাতিল
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="card animate-pulse h-24" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">
          <Clock size={40} className="mx-auto mb-3 opacity-30" />
          <p>কোনো উত্তোলন অনুরোধ নেই</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((w: WithdrawalWithUser) => (
            <div key={w.id} className="card">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="font-bold text-gray-900">{w.user_name}</p>
                    <span className="text-gray-400 text-xs font-mono">{w.user_phone}</span>
                    <StatusBadge status={w.status} />
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                    <span>পরিমাণ: <span className="font-bold text-gray-900">{formatTaka(w.amount_paisa)}</span></span>
                    <span>পদ্ধতি: <span className={`font-medium ${w.withdrawal_method === 'cash' ? 'text-green-600' : w.withdrawal_method === 'nagad' ? 'text-orange-600' : 'text-pink-600'}`}>{w.withdrawal_method === 'cash' ? '💵 ক্যাশ' : w.withdrawal_method === 'nagad' ? '📱 Nagad' : '📱 bKash'}</span></span>
                    {w.bkash_number && <span>{w.withdrawal_method === 'nagad' ? 'Nagad' : 'bKash'}: <span className="font-mono font-medium text-gray-700">{w.bkash_number}</span></span>}
                    <span>তারিখ: {formatDate(w.requested_at)}</span>
                    {w.bkash_txid && <span>TxID: <span className="font-mono text-green-700">{w.bkash_txid}</span></span>}
                  </div>
                  {w.admin_note && (
                    <p className="text-xs text-red-600 mt-1">কারণ: {w.admin_note}</p>
                  )}
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  {w.status === 'pending' && (
                    <>
                      <button
                        onClick={() => { setMsg(''); setErrMsg(''); approveMutation.mutate(w.id) }}
                        disabled={approveMutation.isPending || rejectMutation.isPending}
                        className="flex items-center gap-1 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <CheckCircle size={14} />
                        {approveMutation.isPending ? '...' : 'অনুমোদন'}
                      </button>
                      <button
                        onClick={() => { setMsg(''); setErrMsg(''); setRejectId(w.id) }}
                        disabled={approveMutation.isPending || rejectMutation.isPending}
                        className="flex items-center gap-1 text-xs bg-red-100 text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <XCircle size={14} /> প্রত্যাখ্যান
                      </button>
                    </>
                  )}
                  {w.status === 'approved' && (
                    <>
                      {w.withdrawal_method === 'cash' ? (
                        <button
                          onClick={() => { setMsg(''); setErrMsg(''); completeMutation.mutate({ id: w.id }) }}
                          disabled={completeMutation.isPending || rejectMutation.isPending}
                          className="flex items-center gap-1 text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <DollarSign size={14} />
                          {completeMutation.isPending ? '...' : '💵 ক্যাশ প্রদান'}
                        </button>
                      ) : (
                        <button
                          onClick={() => { setMsg(''); setErrMsg(''); setCompletingWithdrawal(w) }}
                          disabled={completeMutation.isPending || rejectMutation.isPending}
                          className="flex items-center gap-1 text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <DollarSign size={14} />
                          {completeMutation.isPending ? '...' : w.withdrawal_method === 'nagad' ? 'Nagad পাঠান' : 'bKash পাঠান'}
                        </button>
                      )}
                      <button
                        onClick={() => { setMsg(''); setErrMsg(''); setRejectId(w.id) }}
                        disabled={completeMutation.isPending || rejectMutation.isPending}
                        className="flex items-center gap-1 text-xs bg-red-100 text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <XCircle size={14} /> প্রত্যাখ্যান
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
