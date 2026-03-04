import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { profitApi, type ProfitDistribution } from '../../lib/api'
import { formatTaka, formatDate } from '../../lib/auth'
import { ArrowLeft, Send, Users, DollarSign, CheckCircle, AlertTriangle, History, Wallet } from 'lucide-react'

export default function ProfitDistribution() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const id = parseInt(projectId || '0')

  const [companyPct, setCompanyPct] = useState(30)
  const [showConfirm, setShowConfirm] = useState(false)
  const [msg, setMsg] = useState('')
  const [errMsg, setErrMsg] = useState('')

  // Fetch preview
  const { data: previewData, isLoading: previewLoading, refetch } = useQuery({
    queryKey: ['profit-preview', id, companyPct],
    queryFn: () => profitApi.preview(id, companyPct),
    enabled: !!id
  })

  // Fetch history
  const { data: historyData } = useQuery({
    queryKey: ['profit-history', id],
    queryFn: () => profitApi.getHistory(id),
    enabled: !!id
  })

  // Distribute mutation
  const distributeMutation = useMutation({
    mutationFn: () => profitApi.distribute(id, { company_share_percentage: companyPct }),
    onSuccess: (res) => {
      if (res.success) {
        setMsg(res.data.message)
        setErrMsg('')
        setShowConfirm(false)
        refetch()
        qc.invalidateQueries({ queryKey: ['profit-history', id] })
      } else {
        setErrMsg((res as any).error || 'ব্যর্থ হয়েছে')
      }
    },
    onError: (err: any) => {
      setErrMsg(err.message || 'ব্যর্থ হয়েছে')
    }
  })

  const preview = previewData?.success ? previewData.data : null
  const history = historyData?.success ? (historyData.data as any).items : []

  if (previewLoading) {
    return (
      <div className="p-4">
        <div className="shimmer rounded-2xl h-20 w-full mb-4" />
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
              <p className="text-white/70 text-sm">শেয়ারহোল্ডারদের লাভ বিতরণ</p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      {msg && (
        <div className="flex items-start gap-2 bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm">
          <CheckCircle size={16} className="mt-0.5 shrink-0" /> {msg}
          <button onClick={() => setMsg('')} className="ml-auto text-green-400 hover:text-green-600">✕</button>
        </div>
      )}
      {errMsg && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" /> {errMsg}
          <button onClick={() => setErrMsg('')} className="ml-auto text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {preview && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-green-50 border border-green-100 rounded-2xl p-4 text-center">
              <p className="text-green-600 text-xs font-medium">মোট আয়</p>
              <p className="text-lg font-bold text-green-700 mt-1">{formatTaka(preview.summary.total_revenue)}</p>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-center">
              <p className="text-red-600 text-xs font-medium">মোট খরচ</p>
              <p className="text-lg font-bold text-red-700 mt-1">{formatTaka(preview.summary.total_expense)}</p>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-center">
              <p className="text-blue-600 text-xs font-medium">নেট লাভ</p>
              <p className="text-lg font-bold text-blue-700 mt-1">{formatTaka(preview.summary.net_profit)}</p>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-center">
              <p className="text-amber-600 text-xs font-medium">বিতরণযোগ্য</p>
              <p className="text-lg font-bold text-amber-700 mt-1">{formatTaka(preview.summary.available_profit)}</p>
            </div>
          </div>

          {/* Share Split Settings */}
          <div className="card border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
              <DollarSign size={20} className="text-amber-600" />
              লাভ ভাগাভাগি সেটিং
            </h2>
            
            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* Company Share */}
              <div className="flex-1 w-full">
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">কোম্পানি</span>
                  <span className="font-bold text-amber-600">{companyPct}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={companyPct}
                  onChange={e => setCompanyPct(parseInt(e.target.value))}
                  className="w-full h-2 bg-amber-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
                />
              </div>

              {/* Investor Share */}
              <div className="flex-1 w-full">
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">শেয়ারহোল্ডার</span>
                  <span className="font-bold text-green-600">{100 - companyPct}%</span>
                </div>
                <div className="w-full h-2 bg-green-200 rounded-lg">
                  <div 
                    className="h-full bg-green-500 rounded-lg transition-all"
                    style={{ width: `${100 - companyPct}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Amount Display */}
            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-amber-200">
              <div className="text-center p-3 bg-amber-100 rounded-xl">
                <p className="text-xs text-amber-600">কোম্পানি পাবে</p>
                <p className="text-lg font-bold text-amber-700">{formatTaka(preview.summary.company_share_amount)}</p>
              </div>
              <div className="text-center p-3 bg-green-100 rounded-xl">
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
                শেয়ারহোল্ডার প্রফিট ({preview.summary.total_shareholders} জন)
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
                          <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
                            {sh.shares_held} টি
                          </span>
                        </td>
                        <td className="py-3 text-center font-medium">{sh.ownership_percentage.toFixed(2)}%</td>
                        <td className="py-3 text-right font-bold text-green-600">{formatTaka(sh.profit_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t bg-gray-50">
                    <tr>
                      <td className="py-3 font-bold">মোট</td>
                      <td className="py-3 text-center font-bold">{preview.summary.total_shares_sold} টি</td>
                      <td className="py-3 text-center font-bold">100%</td>
                      <td className="py-3 text-right font-bold text-green-600">{formatTaka(preview.summary.investor_pool)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* Send Profit Button */}
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
                      <p className="font-bold text-amber-800">আপনি কি নিশ্চিত?</p>
                      <p className="text-sm text-amber-700 mt-1">
                        এটি করলে {preview.summary.total_shareholders} জন শেয়ারহোল্ডারের অ্যাকাউন্টে {formatTaka(preview.summary.investor_pool)} যোগ হবে।
                        এই অ্যাকশন পূর্বাবস্থায় ফেরানো যাবে না।
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
                    <button
                      onClick={() => setShowConfirm(false)}
                      className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition"
                    >
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
            {history.map((dist: ProfitDistribution) => (
              <div key={dist.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div>
                  <p className="font-semibold">Distribution #{dist.id}</p>
                  <p className="text-xs text-gray-500">
                    {dist.distributed_at ? formatDate(dist.distributed_at) : '-'} • 
                    {dist.shareholders_count || 0} জন শেয়ারহোল্ডার
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600">{formatTaka(dist.distributable_amount)}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    dist.status === 'distributed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {dist.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
