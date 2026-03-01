import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { withdrawalsApi } from '../lib/api'
import { formatTaka, formatDate } from '../lib/auth'
import type { Withdrawal, WithdrawalStatus } from '../lib/api'
import {
  Wallet, Clock, CheckCircle, XCircle, AlertTriangle,
  ArrowDownCircle, ChevronDown, ChevronUp, Info
} from 'lucide-react'
import Disclaimer from '../components/Disclaimer'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: WithdrawalStatus }) {
  const map: Record<WithdrawalStatus, { label: string; cls: string; icon: React.ReactNode }> = {
    pending:   { label: 'অপেক্ষমাণ',  cls: 'bg-yellow-100 text-yellow-700', icon: <Clock size={12} /> },
    approved:  { label: 'অনুমোদিত',   cls: 'bg-blue-100 text-blue-700',    icon: <CheckCircle size={12} /> },
    completed: { label: 'সম্পন্ন',    cls: 'bg-green-100 text-green-700',  icon: <CheckCircle size={12} /> },
    rejected:  { label: 'প্রত্যাখ্যাত', cls: 'bg-red-100 text-red-700',   icon: <XCircle size={12} /> }
  }
  const { label, cls, icon } = map[status]
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>
      {icon} {label}
    </span>
  )
}

function WithdrawalCard({ w }: { w: Withdrawal }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <div>
          <p className="font-bold text-gray-900">{formatTaka(w.amount_paisa)}</p>
          <p className="text-xs text-gray-500 mt-0.5">{formatDate(w.requested_at)}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={w.status} />
          {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </div>
      </div>
      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">bKash নম্বর</span>
            <span className="font-mono font-medium">{w.bkash_number}</span>
          </div>
          {w.bkash_txid && (
            <div className="flex justify-between">
              <span className="text-gray-500">bKash TxID</span>
              <span className="font-mono text-green-700 font-medium">{w.bkash_txid}</span>
            </div>
          )}
          {w.approved_at && (
            <div className="flex justify-between">
              <span className="text-gray-500">অনুমোদনের তারিখ</span>
              <span>{formatDate(w.approved_at)}</span>
            </div>
          )}
          {w.completed_at && (
            <div className="flex justify-between">
              <span className="text-gray-500">সম্পন্নের তারিখ</span>
              <span>{formatDate(w.completed_at)}</span>
            </div>
          )}
          {w.admin_note && (
            <div className="bg-red-50 border border-red-100 rounded-lg p-2 text-red-700">
              <span className="font-medium">কারণ: </span>{w.admin_note}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Withdraw() {
  const qc = useQueryClient()
  const [amountTaka, setAmountTaka] = useState('')
  const [bkashNumber, setBkashNumber] = useState('')
  const [msg, setMsg] = useState('')
  const [errMsg, setErrMsg] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)

  const { data: balanceData, isLoading: balanceLoading } = useQuery({
    queryKey: ['withdrawal-balance'],
    queryFn: () => withdrawalsApi.balance(),
    staleTime: 30_000
  })

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['withdrawal-history'],
    queryFn: () => withdrawalsApi.history(),
    staleTime: 30_000
  })

  const requestMutation = useMutation({
    mutationFn: () => withdrawalsApi.request(
      Math.round(parseFloat(amountTaka) * 100),
      bkashNumber
    ),
    onSuccess: (res) => {
      if (res.success) {
        setMsg(`✅ উত্তোলন অনুরোধ সফলভাবে জমা হয়েছে! অ্যাডমিন অনুমোদনের পরে bKash এ পাঠানো হবে।`)
        setErrMsg('')
        setAmountTaka('')
        setBkashNumber('')
        setShowConfirm(false)
        qc.invalidateQueries({ queryKey: ['withdrawal-balance'] })
        qc.invalidateQueries({ queryKey: ['withdrawal-history'] })
      } else {
        setErrMsg((res as any).error)
        setShowConfirm(false)
      }
    }
  })

  const balance = balanceData?.success ? balanceData.data : null
  const history = historyData?.success ? historyData.data.items : []
  const hasPending = history.some(w => w.status === 'pending')

  const amountPaisa = Math.round((parseFloat(amountTaka) || 0) * 100)
  const isValidAmount = balance
    ? amountPaisa >= balance.settings.min_paisa &&
      amountPaisa <= balance.settings.max_paisa &&
      amountPaisa <= balance.available_paisa
    : false
  const isValidPhone = /^01[3-9]\d{8}$/.test(bkashNumber)
  const canSubmit = isValidAmount && isValidPhone && !hasPending

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">মুনাফা উত্তোলন</h1>
        <p className="text-gray-500 text-sm mt-1">আপনার অর্জিত মুনাফা bKash এ উত্তোলন করুন</p>
      </div>

      <Disclaimer variant="withdrawal" compact />

      {msg && (
        <div className="flex items-start gap-2 bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm">
          <CheckCircle size={16} className="mt-0.5 shrink-0" /> {msg}
          <button onClick={() => setMsg('')} className="ml-auto">✕</button>
        </div>
      )}
      {errMsg && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" /> {errMsg}
          <button onClick={() => setErrMsg('')} className="ml-auto">✕</button>
        </div>
      )}

      {/* Balance card */}
      {balanceLoading ? (
        <div className="card animate-pulse h-24" />
      ) : balance && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="card bg-gradient-to-br from-green-50 to-emerald-50 border-green-100">
            <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Wallet size={12} /> মোট মুনাফা</p>
            <p className="font-bold text-green-700 text-lg">{formatTaka(balance.total_earned_paisa)}</p>
          </div>
          <div className="card bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100">
            <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><CheckCircle size={12} /> উত্তোলিত</p>
            <p className="font-bold text-blue-700 text-lg">{formatTaka(balance.total_withdrawn_paisa)}</p>
          </div>
          <div className="card bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-100">
            <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Clock size={12} /> অপেক্ষমাণ</p>
            <p className="font-bold text-amber-700 text-lg">{formatTaka(balance.pending_paisa)}</p>
          </div>
          <div className="card bg-gradient-to-br from-purple-50 to-violet-50 border-purple-100">
            <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><ArrowDownCircle size={12} /> উপলব্ধ</p>
            <p className="font-bold text-purple-700 text-lg">{formatTaka(balance.available_paisa)}</p>
          </div>
        </div>
      )}

      {/* Withdrawal form */}
      {hasPending && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3 text-sm">
          <Info size={16} className="shrink-0 mt-0.5" />
          আপনার একটি উত্তোলন অনুরোধ অপেক্ষমাণ আছে। অনুমোদনের পরে নতুন অনুরোধ করতে পারবেন।
        </div>
      )}

      <div className={`card ${hasPending ? 'opacity-60 pointer-events-none' : ''}`}>
        <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
          <ArrowDownCircle size={20} className="text-primary-500" /> নতুন উত্তোলন অনুরোধ
        </h2>

        {balance && (
          <p className="text-xs text-gray-500 mb-4 bg-gray-50 rounded-lg px-3 py-2">
            সর্বনিম্ন {formatTaka(balance.settings.min_paisa)} •
            সর্বোচ্চ {formatTaka(balance.settings.max_paisa)} •
            প্রতি {balance.settings.cooldown_days} দিনে একবার
          </p>
        )}

        <div className="space-y-4">
          <div>
            <label className="label">উত্তোলনের পরিমাণ (টাকায়)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">৳</span>
              <input
                className="input pl-7"
                type="number"
                step="1"
                min={balance ? balance.settings.min_paisa / 100 : 100}
                max={balance ? Math.min(balance.settings.max_paisa, balance.available_paisa) / 100 : undefined}
                placeholder={`সর্বনিম্ন ৳${balance ? balance.settings.min_paisa / 100 : 100}`}
                value={amountTaka}
                onChange={e => { setAmountTaka(e.target.value); setErrMsg('') }}
              />
            </div>
            {amountTaka && balance && amountPaisa > balance.available_paisa && (
              <p className="text-xs text-red-500 mt-1">উপলব্ধ ব্যালেন্সের বেশি হতে পারবে না</p>
            )}
          </div>

          <div>
            <label className="label">bKash নম্বর</label>
            <input
              className="input font-mono"
              type="tel"
              placeholder="01XXXXXXXXX"
              value={bkashNumber}
              onChange={e => { setBkashNumber(e.target.value); setErrMsg('') }}
              pattern="01[3-9][0-9]{8}"
              maxLength={11}
            />
            {bkashNumber && !isValidPhone && (
              <p className="text-xs text-red-500 mt-1">সঠিক bKash নম্বর দিন (01XXXXXXXXX)</p>
            )}
          </div>

          {!showConfirm ? (
            <button
              onClick={() => setShowConfirm(true)}
              disabled={!canSubmit}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <ArrowDownCircle size={18} /> উত্তোলন অনুরোধ করুন
            </button>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-2 text-amber-800 text-sm">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">নিশ্চিত করুন</p>
                  <p className="text-xs mt-1">
                    <span className="font-bold">{formatTaka(amountPaisa)}</span> টাকা
                    <span className="font-mono font-bold mx-1">{bkashNumber}</span>
                    নম্বরে পাঠানোর অনুরোধ করছেন?
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setMsg(''); setErrMsg(''); requestMutation.mutate() }}
                  disabled={requestMutation.isPending}
                  className="btn-primary flex-1 text-sm py-2"
                >
                  {requestMutation.isPending ? 'জমা হচ্ছে...' : 'হ্যাঁ, অনুরোধ করুন'}
                </button>
                <button onClick={() => setShowConfirm(false)} className="btn-secondary flex-1 text-sm py-2">
                  বাতিল
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* History */}
      <div>
        <h2 className="font-bold text-gray-900 mb-3">উত্তোলনের ইতিহাস</h2>
        {historyLoading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="card animate-pulse h-16" />)}
          </div>
        ) : history.length === 0 ? (
          <div className="card text-center py-8 text-gray-400 text-sm">
            কোনো উত্তোলনের ইতিহাস নেই
          </div>
        ) : (
          <div className="space-y-2">
            {history.map(w => <WithdrawalCard key={w.id} w={w} />)}
          </div>
        )}
      </div>
    </div>
  )
}
