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
      <h1 className="text-2xl font-bold text-gray-900">শেয়ার অনুমোদন</h1>

      {/* Status filter */}
      <div className="flex gap-2">
        {['pending', 'approved', 'rejected'].map(s => (
          <button key={s} onClick={() => setStatus(s)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${status === s ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}>
            {s === 'pending' ? 'অপেক্ষমাণ' : s === 'approved' ? 'অনুমোদিত' : 'বাতিল'}
          </button>
        ))}
      </div>

      {isLoading ? <p className="text-gray-400 text-sm">লোড হচ্ছে...</p> :
        requests.length === 0 ? (
          <div className="card text-center py-10 text-gray-400">কোনো অনুরোধ নেই</div>
        ) : (
          <div className="space-y-4">
            {requests.map(r => (
              <div key={r.id} className="card">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="font-bold text-gray-900">{r.user_name}</p>
                      <span className="text-gray-400 text-sm">({r.user_phone})</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">প্রজেক্ট: <strong>{r.project_title}</strong></p>
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div><p className="text-gray-400">শেয়ার</p><p className="font-bold">{r.quantity}টি</p></div>
                      <div><p className="text-gray-400">মোট টাকা</p><p className="font-bold text-primary-600">{formatTaka(r.total_amount)}</p></div>
                      <div><p className="text-gray-400">bKash TxID</p><p className="font-mono text-xs font-bold">{r.bkash_txid}</p></div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">জমা: {formatDate(r.created_at)}</p>
                    {r.admin_note && <p className="text-xs text-red-500 mt-1">নোট: {r.admin_note}</p>}
                  </div>

                  {status === 'pending' && (
                    <div className="flex flex-col gap-2 shrink-0 min-w-[140px]">
                      <button onClick={() => approveMutation.mutate(r.id)} disabled={approveMutation.isPending}
                        className="flex items-center gap-1 btn-primary text-xs py-1.5 justify-center">
                        <CheckCircle size={14} /> অনুমোদন
                      </button>
                      <input className="input text-xs py-1" placeholder="বাতিলের কারণ"
                        value={rejectNote[r.id] ?? ''}
                        onChange={e => setRejectNote(p => ({ ...p, [r.id]: e.target.value }))} />
                      <button onClick={() => rejectMutation.mutate({ id: r.id, note: rejectNote[r.id] })}
                        disabled={rejectMutation.isPending}
                        className="flex items-center gap-1 btn-danger text-xs py-1.5 justify-center">
                        <XCircle size={14} /> বাতিল
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
