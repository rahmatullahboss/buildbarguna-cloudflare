import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { withdrawalsApi } from '../lib/api'
import { formatTaka, formatDate } from '../lib/auth'
import type { Withdrawal, WithdrawalStatus, IncomeBreakdownItem } from '../lib/api'
import {
  Clock, CheckCircle, XCircle, AlertTriangle,
  ArrowDownCircle, ChevronDown, ChevronUp, Info, Send, CircleDot, Layers
} from 'lucide-react'
import Disclaimer from '../components/Disclaimer'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: WithdrawalStatus }) {
  const map: Record<WithdrawalStatus, { label: string; cls: string; icon: React.ReactNode }> = {
    pending:   { label: 'অপেক্ষমাণ',     cls: 'bg-yellow-100 text-yellow-700', icon: <Clock size={12} /> },
    approved:  { label: 'অনুমোদিত',      cls: 'bg-blue-100 text-blue-700',    icon: <CheckCircle size={12} /> },
    completed: { label: 'সম্পন্ন',       cls: 'bg-green-100 text-green-700',  icon: <CheckCircle size={12} /> },
    rejected:  { label: 'প্রত্যাখ্যাত', cls: 'bg-red-100 text-red-700',      icon: <XCircle size={12} /> }
  }
  const { label, cls, icon } = map[status]
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>
      {icon} {label}
    </span>
  )
}

