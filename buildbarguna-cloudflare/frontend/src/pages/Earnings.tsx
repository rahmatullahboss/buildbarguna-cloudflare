import { useQuery } from '@tanstack/react-query'
import { earningsApi, type EarningItem } from '../lib/api'
import { formatTaka } from '../lib/auth'
import { TrendingUp } from 'lucide-react'
import Disclaimer from '../components/Disclaimer'
import BarChart from '../components/BarChart'

export default function Earnings() {
  const { data: summary } = useQuery({
    queryKey: ['earnings-summary'],
    queryFn: () => earningsApi.summary(),
    staleTime: 60_000
  })
  const { data: history, isLoading } = useQuery({
    queryKey: ['earnings'],
    queryFn: () => earningsApi.list(),
    staleTime: 60_000
  })

  const total = summary?.success ? summary.data.total_paisa : 0
  const thisMonth = summary?.success ? summary.data.this_month_paisa : 0

  // Build bar chart data — sum per month across all projects, last 6 months
  const monthMap: Record<string, number> = {}
  if (history?.success) {
    history.data.items.forEach(e => {
      monthMap[e.month] = (monthMap[e.month] ?? 0) + e.amount
    })
  }
  const sortedMonths = Object.keys(monthMap).sort().slice(-6)
  const barData = sortedMonths.map(m => ({
    label: m.slice(5), // MM only
    value: monthMap[m],
    color: '#22c55e'
  }))

  // Group history items by month for display
  const grouped: Record<string, EarningItem[]> = {}
  if (history?.success) {
    history.data.items.forEach((e: EarningItem) => {
      if (!grouped[e.month]) grouped[e.month] = []
      grouped[e.month].push(e)
    })
  }
  const sortedGroupMonths = Object.keys(grouped).sort().reverse()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">মুনাফা ইতিহাস</h1>
        <p className="text-gray-500 text-sm mt-1">আপনার মাসিক মুনাফার বিবরণ</p>
      </div>

      <Disclaimer variant="halal" compact />
      <Disclaimer variant="investment-risk" compact />

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card bg-gradient-to-br from-green-50 to-emerald-50 border-green-100">
          <p className="text-sm text-gray-500 mb-1">মোট মুনাফা</p>
          <p className="text-3xl font-bold text-green-700">{formatTaka(total)}</p>
        </div>
        <div className="card bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100">
          <p className="text-sm text-gray-500 mb-1">এই মাস</p>
          <p className="text-3xl font-bold text-blue-700">{formatTaka(thisMonth)}</p>
        </div>
      </div>

      {/* Bar chart */}
      {barData.length > 0 && (
        <div className="card">
          <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-green-500" /> মাসিক মুনাফার গ্রাফ
          </h2>
          <BarChart
            data={barData}
            height={120}
            formatValue={v => formatTaka(v)}
            title="সর্বশেষ ৬ মাস"
          />
        </div>
      )}

      {/* Grouped monthly history */}
      <div className="card">
        <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
          <TrendingUp size={20} /> মাসিক বিবরণ
        </h2>
        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="h-14 bg-gray-50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : sortedGroupMonths.length > 0 ? (
          <div className="space-y-5">
            {sortedGroupMonths.map(month => {
              const items: EarningItem[] = grouped[month]
              const monthTotal = items.reduce((s: number, e: EarningItem) => s + e.amount, 0)
              return (
                <div key={month}>
                  {/* Month header */}
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-gray-700 bg-gray-100 px-3 py-1 rounded-full">{month}</p>
                    <p className="text-sm font-bold text-green-600">+{formatTaka(monthTotal)}</p>
                  </div>
                  {/* Items */}
                  <div className="space-y-2 pl-1">
                    {items.map((e: EarningItem) => (
                      <div key={e.id} className="flex items-center justify-between border-b last:border-0 pb-2 last:pb-0">
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{e.project_title}</p>
                          <p className="text-xs text-gray-400">{e.shares}টি শেয়ার • {(e.rate / 100).toFixed(2)}% হার</p>
                        </div>
                        <p className="font-bold text-green-600">+{formatTaka(e.amount)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-10">
            <TrendingUp size={36} className="mx-auto mb-2 text-gray-200" />
            <p className="text-gray-400 text-sm">এখনো কোনো মুনাফা নেই</p>
            <p className="text-gray-300 text-xs mt-1">শেয়ার কিনলে মাসিক মুনাফা এখানে দেখাবে</p>
          </div>
        )}
      </div>
    </div>
  )
}
