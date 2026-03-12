import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { profitApi, type ProfitDistribution } from '../../lib/api'
import { formatTaka, formatDate } from '../../lib/auth'
import {
  ArrowLeft, Send, Users, DollarSign, CheckCircle, AlertTriangle,
  History, Eye, TrendingUp, TrendingDown, Building2, Wallet, Calendar, FileText
} from 'lucide-react'

export default function ProfitDistribution() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const id = parseInt(projectId || '0')

  const [companyPct, setCompanyPct] = useState(30)
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const [notes, setNotes] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)
  const [msg, setMsg] = useState('')
  const [errMsg, setErrMsg] = useState('')
  const [selectedDistId, setSelectedDistId] = useState<number | null>(null)

  const { data: previewData, isLoading, refetch } = useQuery({
    queryKey: ['profit-preview', id, companyPct],
    queryFn: () => profitApi.preview(id, companyPct),
    enabled: !!id
  })

  const { data: historyData } = useQuery({
    queryKey: ['profit-history', id],
    queryFn: () => profitApi.getHistory(id),
    enabled: !!id
  })

  const { data: detailData } = useQuery({
    queryKey: ['profit-detail', selectedDistId],
    queryFn: () => profitApi.getDistribution(selectedDistId!),
    enabled: !!selectedDistId
  })

  const distributeMutation = useMutation({
    mutationFn: () => profitApi.distribute(id, {
      company_share_percentage: companyPct,
      period_start: periodStart || undefined,
      period_end: periodEnd || undefined,
      notes: notes || undefined
    }),
    onSuccess: (res) => {
      if (res.success) {
        setMsg(res.data.message)
        setErrMsg('')
        setShowConfirm(false)
        setNotes('')
        setPeriodStart('')
        setPeriodEnd('')
        refetch()
        qc.invalidateQueries({ queryKey: ['profit-history', id] })
        qc.invalidateQueries({ queryKey: ['company-fund'] })
      } else {
        setErrMsg((res as any).error || 'ব্যর্থ হয়েছে')
      }
    },
    onError: (err: any) => setErrMsg(err.message || 'ব্যর্থ হয়েছে')
  })

  const preview = previewData?.success ? previewData.data : null
  const history = historyData?.success ? (historyData.data as any).items : []
  const detail = detailData?.success ? detailData.data : null

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="shimmer rounded-2xl h-20 w-full" />
        <div className="shimmer rounded-2xl h-60 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-600 via-orange-500 to-red-500 rounded-3xl p-5 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="bg-white/15 p-2 rounded-xl hover:bg-white/25 transition">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-bold">প্রফিট ডিস্ট্রিবিউশন</h1>
              <p className="text-white/70 text-sm">
                {preview?.project?.title ?? 'শেয়ারহোল্ডারদের লাভ বিতরণ'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      {msg && (
        <div className="flex items-start gap-2 bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm">
          <CheckCircle size={16} className="mt-0.5 shrink-0" /> {msg}
          <button onClick={() => setMsg('')} className="ml-auto text-green-400">✕</button>
        </div>
      )}
      {errMsg && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" /> {errMsg}
          <button onClick={() => setErrMsg('')} className="ml-auto text-red-400">✕</button>
        </div>
      )}

      {preview && (
        <>
          {/* Financial Summary — 6 cards */}
          <div className="card">
            <h2 className="font-bold text-lg mb-3 flex items-center gap-2">
              <DollarSign size={20} className="text-blue-600" />
              আর্থিক সারসংক্ষেপ
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="bg-green-50 border border-green-100 rounded-2xl p-3">
                <div className="flex items-center gap-1 mb-1"><TrendingUp size={13} className="text-green-500" /><p className="text-green-600 text-xs font-medium">মোট আয়</p></div>
                <p className="text-base font-bold text-green-700">{formatTaka(preview.summary.total_revenue)}</p>
              </div>
              <div className="bg-red-50 border border-red-100 rounded-2xl p-3">
                <div className="flex items-center gap-1 mb-1"><TrendingDown size={13} className="text-red-500" /><p className="text-red-600 text-xs font-medium">প্রত্যক্ষ খরচ</p></div>
                <p className="text-base font-bold text-red-700">{formatTaka(preview.summary.direct_expense)}</p>
              </div>
              <div className="bg-orange-50 border border-orange-100 rounded-2xl p-3">
                <div className="flex items-center gap-1 mb-1"><Building2 size={13} className="text-orange-500" /><p className="text-orange-600 text-xs font-medium">কোম্পানি বরাদ্দ</p></div>
                <p className="text-base font-bold text-orange-700">{formatTaka(preview.summary.company_expense_allocation)}</p>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3">
                <div className="flex items-center gap-1 mb-1"><DollarSign size={13} className="text-blue-500" /><p className="text-blue-600 text-xs font-medium">নেট লাভ</p></div>
                <p className={`text-base font-bold ${preview.summary.net_profit >= 0 ? 'text-blue-700' : 'text-red-700'}`}>{formatTaka(preview.summary.net_profit)}</p>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3">
                <div className="flex items-center gap-1 mb-1"><History size={13} className="text-gray-500" /><p className="text-gray-600 text-xs font-medium">আগে বিতরিত</p></div>
                <p className="text-base font-bold text-gray-700">{formatTaka(preview.summary.previously_distributed)}</p>
              </div>
              <div className={`border rounded-2xl p-3 ${preview.summary.available_profit > 0 ? 'bg-amber-50 border-amber-100' : 'bg-red-50 border-red-100'}`}>
                <div className="flex items-center gap-1 mb-1"><Wallet size={13} className={preview.summary.available_profit > 0 ? 'text-amber-500' : 'text-red-500'} /><p className={`text-xs font-medium ${preview.summary.available_profit > 0 ? 'text-amber-600' : 'text-red-600'}`}>বিতরণযোগ্য</p></div>
                <p className={`text-base font-bold ${preview.summary.available_profit > 0 ? 'text-amber-700' : 'text-red-700'}`}>{formatTaka(preview.summary.available_profit)}</p>
              </div>
            </div>
          </div>

          {/* Distribution Settings */}
          <div className="card border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
              <DollarSign size={20} className="text-amber-600" />
              ডিস্ট্রিবিউশন সেটিং
            </h2>

            {/* Company vs Investor split */}
            <div className="mb-5">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">কোম্পানির ভাগ</span>
                <span className="font-bold text-amber-600">{companyPct}%</span>
              </div>
              <input
                type="range" min="0" max="100" value={companyPct}
                onChange={e => setCompanyPct(parseInt(e.target.value))}
                className="w-full h-2 bg-amber-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>কোম্পানি: <strong className="text-amber-600">{formatTaka(preview.summary.company_share_amount)}</strong></span>
                <span>শেয়ারহোল্ডার ({100 - companyPct}%): <strong className="text-green-600">{formatTaka(preview.summary.investor_pool)}</strong></span>
              </div>
            </div>

            {/* Period */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                  <Calendar size={12} /> পিরিয়ড শুরু (ঐচ্ছিক)
                </label>
                <input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)} className="input w-full text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                  <Calendar size={12} /> পিরিয়ড শেষ (ঐচ্ছিক)
                </label>
                <input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} className="input w-full text-sm" />
              </div>
            </div>

            {/* Notes */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                <FileText size={12} /> বিতরণের কারণ / নোট (ঐচ্ছিক)
              </label>
              <textarea
                rows={2}
                placeholder="যেমন: Q4 2025 প্রফিট শেয়ার..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="input w-full text-sm resize-none"
              />
            </div>

            {/* Amount display */}
            <div className="grid grid-cols-2 gap-3 py-3 border-t border-amber-200">
              <div className="text-center bg-amber-100 rounded-xl p-3">
                <p className="text-xs text-amber-600">কোম্পানি ফান্ডে যাবে</p>
                <p className="text-lg font-bold text-amber-700">{formatTaka(preview.summary.company_share_amount)}</p>
              </div>
              <div className="text-center bg-green-100 rounded-xl p-3">
                <p className="text-xs text-green-600">শেয়ারহোল্ডার পুল</p>
                <p className="text-lg font-bold text-green-700">{formatTaka(preview.summary.investor_pool)}</p>
              </div>
            </div>
          </div>

          {/* Shareholders Table */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <Users size={20} className="text-primary-600" />
                শেয়ারহোল্ডার তালিকা ({preview.summary.total_shareholders} জন)
              </h2>
              <span className="text-sm text-gray-500">মোট শেয়ার: {preview.summary.total_shares_sold}</span>
            </div>

            {preview.shareholders.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Users size={40} className="mx-auto mb-2 opacity-50" />
                <p>কোনো শেয়ারহোল্ডার নেই</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="pb-2 font-medium">নাম</th>
                      <th className="pb-2 font-medium text-center">শেয়ার</th>
                      <th className="pb-2 font-medium text-center">মালিকানা</th>
                      <th className="pb-2 font-medium text-right">প্রফিট</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {preview.shareholders.map(sh => (
                      <tr key={sh.user_id} className="hover:bg-gray-50">
                        <td className="py-3">
                          <p className="font-semibold">{sh.user_name}</p>
                          <p className="text-xs text-gray-500">{sh.phone}</p>
                        </td>
                        <td className="py-3 text-center">
                          <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">{sh.shares_held} টি</span>
                        </td>
                        <td className="py-3 text-center font-medium">{(sh.ownership_pct_bps / 100).toFixed(2)}%</td>
                        <td className="py-3 text-right font-bold text-green-600">{formatTaka(sh.profit_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t bg-gray-50">
                    <tr>
                      <td className="py-3 font-bold" colSpan={2}>মোট</td>
                      <td className="py-3 text-center font-bold">100%</td>
                      <td className="py-3 text-right font-bold text-green-600">{formatTaka(preview.summary.investor_pool)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* Distribute Button / Confirm */}
            <div className="mt-4 pt-4 border-t">
              {!showConfirm ? (
                <button
                  onClick={() => setShowConfirm(true)}
                  disabled={!preview.has_available_profit || preview.summary.total_shareholders === 0}
                  className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold text-lg hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Send size={20} /> সব শেয়ারহোল্ডারকে প্রফিট পাঠান
                </button>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-start gap-2 mb-3">
                    <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-amber-800">নিশ্চিত করুন</p>
                      <p className="text-sm text-amber-700 mt-1">
                        {preview.summary.total_shareholders} জনকে <strong>{formatTaka(preview.summary.investor_pool)}</strong> পাঠানো হবে।
                        কোম্পানি ফান্ডে <strong>{formatTaka(preview.summary.company_share_amount)}</strong> জমা হবে।
                        এটি পূর্বাবস্থায় ফেরানো যাবে না।
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => distributeMutation.mutate()}
                      disabled={distributeMutation.isPending}
                      className="flex-1 py-3 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition disabled:opacity-50"
                    >
                      {distributeMutation.isPending ? '⏳ প্রসেসিং...' : '✅ হ্যাঁ, পাঠান'}
                    </button>
                    <button onClick={() => setShowConfirm(false)} className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition">
                      বাতিল
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Distribution History */}
      {history.length > 0 && (
        <div className="card">
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
            <History size={20} className="text-gray-600" />
            পূর্বের ডিস্ট্রিবিউশন
          </h2>
          <div className="space-y-2">
            {history.map((dist: ProfitDistribution & { notes?: string; shareholders_count?: number; company_share_percentage?: number }) => (
              <div
                key={dist.id}
                className="p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition cursor-pointer"
                onClick={() => setSelectedDistId(selectedDistId === dist.id ? null : dist.id)}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-sm flex items-center gap-1">
                      #{dist.id}
                      {selectedDistId === dist.id && <Eye size={13} className="text-primary-500" />}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {dist.distributed_at ? formatDate(dist.distributed_at) : '-'}
                      {dist.shareholders_count != null && ` • ${dist.shareholders_count} জন`}
                      {dist.company_share_percentage != null && ` • কোম্পানি ${(dist.company_share_percentage / 100).toFixed(0)}%`}
                    </p>
                    {dist.notes && <p className="text-xs text-gray-400 mt-0.5 italic">"{dist.notes}"</p>}
                    {dist.period_start && <p className="text-xs text-blue-500 mt-0.5">{dist.period_start} → {dist.period_end}</p>}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600 text-sm">{formatTaka(dist.distributable_amount)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      dist.status === 'distributed' ? 'bg-green-100 text-green-700' :
                      dist.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {dist.status === 'distributed' ? '✅ বিতরিত' : dist.status === 'cancelled' ? '❌ বাতিল' : dist.status}
                    </span>
                  </div>
                </div>

                {/* Inline detail */}
                {selectedDistId === dist.id && detail && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="grid grid-cols-4 gap-2 mb-3">
                      {[
                        { label: 'আয়', val: (detail.distribution as any).total_revenue, color: 'green' },
                        { label: 'খরচ', val: (detail.distribution as any).total_expense, color: 'red' },
                        { label: 'নেট', val: (detail.distribution as any).net_profit, color: 'blue' },
                        { label: 'বিতরিত', val: (detail.distribution as any).distributable_amount, color: 'amber' }
                      ].map(item => (
                        <div key={item.label} className="bg-white rounded-lg p-2 text-center">
                          <p className="text-xs text-gray-500">{item.label}</p>
                          <p className={`text-xs font-bold text-${item.color}-600`}>{formatTaka(item.val)}</p>
                        </div>
                      ))}
                    </div>
                    {detail.shareholders && detail.shareholders.length > 0 && (
                      <div className="space-y-1">
                        {detail.shareholders.map((sh: any) => (
                          <div key={sh.user_id} className="flex justify-between text-xs">
                            <span className="text-gray-600">{sh.user_name}</span>
                            <span className="font-medium text-green-600">{formatTaka(sh.profit_amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
