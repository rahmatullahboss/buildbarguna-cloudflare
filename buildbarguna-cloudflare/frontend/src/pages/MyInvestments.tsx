import { useQuery } from '@tanstack/react-query'
import { sharesApi } from '../lib/api'
import { formatTaka } from '../lib/auth'
import { PieChart } from 'lucide-react'
import Disclaimer from '../components/Disclaimer'

const statusLabel: Record<string, string> = { pending: 'অপেক্ষমাণ', approved: 'অনুমোদিত', rejected: 'বাতিল' }
const statusBadge: Record<string, string> = { pending: 'badge-pending', approved: 'badge-approved', rejected: 'badge-rejected' }

export default function MyInvestments() {
  const { data: shares, isLoading: sharesLoading } = useQuery({ queryKey: ['my-shares'], queryFn: () => sharesApi.my() })
  const { data: requests, isLoading: reqLoading } = useQuery({ queryKey: ['share-requests'], queryFn: () => sharesApi.requests() })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">আমার বিনিয়োগ</h1>
        <p className="text-gray-500 text-sm mt-1">আপনার শেয়ার পোর্টফোলিও</p>
      </div>

      <Disclaimer variant="halal" compact />
      <Disclaimer variant="investment-risk" compact />

      {/* Portfolio */}
      <div className="card">
        <h2 className="font-bold text-lg mb-4 flex items-center gap-2"><PieChart size={20} /> শেয়ার পোর্টফোলিও</h2>
        {sharesLoading ? <p className="text-gray-400 text-sm">লোড হচ্ছে...</p> :
          shares?.success && shares.data.items.length > 0 ? (
            <div className="space-y-3">
              {shares.data.items.map(s => (
                <div key={s.project_id} className="flex items-center justify-between border-b last:border-0 pb-3 last:pb-0">
                  <div>
                    <p className="font-semibold text-gray-900">{s.title}</p>
                    <p className="text-sm text-gray-500">{s.quantity}টি শেয়ার × {formatTaka(s.share_price)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary-600">{formatTaka(s.quantity * s.share_price)}</p>
                    <span className={`badge-${s.status === 'active' ? 'active' : 'closed'} text-xs`}>{s.status === 'active' ? 'সক্রিয়' : 'বন্ধ'}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-gray-400 text-sm text-center py-6">কোনো শেয়ার নেই। প্রজেক্টে বিনিয়োগ করুন।</p>
        }
      </div>

      {/* Purchase requests */}
      <div className="card">
        <h2 className="font-bold text-lg mb-4">কেনার অনুরোধ</h2>
        {reqLoading ? <p className="text-gray-400 text-sm">লোড হচ্ছে...</p> :
          requests?.success && requests.data.items.length > 0 ? (
            <div className="space-y-3">
              {requests.data.items.map(r => (
                <div key={r.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-semibold">{r.project_title}</p>
                    <span className={statusBadge[r.status]}>{statusLabel[r.status]}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm text-gray-500">
                    <div><span className="block text-xs">শেয়ার</span><strong className="text-gray-900">{r.quantity}টি</strong></div>
                    <div><span className="block text-xs">মোট</span><strong className="text-gray-900">{formatTaka(r.total_amount)}</strong></div>
                    <div><span className="block text-xs">TxID</span><strong className="text-gray-900 font-mono text-xs">{r.bkash_txid}</strong></div>
                  </div>
                  {r.admin_note && <p className="text-xs text-red-500 mt-2">নোট: {r.admin_note}</p>}
                </div>
              ))}
            </div>
          ) : <p className="text-gray-400 text-sm text-center py-6">কোনো অনুরোধ নেই</p>
        }
      </div>
    </div>
  )
}
