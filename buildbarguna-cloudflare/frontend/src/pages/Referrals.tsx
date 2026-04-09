import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { referralsApi } from '../lib/api'
import { formatTaka } from '../lib/auth'
import { Copy, Gift, Users, CheckCircle, Clock, Share2, Sparkles } from 'lucide-react'
import Disclaimer from '../components/Disclaimer'

export default function Referrals() {
  const [copied, setCopied] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['referral-stats'],
    queryFn: () => referralsApi.stats(),
    staleTime: 30_000,
    retry: 1
  })

  const stats = data?.success ? data.data : null

  async function copyCode() {
    if (!stats?.referral_code) return
    try {
      await navigator.clipboard.writeText(stats.referral_code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for non-HTTPS or unsupported browsers
      const el = document.createElement('textarea')
      el.value = stats.referral_code
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  async function copyLink() {
    if (!stats?.share_link) return
    try {
      await navigator.clipboard.writeText(stats.share_link)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    } catch {
      const el = document.createElement('textarea')
      el.value = stats.share_link
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
      </div>
    )
  }

  if (isError || (data && !data.success)) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
        <div className="bg-red-100 w-14 h-14 rounded-full flex items-center justify-center">
          <Gift size={28} className="text-red-400" />
        </div>
        <p className="text-gray-700 font-medium">রেফারেল তথ্য লোড করা যায়নি</p>
        <p className="text-gray-400 text-sm">নেটওয়ার্ক সমস্যা হতে পারে। পেজ রিফ্রেশ করুন।</p>
        <button
          onClick={() => window.location.reload()}
          className="btn-secondary text-sm mt-2"
        >
          🔄 আবার চেষ্টা করুন
        </button>
      </div>
    )
  }

  const bonusPerReferral = (stats as any)?.bonus_per_referral_paisa ?? 5000
  const potentialBonus = (stats as any)?.potential_bonus_paisa ?? 0
  const pendingReferralsCount = (stats as any)?.pending_referrals_count ?? 0

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="bg-gradient-to-br from-primary-700 via-primary-600 to-emerald-600 rounded-3xl p-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-10 w-24 h-24 bg-white/10 rounded-full translate-y-1/2" />
        <div className="relative z-10">
          <div className="text-4xl mb-3">🎁</div>
          <h1 className="text-2xl font-bold">রেফারেল প্রোগ্রাম</h1>
          <p className="text-primary-100 text-sm mt-1">বন্ধুকে রেফার করুন, প্রথম বিনিয়োগে বোনাস পান</p>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card text-center p-4">
          <div className="bg-blue-100 w-10 h-10 rounded-2xl flex items-center justify-center mx-auto mb-2">
            <Users size={20} className="text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats?.total_referred ?? 0}</p>
          <p className="text-xs text-gray-500 mt-1">রেফার করেছেন</p>
        </div>
        <div className="card text-center p-4">
          <div className="bg-green-100 w-10 h-10 rounded-2xl flex items-center justify-center mx-auto mb-2">
            <CheckCircle size={20} className="text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats?.bonuses_earned ?? 0}</p>
          <p className="text-xs text-gray-500 mt-1">বোনাস পেয়েছেন</p>
        </div>
        <div className="card text-center p-4">
          <div className="bg-amber-100 w-10 h-10 rounded-2xl flex items-center justify-center mx-auto mb-2">
            <Gift size={20} className="text-amber-600" />
          </div>
          <p className="text-xl font-bold text-amber-600">{formatTaka(stats?.total_bonus_paisa ?? 0)}</p>
          <p className="text-xs text-gray-500 mt-1">মোট বোনাস পেয়েছেন</p>
        </div>
        {/* Potential bonus card — only show if pending referrals exist */}
        {pendingReferralsCount > 0 && (
          <div className="card text-center p-4 bg-gradient-to-br from-purple-50 to-violet-50 border-purple-100">
            <div className="bg-purple-100 w-10 h-10 rounded-2xl flex items-center justify-center mx-auto mb-2">
              <Sparkles size={20} className="text-purple-600" />
            </div>
            <p className="text-xl font-bold text-purple-600">{formatTaka(potentialBonus)}</p>
            <p className="text-xs text-gray-500 mt-1">সম্ভাব্য বোনাস</p>
            <p className="text-[10px] text-purple-400 mt-0.5">{pendingReferralsCount} জন শেয়ার কিনলে পাবেন</p>
          </div>
        )}
      </div>

      {/* Potential bonus info banner */}
      {pendingReferralsCount > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 flex items-start gap-2">
          <Sparkles size={14} className="text-purple-500 shrink-0 mt-0.5" />
          <p className="text-xs text-purple-700">
            আপনার রেফার করা <strong>{pendingReferralsCount} জন</strong> এখনো শেয়ার কেনেননি।
            তারা শেয়ার কিনলে প্রতিজনে <strong>{formatTaka(bonusPerReferral)}</strong> বোনাস আপনার ব্যালেন্সে যোগ হবে
            এবং উত্তোলনযোগ্য হবে।
          </p>
        </div>
      )}

      {/* Share card */}
      <div className="card bg-gradient-to-br from-primary-50 to-emerald-50 border-primary-100 space-y-4">
        <h2 className="font-bold text-gray-800 flex items-center gap-2"><Share2 size={16} className="text-primary-600" /> আপনার রেফারেল কোড শেয়ার করুন</h2>

        {/* Code */}
        <div>
          <p className="text-xs text-gray-500 mb-2">রেফারেল কোড</p>
          <div className="flex items-center gap-3 bg-white rounded-2xl p-3 border border-primary-100">
            <span className="text-2xl font-mono font-bold text-primary-700 tracking-widest flex-1">
              {stats?.referral_code ?? '—'}
            </span>
            <button
              onClick={copyCode}
              aria-label={copied ? 'কপি হয়েছে' : 'রেফারেল কোড কপি করুন'}
              className="flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm py-2 px-3 rounded-xl transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-primary-500"
            >
              <Copy size={14} />
              {copied ? '✓ কপি!' : 'কপি করুন'}
            </button>
          </div>
        </div>

        {/* Share buttons */}
        <div>
          <p className="text-xs text-gray-500 mb-2">সরাসরি শেয়ার করুন</p>
          <div className="flex gap-2 flex-wrap">
            {/* WhatsApp */}
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`বিল্ড বরগুনায় বিনিয়োগ করুন! আমার রেফারেল কোড: ${stats?.referral_code ?? ''} — ${stats?.share_link ?? ''}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white text-sm py-2 px-4 rounded-xl transition-colors shadow-sm"
            >
              <span>📱</span> WhatsApp
            </a>
            {/* Copy link */}
            <button onClick={copyLink} className="flex items-center gap-1.5 btn-secondary text-sm py-2 px-4">
              <Copy size={14} />
              {linkCopied ? '✓ লিংক কপি!' : 'লিংক কপি'}
            </button>
          </div>
        </div>

        <p className="text-xs text-gray-500 bg-white/60 rounded-xl p-2.5">
          🎁 আপনার বন্ধু এই লিংকে রেজিস্ট্রেশন করে প্রথম শেয়ার কিনলে আপনি বোনাস পাবেন
        </p>
      </div>

      <Disclaimer variant="referral" />

      {/* How it works */}
      <div className="card space-y-3">
        <h2 className="font-semibold text-gray-800">কিভাবে কাজ করে?</h2>
        <div className="space-y-2">
          {[
            { step: '১', text: 'আপনার রেফারেল কোড বা লিংক বন্ধুকে পাঠান' },
            { step: '২', text: 'বন্ধু সেই কোড দিয়ে রেজিস্ট্রেশন করেন' },
            { step: '৩', text: `বন্ধু প্রথমবার শেয়ার কিনলে আপনি ${formatTaka(bonusPerReferral)} বোনাস পান` },
            { step: '৪', text: 'বোনাস আপনার ব্যালেন্সে যোগ হয় — উত্তোলন করতে পারবেন' },
          ].map(item => (
            <div key={item.step} className="flex items-start gap-3">
              <span className="bg-primary-100 text-primary-700 font-bold text-sm rounded-full w-7 h-7 flex items-center justify-center flex-shrink-0">
                {item.step}
              </span>
              <p className="text-sm text-gray-600 pt-0.5">{item.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Referred users list */}
      <div className="card">
        <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Users size={16} /> রেফার করা সদস্যরা ({stats?.total_referred ?? 0})
        </h2>
        {!stats?.referrals?.length ? (
          <div className="text-center py-8 text-gray-400">
            <Users size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">এখনো কেউ আপনার রেফারেল কোড ব্যবহার করেননি</p>
            <p className="text-xs mt-1">বন্ধুদের কোড শেয়ার করুন!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {stats.referrals.map((r, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="bg-primary-100 w-9 h-9 rounded-full flex items-center justify-center text-primary-700 font-bold text-sm">
                    {r.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-sm text-gray-800">{r.name}</p>
                    <p className="text-xs text-gray-400">
                      যোগ: {new Date(r.joined_at).toLocaleDateString('bn-BD')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {r.bonus_credited ? (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Gift size={10} /> {formatTaka(bonusPerReferral)} পেয়েছেন
                    </span>
                  ) : r.has_invested ? (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle size={10} /> বিনিয়োগ করেছেন
                    </span>
                  ) : (
                    <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Sparkles size={10} /> {formatTaka(bonusPerReferral)} পাবেন
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
