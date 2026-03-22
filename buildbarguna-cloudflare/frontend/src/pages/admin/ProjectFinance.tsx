import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { financeApi, profitApi, type ProjectTransaction } from '../../lib/api'
import { formatTaka, formatDate } from '../../lib/auth'
import TransactionForm from '../../components/admin/TransactionForm'
import FinancialSummaryCard from '../../components/admin/FinancialSummaryCard'
import { TrendingUp, TrendingDown, ArrowLeft, DollarSign, Send, History, Edit2, Trash2 } from 'lucide-react'

export default function ProjectFinance() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const id = parseInt(projectId || '0')

  const [filter, setFilter] = useState<'all' | 'expense' | 'revenue'>('all')
  const [editData, setEditData] = useState<ProjectTransaction | null>(null)
  const [showForm, setShowForm] = useState(false)

  // Fetch project summary
  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ['project-finance-summary', id],
    queryFn: () => financeApi.getSummary(id),
    enabled: !!id
  })

  // Fetch transactions
  const { data: transactionsData, isLoading: transLoading } = useQuery({
    queryKey: ['project-transactions', id, filter],
    queryFn: () => financeApi.getTransactions(id, { type: filter === 'all' ? undefined : filter }),
    enabled: !!id
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (transId: number) => financeApi.deleteTransaction(transId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project-transactions', id] })
  })

  const summary = summaryData?.success ? summaryData.data : null
  const transactions = transactionsData?.success ? (transactionsData.data as any).items : []

  const handleDelete = (transId: number) => {
    if (confirm('আপনি কি নিশ্চিত? এই এন্ট্রি ডিলিট হয়ে যাবে।')) {
      deleteMutation.mutate(transId)
    }
  }

  if (summaryLoading) {
    return (
      <div className="p-4">
        <div className="shimmer rounded-2xl h-20 w-full mb-4" />
        <div className="shimmer rounded-2xl h-40 w-full" />
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="p-4 text-center">
        <p className="text-gray-500">প্রজেক্ট পাওয়া যায়নি</p>
        <Link to="/admin/projects" className="text-primary-600 hover:underline mt-2 inline-block">
          প্রজেক্ট লিস্টে ফিরে যান
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-700 via-purple-600 to-pink-600 rounded-3xl p-5 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/admin/projects')} aria-label="ফিরে যান" className="bg-white/15 p-2 rounded-xl hover:bg-white/25 transition">
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-xl font-bold">{summary.project.title}</h1>
                <p className="text-white/70 text-sm">ফাইনান্সিয়াল ব্যবস্থাপনা</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link
                to={`/admin/projects/${id}/distribute-profit`}
                className="bg-white text-purple-700 font-bold text-sm px-4 py-2 rounded-xl hover:bg-purple-50 transition flex items-center gap-2"
              >
                <Send size={16} /> প্রফিট পাঠান
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <FinancialSummaryCard data={summary.financials} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Transaction Form */}
        <div className="lg:col-span-1">
          <TransactionForm
            projectId={id}
            onSuccess={() => {
              qc.invalidateQueries({ queryKey: ['project-transactions', id] })
              qc.invalidateQueries({ queryKey: ['project-finance-summary', id] })
              setShowForm(false)
              setEditData(null)
            }}
            editData={editData || undefined}
            onEditCancel={() => setEditData(null)}
          />
        </div>

        {/* Right: Transactions List */}
        <div className="lg:col-span-2">
          <div className="card">
            {/* Filters */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg">ট্রানজেকশন লিস্ট</h2>
              <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                {(['all', 'expense', 'revenue'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                      filter === f
                        ? 'bg-white shadow text-gray-900'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {f === 'all' ? '📋 সব' : f === 'expense' ? '📤 খরচ' : '📥 আয়'}
                  </button>
                ))}
              </div>
            </div>

            {/* Transactions */}
            {transLoading ? (
              <div className="space-y-2">
                {[1,2,3].map(i => <div key={i} className="shimmer h-16 rounded-xl" />)}
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <DollarSign size={40} className="mx-auto mb-2 opacity-50" />
                <p>কোনো ট্রানজেকশন নেই</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {transactions.map((tx: ProjectTransaction) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        tx.transaction_type === 'expense' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                      }`}>
                        {tx.transaction_type === 'expense' ? <TrendingDown size={18} /> : <TrendingUp size={18} />}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{tx.category}</p>
                        <p className="text-xs text-gray-500">{formatDate(tx.transaction_date)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className={`font-bold ${
                        tx.transaction_type === 'expense' ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {tx.transaction_type === 'expense' ? '-' : '+'}{formatTaka(tx.amount)}
                      </p>
                      <div className="hidden group-hover:flex gap-1">
                        <button
                          onClick={() => setEditData(tx)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(tx.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      {summary?.category_breakdown && summary.category_breakdown.length > 0 && (
        <div className="card">
          <h2 className="font-bold text-lg mb-4">ক্যাটাগরি অনুযায়ী বিভাজন</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {summary.category_breakdown.map((cat, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${
                    cat.transaction_type === 'expense' ? 'bg-red-500' : 'bg-green-500'
                  }`} />
                  <span className="font-medium">{cat.category}</span>
                  <span className="text-xs text-gray-400">({cat.transaction_count})</span>
                </div>
                <span className={`font-bold ${
                  cat.transaction_type === 'expense' ? 'text-red-600' : 'text-green-600'
                }`}>
                  {formatTaka(cat.total_amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Monthly Trend */}
      {summary?.monthly_trend && summary.monthly_trend.length > 0 && (
        <div className="card">
          <h2 className="font-bold text-lg mb-4">মাসিক প্রবণতা</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-2 font-medium">মাস</th>
                  <th className="pb-2 font-medium text-right">আয়</th>
                  <th className="pb-2 font-medium text-right">খরচ</th>
                  <th className="pb-2 font-medium text-right">লাভ/লস</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {summary.monthly_trend.map((m, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="py-2 font-medium">{m.month}</td>
                    <td className="py-2 text-right text-green-600">{formatTaka(m.revenue)}</td>
                    <td className="py-2 text-right text-red-600">{formatTaka(m.expense)}</td>
                    <td className={`py-2 text-right font-bold ${
                      m.profit >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {m.profit >= 0 ? '+' : ''}{formatTaka(m.profit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
