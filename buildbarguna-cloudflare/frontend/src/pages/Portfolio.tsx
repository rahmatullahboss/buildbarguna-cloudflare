import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { earningsApi, sharesApi, getToken } from '../lib/api'
import { formatTaka, formatDate } from '../lib/auth'
import type { ProjectPortfolioItem } from '../lib/api'
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PieChart,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart2,
  Briefcase,
  Download
} from 'lucide-react'
import DonutChart from '../components/DonutChart'
import BarChart from '../components/BarChart'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function RoiBadge({ roi }: { roi: number }) {
  if (roi > 0) return (
    <span className="inline-flex items-center gap-1 text-green-600 font-bold text-sm">
      <TrendingUp size={14} /> {roi.toFixed(2)}%
    </span>
  )
  if (roi < 0) return (
    <span className="inline-flex items-center gap-1 text-red-500 font-bold text-sm">
      <TrendingDown size={14} /> {roi.toFixed(2)}%
    </span>
  )
  return <span className="text-gray-400 text-sm font-medium">০.০০%</span>
}

function ConcentrationRiskBadge({ risk }: { risk: number }) {
  if (risk > 50) return (
    <span className="inline-flex items-center gap-1 text-red-600 text-xs font-medium bg-red-50 px-2 py-0.5 rounded-full">
      <AlertTriangle size={11} /> উচ্চ ঝুঁকি ({risk.toFixed(0)}%)
    </span>
  )
  if (risk > 20) return (
    <span className="inline-flex items-center gap-1 text-yellow-600 text-xs font-medium bg-yellow-50 px-2 py-0.5 rounded-full">
      <Clock size={11} /> মাঝারি ঝুঁকি ({risk.toFixed(0)}%)
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 text-green-600 text-xs font-medium bg-green-50 px-2 py-0.5 rounded-full">
      <CheckCircle size={11} /> বৈচিত্র্যময় ({risk.toFixed(0)}%)
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    active:  { label: 'সক্রিয়',  cls: 'bg-green-100 text-green-700' },
    closed:  { label: 'বন্ধ',    cls: 'bg-gray-100 text-gray-500' },
    draft:   { label: 'খসড়া',   cls: 'bg-yellow-100 text-yellow-700' },
  }
  const { label, cls } = map[status] ?? { label: status, cls: 'bg-gray-100 text-gray-500' }
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>{label}</span>
}

// ─── Project Card ─────────────────────────────────────────────────────────────

