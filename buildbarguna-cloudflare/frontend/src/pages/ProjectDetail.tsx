import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { projectsApi, sharesApi } from '../lib/api'
import { formatTaka } from '../lib/auth'
import Disclaimer from '../components/Disclaimer'
import { HelpCircle, X, AlertTriangle, CheckSquare } from 'lucide-react'

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [qty, setQty] = useState(1)
  const [txid, setTxid] = useState('')
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)
  const [txidHelp, setTxidHelp] = useState(false)
  const [acknowledged, setAcknowledged] = useState(false)

  // Auto-dismiss success message after 5s
  useEffect(() => {
    if (!msg) return
    const t = setTimeout(() => setMsg(''), 5000)
    return () => clearTimeout(t)
  }, [msg])

  // Auto-dismiss error after 4s
  useEffect(() => {
    if (!error) return
    const t = setTimeout(() => setError(''), 4000)
    return () => clearTimeout(t)
  }, [error])

  const { data, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsApi.get(Number(id))
  })

  const buyMutation = useMutation({
    mutationFn: () => sharesApi.buy({ project_id: Number(id), quantity: qty, bkash_txid: txid }),
    onSuccess: (res) => {
      setShowConfirm(false)
      if (res.success) {
        setMsg('শেয়ার কেনার অনুরোধ জমা হয়েছে! অ্যাডমিন অনুমোদন করলে পোর্টফোলিওতে যোগ হবে।')
        setTxid(''); setQty(1); setAcknowledged(false)
        qc.invalidateQueries({ queryKey: ['projects'] })
      } else {
        setError((res as { error: string }).error)
      }
    }
  })

  if (isLoading) return <div className="text-center py-12 text-gray-400">লোড হচ্ছে...</div>
  if (!data?.success) return <div className="card text-center py-12 text-red-500">প্রজেক্ট পাওয়া যায়নি</div>

  const p = data.data
  const total = qty * p.share_price
  const soldPct = Math.round(((p.total_shares - p.available_shares) / p.total_shares) * 100)

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <button onClick={() => navigate(-1)} className="text-sm text-gray-500 hover:text-gray-800">← ফিরে যান</button>

      <div className="card">
        {p.image_url && <img src={p.image_url} alt={p.title} className="w-full h-52 object-cover rounded-xl mb-5" />}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{p.title}</h1>
        {p.description && <p className="text-gray-600 mb-4">{p.description}</p>}

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">মোট মূলধন</p>
            <p className="font-bold text-lg">{formatTaka(p.total_capital)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">প্রতি শেয়ার মূল্য</p>
            <p className="font-bold text-lg text-primary-600">{formatTaka(p.share_price)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">মোট শেয়ার</p>
            <p className="font-bold text-lg">{p.total_shares}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">বাকি শেয়ার</p>
            <p className={`font-bold text-lg ${p.available_shares === 0 ? 'text-red-500' : 'text-green-600'}`}>{p.available_shares}</p>
          </div>
        </div>

        <div className="w-full bg-gray-100 rounded-full h-3 mb-1">
          <div className="bg-primary-500 h-3 rounded-full" style={{ width: `${soldPct}%` }} />
        </div>
        <p className="text-xs text-gray-400 text-right mb-5">{soldPct}% বিক্রিত</p>

        {/* Buy form */}
        {p.available_shares > 0 ? (
          <div className="border-t pt-5">
            <h2 className="font-bold text-lg mb-4">শেয়ার কিনুন</h2>

            {msg && <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 mb-4 text-sm">{msg}</div>}
            {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">{error}</div>}

            <div className="space-y-4">
              <div>
                <label className="label">কত শেয়ার কিনতে চান?</label>
                <input className="input" type="number" min={1} max={p.available_shares}
                  value={qty} onChange={e => { setQty(Number(e.target.value)); setError('') }} />
                <p className="text-xs text-gray-400 mt-1">সর্বোচ্চ {p.available_shares}টি</p>
              </div>

              <div className="bg-primary-50 rounded-lg p-4">
                <div className="flex justify-between font-semibold">
                  <span>মোট পরিমাণ</span>
                  <span className="text-primary-700 text-lg">{formatTaka(total)}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">{qty} × {formatTaka(p.share_price)}</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="label mb-0">bKash Transaction ID</label>
                  <button
                    type="button"
                    aria-label="bKash TxID সম্পর্কে সাহায্য"
                    onClick={() => setTxidHelp(!txidHelp)}
                    className="text-gray-400 hover:text-primary-600 transition-colors"
                  >
                    <HelpCircle size={16} />
                  </button>
                </div>
                {txidHelp && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2 text-xs text-blue-800 space-y-1">
                    <p className="font-semibold">📱 bKash TxID কোথায় পাবেন?</p>
                    <p>১. bKash অ্যাপ খুলুন → "Send Money" করুন</p>
                    <p>২. পাঠানোর পর SMS আসবে — সেখানে <strong>TrxID</strong> লেখা থাকবে</p>
                    <p>৩. যেমন: <span className="font-mono bg-blue-100 px-1 rounded">8N4K2M9X1P</span></p>
                    <p className="text-blue-600">bKash নম্বর: অ্যাডমিন জানাবেন</p>
                  </div>
                )}
                <p className="text-xs text-gray-500 mb-2">
                  <strong>{formatTaka(total)}</strong> bKash করুন এবং TxID নিচে দিন
                </p>
                <input className="input" type="text" placeholder="TxID যেমন: 8N4K2M..."
                  value={txid} onChange={e => { setTxid(e.target.value); setError('') }} />
              </div>

              <Disclaimer variant="halal" compact />
              <Disclaimer variant="investment-risk" compact />

              {/* Acknowledgment checkbox */}
              <label className="flex items-start gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={acknowledged}
                  onChange={e => setAcknowledged(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600 cursor-pointer"
                />
                <span className="text-xs text-gray-600 group-hover:text-gray-800 leading-relaxed">
                  আমি বুঝতে পেরেছি যে এই বিনিয়োগ হালাল মুশারাকা নীতিতে হচ্ছে। প্রজেক্টে লাভ বা লোকসান হলে আমি সেটা সমানুপাতিক হারে বহন করব।
                </span>
              </label>

              <button
                type="button"
                onClick={() => setShowConfirm(true)}
                disabled={!txid || qty < 1 || qty > p.available_shares || !acknowledged}
                className="btn-primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="শেয়ার কেনার অনুরোধ জমা দিন"
              >
                অনুরোধ জমা দিন
              </button>

              {/* Confirmation Modal */}
              {showConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                  <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <AlertTriangle size={18} className="text-amber-500" /> নিশ্চিত করুন
                      </h3>
                      <button
                        type="button"
                        aria-label="বাতিল করুন"
                        onClick={() => setShowConfirm(false)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X size={20} />
                      </button>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">প্রজেক্ট</span>
                        <span className="font-medium text-gray-900 text-right max-w-[60%]">{p.title}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">শেয়ার সংখ্যা</span>
                        <span className="font-medium">{qty}টি</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">মোট পরিমাণ</span>
                        <span className="font-bold text-primary-700 text-base">{formatTaka(total)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">bKash TxID</span>
                        <span className="font-mono text-xs">{txid}</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                      <CheckSquare size={14} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-emerald-700">আপনি হালাল মুশারাকা নীতিতে বিনিয়োগ করতে সম্মত হয়েছেন।</p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setShowConfirm(false)}
                        className="btn-secondary flex-1"
                      >
                        বাতিল
                      </button>
                      <button
                        type="button"
                        onClick={() => buyMutation.mutate()}
                        disabled={buyMutation.isPending}
                        className="btn-primary flex-1"
                        aria-label="চূড়ান্তভাবে অনুরোধ জমা দিন"
                      >
                        {buyMutation.isPending ? 'জমা হচ্ছে...' : '✅ নিশ্চিত করুন'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="border-t pt-5 text-center">
            <p className="text-gray-500 font-medium">সমস্ত শেয়ার বিক্রি হয়ে গেছে</p>
          </div>
        )}
      </div>
    </div>
  )
}
