import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { rewardsApi, pointsApi } from '../lib/api'
import { Gift, Coins, Package, CheckCircle, Clock, XCircle, AlertTriangle } from 'lucide-react'
import { useState } from 'react'

export default function Rewards() {
  const qc = useQueryClient()
  const [showConfirm, setShowConfirm] = useState<number | null>(null)
  
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
  
  return (
    <div className="space-y-6">
      {/* Points Summary */}
      {points && (
        <div className="card bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
          <div className="flex items-center justify-between">
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
      
      {/* Confirmation Modal */}
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
    </div>
  )
}
