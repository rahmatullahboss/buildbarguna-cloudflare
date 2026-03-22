import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminReferralsApi } from '../../lib/api'
import { formatTaka } from '../../lib/auth'
import { Gift, Users, TrendingUp, CheckCircle, AlertTriangle, Settings, Save } from 'lucide-react'
import Disclaimer from '../../components/Disclaimer'

export default function AdminReferrals() {
  const qc = useQueryClient()
  const [bonusInput, setBonusInput] = useState('')
  const [editMode, setEditMode] = useState(false)
  const [msg, setMsg] = useState('')
  const [errMsg, setErrMsg] = useState('')

  const { data: settingsData, isLoading: settingsLoading } = useQuery({
    queryKey: ['admin-referral-settings'],
    queryFn: () => adminReferralsApi.settings(),
    staleTime: 60_000
  })

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-referral-stats'],
    queryFn: () => adminReferralsApi.stats(),
    staleTime: 30_000
  })

  const settings = settingsData?.success ? settingsData.data : null
  const stats = statsData?.success ? statsData.data : null

  const updateMutation = useMutation({
    mutationFn: (amount: number) => adminReferralsApi.updateSettings(amount),
    onSuccess: (res) => {
      if (res.success) {
        setMsg('✅ রেফারেল বোনাস আপডেট হয়েছে')
        setEditMode(false)
        setBonusInput('')
        qc.invalidateQueries({ queryKey: ['admin-referral-settings'] })
      } else {
        setErrMsg((res as any).error ?? 'আপডেট ব্যর্থ হয়েছে')
      }
    }
  })

  function handleSave() {
    const val = parseInt(bonusInput)
    if (isNaN(val) || val < 0) {
      setErrMsg('সঠিক পরিমাণ দিন (পয়সায়)')
      return
    }
    if (val > 100_000) {
      setErrMsg('বোনাস সর্বোচ্চ ৳1,000 (100,000 পয়সা) হতে পারে')
      return
    }
    setMsg('')
    setErrMsg('')
    updateMutation.mutate(val)
  }

  function startEdit() {
    setBonusInput(String(settings?.referral_bonus_paisa ?? 5000))
    setEditMode(true)
    setMsg('')
    setErrMsg('')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-700 via-emerald-600 to-teal-600 rounded-3xl p-5 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 flex items-center gap-3">
          <div className="bg-white/15 p-2.5 rounded-2xl text-2xl">🎁</div>
          <div>
            <h1 className="text-2xl font-bold">রেফারেল ব্যবস্থাপনা</h1>
            <p className="text-emerald-100 text-sm mt-0.5">রেফারেল বোনাস সেটিং ও নেটওয়ার্ক পরিসংখ্যান</p>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {msg && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm">
          <CheckCircle size={16} /> {msg}
          <button aria-label="বার্তা বন্ধ করুন" onClick={() => setMsg('')} className="ml-auto text-green-500 hover:text-green-700">✕</button>
        </div>
      )}
      {errMsg && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
          <AlertTriangle size={16} /> {errMsg}
          <button aria-label="বার্তা বন্ধ করুন" onClick={() => setErrMsg('')} className="ml-auto text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* Global Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card text-center">
          <div className="bg-blue-100 w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2">
            <Gift size={20} className="text-blue-600" />
          </div>
          {statsLoading ? (
            <div className="h-7 bg-gray-100 rounded animate-pulse mx-auto w-16 mb-1" />
          ) : (
            <p className="text-2xl font-bold text-gray-900">{stats?.total_bonuses_issued ?? 0}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">মোট বোনাস দেওয়া হয়েছে</p>
        </div>
        <div className="card text-center">
          <div className="bg-amber-100 w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2">
            <TrendingUp size={20} className="text-amber-600" />
          </div>
          {statsLoading ? (
            <div className="h-7 bg-gray-100 rounded animate-pulse mx-auto w-24 mb-1" />
          ) : (
            <p className="text-2xl font-bold text-amber-600">{formatTaka(stats?.total_bonus_paid_paisa ?? 0)}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">মোট বোনাস পরিমাণ</p>
        </div>
      </div>

      <Disclaimer variant="referral" />

      {/* Bonus Settings Card */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Settings size={16} className="text-gray-500" /> বোনাস সেটিং
          </h2>
          {!editMode && (
            <button
              onClick={startEdit}
              className="text-sm flex items-center gap-1 text-primary-600 hover:text-primary-700 font-medium"
            >
              <Settings size={14} /> পরিবর্তন করুন
            </button>
          )}
        </div>

        {settingsLoading ? (
          <div className="h-16 bg-gray-50 rounded-xl animate-pulse" />
        ) : editMode ? (
          <div className="space-y-3">
            <div>
              <label className="label">বোনাস পরিমাণ (পয়সায়)</label>
              <p className="text-xs text-gray-400 mb-1">১০০ পয়সা = ৳১ — সর্বোচ্চ ১,০০,০০০ পয়সা (৳১,০০০)</p>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  className="input flex-1"
                  placeholder="যেমন: 5000 (= ৳50)"
                  value={bonusInput}
                  min={0}
                  max={100000}
                  onChange={e => setBonusInput(e.target.value)}
                />
                <div className="text-right min-w-[80px]">
                  <p className="text-xs text-gray-400">সমান</p>
                  <p className="font-bold text-primary-700">
                    {bonusInput && !isNaN(parseInt(bonusInput))
                      ? formatTaka(parseInt(bonusInput))
                      : '—'}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={updateMutation.isPending || !bonusInput}
                className="flex items-center gap-1.5 btn-primary flex-1 justify-center"
              >
                <Save size={14} />
                {updateMutation.isPending ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
              </button>
              <button
                onClick={() => { setEditMode(false); setBonusInput(''); setErrMsg('') }}
                className="btn-secondary flex-1"
              >
                বাতিল
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">প্রতি রেফারেলে বোনাস (প্রথম বিনিয়োগে)</p>
              <p className="text-3xl font-bold text-primary-700 mt-1">
                {formatTaka(settings?.referral_bonus_paisa ?? 5000)}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                = {settings?.referral_bonus_paisa ?? 5000} পয়সা
              </p>
            </div>
            <Gift size={40} className="text-primary-200" />
          </div>
        )}
      </div>

      {/* Top Referrers Table */}
      <div className="card">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2 mb-4">
          <Users size={16} className="text-gray-500" /> শীর্ষ রেফারকারী (Top 10)
        </h2>

        {statsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-14 bg-gray-50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : !stats?.top_referrers?.length ? (
          <div className="text-center py-10 text-gray-400">
            <Users size={36} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">এখনো কোনো রেফারেল হয়নি</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-4 text-xs font-medium text-gray-400 uppercase">#</th>
                  <th className="text-left py-2 px-4 text-xs font-medium text-gray-400 uppercase">সদস্য</th>
                  <th className="text-left py-2 px-4 text-xs font-medium text-gray-400 uppercase">কোড</th>
                  <th className="text-right py-2 px-4 text-xs font-medium text-gray-400 uppercase">রেফার করেছেন</th>
                  <th className="text-right py-2 px-4 text-xs font-medium text-gray-400 uppercase">বোনাস পেয়েছেন</th>
                  <th className="text-right py-2 px-4 text-xs font-medium text-gray-400 uppercase">মোট আয়</th>
                </tr>
              </thead>
              <tbody>
                {(stats.top_referrers as Array<{
                  name: string
                  phone: string
                  referral_code: string
                  referred_count: number
                  bonuses_count: number
                  total_earned_paisa: number
                }>).map((r, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4">
                      <span className={`font-bold text-sm ${
                        i === 0 ? 'text-amber-500' :
                        i === 1 ? 'text-gray-400' :
                        i === 2 ? 'text-orange-400' : 'text-gray-300'
                      }`}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-gray-900">{r.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{r.phone}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full">
                        {r.referral_code}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-medium text-gray-700">{r.referred_count}</span>
                      <span className="text-xs text-gray-400 ml-1">জন</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-medium text-green-600">{r.bonuses_count}</span>
                      <span className="text-xs text-gray-400 ml-1">বার</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-bold text-amber-600">{formatTaka(r.total_earned_paisa)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
