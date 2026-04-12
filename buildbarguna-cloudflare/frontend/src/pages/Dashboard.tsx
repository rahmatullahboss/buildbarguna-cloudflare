import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { earningsApi, sharesApi, withdrawalsApi, referralsApi, memberApi } from '../lib/api'
import { formatTaka, getUser } from '../lib/auth'
import { TrendingUp, PieChart, Briefcase, Copy, BarChart2, ArrowRight, ArrowDownCircle, Gift, Users, FileText, Download, CheckCircle, ListTodo, Layers } from 'lucide-react'
import { useState } from 'react'
import Onboarding, { useOnboarding } from '../components/Onboarding'
import { useCertificateDownload } from '../hooks/useCertificateDownload'

export default function Dashboard() {
  const user = getUser()
  const [copied, setCopied] = useState(false)
  const { show: showOnboarding, dismiss: dismissOnboarding } = useOnboarding()
  const { downloading, error, downloadCertificate, clearError } = useCertificateDownload()

  const { data: summary } = useQuery({ queryKey: ['earnings-summary'], queryFn: () => earningsApi.summary() })
  const { data: shares } = useQuery({ queryKey: ['my-shares'], queryFn: () => sharesApi.my() })
  const { data: portfolio } = useQuery({ queryKey: ['portfolio'], queryFn: () => earningsApi.portfolio(), staleTime: 60_000 })
  const { data: withdrawalBalance } = useQuery({ queryKey: ['withdrawal-balance'], queryFn: () => withdrawalsApi.balance(), staleTime: 60_000 })
  const { data: referralStats } = useQuery({ queryKey: ['referral-stats'], queryFn: () => referralsApi.stats(), staleTime: 60_000 })
  const { data: memberStatus } = useQuery({ queryKey: ['member-status'], queryFn: () => memberApi.status(), staleTime: 60_000 })
  const { data: shareRequests } = useQuery({ queryKey: ['share-requests-dashboard'], queryFn: () => sharesApi.requests(1), staleTime: 60_000 })
  const { data: incomeBreakdown } = useQuery({ queryKey: ['income-breakdown'], queryFn: () => withdrawalsApi.incomeBreakdown(), staleTime: 60_000 })

  const totalProfit = summary?.success ? summary.data.total_paisa : 0
  const thisMonth = summary?.success ? summary.data.this_month_paisa : 0
  const totalShares = shares?.success ? shares.data.items.reduce((s, i) => s + i.quantity, 0) : 0
  const port = portfolio?.success ? portfolio.data : null
  const wbal = withdrawalBalance?.success ? withdrawalBalance.data : null
  const refStats = referralStats?.success ? referralStats.data : null
  const approvedPurchases = shareRequests?.success ? shareRequests.data.items.filter((r: any) => r.status === 'approved') : []

  function copyReferral() {
    navigator.clipboard.writeText(user?.referral_code ?? '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Onboarding modal for first-time users */}
      {showOnboarding && <Onboarding onDismiss={dismissOnboarding} />}

      {/* Hero Welcome Banner */}
      <div className="bg-gradient-to-r from-primary-700 via-primary-600 to-teal-600 rounded-3xl p-5 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-20 w-24 h-24 bg-white/10 rounded-full translate-y-1/2" />
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <p className="text-primary-100 text-sm mb-1">স্বাগতম 👋</p>
            <h1 className="text-2xl font-bold">{user?.name}</h1>
            <p className="text-primary-200 text-sm mt-1">আপনার বিনিয়োগ পোর্টফোলিও</p>
          </div>
          <button
            onClick={() => { localStorage.removeItem('bb_onboarding_done'); window.location.reload() }}
            className="text-xs text-white/70 hover:text-white transition-colors flex items-center gap-1 bg-white/10 px-2 py-1 rounded-xl"
            aria-label="গাইড আবার দেখুন"
          >
            ❓ গাইড
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-4 text-white shadow-md slide-up stagger-1">
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-white/20 p-1.5 rounded-xl"><TrendingUp size={18} className="text-white" /></div>
            <span className="text-sm text-green-100">মোট মুনাফা</span>
          </div>
          <p className="text-2xl font-bold" style={{animation: 'countUp 0.4s ease-out 0.1s both'}}>{formatTaka(totalProfit)}</p>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-4 text-white shadow-md slide-up stagger-2">
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-white/20 p-1.5 rounded-xl"><BarChart2 size={18} className="text-white" /></div>
            <span className="text-sm text-blue-100">এই মাস</span>
          </div>
          <p className="text-2xl font-bold" style={{animation: 'countUp 0.4s ease-out 0.2s both'}}>{formatTaka(thisMonth)}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl p-4 text-white shadow-md slide-up stagger-3">
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-white/20 p-1.5 rounded-xl"><PieChart size={18} className="text-white" /></div>
            <span className="text-sm text-purple-100">মোট শেয়ার</span>
          </div>
          <p className="text-2xl font-bold" style={{animation: 'countUp 0.4s ease-out 0.3s both'}}>{totalShares.toLocaleString('bn-BD')}</p>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl p-4 text-white shadow-md slide-up stagger-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-white/20 p-1.5 rounded-xl"><Briefcase size={18} className="text-white" /></div>
            <span className="text-sm text-orange-100">প্রজেক্ট</span>
          </div>
          <p className="text-2xl font-bold" style={{animation: 'countUp 0.4s ease-out 0.4s both'}}>{shares?.success ? shares.data.items.length : 0}</p>
        </div>
      </div>

      {/* Portfolio summary card */}
      {port && port.projects_count > 0 && (
        <div className="card bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <BarChart2 size={18} className="text-indigo-500" /> পোর্টফোলিও সারসংক্ষেপ
            </h2>
            <Link to="/portfolio" className="text-xs text-indigo-600 font-medium flex items-center gap-1 hover:underline">
              বিস্তারিত <ArrowRight size={12} />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl p-3 border border-indigo-100 text-center">
              <p className="text-xs text-gray-400 mb-1">মোট বিনিয়োগ</p>
              <p className="font-bold text-indigo-700 text-sm">{formatTaka(port.total_invested_paisa)}</p>
            </div>
            <div className="bg-white rounded-xl p-3 border border-indigo-100 text-center">
              <p className="text-xs text-gray-400 mb-1">মোট ROI</p>
              <p className={`font-bold text-sm ${port.roi_percent > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                {port.roi_percent.toFixed(2)}%
              </p>
            </div>
            <div className="bg-white rounded-xl p-3 border border-indigo-100 text-center">
              <p className="text-xs text-gray-400 mb-1">বার্ষিক রিটার্ন</p>
              <p className={`font-bold text-sm ${port.annualized_roi_percent > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                {port.annualized_roi_percent.toFixed(2)}%
              </p>
            </div>
            <div className="bg-white rounded-xl p-3 border border-indigo-100 text-center">
              <p className="text-xs text-gray-400 mb-1">প্রত্যাশিত এই মাস</p>
              <p className="font-bold text-amber-600 text-sm">{formatTaka(port.expected_this_month_paisa)}</p>
            </div>
          </div>
          {/* Mini distribution bar */}
          {port.projects.length > 1 && (
            <div className="mt-3">
              <div className="flex rounded-full overflow-hidden h-2 gap-0.5">
                {port.projects.map((item, i) => {
                  const colors = ['bg-blue-500','bg-green-500','bg-purple-500','bg-amber-500','bg-rose-500','bg-teal-500']
                  return (
                    <div key={item.project_id} className={`${colors[i % colors.length]}`}
                      style={{ width: `${item.weight_percent}%` }}
                      title={`${item.project_title}: ${item.weight_percent.toFixed(1)}%`}
                    />
                  )
                })}
              </div>
              <p className="text-xs text-gray-400 mt-1">{port.projects_count}টি প্রজেক্টে বিনিয়োগ বিতরণ</p>
            </div>
          )}
        </div>
      )}

      {/* Membership Status Card */}
      <div className="card bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-teal-100 p-2 rounded-xl">
              <FileText size={20} className="text-teal-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">মেম্বারশিপ</h2>
              {memberStatus?.success && memberStatus.data.registered ? (
                <p className="text-sm">
                  {memberStatus.data.payment_status === 'verified' ? (
                    <span className="text-green-600">যাচাইকৃত • {memberStatus.data.form_number}</span>
                  ) : memberStatus.data.payment_status === 'pending' ? (
                    <span className="text-yellow-600">পেমেন্ট যাচাইয়ের অপেক্ষায়</span>
                  ) : (
                    <span className="text-red-600">প্রত্যাখ্যাত</span>
                  )}
                </p>
              ) : (
                <p className="text-sm text-gray-500">এখনো রেজিস্ট্রেশন করেননি</p>
              )}
            </div>
          </div>
          <Link
            to="/membership"
            className="text-sm text-teal-600 font-medium flex items-center gap-1 hover:underline"
          >
            {memberStatus?.success && memberStatus.data.registered ? 'দেখুন' : 'রেজিস্ট্রেশন'} <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* Share Certificate Download Card */}
      {approvedPurchases.length > 0 && (
        <div className="card bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <CheckCircle size={18} className="text-emerald-600" /> শেয়ার সার্টিফিকেট
            </h2>
            <Link to="/my-investments" className="text-xs text-emerald-600 font-medium flex items-center gap-1 hover:underline">
              সব দেখুন <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-2">
            {approvedPurchases.slice(0, 3).map((purchase: any) => (
              <div key={purchase.id} className="flex items-center justify-between bg-white rounded-xl p-3 border border-emerald-100">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{purchase.project_title}</p>
                  <p className="text-xs text-gray-500">{purchase.quantity} শেয়ার • {formatTaka(purchase.total_amount)}</p>
                </div>
                <button
                  onClick={() => downloadCertificate(purchase.id)}
                  disabled={downloading}
                  className={`flex items-center gap-1.5 text-xs py-2 px-3 rounded-xl font-medium transition-colors shrink-0 ml-3 ${
                    downloading
                      ? 'bg-gray-400 cursor-not-allowed text-gray-200'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  <Download size={14} />
                  {downloading ? 'ডাউনলোড...' : 'ডাউনলোড'}
                </button>
              </div>
            ))}
          </div>
          {error && (
            <p className="text-xs text-red-500 mt-2 bg-red-50 rounded-lg px-3 py-2">⚠️ {error}</p>
          )}
          <p className="text-xs text-gray-500 mt-3 flex items-center gap-1">
            <CheckCircle size={11} /> অনুমোদিত শেয়ার ক্রয়ের সার্টিফিকেট সাথে সাথে ডাউনলোড করুন
          </p>
        </div>
      )}

      {wbal && wbal.available_paisa > 0 && (
        <div className="card bg-gradient-to-br from-purple-50 to-violet-50 border-purple-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <ArrowDownCircle size={18} className="text-purple-500" /> উত্তোলনযোগ্য মুনাফা
            </h2>
            <Link to="/withdraw" className="text-xs text-purple-600 font-medium flex items-center gap-1 hover:underline">
              উত্তোলন করুন <ArrowRight size={12} />
            </Link>
          </div>
          <div className="flex items-baseline justify-between mb-3">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">উত্তোলনযোগ্য</p>
              <p className="text-2xl font-bold text-purple-700">{formatTaka(wbal.available_paisa)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">মোট জমাকৃত</p>
              <p className="font-semibold text-gray-600">{formatTaka(wbal.total_earned_paisa)}</p>
            </div>
          </div>
          <p className="text-xs text-gray-400">
            সম্পন্ন: {formatTaka(wbal.total_withdrawn_paisa)}
            {(wbal as any).approved_paisa > 0 && (
              <> • <span className="text-blue-600 font-medium">অনুমোদিত (bKash পাঠানো হবে): {formatTaka((wbal as any).approved_paisa)}</span></>
            )}
            {wbal.pending_paisa > 0 && <> • অপেক্ষমাণ: {formatTaka(wbal.pending_paisa)}</>}
          </p>

          {/* Income Breakdown — category-wise detail */}
          {incomeBreakdown?.success && incomeBreakdown.data.breakdown.length > 0 && (
            <div className="mt-4 pt-3 border-t border-purple-100">
              <h3 className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1.5">
                <Layers size={12} /> আয়ের বিবরণ (খাত অনুযায়ী)
              </h3>
              <div className="space-y-2">
                {incomeBreakdown.data.breakdown.map((item, i) => {
                  const colors = ['bg-green-500','bg-blue-500','bg-amber-500','bg-rose-500','bg-cyan-500','bg-violet-500']
                  const textColors = ['text-green-700','text-blue-700','text-amber-700','text-rose-700','text-cyan-700','text-violet-700']
                  const bgColors = ['bg-green-50','bg-blue-50','bg-amber-50','bg-rose-50','bg-cyan-50','bg-violet-50']
                  const widthPct = incomeBreakdown.data.total_earned_paisa > 0
                    ? Math.max(3, (item.amount_paisa / incomeBreakdown.data.total_earned_paisa) * 100)
                    : 0
                  const isRef = item.source === 'referral_bonus'
                  const isProject = item.source === 'project_earnings'
                  const icon = isProject ? '📊' : isRef ? '🎁' : item.source === 'monthly_earnings' ? '📈' : item.source === 'capital_refund' ? '🏦' : '💰'
                  const displayLabel = isProject ? item.project_title : item.label

                  return (
                    <div key={`${item.source}-${item.project_id ?? 'ref'}-${i}`}
                      className={`rounded-xl p-2.5 ${bgColors[i % bgColors.length]} border border-gray-100`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${colors[i % colors.length]}`} />
                          <span className="text-xs font-medium text-gray-700 truncate">
                            {icon} {displayLabel}
                          </span>
                          {item.detail && (
                            <span className="text-[10px] text-gray-400 shrink-0">({item.detail})</span>
                          )}
                        </div>
                        <span className={`text-sm font-bold shrink-0 ml-2 ${textColors[i % textColors.length]}`}>
                          {formatTaka(item.amount_paisa)}
                        </span>
                      </div>
                      <div className="h-1.5 bg-white/80 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${colors[i % colors.length]} transition-all`}
                          style={{ width: `${widthPct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}


      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Link to="/projects" className="card hover:shadow-md transition-all hover:-translate-y-0.5 flex items-center gap-3 cursor-pointer group">
          <div className="bg-primary-100 group-hover:bg-primary-200 p-2.5 rounded-xl transition-colors"><Briefcase size={20} className="text-primary-700" /></div>
          <div><p className="font-semibold text-sm">প্রজেক্ট</p><p className="text-xs text-gray-400">শেয়ার কিনুন</p></div>
        </Link>
        <Link to="/tasks" className="card hover:shadow-md transition-all hover:-translate-y-0.5 flex items-center gap-3 cursor-pointer group">
          <div className="bg-amber-100 group-hover:bg-amber-200 p-2.5 rounded-xl transition-colors"><ListTodo size={20} className="text-amber-700" /></div>
          <div><p className="font-semibold text-sm">টাস্ক</p><p className="text-xs text-gray-400">পয়েন্ট সংগ্রহ</p></div>
        </Link>
        <Link to="/earnings" className="card hover:shadow-md transition-all hover:-translate-y-0.5 flex items-center gap-3 cursor-pointer group">
          <div className="bg-yellow-100 group-hover:bg-yellow-200 p-2.5 rounded-xl transition-colors"><TrendingUp size={20} className="text-yellow-700" /></div>
          <div><p className="font-semibold text-sm">মুনাফা</p><p className="text-xs text-gray-400">ইতিহাস দেখুন</p></div>
        </Link>
        <Link to="/portfolio" className="card hover:shadow-md transition-all hover:-translate-y-0.5 flex items-center gap-3 cursor-pointer group">
          <div className="bg-indigo-100 group-hover:bg-indigo-200 p-2.5 rounded-xl transition-colors"><BarChart2 size={20} className="text-indigo-700" /></div>
          <div><p className="font-semibold text-sm">পোর্টফোলিও</p><p className="text-xs text-gray-400">ROI দেখুন</p></div>
        </Link>
        <Link to="/withdraw" className="card hover:shadow-md transition-all hover:-translate-y-0.5 flex items-center gap-3 cursor-pointer group">
          <div className="bg-purple-100 group-hover:bg-purple-200 p-2.5 rounded-xl transition-colors"><ArrowDownCircle size={20} className="text-purple-700" /></div>
          <div><p className="font-semibold text-sm">উত্তোলন</p><p className="text-xs text-gray-400">মুনাফা নিন</p></div>
        </Link>
        <Link to="/member-registration" className="card hover:shadow-md transition-all hover:-translate-y-0.5 flex items-center gap-3 cursor-pointer group">
          <div className="bg-teal-100 group-hover:bg-teal-200 p-2.5 rounded-xl transition-colors"><FileText size={20} className="text-teal-700" /></div>
          <div><p className="font-semibold text-sm">সদস্যপদ</p><p className="text-xs text-gray-400">নিবন্ধন করুন</p></div>
        </Link>
      </div>

      {/* Referral Stats Card */}
      <div className="card bg-gradient-to-r from-primary-50 to-blue-50 border-primary-100">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <Gift size={18} className="text-primary-600" /> রেফারেল প্রোগ্রাম
          </h3>
          <Link to="/referrals" className="text-xs text-primary-600 font-medium flex items-center gap-1 hover:underline">
            বিস্তারিত <ArrowRight size={12} />
          </Link>
        </div>

        {/* Code + copy */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-mono font-bold text-primary-700 tracking-widest">{user?.referral_code}</span>
          <button onClick={copyReferral} className="flex items-center gap-1 text-sm btn-secondary py-1.5 px-3">
            <Copy size={14} />
            {copied ? 'কপি হয়েছে!' : 'কপি করুন'}
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl p-3 border border-primary-100 text-center">
            <p className="text-xs text-gray-400 mb-1 flex items-center justify-center gap-1"><Users size={10} /> রেফার করেছেন</p>
            <p className="font-bold text-primary-700">{refStats?.total_referred ?? 0}</p>
          </div>
          <div className="bg-white rounded-xl p-3 border border-primary-100 text-center">
            <p className="text-xs text-gray-400 mb-1">বোনাস পেয়েছেন</p>
            <p className="font-bold text-green-600">{refStats?.bonuses_earned ?? 0}x</p>
          </div>
          <div className="bg-white rounded-xl p-3 border border-primary-100 text-center">
            <p className="text-xs text-gray-400 mb-1">মোট বোনাস</p>
            <p className="font-bold text-amber-600">{formatTaka(refStats?.total_bonus_paisa ?? 0)}</p>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-3 flex items-center gap-1">
          <Gift size={11} /> বন্ধু প্রথম বিনিয়োগ করলে আপনি বোনাস পাবেন
        </p>
      </div>
    </div>
  )
}
