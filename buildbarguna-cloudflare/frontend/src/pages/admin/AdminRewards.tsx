import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../../lib/api'
import { Gift, Plus, ToggleLeft, ToggleRight, Package, CheckCircle, Clock, XCircle } from 'lucide-react'

export default function AdminRewards() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [activeTab, setActiveTab] = useState<'rewards' | 'redemptions'>('rewards')
  const [form, setForm] = useState({ 
    name: '', 
    description: '', 
    points_required: 100,
    quantity: null as number | null,
    image_url: ''
  })
  const [msg, setMsg] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('pending')

  const { data: rewardsData, isLoading } = useQuery({ 
    queryKey: ['admin-rewards'], 
    queryFn: () => adminApi.rewards() 
  })
  
  const { data: redemptionsData } = useQuery({ 
    queryKey: ['admin-redemptions', selectedStatus], 
    queryFn: () => adminApi.redemptions(selectedStatus) 
  })

  const createMutation = useMutation({
    mutationFn: () => adminApi.createReward(form),
    onSuccess: (res) => {
      if (res.success) {
        setMsg('রিওয়ার্ড তৈরি হয়েছে')
        setForm({ name: '', description: '', points_required: 100, quantity: null, image_url: '' })
        setShowForm(false)
        qc.invalidateQueries({ queryKey: ['admin-rewards'] })
      }
    }
  })
  
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, admin_note }: { id: number; status: string; admin_note?: string }) => 
      adminApi.updateRedemptionStatus(id, status, admin_note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-redemptions', selectedStatus] })
      qc.invalidateQueries({ queryKey: ['my-redemptions'] })
    }
  })

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

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-700 via-pink-600 to-rose-600 rounded-3xl p-5 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/15 p-2.5 rounded-2xl text-2xl">🎁</div>
            <div>
              <h1 className="text-2xl font-bold">রিওয়ার্ড ব্যবস্থাপনা</h1>
              <p className="text-purple-100 text-sm mt-0.5">রিওয়ার্ড ক্যাটালগ এবং রিডিম অনুমোদন</p>
            </div>
          </div>
          <button 
            onClick={() => setShowForm(!showForm)} 
            className="bg-white text-purple-700 font-bold text-sm px-4 py-2 rounded-xl hover:bg-purple-50 transition-colors shadow-sm flex items-center gap-1.5"
          >
            <Plus size={15} /> নতুন রিওয়ার্ড
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('rewards')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'rewards'
              ? 'border-b-2 border-purple-600 text-purple-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          রিওয়ার্ড ক্যাটালগ
        </button>
        <button
          onClick={() => setActiveTab('redemptions')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'redemptions'
              ? 'border-b-2 border-purple-600 text-purple-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          রিডিম অনুমোদন
        </button>
      </div>

      {msg && <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm">{msg}</div>}

      {showForm && activeTab === 'rewards' && (
        <div className="card border-purple-200 bg-purple-50">
          <h2 className="font-bold text-lg mb-4">নতুন রিওয়ার্ড যোগ করুন</h2>
          <div className="space-y-4">
            <div>
              <label className="label">রিওয়ার্ডের নাম</label>
              <input 
                className="input" 
                placeholder="যেমন: ৳50 Cash Withdrawal"
                value={form.name} 
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))} 
              />
            </div>
            <div>
              <label className="label">বিবরণ</label>
              <textarea 
                className="input" 
                rows={2}
                placeholder="রিওয়ার্ড সম্পর্কে বিস্তারিত"
                value={form.description} 
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))} 
              />
            </div>
            <div>
              <label className="label">পয়েন্ট প্রয়োজন</label>
              <input 
                className="input" 
                type="number" 
                min="1"
                value={form.points_required} 
                onChange={e => setForm(p => ({ ...p, points_required: parseInt(e.target.value) || 1 }))} 
              />
            </div>
            <div>
              <label className="label">পরিমাণ (খালি রাখলে অসীম)</label>
              <input 
                className="input" 
                type="number" 
                min="1"
                placeholder="খালি রাখুন অসীমের জন্য"
                value={form.quantity || ''} 
                onChange={e => setForm(p => ({ ...p, quantity: e.target.value ? parseInt(e.target.value) : null }))} 
              />
            </div>
            <div>
              <label className="label">ছবির লিংক (ঐচ্ছিক)</label>
              <input 
                className="input" 
                type="url" 
                placeholder="https://..."
                value={form.image_url} 
                onChange={e => setForm(p => ({ ...p, image_url: e.target.value }))} 
              />
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => createMutation.mutate()} 
                disabled={createMutation.isPending || !form.name || !form.points_required}
                className="btn-primary"
              >
                {createMutation.isPending ? 'তৈরি হচ্ছে...' : 'তৈরি করুন'}
              </button>
              <button onClick={() => setShowForm(false)} className="btn-secondary">বাতিল</button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'rewards' && (
        isLoading ? <p className="text-gray-400 text-sm">লোড হচ্ছে...</p> : (
          <div className="space-y-3">
            {rewards.map((reward: any) => (
              <div key={reward.id} className={`card flex items-center justify-between ${!reward.is_active ? 'opacity-50' : ''}`}>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{reward.name}</p>
                  {reward.description && (
                    <p className="text-xs text-gray-500 mt-0.5">{reward.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
                      <Package size={10} /> {reward.points_required} পয়েন্ট
                    </span>
                    <span className="text-xs text-gray-400">
                      রিডিম: {reward.redeemed_count}/{reward.quantity || '∞'}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => adminApi.toggleReward(reward.id).then(() => qc.invalidateQueries({ queryKey: ['admin-rewards'] }))}
                  className="shrink-0 text-gray-400 hover:text-purple-600 transition-colors"
                >
                  {reward.is_active ? <ToggleRight size={32} className="text-green-500" /> : <ToggleLeft size={32} />}
                </button>
              </div>
            ))}
          </div>
        )
      )}

      {activeTab === 'redemptions' && (
        <div className="space-y-4">
          {/* Status filter */}
          <div className="flex gap-2 overflow-x-auto">
            {['pending', 'approved', 'fulfilled', 'rejected'].map(status => (
              <button
                key={status}
                onClick={() => setSelectedStatus(status)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
                  selectedStatus === status
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {status === 'pending' && '⏳ '}
                {status === 'approved' && '✓ '}
                {status === 'fulfilled' && '✅ '}
                {status === 'rejected' && '✗ '}
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>

          {redemptions.length === 0 ? (
            <div className="card text-center py-10">
              <Package size={36} className="mx-auto mb-2 text-gray-200" />
              <p className="text-gray-400 text-sm">কোনো রিডিম নেই</p>
            </div>
          ) : (
            <div className="space-y-3">
              {redemptions.map((redemption: any) => (
                <div key={redemption.id} className="card">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900">{redemption.reward_name}</p>
                        <div className="flex items-center gap-1 text-xs">
                          {getStatusIcon(redemption.status)}
                          <span className={
                            redemption.status === 'pending' ? 'text-orange-600' :
                            redemption.status === 'approved' ? 'text-blue-600' :
                            redemption.status === 'fulfilled' ? 'text-green-600' :
                            'text-red-600'
                          }>
                            {redemption.status}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {redemption.user_name} ({redemption.user_phone})
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(redemption.redeemed_at).toLocaleDateString('bn-BD', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                      <p className="text-xs text-amber-600 font-medium mt-1">
                        -{redemption.points_spent} পয়েন্ট
                      </p>
                      {redemption.admin_note && (
                        <p className="text-xs text-gray-500 mt-2 bg-gray-50 p-2 rounded">
                          নোট: {redemption.admin_note}
                        </p>
                      )}
                    </div>
                    
                    {redemption.status === 'pending' && (
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => updateStatusMutation.mutate({ id: redemption.id, status: 'approved' })}
                          className="text-xs bg-green-500 text-white px-3 py-1.5 rounded-lg hover:bg-green-600 transition-colors"
                        >
                          অনুমোদন
                        </button>
                        <button
                          onClick={() => updateStatusMutation.mutate({ id: redemption.id, status: 'rejected', admin_note: 'Not eligible' })}
                          className="text-xs bg-red-500 text-white px-3 py-1.5 rounded-lg hover:bg-red-600 transition-colors"
                        >
                          প্রত্যাখ্যান
                        </button>
                      </div>
                    )}
                    
                    {redemption.status === 'approved' && (
                      <button
                        onClick={() => updateStatusMutation.mutate({ id: redemption.id, status: 'fulfilled' })}
                        className="text-xs bg-purple-500 text-white px-3 py-1.5 rounded-lg hover:bg-purple-600 transition-colors"
                      >
                        সম্পন্ন
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
