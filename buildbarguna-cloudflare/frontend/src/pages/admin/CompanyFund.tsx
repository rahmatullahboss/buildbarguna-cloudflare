import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { profitApi, type CompanyFundTransaction } from '../../lib/api'
import { formatTaka, formatDate } from '../../lib/auth'
import {
  Building2, TrendingUp, TrendingDown, Wallet, ArrowDownCircle,
  ArrowUpCircle, Plus, CheckCircle, AlertTriangle, History
} from 'lucide-react'

const TRANSACTION_TYPE_LABELS: Record<CompanyFundTransaction['transaction_type'], string> = {
  profit_share: '📥 প্রফিট শেয়ার',
  withdrawal: '📤 উত্তোলন',
  adjustment: '⚙️ সমন্বয়',
  expense: '💸 খরচ'
}

export default function CompanyFund() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [withdrawForm, setWithdrawForm] = useState({
    amount: '',
    description: '',
    transaction_type: 'withdrawal' as 'withdrawal' | 'expense'
  })
  const [msg, setMsg] = useState('')
  const [errMsg, setErrMsg] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['company-fund', page],
    queryFn: () => profitApi.companyFund(page)
  })

  const withdrawMutation = useMutation({
    mutationFn: () => profitApi.withdrawFund({
      amount: Math.round(parseFloat(withdrawForm.amount) * 100),
      description: withdrawForm.description,
      transaction_type: withdrawForm.transaction_type
    }),
    onSuccess: (res) => {
      if (res.success) {
        setMsg('সফলভাবে সম্পন্ন হয়েছে!')
        setErrMsg('')
        setShowWithdraw(false)
        setWithdrawForm({ amount: '', description: '', transaction_type: 'withdrawal' })
        qc.invalidateQueries({ queryKey: ['company-fund'] })
      } else {
        setErrMsg((res as any).error || 'ব্যর্থ হয়েছে')
      }
    },
    onError: (err: any) => setErrMsg(err.message || 'ব্যর্থ হয়েছে')
  })

  const fund = data?.success ? data.data : null

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="shimmer rounded-2xl h-24 w-full" />
        <div className="shimmer rounded-2xl h-60 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-700 via-purple-600 to-violet-500 rounded-3xl p-5 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-1">
            <Building2 size={24} />
            <h1 className="text-xl font-bold">কোম্পানি ফান্ড</h1>
          </div>
          <p className="text-white/70 text-sm">প্রজেক্ট প্রফিট থেকে কোম্পানির অংশ</p>
        </div>
      </div>

      {/* Messages */}
      {msg && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm">
          <CheckCircle size={16} /> {msg}
          <button onClick={() => setMsg('')} className="ml-auto text-green-400">✕</button>
        </div>
      )}
      {errMsg && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
          <AlertTriangle size={16} /> {errMsg}
          <button onClick={() => setErrMsg('')} className="ml-auto text-red-400">✕</button>
        </div>
      )}

      {/* Summary Cards */}
      {fund && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Current Balance */}
            <div className="card bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200 col-span-1 sm:col-span-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-indigo-100 rounded-xl">
                  <Wallet size={22} className="text-indigo-600" />
                </div>
                <div>
                  <p className="text-xs text-indigo-500 font-medium">বর্তমান ব্যালেন্স</p>
                  <p className="text-2xl font-bold text-indigo-700">{formatTaka(fund.summary.current_balance)}</p>
                </div>
              </div>
              <button
                onClick={() => setShowWithdraw(true)}
                className="w-full mt-2 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition flex items-center justify-center gap-2"
              >
                <Plus size={16} /> উত্তোলন / খরচ রেকর্ড
              </button>
            </div>

            {/* Total Credited */}
            <div className="card bg-green-50 border-green-200">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 rounded-xl">
                  <ArrowDownCircle size={22} className="text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-green-500 font-medium">মোট জমা (প্রফিট শেয়ার)</p>
                  <p className="text-2xl font-bold text-green-700">{formatTaka(fund.summary.total_credited)}</p>
                </div>
              </div>
            </div>

            {/* Total Debited */}
            <div className="card bg-red-50 border-red-200">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-100 rounded-xl">
                  <ArrowUpCircle size={22} className="text-red-600" />
                </div>
                <div>
                  <p className="text-xs text-red-500 font-medium">মোট ব্যয়</p>
                  <p className="text-2xl font-bold text-red-700">{formatTaka(fund.summary.total_debited)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Withdraw / Expense Form */}
          {showWithdraw && (
            <div className="card border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Plus size={20} className="text-indigo-600" />
                ফান্ড থেকে উত্তোলন / খরচ
              </h3>
              <div className="space-y-3">
                {/* Type */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setWithdrawForm(f => ({ ...f, transaction_type: 'withdrawal' }))}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition ${
                      withdrawForm.transaction_type === 'withdrawal'
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-300'
                    }`}
                  >📤 উত্তোলন</button>
                  <button
                    onClick={() => setWithdrawForm(f => ({ ...f, transaction_type: 'expense' }))}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition ${
                      withdrawForm.transaction_type === 'expense'
                        ? 'bg-red-500 text-white border-red-500'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-red-300'
                    }`}
                  >💸 খরচ রেকর্ড</button>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">পরিমাণ (৳)</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={withdrawForm.amount}
                    onChange={e => setWithdrawForm(f => ({ ...f, amount: e.target.value }))}
                    className="input w-full"
                    min="0"
                    step="0.01"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">বিবরণ *</label>
                  <input
                    type="text"
                    placeholder="কোন উদ্দেশ্যে?"
                    value={withdrawForm.description}
                    onChange={e => setWithdrawForm(f => ({ ...f, description: e.target.value }))}
                    className="input w-full"
                  />
                </div>

                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => withdrawMutation.mutate()}
                    disabled={!withdrawForm.amount || !withdrawForm.description || withdrawMutation.isPending}
                    className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition disabled:opacity-50"
                  >
                    {withdrawMutation.isPending ? '⏳ প্রসেসিং...' : '✅ নিশ্চিত করুন'}
                  </button>
                  <button
                    onClick={() => setShowWithdraw(false)}
                    className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition"
                  >
                    বাতিল
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Transaction History */}
          <div className="card">
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
              <History size={20} className="text-gray-600" />
              লেনদেনের ইতিহাস ({fund.pagination.total})
            </h2>

            {fund.transactions.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <Building2 size={40} className="mx-auto mb-2 opacity-40" />
                <p>এখনো কোনো লেনদেন নেই</p>
                <p className="text-xs mt-1">প্রজেক্ট থেকে প্রফিট বিতরণ করলে এখানে দেখাবে</p>
              </div>
            ) : (
              <div className="space-y-2">
                {fund.transactions.map((tx) => (
                  <div key={tx.id} className={`flex items-start gap-3 p-3 rounded-xl border ${
                    tx.amount_paisa > 0 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'
                  }`}>
                    <div className={`p-2 rounded-lg shrink-0 ${
                      tx.amount_paisa > 0 ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {tx.amount_paisa > 0
                        ? <TrendingUp size={18} className="text-green-600" />
                        : <TrendingDown size={18} className="text-red-600" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-sm truncate">{tx.description}</p>
                        <p className={`font-bold text-sm shrink-0 ${tx.amount_paisa > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {tx.amount_paisa > 0 ? '+' : ''}{formatTaka(tx.amount_paisa)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs text-gray-500">{TRANSACTION_TYPE_LABELS[tx.transaction_type]}</span>
                        {tx.project_title && (
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{tx.project_title}</span>
                        )}
                        <span className="text-xs text-gray-400">{formatDate(tx.created_at)}</span>
                        {tx.created_by_name && (
                          <span className="text-xs text-gray-400">• {tx.created_by_name}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {fund.pagination.total > fund.pagination.limit && (
              <div className="flex justify-center gap-2 mt-4">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                  className="px-4 py-2 text-sm bg-gray-100 rounded-lg disabled:opacity-40 hover:bg-gray-200 transition"
                >← আগের</button>
                <span className="px-4 py-2 text-sm font-medium">{page} / {Math.ceil(fund.pagination.total / fund.pagination.limit)}</span>
                <button
                  disabled={!fund.pagination.hasMore}
                  onClick={() => setPage(p => p + 1)}
                  className="px-4 py-2 text-sm bg-gray-100 rounded-lg disabled:opacity-40 hover:bg-gray-200 transition"
                >পরের →</button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
