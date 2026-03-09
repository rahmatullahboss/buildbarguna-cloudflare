import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { rewardsApi, pointsApi } from '../lib/api'
import { Gift, Coins, Package, CheckCircle, Clock, XCircle, AlertTriangle, Wallet, Send } from 'lucide-react'
import { useState, type FormEvent } from 'react'

export default function Rewards() {
  const qc = useQueryClient()
  const [showConfirm, setShowConfirm] = useState<number | null>(null)
  const [showWithdrawModal, setShowWithdrawModal] = useState<boolean>(false)
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState<{amount: number, bkash: string} | null>(null)
  const [amount, setAmount] = useState<string>('')
  const [bkashNumber, setBkashNumber] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  const MIN_WITHDRAWAL = 200 // This should come from API settings, but hardcoded for now

  const { data: pointsData } = useQuery({
    queryKey: ['points'],
    queryFn: () => pointsApi.getBalance(),
    staleTime: 60_000
  })

  const { data: rewardsData, isLoading } = useQuery({
    queryKey: ['rewards'],
    queryFn: () => rewardsApi.list(),
    staleTime: 5 * 60_000
  })

  const { data: redemptionsData } = useQuery({
    queryKey: ['my-redemptions'],
    queryFn: () => rewardsApi.myRedemptions(),
    staleTime: 30_000
  })

  const { data: withdrawalsData } = useQuery({
    queryKey: ['point-withdrawals'],
    queryFn: () => pointsApi.getWithdrawals(),
    staleTime: 30_000
  })

  const redeemMutation = useMutation({
    mutationFn: (id: number) => rewardsApi.redeem(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['points'] })
      qc.invalidateQueries({ queryKey: ['rewards'] })
      qc.invalidateQueries({ queryKey: ['my-redemptions'] })
      setShowConfirm(null)
    }
  })

  const points = pointsData?.success ? pointsData.data : null
  const rewards = rewardsData?.success ? rewardsData.data : []
  const redemptions = redemptionsData?.success ? redemptionsData.data : []
  const withdrawals = withdrawalsData?.success ? withdrawalsData.data.items : []

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock size={16} className="text-orange-500" />
      case 'approved': return <CheckCircle size={16} className="text-blue-500" />
      case 'fulfilled': return <CheckCircle size={16} className="text-green-500" />
      case 'rejected': return <XCircle size={16} className="text-red-500" />
      case 'cancelled': return <XCircle size={16} className="text-gray-400" />
      default: return null
    }
  }

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      pending: 'অনুমোদনের অপেক্ষায়',
      approved: 'অনুমোদিত',
      fulfilled: 'প্রদান করা হয়েছে',
      rejected: 'প্রত্যাখ্যাত',
      cancelled: 'বাতিল'
    }
    return texts[status] || status
  }

  const WithdrawalStatusBadge = ({ status }: { status: string }) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-blue-100 text-blue-700',
      completed: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700'
    }

    const labels: Record<string, string> = {
      pending: 'অপেক্ষায়',
      approved: 'অনুমোদিত',
      completed: 'সম্পন্ন',
      rejected: 'বাতিল'
    }

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100'}`}>
        {getStatusIcon(status)}
        {labels[status] || status}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Points Summary with Withdraw Button */}
      {points && (
        <div className="card bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-amber-100 p-2 rounded-xl">
                <Coins size={24} className="text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-amber-700 font-medium">আপনার পয়েন্ট</p>
                <p className="text-2xl font-bold text-amber-900">{points.available_points} পয়েন্ট</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-amber-600">জীবনে অর্জিত</p>
              <p className="text-lg font-bold text-amber-800">{points.lifetime_earned}</p>
            </div>
          </div>

          {/* Withdraw Button */}
          <button
            onClick={() => setShowWithdrawModal(true)}
            disabled={!points || points.available_points < MIN_WITHDRAWAL}
            className="w-full py-3 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl font-medium hover:from-green-700 hover:to-green-600 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            <Wallet size={18} />
            পয়েন্ট উত্তোলন করুন (ন্যূনতম {MIN_WITHDRAWAL} পয়েন্ট = {MIN_WITHDRAWAL} টাকা)
          </button>

          {points && points.available_points < MIN_WITHDRAWAL && (
            <p className="mt-2 text-xs text-center text-orange-600">
              উত্তোলন করতে আরও {MIN_WITHDRAWAL - points.available_points} পয়েন্ট প্রয়োজন
            </p>
          )}
        </div>
      )}

      {/* Pending Withdrawal Alert */}
      {withdrawals.length > 0 && withdrawals[0].status === 'pending' && (
        <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
          <div className="flex items-center gap-3">
            <Clock size={20} className="text-yellow-600" />
            <div className="flex-1">
              <p className="font-medium text-yellow-800">অপেক্ষায় থাকা উত্তোলন</p>
              <p className="text-sm text-yellow-700">
                {withdrawals[0].amount_points} পয়েন্ট = {withdrawals[0].amount_taka} টাকা • {withdrawals[0].bkash_number}
              </p>
            </div>
            <WithdrawalStatusBadge status="pending" />
          </div>
        </div>
      )}

      {/* Rewards Catalog */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Gift size={20} className="text-primary-600" />
          <h2 className="text-lg font-bold text-gray-900">রিওয়ার্ড ক্যাটালগ</h2>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="card h-28 animate-pulse bg-gray-50" />
            ))}
          </div>
        ) : rewards.length === 0 ? (
          <div className="card text-center py-10">
            <Gift size={36} className="mx-auto mb-2 text-gray-200" />
            <p className="text-gray-400 text-sm">কোনো রিওয়ার্ড উপলব্ধ নেই</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {rewards.map((reward) => {
              const canAfford = points && points.available_points >= reward.points_required
              const isLimited = reward.quantity !== null
              const remaining = isLimited && reward.quantity ? reward.quantity - reward.redeemed_count : null
              const isAvailable = !isLimited || (remaining !== null && remaining > 0)

              return (
                <div key={reward.id} className="card border-amber-100 bg-gradient-to-r from-amber-50/50 to-orange-50/50">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900">{reward.name}</h3>
                      {reward.description && (
                        <p className="text-sm text-gray-600 mt-1">{reward.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-sm font-bold text-amber-600 flex items-center gap-1">
                          <Coins size={14} /> {reward.points_required} পয়েন্ট
                        </span>
                        {isLimited && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            remaining && remaining > 0
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {remaining && remaining > 0 ? `${remaining}টি বাকি` : 'শেষ হয়ে গেছে'}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => setShowConfirm(reward.id)}
                      disabled={!canAfford || !isAvailable || redeemMutation.isPending}
                      className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                        canAfford && isAvailable
                          ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-sm'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {redeemMutation.isPending ? '...' : !canAfford ? 'কম পয়েন্ট' : 'রিডিম করুন'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Withdrawal History */}
      {withdrawals.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Send size={20} className="text-primary-600" />
            <h2 className="text-lg font-bold text-gray-900">উত্তোলনের ইতিহাস</h2>
          </div>

          <div className="space-y-2">
            {withdrawals.map((withdrawal) => (
              <div key={withdrawal.id} className="card flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">
                    {withdrawal.amount_points} পয়েন্ট = {withdrawal.amount_taka} টাকা
                  </p>
                  <p className="text-xs text-gray-500">
                    bKash: {withdrawal.bkash_number} • {new Date(withdrawal.requested_at).toLocaleDateString('bn-BD')}
                  </p>
                  {withdrawal.admin_note && withdrawal.status === 'rejected' && (
                    <p className="text-xs text-red-600 mt-1 bg-red-50 p-2 rounded">
                      প্রত্যাখ্যানের কারণ: {withdrawal.admin_note}
                    </p>
                  )}
                </div>
                <WithdrawalStatusBadge status={withdrawal.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Redemption History */}
      {redemptions.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Package size={20} className="text-primary-600" />
            <h2 className="text-lg font-bold text-gray-900">রিডিমের ইতিহাস</h2>
          </div>

          <div className="space-y-2">
            {redemptions.map((redemption) => (
              <div key={redemption.id} className="card flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{redemption.reward_name || 'রিওয়ার্ড'}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(redemption.redeemed_at).toLocaleDateString('bn-BD', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                  {redemption.admin_note && redemption.status === 'rejected' && (
                    <p className="text-xs text-red-600 mt-1 bg-red-50 p-2 rounded">
                      প্রত্যাখ্যানের কারণ: {redemption.admin_note}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-amber-600">-{redemption.points_spent} পয়েন্ট</span>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    {getStatusIcon(redemption.status)}
                    <span>{getStatusText(redemption.status)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reward Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-amber-100 p-2 rounded-xl">
                <AlertTriangle size={24} className="text-amber-600" />
              </div>
              <h3 className="text-lg font-bold">নিশ্চিত করুন</h3>
            </div>

            <p className="text-gray-600 mb-4">
              আপনি কি এই রিওয়ার্ডটি রিডিম করতে চান? এই পয়েন্টগুলো আর ফেরতযোগ্য নয়।
            </p>

            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <p className="text-sm text-gray-500">খরচ হবে</p>
              <p className="text-2xl font-bold text-amber-600 flex items-center gap-2">
                <Coins size={20} />
                {rewards.find(r => r.id === showConfirm)?.points_required} পয়েন্ট
              </p>
              <p className="text-xs text-gray-400 mt-2">
                বর্তমান ব্যালেন্স: {points?.available_points || 0} পয়েন্ট
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => redeemMutation.mutate(showConfirm)}
                disabled={redeemMutation.isPending}
                className="flex-1 bg-amber-500 text-white py-3 rounded-xl font-medium hover:bg-amber-600 transition-colors disabled:opacity-50"
              >
                {redeemMutation.isPending ? '...' : 'হ্যাঁ, রিডিম করুন'}
              </button>
              <button
                onClick={() => setShowConfirm(null)}
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-300 transition-colors"
              >
                বাতিল
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <WithdrawModal
          points={points}
          onClose={() => setShowWithdrawModal(false)}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ['points'] })
            qc.invalidateQueries({ queryKey: ['point-withdrawals'] })
            setShowWithdrawModal(false)
          }}
        />
      )}
    </div>
  )
}

// Withdraw Modal Component
function WithdrawModal({
  points,
  onClose,
  onSuccess
}: {
  points: any
  onClose: () => void
  onSuccess: () => void
}) {
  const [amount, setAmount] = useState<string>('')
  const [bkashNumber, setBkashNumber] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState<{amount: number, bkash: string} | null>(null)
  const MIN_WITHDRAWAL = 200

  const withdrawMutation = useMutation({
    mutationFn: () => {
      const amountNum = parseInt(amount)
      return pointsApi.withdraw(amountNum, bkashNumber)
    },
    onSuccess: (res) => {
      if (res.success) {
        onSuccess()
      } else {
        setError(res.error)
      }
    },
    onError: (err: Error) => {
      setError(err.message)
    }
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError('')

    const amountNum = parseInt(amount)
    if (isNaN(amountNum) || amountNum < MIN_WITHDRAWAL) {
      setError(`ন্যূনতম ${MIN_WITHDRAWAL} পয়েন্ট প্রয়োজন`)
      return
    }

    if (!/^01[3-9]\d{8}$/.test(bkashNumber)) {
      setError('সঠিক bKash নম্বর দিন (01XXXXXXXXX)')
      return
    }

    if (points && amountNum > points.available_points) {
      setError('পর্যাপ্ত পয়েন্ট নেই')
      return
    }

    // Show confirmation before submitting
    setShowWithdrawConfirm({ amount: amountNum, bkash: bkashNumber })
  }

  const handleQuickAmount = (value: number) => {
    if (points) {
      setAmount(Math.min(value, points.available_points).toString())
    }
  }

  const confirmWithdraw = () => {
    if (showWithdrawConfirm) {
      withdrawMutation.mutate()
    }
  }

  // Show confirmation dialog
  if (showWithdrawConfirm) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-amber-100 p-2 rounded-xl">
              <AlertTriangle size={24} className="text-amber-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">নিশ্চিত করুন</h2>
          </div>

          <p className="text-gray-600 mb-4">
            আপনি কি নিশ্চিত যে আপনি এই পয়েন্ট উত্তোলন করতে চান?
          </p>

          <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">উত্তোলনযোগ্য পয়েন্ট</span>
              <span className="font-bold text-green-600">{showWithdrawConfirm.amount} পয়েন্ট</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">bKash নম্বর</span>
              <span className="font-semibold text-gray-700">{showWithdrawConfirm.bkash}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">প্রাপ্য টাকা</span>
              <span className="font-bold text-green-600">{showWithdrawConfirm.amount} টাকা</span>
            </div>
            <div className="border-t pt-2 mt-2">
              <p className="text-xs text-gray-500">
                বর্তমান ব্যালেন্স: {points?.available_points || 0} পয়েন্ট → উত্তোলনের পরে: {points!.available_points - showWithdrawConfirm.amount} পয়েন্ট
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowWithdrawConfirm(null)}
              disabled={withdrawMutation.isPending}
              className="flex-1 py-3 border border-gray-300 rounded-xl font-medium hover:bg-gray-50 transition-colors"
            >
              বাতিল
            </button>
            <button
              onClick={confirmWithdraw}
              disabled={withdrawMutation.isPending}
              className="flex-1 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {withdrawMutation.isPending ? 'প্রসেসিং...' : 'হ্যাঁ, উত্তোলন করুন'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-green-100 p-2 rounded-xl">
            <Wallet size={24} className="text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">পয়েন্ট উত্তোলন</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">পয়েন্ট</label>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder={`ন্যূনতম ${MIN_WITHDRAWAL}`}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
            {points && (
              <div className="flex gap-2 mt-2">
                <button type="button" onClick={() => handleQuickAmount(200)} className="text-xs px-3 py-1 bg-gray-100 rounded-full hover:bg-gray-200">200</button>
                <button type="button" onClick={() => handleQuickAmount(500)} className="text-xs px-3 py-1 bg-gray-100 rounded-full hover:bg-gray-200">500</button>
                <button type="button" onClick={() => handleQuickAmount(points.available_points)} className="text-xs px-3 py-1 bg-gray-100 rounded-full hover:bg-gray-200">সব</button>
              </div>
            )}
          </div>

          {/* bKash Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">bKash নম্বর</label>
            <input
              type="tel"
              value={bkashNumber}
              onChange={e => setBkashNumber(e.target.value)}
              placeholder="01XXXXXXXXX"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>

          {/* Info */}
          <div className="bg-green-50 rounded-lg p-3 text-sm text-green-700">
            <p>• 1 পয়েন্ট = 1 টাকা</p>
            <p>• ন্যূনতম উত্তোলন: {MIN_WITHDRAWAL} পয়েন্ট</p>
            <p>• অ্যাডমিন অনুমোদন প্রয়োজন</p>
            <p>• bKash এ 24-48 ঘণ্টার মধ্যে পাঠানো হবে</p>
            <p>• প্রতি মাসে সর্বোচ্চ 3টি উত্তোলন</p>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 text-red-600 rounded-lg p-3 text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={withdrawMutation.isPending}
              className="flex-1 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {withdrawMutation.isPending ? 'প্রসেসিং...' : 'পরবর্তী'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