/** 3-step progress timeline for a single withdrawal */
function WithdrawalSteps({ status, method }: { status: WithdrawalStatus, method?: string }) {
  const methodLabel = method === 'nagad' ? 'Nagad' : method === 'cash' ? 'অফিস' : 'bKash'
  const steps = [
    { key: 'pending',   label: 'অনুরোধ',      icon: CircleDot },
    { key: 'approved',  label: 'অনুমোদন (৭২ ঘণ্টা)',     icon: CheckCircle },
    { key: 'completed', label: `${methodLabel} প্রেরণ`, icon: Send },
  ]
  const order: Record<string, number> = { pending: 0, approved: 1, completed: 2, rejected: -1 }
  const current = order[status] ?? 0
  const rejected = status === 'rejected'

  if (rejected) return (
    <div className="flex items-center gap-1.5 mt-2">
      <XCircle size={14} className="text-red-400 shrink-0" />
      <span className="text-xs text-red-500">অনুরোধ প্রত্যাখ্যাত হয়েছে</span>
    </div>
  )

  return (
    <div className="flex items-center gap-1 mt-3">
      {steps.map((step, i) => {
        const done = i <= current
        const active = i === current
        const Icon = step.icon
        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-0.5">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all ${
                done
                  ? active
                    ? 'bg-blue-500 border-blue-500 text-white shadow-sm shadow-blue-200'
                    : 'bg-green-500 border-green-500 text-white'
                  : 'bg-gray-100 border-gray-200 text-gray-300'
              }`}>
                <Icon size={12} />
              </div>
              <span className={`text-[9px] font-medium whitespace-nowrap ${
                done ? (active ? 'text-blue-600' : 'text-green-600') : 'text-gray-300'
              }`}>{step.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 mb-3 rounded-full ${
                i < current ? 'bg-green-400' : 'bg-gray-200'
              }`} />
            )}
          </div>
        )
      })}
    </div>
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
        <div className="flex-1">
          <p className="font-bold text-gray-900">{formatTaka(w.amount_paisa)}</p>
          <p className="text-xs text-gray-500 mt-0.5">{formatDate(w.requested_at)}</p>
          <WithdrawalSteps status={w.status} method={w.withdrawal_method} />
        </div>
        <div className="flex items-center gap-3 self-start mt-1">
          <StatusBadge status={w.status} />
          {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </div>
      </div>
      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">{w.withdrawal_method === 'nagad' ? 'Nagad' : 'bKash'} নম্বর</span>
            <span className="font-mono font-medium">{w.bkash_number}</span>
          </div>
          {w.bkash_txid && (
            <div className="flex justify-between">
              <span className="text-gray-500">TxID</span>
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

// ─── Balance Pipeline Card ────────────────────────────────────────────────────

interface BalanceData {
  total_earned_paisa: number
  total_withdrawn_paisa: number
  pending_paisa: number
  approved_paisa: number
  reserved_paisa: number
  available_paisa: number
}

function BalancePipelineCard({ balance }: { balance: BalanceData }) {
  const earned    = balance.total_earned_paisa
  const withdrawn = balance.total_withdrawn_paisa
  const approved  = balance.approved_paisa ?? 0
  const pending   = balance.pending_paisa
  const available = Math.max(0, balance.available_paisa)

  // Progress bar segments as % of total_earned
  const base = earned || 1
  const withdrawnPct = Math.min(100, (withdrawn / base) * 100)
  const approvedPct  = Math.min(100 - withdrawnPct, (approved / base) * 100)
  const pendingPct   = Math.min(100 - withdrawnPct - approvedPct, (pending / base) * 100)
  const availablePct = Math.max(0, 100 - withdrawnPct - approvedPct - pendingPct)

  return (
    <div className="card space-y-4">
      {/* Big available number + total earned */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-400 mb-0.5 flex items-center gap-1">
            <ArrowDownCircle size={12} /> উত্তোলনযোগ্য ব্যালেন্স
          </p>
          <p className="text-3xl font-bold text-purple-700">{formatTaka(available)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">মোট জমাকৃত</p>
          <p className="font-bold text-gray-700">{formatTaka(earned)}</p>
        </div>
      </div>

      {/* Stacked progress bar */}
      <div className="space-y-1.5">
        <div className="flex h-3 rounded-full overflow-hidden bg-gray-100 gap-0.5">
          {withdrawn > 0 && (
            <div className="bg-gray-400 transition-all" style={{ width: `${withdrawnPct}%` }}
              title={`সম্পন্ন: ${formatTaka(withdrawn)}`} />
          )}
          {approved > 0 && (
            <div className="bg-blue-400 transition-all" style={{ width: `${approvedPct}%` }}
              title={`অনুমোদিত: ${formatTaka(approved)}`} />
          )}
          {pending > 0 && (
            <div className="bg-yellow-400 transition-all" style={{ width: `${pendingPct}%` }}
              title={`অপেক্ষমাণ: ${formatTaka(pending)}`} />
          )}
          <div className="bg-purple-400 transition-all" style={{ width: `${availablePct}%` }}
            title={`উপলব্ধ: ${formatTaka(available)}`} />
        </div>
        {/* Legend */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <span className="flex items-center gap-1.5 text-gray-500">
            <span className="w-2.5 h-2.5 rounded-sm bg-gray-400 shrink-0" />
            সম্পন্ন — {formatTaka(withdrawn)}
          </span>
          {approved > 0 && (
            <span className="flex items-center gap-1.5 text-blue-600 font-medium">
              <span className="w-2.5 h-2.5 rounded-sm bg-blue-400 shrink-0" />
              অনুমোদিত (শিগগিরই পাঠানো হবে) — {formatTaka(approved)}
            </span>
          )}
          {pending > 0 && (
            <span className="flex items-center gap-1.5 text-yellow-600">
              <span className="w-2.5 h-2.5 rounded-sm bg-yellow-400 shrink-0" />
              অপেক্ষমাণ — {formatTaka(pending)}
            </span>
          )}
          <span className="flex items-center gap-1.5 text-purple-600 font-medium">
            <span className="w-2.5 h-2.5 rounded-sm bg-purple-400 shrink-0" />
            উত্তোলনযোগ্য — {formatTaka(available)}
          </span>
        </div>
      </div>

      {/* Approved in-flight callout */}
      {approved > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2">
          <Send size={14} className="text-blue-500 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700">
            <strong>{formatTaka(approved)}</strong> অনুমোদিত হয়েছে এবং শীঘ্রই আপনার অ্যাকাউন্টে পাঠানো হবে।
          </p>
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
  const [withdrawalMethod, setWithdrawalMethod] = useState<'bkash' | 'nagad' | 'cash'>('bkash')
  const [msg, setMsg] = useState('')
  const [errMsg, setErrMsg] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)

  const { data: balanceData, isLoading: balanceLoading } = useQuery({
    queryKey: ['withdrawal-balance'],
    queryFn: () => withdrawalsApi.balance(),
    staleTime: 15_000   // Refresh every 15s so cards update promptly after admin action
  })

  const { data: breakdownData } = useQuery({
    queryKey: ['income-breakdown'],
    queryFn: () => withdrawalsApi.incomeBreakdown(),
    staleTime: 60_000
  })

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['withdrawal-history'],
    queryFn: () => withdrawalsApi.history(),
    staleTime: 15_000
  })

  const requestMutation = useMutation({
    mutationFn: () => withdrawalsApi.request(
      Math.round(parseFloat(amountTaka) * 100),
      withdrawalMethod === 'bkash' ? bkashNumber : undefined,
      withdrawalMethod
    ),
    onSuccess: (res) => {
      if (res.success) {
        setMsg(`✅ উত্তোলন অনুরোধ সফলভাবে জমা হয়েছে! অ্যাডমিন ৭২ ঘণ্টার মধ্যে যাচাই করে আপডেট জানাবে।`)
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
  const breakdown = breakdownData?.success ? breakdownData.data.breakdown : []
  const breakdownTotal = breakdownData?.success ? breakdownData.data.total_earned_paisa : 0
  const history = historyData?.success ? historyData.data.items : []
  const hasPending = history.some(w => w.status === 'pending')

  const amountPaisa = Math.round((parseFloat(amountTaka) || 0) * 100)
  const isValidAmount = balance
    ? amountPaisa >= balance.settings.min_paisa &&
      amountPaisa <= balance.available_paisa
    : false
  const isValidPhone = withdrawalMethod === 'cash' || /^01[3-9]\d{8}$/.test(bkashNumber)
  const canSubmit = isValidAmount && isValidPhone && !hasPending

  return (
    <div className="space-y-6">
      {/* Hero banner */}
      <div className="bg-gradient-to-r from-purple-700 via-violet-600 to-purple-600 rounded-3xl p-5 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-36 h-36 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10">
          <h1 className="text-2xl font-bold">💸 মুনাফা উত্তোলন</h1>
          <p className="text-purple-100 text-sm mt-1">আপনার অর্জিত মুনাফা উত্তোলন করুন। সাবমিট করার ৭২ ঘণ্টার মধ্যে অ্যাডমিন আপডেট করবে।</p>
        </div>
      </div>

      <Disclaimer variant="withdrawal" compact />

      {msg && (
        <div className="flex items-start gap-2 bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm">
          <CheckCircle size={16} className="mt-0.5 shrink-0" /> {msg}
          <button onClick={() => setMsg('')} className="ml-auto" aria-label="বার্তা বন্ধ করুন">✕</button>
        </div>
      )}
      {errMsg && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" /> {errMsg}
          <button onClick={() => setErrMsg('')} className="ml-auto" aria-label="ত্রুটি বার্তা বন্ধ করুন">✕</button>
        </div>
      )}

      {/* Balance pipeline card */}
      {balanceLoading ? (
        <div className="card animate-pulse h-36" />
      ) : balance && (
        <BalancePipelineCard balance={balance as any} />
      )}

      {/* Income Breakdown Card */}
      {breakdown.length > 0 && (
        <div className="card">
          <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Layers size={18} className="text-indigo-500" /> আয়ের উৎস (খাত অনুযায়ী)
          </h2>
          <div className="space-y-2.5">
            {breakdown.map((item: IncomeBreakdownItem, i: number) => {
              const colors = ['bg-green-500','bg-blue-500','bg-amber-500','bg-rose-500','bg-cyan-500','bg-violet-500']
              const textColors = ['text-green-700','text-blue-700','text-amber-700','text-rose-700','text-cyan-700','text-violet-700']
              const bgColors = ['bg-green-50','bg-blue-50','bg-amber-50','bg-rose-50','bg-cyan-50','bg-violet-50']
              const widthPct = breakdownTotal > 0
                ? Math.max(3, (item.amount_paisa / breakdownTotal) * 100)
                : 0
              const isRef = item.source === 'referral_bonus'
              const isProject = item.source === 'project_earnings'
              const icon = isProject ? '📊' : isRef ? '🎁' : item.source === 'monthly_earnings' ? '📈' : item.source === 'capital_refund' ? '🏦' : '💰'
              const displayLabel = isProject ? item.project_title : item.label
              const pctText = breakdownTotal > 0
                ? `${((item.amount_paisa / breakdownTotal) * 100).toFixed(1)}%`
                : '0%'

              return (
                <div key={`${item.source}-${item.project_id ?? 'ref'}-${i}`}
                  className={`rounded-xl p-3 ${bgColors[i % bgColors.length]} border border-gray-100`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${colors[i % colors.length]}`} />
                      <div className="min-w-0">
                        <span className="text-sm font-medium text-gray-800 truncate block">
                          {icon} {displayLabel}
                        </span>
                        {item.detail && (
                          <span className="text-[10px] text-gray-400">{item.detail}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className={`text-sm font-bold ${textColors[i % textColors.length]}`}>
                        {formatTaka(item.amount_paisa)}
                      </p>
                      <p className="text-[10px] text-gray-400">{pctText}</p>
                    </div>
                  </div>
                  <div className="h-2 bg-white/80 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${colors[i % colors.length]} transition-all duration-500`}
                      style={{ width: `${widthPct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
          <p className="text-xs text-gray-400 mt-3 text-center">
            মোট আয়: <span className="font-semibold text-gray-600">{formatTaka(breakdownTotal)}</span>
          </p>
        </div>
      )}

      {/* Pending warning */}
      {hasPending && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3 text-sm">
          <Info size={16} className="shrink-0 mt-0.5" />
          আপনার একটি উত্তোলন অনুরোধ অপেক্ষমাণ আছে। অনুমোদনের পরে নতুন অনুরোধ করতে পারবেন।
        </div>
      )}

      {/* Withdrawal form */}
      <div className={`card ${hasPending ? 'opacity-60 pointer-events-none' : ''}`}>
        <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
          <ArrowDownCircle size={20} className="text-primary-500" /> নতুন উত্তোলন অনুরোধ
        </h2>

        {balance && (
          <p className="text-xs text-gray-500 mb-4 bg-gray-50 rounded-lg px-3 py-2">
            সর্বনিম্ন {formatTaka(balance.settings.min_paisa)} •
            প্রতি {balance.settings.cooldown_days} দিনে একবার
          </p>
        )}

        {/* Withdrawal Method Toggle */}
        <div className="mb-4">
          <label className="label">উত্তোলন পদ্ধতি</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setWithdrawalMethod('bkash')}
              className={`py-2.5 px-4 rounded-xl text-sm font-medium transition-all border-2 ${
                withdrawalMethod === 'bkash'
                  ? 'bg-pink-50 border-pink-500 text-pink-700 shadow-sm'
                  : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              <span className="inline-flex items-center gap-1.5"><img src="/bkash-logo.svg" alt="bKash" className="h-5 inline-block" /> bKash</span>
            </button>
            <button
              type="button"
              onClick={() => setWithdrawalMethod('nagad')}
              className={`py-2.5 px-4 rounded-xl text-sm font-medium transition-all border-2 ${
                withdrawalMethod === 'nagad'
                  ? 'bg-orange-50 border-orange-500 text-orange-700 shadow-sm'
                  : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              <span className="inline-flex items-center gap-1.5"><img src="/nagad-logo.svg" alt="Nagad" className="h-5 inline-block" /> Nagad</span>
            </button>
            <button
              type="button"
              onClick={() => setWithdrawalMethod('cash')}
              className={`py-2.5 px-4 rounded-xl text-sm font-medium transition-all border-2 ${
                withdrawalMethod === 'cash'
                  ? 'bg-green-50 border-green-500 text-green-700 shadow-sm'
                  : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              💵 ক্যাশ
            </button>
          </div>
        </div>

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
                max={balance ? balance.available_paisa / 100 : undefined}
                placeholder={`সর্বনিম্ন ৳${balance ? balance.settings.min_paisa / 100 : 100}`}
                value={amountTaka}
                onChange={e => { setAmountTaka(e.target.value); setErrMsg('') }}
              />
            </div>
            {amountTaka && balance && amountPaisa > balance.available_paisa && (
              <p className="text-xs text-red-500 mt-1">উপলব্ধ ব্যালেন্সের বেশি হতে পারবে না</p>
            )}
          </div>

          {withdrawalMethod !== 'cash' && (
          <div>
            <label className="label">{withdrawalMethod === 'nagad' ? 'Nagad' : 'bKash'} নম্বর</label>
            <input
              className="input font-mono"
              type="tel"
              placeholder="01XXXXXXXXX"
              value={bkashNumber}
              onChange={e => { setBkashNumber(e.target.value); setErrMsg('') }}
              pattern="01[3-9][0-9]{8}"
              maxLength={11}
            />
            {bkashNumber && !(/^01[3-9]\d{8}$/.test(bkashNumber)) && (
              <p className="text-xs text-red-500 mt-1">সঠিক মোবাইল নম্বর দিন (01XXXXXXXXX)</p>
            )}
            <p className="text-xs text-gray-500 mt-2">
              <Info size={12} className="inline mr-1" />
              রিকোয়েস্ট করার ৭২ ঘণ্টার মধ্যে অ্যাডমিন আপনার রিকোয়েস্ট যাচাই করে অ্যাকাউন্টে ব্যালেন্স আপডেট করে দিবে।
            </p>
          </div>
          )}

          {withdrawalMethod === 'cash' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700 flex items-start gap-2">
              <Info size={16} className="shrink-0 mt-0.5" />
              <div>
                <p>ক্যাশ উত্তোলন অনুমোদনের পরে অফিস থেকে সংগ্রহ করুন। মোবাইল নম্বর প্রয়োজন নেই।</p>
                <p className="mt-1 text-xs font-semibold">রিকোয়েস্ট করার ৭২ ঘণ্টার মধ্যে অ্যাডমিন আপনার রিকোয়েস্ট যাচাই করে আপডেট করে দিবে।</p>
              </div>
            </div>
          )}

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
                    {withdrawalMethod !== 'cash' ? (
                      <><span className="font-mono font-bold mx-1">{bkashNumber}</span> নম্বরে {withdrawalMethod === 'nagad' ? 'Nagad' : 'bKash'} এ পাঠানোর অনুরোধ করছেন?</>
                    ) : (
                      <> ক্যাশ হিসেবে উত্তোলনের অনুরোধ করছেন?</>
                    )}
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
            {[1,2,3].map(i => <div key={i} className="card animate-pulse h-28" />)}
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
