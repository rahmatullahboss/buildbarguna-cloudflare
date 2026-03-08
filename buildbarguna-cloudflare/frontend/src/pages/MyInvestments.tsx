import { useQuery } from '@tanstack/react-query'
import { sharesApi } from '../lib/api'
import { formatTaka, formatDate } from '../lib/auth'
import { PieChart, Download } from 'lucide-react'
import { useState } from 'react'
import Disclaimer from '../components/Disclaimer'

const statusLabel: Record<string, string> = { pending: 'অপেক্ষমাণ', approved: 'অনুমোদিত', rejected: 'বাতিল' }
const statusBadge: Record<string, string> = { pending: 'badge-pending', approved: 'badge-approved', rejected: 'badge-rejected' }

export default function MyInvestments() {
  const { data: shares, isLoading: sharesLoading } = useQuery({ queryKey: ['my-shares'], queryFn: () => sharesApi.my() })
  const { data: requests, isLoading: reqLoading } = useQuery({ queryKey: ['share-requests'], queryFn: () => sharesApi.requests() })
  const [downloading, setDownloading] = useState<number | null>(null)

  async function handleDownload(purchaseId: number) {
    setDownloading(purchaseId)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/shares/certificate/${purchaseId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!response.ok) throw new Error('Download failed')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `BBI_Share_Certificate_${purchaseId}.pdf`
      link.click()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Download error:', err)
    } finally {
      setDownloading(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Hero banner */}
      <div className="bg-gradient-to-r from-indigo-700 via-purple-600 to-violet-600 rounded-3xl p-5 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-36 h-36 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10">
          <h1 className="text-2xl font-bold">💼 আমার বিনিয়োগ</h1>
          <p className="text-indigo-100 text-sm mt-1">আপনার শেয়ার পোর্টফোলিও ও অনুরোধ</p>
        </div>
      </div>

      <Disclaimer variant="halal" compact />
      <Disclaimer variant="investment-risk" compact />

      {/* Portfolio */}
      <div className="card">
        <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
          <div className="bg-indigo-100 p-1.5 rounded-xl"><PieChart size={18} className="text-indigo-600" /></div>
          শেয়ার পোর্টফোলিও
        </h2>
        {sharesLoading ? (
          <div className="flex items-center gap-2 py-4 text-gray-400 text-sm">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-primary-500 rounded-full animate-spin" /> লোড হচ্ছে...
          </div>
        ) : shares?.success && shares.data.items.length > 0 ? (
          <div className="space-y-3">
            {shares.data.items.map(s => (
              <div key={s.project_id} className="flex items-center justify-between bg-gray-50 rounded-2xl p-3.5">
                <div>
                  <p className="font-semibold text-gray-900">{s.title}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{s.quantity}টি শেয়ার × {formatTaka(s.share_price)}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary-700">{formatTaka(s.quantity * s.share_price)}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold mt-1 inline-block ${s.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-500'}`}>
                    {s.status === 'active' ? '● সক্রিয়' : 'বন্ধ'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <PieChart size={28} className="text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium">কোনো শেয়ার নেই</p>
            <p className="text-gray-400 text-xs mt-1">প্রজেক্টে বিনিয়োগ করুন</p>
          </div>
        )}
      </div>

      {/* Purchase requests */}
      <div className="card">
        <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
          <div className="bg-amber-100 p-1.5 rounded-xl"><span className="text-base">📋</span></div>
          কেনার অনুরোধ
        </h2>
        {reqLoading ? (
          <div className="flex items-center gap-2 py-4 text-gray-400 text-sm">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-primary-500 rounded-full animate-spin" /> লোড হচ্ছে...
          </div>
        ) : requests?.success && requests.data.items.length > 0 ? (
          <div className="space-y-3">
            {requests.data.items.map(r => (
              <div key={r.id} className="border border-gray-100 rounded-2xl p-4 hover:shadow-sm transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <p className="font-semibold text-gray-900">{r.project_title}</p>
                  <span className={statusBadge[r.status]}>{statusLabel[r.status]}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-gray-50 rounded-xl p-2.5 text-center">
                    <span className="block text-xs text-gray-400 mb-0.5">শেয়ার</span>
                    <strong className="text-gray-900 text-sm">{r.quantity}টি</strong>
                  </div>
                  <div className="bg-primary-50 rounded-xl p-2.5 text-center">
                    <span className="block text-xs text-gray-400 mb-0.5">মোট</span>
                    <strong className="text-primary-700 text-sm">{formatTaka(r.total_amount)}</strong>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-2.5 text-center">
                    <span className="block text-xs text-gray-400 mb-0.5">TxID</span>
                    <strong className="text-gray-900 font-mono text-xs">{r.bkash_txid}</strong>
                  </div>
                </div>
                {r.admin_note && (
                  <p className="text-xs text-red-600 mt-2 bg-red-50 rounded-xl px-3 py-2">⚠️ নোট: {r.admin_note}</p>
                )}
                
                {/* Download certificate button for approved purchases */}
                {r.status === 'approved' && (
                  <button
                    onClick={() => handleDownload(r.id)}
                    disabled={downloading === r.id}
                    className="mt-3 flex items-center gap-1 text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg text-sm font-medium"
                  >
                    <Download size={14} />
                    {downloading === r.id ? 'ডাউনলোড হচ্ছে...' : 'সার্টিফিকেট ডাউনলোড'}
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10">
            <p className="text-gray-400 text-sm">কোনো অনুরোধ নেই</p>
          </div>
        )}
      </div>
    </div>
  )
}
