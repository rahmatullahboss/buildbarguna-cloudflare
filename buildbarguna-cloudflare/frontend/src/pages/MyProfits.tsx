import { useQuery } from '@tanstack/react-query'
import { profitApi } from '../lib/api'
import { formatTaka, formatDate } from '../lib/auth'
import {
  TrendingUp, Wallet, BarChart3, Calendar, FileText, ChevronRight
} from 'lucide-react'

export default function MyProfits() {
  const { data, isLoading } = useQuery({
    queryKey: ['my-profits'],
    queryFn: () => profitApi.myProfits()
  })

  const result = data?.success ? data.data : null
  const profits = result?.profits ?? []
  const summary = result?.summary

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="shimmer rounded-2xl h-20 w-full" />
        <div className="shimmer rounded-2xl h-40 w-full" />
        <div className="shimmer rounded-2xl h-60 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 via-green-500 to-teal-500 rounded-3xl p-5 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Wallet size={24} /> আমার প্রফিট
          </h1>
          <p className="text-white/70 text-sm mt-1">আপনার সকল প্রফিট ডিস্ট্রিবিউশনের ইতিহাস</p>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-3 gap-3">
          <div className="card bg-gradient-to-br from-green-50 to-emerald-50 border-green-100 text-center">
            <TrendingUp size={20} className="mx-auto text-green-500 mb-1" />
            <p className="text-xs text-green-600 font-medium">মোট আয়</p>
            <p className="text-lg font-bold text-green-700">{formatTaka(summary.total_profit_earned)}</p>
          </div>
          <div className="card bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100 text-center">
            <BarChart3 size={20} className="mx-auto text-blue-500 mb-1" />
            <p className="text-xs text-blue-600 font-medium">ডিস্ট্রিবিউশন</p>
            <p className="text-lg font-bold text-blue-700">{summary.total_distributions} বার</p>
          </div>
          <div className="card bg-gradient-to-br from-purple-50 to-violet-50 border-purple-100 text-center">
            <FileText size={20} className="mx-auto text-purple-500 mb-1" />
            <p className="text-xs text-purple-600 font-medium">প্রজেক্ট</p>
            <p className="text-lg font-bold text-purple-700">{summary.projects_count} টি</p>
          </div>
        </div>
      )}

      {/* Profit History */}
      <div className="card">
        <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
          <Calendar size={20} className="text-gray-600" />
          প্রফিট ইতিহাস
        </h2>

        {profits.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Wallet size={48} className="mx-auto mb-3 opacity-40" />
            <p className="text-lg font-medium">এখনো কোনো প্রফিট পাননি</p>
            <p className="text-sm mt-1">প্রজেক্টে শেয়ার কিনে প্রফিট পেতে পারেন</p>
          </div>
        ) : (
          <div className="space-y-2">
            {profits.map((p, idx) => (
              <div key={idx} className="p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{p.project_title}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                      <span>{p.distributed_at ? formatDate(p.distributed_at) : '-'}</span>
                      {p.period_start && p.period_end && (
                        <>
                          <span>•</span>
                          <span className="text-blue-500">{p.period_start} → {p.period_end}</span>
                        </>
                      )}
                    </div>
                    {p.distribution_notes && (
                      <p className="text-xs text-gray-400 mt-0.5 italic">"{p.distribution_notes}"</p>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span>{p.shares_held} শেয়ার</span>
                      <span>•</span>
                      <span>{((p.ownership_percentage ?? 0) / 100).toFixed(1)}% মালিকানা</span>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <p className="font-bold text-green-600 text-base">{formatTaka(p.profit_amount)}</p>
                    <ChevronRight size={16} className="text-gray-300" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
