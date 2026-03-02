import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../../lib/api'
import { formatTaka, formatDate } from '../../lib/auth'
import { CheckCircle, XCircle } from 'lucide-react'

export default function AdminShares() {
  const qc = useQueryClient()
  const [status, setStatus] = useState('pending')
  const [rejectNote, setRejectNote] = useState<Record<number, string>>({})

  const { data, isLoading } = useQuery({
    queryKey: ['admin-shares', status],
    queryFn: () => adminApi.pendingShares(1, status)
  })

  const approveMutation = useMutation({
    mutationFn: (id: number) => adminApi.approveShare(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-shares'] })
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, note }: { id: number; note?: string }) => adminApi.rejectShare(id, note),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-shares'] })
  })

  const requests = data?.success ? data.data.items : []

  return (
    <div className="space-y-6">
      {/* Hero banner */}
      <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 rounded-3xl p-5 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 flex items-center gap-3">
          <div className="bg-white/15 p-2.5 rounded-2xl text-2xl">📋</div>
          <div>
            <h1 className="text-2xl font-bold">শেয়ার অনুমোদন</h1>
            <p className="text-amber-100 text-sm mt-0.5">সদস্যদের শেয়ার কেনার অনুরোধ পর্যালোচনা করুন</p>
          </div>
        </div>
      </div>

      {/* Status filter */}
      <div className="flex gap-2">
        {['pending', 'approved', 'rejected'].map(s => (
          <button key={s} onClick={() => setStatus(s)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all
              ${status === s
                ? s === 'pending' ? 'bg-amber-500 text-white shadow-sm'
                  : s === 'approved' ? 'bg-emerald-500 text-white shadow-sm'
                  : 'bg-red-500 text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
            {s === 'pending' ? '⏳ অপেক্ষমাণ' : s === 'approved' ? '✅ অনুমোদিত' : '❌ বাতিল'}
          </button>
        ))}
      </div>

      {isLoading ? <p className="text-gray-400 text-sm">লোড হচ্ছে...</p> :
        requests.length === 0 ? (
          <div className="card text-center py-10 text-gray-400">কোনো অনুরোধ নেই</div>
        ) : (
          <div className="space-y-4">
            {requests.map(r => (
              <div key={r.id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-teal-500 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {r.user_name?.charAt(0) ?? '?'}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-sm">{r.user_name}</p>
                        <p className="text-gray-400 text-xs font-mono">{r.user_phone}</p>
                      </div>
                    </div>
                    <div className="bg-primary-50 rounded-xl px-3 py-1.5 mb-3 inline-block">
                      <p className="text-xs text-primary-700 font-semibold">🏗️ {r.project_title}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-gray-50 rounded-xl p-2 text-center">
                        <p className="text-xs text-gray-400 mb-0.5">শেয়ার</p>
                        <p className="font-bold text-sm">{r.quantity}টি</p>
                      </div>
                      <div className="bg-primary-50 rounded-xl p-2 text-center">
                        <p className="text-xs text-gray-400 mb-0.5">মোট টাকা</p>
                        <p className="font-bold text-sm text-primary-700">{formatTaka(r.total_amount)}</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-2 text-center">
                        <p className="text-xs text-gray-400 mb-0.5">TxID</p>
                        <p className="font-mono text-xs font-bold truncate">{r.bkash_txid}</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">জমা: {formatDate(r.created_at)}</p>
                    {r.admin_note && <p className="text-xs text-red-500 mt-1 bg-red-50 rounded-lg px-2 py-1">⚠️ {r.admin_note}</p>}
                  </div>

                  {status === 'pending' && (
                    <div className="flex flex-col gap-2 shrink-0 min-w-[140px]">
                      <button onClick={() => approveMutation.mutate(r.id)} disabled={approveMutation.isPending}
                        className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs py-2 px-3 rounded-xl justify-center font-semibold transition-colors">
                        <CheckCircle size={13} /> অনুমোদন
                      </button>
                      <input className="input text-xs py-1.5" placeholder="বাতিলের কারণ"
                        value={rejectNote[r.id] ?? ''}
                        onChange={e => setRejectNote(p => ({ ...p, [r.id]: e.target.value }))} />
                      <button onClick={() => rejectMutation.mutate({ id: r.id, note: rejectNote[r.id] })}
                        disabled={rejectMutation.isPending}
                        className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-xs py-2 px-3 rounded-xl justify-center font-semibold transition-colors">
                        <XCircle size={13} /> বাতিল
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  )
}
