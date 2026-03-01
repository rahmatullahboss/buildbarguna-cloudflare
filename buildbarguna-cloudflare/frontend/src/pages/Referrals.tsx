import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { referralsApi } from '../lib/api'
import { formatTaka } from '../lib/auth'
import { Copy, Gift, Users, CheckCircle, Clock } from 'lucide-react'
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Gift size={24} className="text-primary-600" /> রেফারেল প্রোগ্রাম
        </h1>
        <p className="text-gray-500 text-sm mt-1">বন্ধুকে রেফার করুন, প্রথম বিনিয়োগে বোনাস পান</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center">
          <div className="bg-blue-100 w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2">
            <Users size={20} className="text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats?.total_referred ?? 0}</p>
          <p className="text-xs text-gray-500 mt-1">রেফার করেছেন</p>
        </div>
        <div className="card text-center">
          <div className="bg-green-100 w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2">
            <CheckCircle size={20} className="text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats?.bonuses_earned ?? 0}</p>
          <p className="text-xs text-gray-500 mt-1">বোনাস পেয়েছেন</p>
        </div>
        <div className="card text-center">
          <div className="bg-amber-100 w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2">
            <Gift size={20} className="text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-amber-600">{formatTaka(stats?.total_bonus_paisa ?? 0)}</p>
          <p className="text-xs text-gray-500 mt-1">মোট বোনাস</p>
        </div>
      </div>

      {/* Share card */}
      <div className="card bg-gradient-to-br from-primary-50 to-blue-50 border-primary-100 space-y-4">
        <h2 className="font-semibold text-gray-800">আপনার রেফারেল কোড শেয়ার করুন</h2>

        {/* Code */}
        <div>
          <p className="text-xs text-gray-500 mb-1">রেফারেল কোড</p>
          <div className="flex items-center gap-3">
            <span className="text-3xl font-mono font-bold text-primary-700 tracking-widest">
              {stats?.referral_code ?? '—'}
            </span>
            <button onClick={copyCode} className="flex items-center gap-1 btn-secondary text-sm py-1.5 px-3">
              <Copy size={14} />
              {copied ? '✓ কপি হয়েছে' : 'কোড কপি করুন'}
            </button>
          </div>
        </div>

        {/* Share link */}
        <div>
          <p className="text-xs text-gray-500 mb-1">শেয়ার লিংক</p>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={stats?.share_link ?? ''}
              className="input text-xs flex-1 bg-white"
            />
            <button onClick={copyLink} className="btn-secondary text-sm py-2 px-3 whitespace-nowrap flex items-center gap-1">
              <Copy size={14} />
              {linkCopied ? '✓ কপি' : 'লিংক কপি'}
            </button>
          </div>
        </div>

        <p className="text-xs text-gray-500">
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
            { step: '৩', text: 'বন্ধু প্রথমবার শেয়ার কিনলে আপনি বোনাস পান' },
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
                  {r.has_invested ? (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle size={10} /> বিনিয়োগ করেছেন
                    </span>
                  ) : (
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Clock size={10} /> বিনিয়োগ করেননি
                    </span>
                  )}
                  {r.bonus_credited && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Gift size={10} /> বোনাস
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