function ProjectCard({ item, purchases }: { item: ProjectPortfolioItem; purchases: any[] }) {
  const [expanded, setExpanded] = useState(false)
  const [downloading, setDownloading] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Get approved purchases for this project
  const projectPurchases = purchases?.filter(p => p.project_id === item.project_id && p.status === 'approved') || []

  async function handleDownload(purchaseId: number) {
    setDownloading(purchaseId)
    setError(null)
    try {
      const token = getToken()
      if (!token) {
        setError('সেশন expire হয়েছে। আবার লগইন করুন।')
        return
      }
      
      // Fetch certificate data as JSON from preview endpoint
      const response = await fetch(`/api/shares/certificate/${purchaseId}/preview`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Download failed')
      }
      
      const json = await response.json()
      
      // Generate PDF in browser — zero server CPU cost
      const { downloadShareCertificate } = await import('../lib/certificateGenerator')
      await downloadShareCertificate(json.data)
    } catch (err: any) {
      console.error('Download error:', err)
      setError(err.message || 'ডাউনলোড ব্যর্থ হয়েছে')
    } finally {
      setDownloading(null)
    }
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Header row */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-gray-900 truncate">{item.project_title}</p>
            <StatusBadge status={item.project_status} />
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {item.shares_owned}টি শেয়ার × {formatTaka(item.share_price)} — পোর্টফোলিওর {item.weight_percent.toFixed(1)}%
          </p>
        </div>
        <div className="text-right ml-4 shrink-0">
          <p className="font-bold text-primary-700">{formatTaka(item.investment_value_paisa)}</p>
          <RoiBadge roi={item.roi_percent} />
        </div>
        <div className="ml-3 text-gray-400">
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-4">
          {/* Key metrics grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="bg-white rounded-lg p-3 border border-gray-100 text-center">
              <p className="text-xs text-gray-500 mb-1">মোট বিনিয়োগ</p>
              <p className="font-bold text-gray-900 text-sm">{formatTaka(item.investment_value_paisa)}</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-gray-100 text-center">
              <p className="text-xs text-gray-500 mb-1">মোট মুনাফা</p>
              <p className="font-bold text-green-600 text-sm">{formatTaka(item.total_earned_paisa)}</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-gray-100 text-center">
              <p className="text-xs text-gray-500 mb-1">সর্বশেষ হার</p>
              <p className="font-bold text-blue-600 text-sm">
                {item.latest_rate_bps > 0 ? `${(item.latest_rate_bps / 100).toFixed(2)}%` : '—'}
              </p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-gray-100 text-center">
              <p className="text-xs text-gray-500 mb-1">প্রত্যাশিত এই মাস</p>
              <p className="font-bold text-indigo-600 text-sm">
                {item.expected_this_month_paisa > 0 ? formatTaka(item.expected_this_month_paisa) : '—'}
              </p>
            </div>
          </div>

          {/* Monthly history */}
          {item.monthly_history.length > 0 ? (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">মাসিক মুনাফার ইতিহাস</p>
              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                {item.monthly_history.map(h => (
                  <div
                    key={h.month}
                    className="flex items-center justify-between text-sm bg-white rounded-lg px-3 py-2 border border-gray-100"
                  >
                    <span className="text-gray-600 font-medium">{h.month}</span>
                    <span className="text-gray-400 text-xs">{h.rate_percent.toFixed(2)}% হার</span>
                    <span className="font-bold text-green-600">+{formatTaka(h.earned_paisa)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-2">এখনো কোনো মুনাফা বিতরণ হয়নি</p>
          )}

          {/* Calculation breakdown */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-xs text-blue-700 space-y-1">
            <p className="font-semibold mb-1">📐 হিসাব পদ্ধতি</p>
            <p>মাসিক মুনাফা = শেয়ার সংখ্যা × শেয়ার মূল্য × মুনাফার হার (bps) ÷ ১০,০০০</p>
            <p className="font-mono mt-1 text-blue-800">
              {item.latest_rate_bps > 0
                ? `= ${item.shares_owned} × ${formatTaka(item.share_price)} × ${item.latest_rate_bps} ÷ ১০,০০০ = ${formatTaka(item.expected_this_month_paisa)}`
                : 'এই মাসের হার এখনো নির্ধারিত হয়নি'}
            </p>
          </div>

          {/* Share Certificate Download */}
          {projectPurchases.length > 0 && (
            <div className="border-t border-gray-200 pt-4">
              <p className="text-xs font-semibold text-gray-500 mb-2">শেয়ার সার্টিফিকেট</p>
              <div className="space-y-2">
                {projectPurchases.map((purchase: any) => (
                  <div key={purchase.id} className="flex items-center justify-between bg-white rounded-lg p-3 border">
                    <div>
                      <p className="text-sm font-medium">{purchase.quantity} শেয়ার • {formatTaka(purchase.total_amount)}</p>
                      <p className="text-xs text-gray-500">{formatDate(purchase.created_at)} তারিখে ক্রয়</p>
                      {error && downloading === purchase.id && (
                        <p className="text-red-500 text-xs mt-1">{error}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDownload(purchase.id)}
                      disabled={downloading === purchase.id}
                      className="flex items-center gap-1 text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50"
                    >
                      <Download size={14} />
                      {downloading === purchase.id ? 'ডাউনলোড হচ্ছে...' : 'সার্টিফিকেট'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Portfolio() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['portfolio'],
    queryFn: () => earningsApi.portfolio(),
    staleTime: 60_000
  })

  // Fetch share purchases for certificate download
  const { data: purchasesData } = useQuery({
    queryKey: ['my-shares-for-cert'],
    queryFn: () => sharesApi.my(1),
    staleTime: 60_000
  })

  const portfolio = data?.success ? data.data : null
  const purchases = purchasesData?.success ? purchasesData.data.items : []

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-64">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-500 text-sm">পোর্টফোলিও লোড হচ্ছে...</p>
      </div>
    </div>
  )

  if (isError || !portfolio) return (
    <div className="card text-center py-12">
      <AlertTriangle size={40} className="mx-auto text-red-400 mb-3" />
      <p className="text-gray-500">পোর্টফোলিও লোড করা সম্ভব হয়নি। আবার চেষ্টা করুন।</p>
    </div>
  )

  const hasInvestments = portfolio.projects_count > 0

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="bg-gradient-to-r from-indigo-700 via-purple-600 to-violet-600 rounded-3xl p-5 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-36 h-36 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-10 w-20 h-20 bg-white/10 rounded-full translate-y-1/2" />
        <div className="relative z-10">
          <h1 className="text-2xl font-bold">📊 আমার পোর্টফোলিও</h1>
          <p className="text-indigo-100 text-sm mt-1">বিনিয়োগ, মুনাফা ও রিটার্নের সম্পূর্ণ হিসাব</p>
        </div>
      </div>

      {!hasInvestments ? (
        <div className="card text-center py-16">
          <PieChart size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium">এখনো কোনো বিনিয়োগ নেই</p>
          <p className="text-gray-400 text-sm mt-1 mb-6">প্রজেক্টে শেয়ার কিনুন এবং মুনাফা উপার্জন শুরু করুন।</p>
          <a href="/projects" className="inline-flex items-center gap-2 bg-primary-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-primary-700 transition-colors">
            <Briefcase size={18} /> প্রজেক্ট দেখুন
          </a>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="card bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100">
              <div className="flex items-center gap-2 mb-1">
                <Wallet size={16} className="text-blue-500" />
                <p className="text-xs text-gray-500">মোট বিনিয়োগ</p>
              </div>
              <p className="text-2xl font-bold text-blue-700">{formatTaka(portfolio.total_invested_paisa)}</p>
              <p className="text-xs text-gray-400 mt-1">{portfolio.projects_count}টি প্রজেক্ট</p>
            </div>

            <div className="card bg-gradient-to-br from-green-50 to-emerald-50 border-green-100">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp size={16} className="text-green-500" />
                <p className="text-xs text-gray-500">মোট মুনাফা</p>
              </div>
              <p className="text-2xl font-bold text-green-700">{formatTaka(portfolio.total_earned_paisa)}</p>
              <RoiBadge roi={portfolio.roi_percent} />
            </div>

            <div className="card bg-gradient-to-br from-purple-50 to-violet-50 border-purple-100">
              <div className="flex items-center gap-2 mb-1">
                <BarChart2 size={16} className="text-purple-500" />
                <p className="text-xs text-gray-500">এই মাস</p>
              </div>
              <p className="text-2xl font-bold text-purple-700">{formatTaka(portfolio.this_month_earned_paisa)}</p>
              {portfolio.last_month_earned_paisa > 0 && (
                <p className="text-xs text-gray-400 mt-1">
                  গত মাস: {formatTaka(portfolio.last_month_earned_paisa)}
                </p>
              )}
            </div>

            <div className="card bg-gradient-to-br from-amber-50 to-orange-50 border-amber-100">
              <div className="flex items-center gap-2 mb-1">
                <Clock size={16} className="text-amber-500" />
                <p className="text-xs text-gray-500">প্রত্যাশিত এই মাস</p>
              </div>
              <p className="text-2xl font-bold text-amber-700">{formatTaka(portfolio.expected_this_month_paisa)}</p>
              <p className="text-xs text-gray-400 mt-1">বার্ষিক: <RoiBadge roi={portfolio.annualized_roi_percent} /></p>
            </div>
          </div>

          {/* Portfolio health + Donut chart */}
          <div className="card">
            <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <PieChart size={18} /> পোর্টফোলিও বিশ্লেষণ
            </h2>

            {/* Donut chart + health side by side */}
            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* Donut chart */}
              {portfolio.projects.length > 0 && (() => {
                const palette = ['#6366f1','#22c55e','#a855f7','#f59e0b','#f43f5e','#14b8a6','#3b82f6']
                return (
                  <DonutChart
                    slices={portfolio.projects.map((p, i) => ({
                      label: p.project_title.length > 12 ? p.project_title.slice(0, 12) + '…' : p.project_title,
                      value: p.investment_value_paisa,
                      color: palette[i % palette.length]
                    }))}
                    size={180}
                    thickness={38}
                    centerLabel={`${portfolio.projects_count}টি`}
                    centerSubLabel="প্রজেক্ট"
                  />
                )
              })()}

              {/* Health metrics */}
              <div className="flex-1 space-y-3 w-full">
                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                  <span className="text-sm text-gray-500">মোট ROI</span>
                  <RoiBadge roi={portfolio.roi_percent} />
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                  <span className="text-sm text-gray-500">বার্ষিক রিটার্ন</span>
                  <RoiBadge roi={portfolio.annualized_roi_percent} />
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-gray-500">মোট বিনিয়োগ</span>
                  <span className="font-bold text-indigo-700 text-sm">{formatTaka(portfolio.total_invested_paisa)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Monthly earnings bar chart — aggregate across all projects */}
          {(() => {
            // Collect all monthly history across projects, sum by month
            const monthMap: Record<string, number> = {}
            portfolio.projects.forEach(p => {
              p.monthly_history.forEach(h => {
                monthMap[h.month] = (monthMap[h.month] ?? 0) + h.earned_paisa
              })
            })
            const months = Object.keys(monthMap).sort().slice(-6) // last 6 months
            if (months.length === 0) return null
            const barData = months.map(m => ({
              label: m.slice(5), // show MM only
              value: monthMap[m],
              color: '#6366f1'
            }))
            return (
              <div className="card">
                <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <BarChart2 size={18} /> মাসিক মুনাফার ইতিহাস
                </h2>
                <BarChart
                  data={barData}
                  height={130}
                  formatValue={v => formatTaka(v)}
                  title="সর্বশেষ ৬ মাস"
                />
                <p className="text-xs text-gray-400 mt-2 text-center">সকল প্রজেক্টের মুনাফা একত্রিত</p>
              </div>
            )
          })()}

          {/* Per-project breakdown */}
          <div>
            <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <BarChart2 size={18} /> প্রজেক্ট বিবরণ
            </h2>
            <div className="space-y-3">
              {portfolio.projects.map(item => (
                <ProjectCard key={item.project_id} item={item} purchases={purchases} />
              ))}
            </div>
          </div>

          {/* Calculation methodology note */}
          <div className="card bg-gray-50 border-gray-200">
            <p className="text-xs font-semibold text-gray-600 mb-2">📊 হিসাব পদ্ধতি সম্পর্কে</p>
            <ul className="text-xs text-gray-500 space-y-1 list-disc list-inside">
              <li>সকল অর্থের মান পয়সায় সংরক্ষিত (১ টাকা = ১০০ পয়সা) — ভগ্নাংশ ত্রুটি এড়াতে</li>
              <li>মুনাফার হার বেসিস পয়েন্টে (bps) — ১০০ bps = ১%</li>
              <li>মাসিক মুনাফা = শেয়ার × শেয়ার মূল্য × হার (bps) ÷ ১০,০০০</li>
              <li>ROI = (মোট মুনাফা ÷ মোট বিনিয়োগ) × ১০০</li>
              <li>বার্ষিক ROI = (ROI ÷ সক্রিয় মাস) × ১২ — অনুমানিত মান</li>
            </ul>
          </div>
        </>
      )}
    </div>
  )
}
