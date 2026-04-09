import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { projectsApi, sharesApi, memberApi, type ProjectUpdate } from '../lib/api'
import { formatTaka } from '../lib/auth'
import Disclaimer from '../components/Disclaimer'
import { HelpCircle, X, AlertTriangle, CheckSquare, Plus, Minus, Wallet, Phone, CheckCircle, ArrowRight, FileText, PartyPopper, MapPin, Calendar, Clock, Newspaper, ShieldAlert } from 'lucide-react'

type PaymentMethod = 'bkash' | 'manual'

// Success purchase data
type PurchaseSuccess = {
  purchase_id: number
  total_amount_paisa: number
  payment_method: PaymentMethod
  quantity: number
  project_title: string
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [qty, setQty] = useState(1)
  const [txid, setTxid] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bkash')
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)
  const [txidHelp, setTxidHelp] = useState(false)
  const [acknowledged, setAcknowledged] = useState(false)
  const [purchaseSuccess, setPurchaseSuccess] = useState<PurchaseSuccess | null>(null)

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

  // Check membership status
  const { data: memberStatus } = useQuery({
    queryKey: ['member-status'],
    queryFn: () => memberApi.status()
  })
  const isVerifiedMember = memberStatus?.success && memberStatus.data?.registered && memberStatus.data?.payment_status === 'verified'

  const { data: updatesData } = useQuery({
    queryKey: ['project-updates', id],
    queryFn: () => projectsApi.getUpdates(Number(id)),
    enabled: !!id
  })
  const updates: ProjectUpdate[] = updatesData?.success ? (updatesData.data as ProjectUpdate[]) : []

  const buyMutation = useMutation({
    mutationFn: async () => {
      const res = await sharesApi.buy({
        project_id: Number(id),
        quantity: qty,
        payment_method: paymentMethod,
        bkash_txid: paymentMethod === 'bkash' ? txid : undefined
      })
      return res as { success: boolean; data?: { purchase_id: number; total_amount_paisa: number; payment_method: string }; error?: string }
    },
    onSuccess: (res) => {
      setShowConfirm(false)
      if (res.success && res.data) {
        // Set success data for success screen
        setPurchaseSuccess({
          purchase_id: res.data.purchase_id,
          total_amount_paisa: res.data.total_amount_paisa,
          payment_method: res.data.payment_method as PaymentMethod,
          quantity: qty,
          project_title: p.title
        })
        setTxid(''); setAcknowledged(false)
        qc.invalidateQueries({ queryKey: ['projects'] })
      } else {
        setError(res.error || 'কিছু সমস্যা হয়েছে')
      }
    }
  })

  // Quantity handlers
  const handleMinus = () => {
    if (qty > 1) {
      setQty(qty - 1)
      setError('')
    }
  }

  const handlePlus = () => {
    if (data?.success && qty < data.data.available_shares) {
      setQty(qty + 1)
      setError('')
    }
  }

  // Validation - check data.success first
  const canSubmit = data?.success
    ? (paymentMethod === 'manual' 
        ? (qty >= 1 && qty <= data.data.available_shares && acknowledged)
        : (qty >= 1 && qty <= data.data.available_shares && txid.length >= 8 && acknowledged))
    : false

  if (isLoading) return <div className="text-center py-12 text-gray-400">লোড হচ্ছে...</div>
  if (!data?.success) return <div className="card text-center py-12 text-red-500">প্রজেক্ট পাওয়া যায়নি</div>

  const p = data.data
  const total = qty * p.share_price
  const soldPct = Math.round(((p.total_shares - p.available_shares) / p.total_shares) * 100)

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <button onClick={() => navigate(-1)} aria-label="ফিরে যান" className="text-sm text-gray-500 hover:text-primary-600 flex items-center gap-1 transition-colors">← ফিরে যান</button>

      <div className="card overflow-hidden p-0">
        {/* Project image or gradient banner */}
        {p.image_url ? (
          <img
            src={p.image_url}
            alt={p.title}
            className="w-full h-52 object-cover"
            onError={(e) => {
              const target = e.currentTarget
              target.style.display = 'none'
              target.parentElement?.querySelector('.img-fallback')?.classList.remove('hidden')
            }}
          />
        ) : null}
        <div className={`w-full h-40 bg-gradient-to-br from-primary-600 via-teal-600 to-emerald-500 flex items-center justify-center relative overflow-hidden img-fallback ${p.image_url ? 'hidden' : ''}`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <img src="/bbi logo.jpg" alt="BBI Logo" className="w-24 h-24 object-contain" />
        </div>

        <div className="p-5">
          {/* Completed status banner */}
          {p.status === 'completed' && (
            <div className="mb-4 bg-teal-50 border border-teal-200 rounded-2xl p-3.5 flex items-center gap-3">
              <CheckCircle size={22} className="text-teal-600 shrink-0" />
              <div>
                <p className="font-semibold text-teal-800">প্রজেক্ট সম্পন্ন হয়েছে</p>
                {p.completed_at && (
                  <p className="text-xs text-teal-600 mt-0.5 flex items-center gap-1">
                    <Clock size={11} /> {new Date(p.completed_at).toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex items-start justify-between gap-2 mb-2">
            <h1 className="text-2xl font-bold text-gray-900">{p.title}</h1>
            {p.status !== 'completed' && (
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold shrink-0 ${p.available_shares === 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                {p.available_shares === 0 ? 'শেষ' : '● সক্রিয়'}
              </span>
            )}
          </div>

          {/* Category & location tags */}
          {(p.category || p.location) && (
            <div className="flex flex-wrap gap-2 mb-3">
              {p.category && (
                <span className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded-full font-medium">{p.category}</span>
              )}
              {p.location && (
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <MapPin size={11} /> {p.location}
                </span>
              )}
            </div>
          )}

          {/* Dates */}
          {(p.start_date || p.expected_end_date) && (
            <div className="flex flex-wrap gap-4 mb-3 text-xs text-gray-400">
              {p.start_date && (
                <span className="flex items-center gap-1"><Calendar size={11} /> শুরু: {p.start_date}</span>
              )}
              {p.expected_end_date && (
                <span className="flex items-center gap-1"><Calendar size={11} /> শেষ: {p.expected_end_date}</span>
              )}
            </div>
          )}

          {p.description && <p className="text-gray-500 mb-5 text-sm leading-relaxed">{p.description}</p>}

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-gray-50 rounded-2xl p-3.5">
              <p className="text-xs text-gray-400 mb-1">মোট মূলধন</p>
              <p className="font-bold text-base text-gray-900">{formatTaka(p.total_capital)}</p>
            </div>
            <div className="bg-primary-50 rounded-2xl p-3.5">
              <p className="text-xs text-gray-400 mb-1">প্রতি শেয়ার</p>
              <p className="font-bold text-base text-primary-700">{formatTaka(p.share_price)}</p>
            </div>
            <div className="bg-gray-50 rounded-2xl p-3.5">
              <p className="text-xs text-gray-400 mb-1">মোট শেয়ার</p>
              <p className="font-bold text-base text-gray-900">{p.total_shares}</p>
            </div>
            <div className={`rounded-2xl p-3.5 ${p.available_shares === 0 ? 'bg-red-50' : 'bg-emerald-50'}`}>
              <p className="text-xs text-gray-400 mb-1">বাকি শেয়ার</p>
              <p className={`font-bold text-base ${p.available_shares === 0 ? 'text-red-600' : 'text-emerald-600'}`}>{p.available_shares}</p>
            </div>
          </div>

          {/* Share sales progress bar */}
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-400 mb-1.5">
              <span>বিক্রিত শেয়ার</span>
              <span className="font-semibold">{soldPct}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5">
              <div className={`h-2.5 rounded-full transition-all ${soldPct > 80 ? 'bg-red-400' : 'bg-gradient-to-r from-primary-500 to-teal-500'}`}
                style={{ width: `${soldPct}%` }} />
            </div>
          </div>

          {/* Project progress bar (if set) */}
          {(p.progress_pct ?? 0) > 0 && (
            <div className="mb-1">
              <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                <span>প্রজেক্ট অগ্রগতি</span>
                <span className="font-semibold">{p.progress_pct}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${p.status === 'completed' ? 'bg-teal-500' : 'bg-emerald-500'}`}
                  style={{ width: `${p.progress_pct}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Buy form */}
        {p.status === 'completed' ? (
          <div className="border-t border-teal-100 p-5">
            <div className="flex items-center gap-3 bg-teal-50 rounded-2xl p-4">
              <CheckCircle size={28} className="text-teal-500 shrink-0" />
              <div>
                <p className="font-bold text-teal-800">এই প্রজেক্ট সম্পন্ন হয়েছে</p>
                <p className="text-teal-600 text-sm mt-0.5">আর শেয়ার কেনার সুযোগ নেই। বিনিয়োগকারীদের মুনাফা বিতরণ করা হয়েছে।</p>
              </div>
            </div>
          </div>
        ) : !isVerifiedMember ? (
          <div className="border-t border-gray-100 p-5">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center space-y-3">
              <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
                <ShieldAlert size={28} className="text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-amber-800 text-lg">মেম্বারশিপ প্রয়োজন</h3>
                <p className="text-amber-700 text-sm mt-1">শেয়ার কিনতে হলে আপনাকে প্রথমে মেম্বারশিপ নিতে হবে।</p>
              </div>
              <button
                onClick={() => navigate('/membership')}
                className="btn-primary w-full py-3 text-base flex items-center justify-center gap-2"
              >
                মেম্বারশিপ নিন <ArrowRight size={16} />
              </button>
            </div>
          </div>
        ) : p.available_shares > 0 ? (
          <div className="border-t border-gray-100 p-5">
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2">🛒 শেয়ার কিনুন</h2>

            {msg && <div className="bg-green-50 border border-green-200 text-green-700 rounded-2xl p-3 mb-4 text-sm flex items-start gap-2"><span>✅</span><span>{msg}</span></div>}
            {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-3 mb-4 text-sm flex items-start gap-2"><span>⚠️</span><span>{error}</span></div>}

            <div className="space-y-5">
              {/* Quantity Selector with Plus/Minus */}
              <div>
                <label className="label mb-3">কত শেয়ার কিনতে চান?</label>
                <div className="flex items-center gap-4">
                  {/* Minus Button */}
                  <button
                    type="button"
                    onClick={handleMinus}
                    disabled={qty <= 1}
                    className="w-14 h-14 rounded-2xl bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all active:scale-95"
                    aria-label="শেয়ার সংখ্যা কমান"
                  >
                    <Minus size={24} className="text-gray-700" />
                  </button>

                  {/* Quantity Display */}
                  <div className="flex-1 bg-gradient-to-r from-primary-50 to-teal-50 rounded-2xl py-4 px-6 text-center border border-primary-100">
                    <span className="text-3xl font-bold text-primary-700">{qty}</span>
                    <span className="text-sm text-gray-500 ml-2">টি</span>
                  </div>

                  {/* Plus Button */}
                  <button
                    type="button"
                    onClick={handlePlus}
                    disabled={qty >= p.available_shares}
                    className="w-14 h-14 rounded-2xl bg-primary-600 hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all active:scale-95"
                    aria-label="শেয়ার সংখ্যা বাড়ান"
                  >
                    <Plus size={24} className="text-white" />
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-2 text-center">সর্বোচ্চ {p.available_shares}টি শেয়ার কেনা যাবে</p>
              </div>

              {/* Quick quantity buttons */}
              <div className="flex gap-2 justify-center flex-wrap">
                {[1, 5, 10, 25, 50].filter(n => n <= p.available_shares).map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => { setQty(n); setError('') }}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      qty === n 
                        ? 'bg-primary-600 text-white shadow-md' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {n}টি
                  </button>
                ))}
                {p.available_shares > 50 && (
                  <button
                    type="button"
                    onClick={() => { setQty(p.available_shares); setError('') }}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      qty === p.available_shares 
                        ? 'bg-primary-600 text-white shadow-md' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}>
                    সব
                  </button>
                )}
              </div>

              {/* Total amount card */}
              <div className="bg-gradient-to-r from-primary-600 to-teal-600 rounded-2xl p-4 text-white">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-primary-100 text-xs mb-0.5">মোট পরিমাণ</p>
                    <p className="text-2xl font-bold">{formatTaka(total)}</p>
                  </div>
                  <p className="text-primary-200 text-sm">{qty} × {formatTaka(p.share_price)}</p>
                </div>
              </div>

              {/* Payment Method Selection */}
              <div>
                <label className="label mb-3" id="payment-method-label">💳 পেমেন্ট মেথড</label>
                <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-labelledby="payment-method-label">
                  {/* bKash Option */}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={paymentMethod === 'bkash'}
                    onClick={() => { setPaymentMethod('bkash'); setError('') }}
                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none ${
                      paymentMethod === 'bkash'
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                      <span className="text-2xl">📱</span>
                    </div>
                    <span className={`font-semibold ${paymentMethod === 'bkash' ? 'text-primary-700' : 'text-gray-700'}`}>
                      bKash
                    </span>
                    <span className="text-xs text-gray-500">অনলাইন পেমেন্ট</span>
                  </button>

                  {/* Manual/Cash Option */}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={paymentMethod === 'manual'}
                    onClick={() => { setPaymentMethod('manual'); setTxid(''); setError('') }}
                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none ${
                      paymentMethod === 'manual'
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                      <Wallet size={24} className="text-amber-600" />
                    </div>
                    <span className={`font-semibold ${paymentMethod === 'manual' ? 'text-primary-700' : 'text-gray-700'}`}>
                      ম্যানুয়াল
                    </span>
                    <span className="text-xs text-gray-500">ক্যাশ পেমেন্ট</span>
                  </button>
                </div>
              </div>

              {/* bKash Payment Info Box - Always show when bKash selected */}
              {paymentMethod === 'bkash' && (
                <div className="card bg-blue-50 border-blue-200 animate-fadeIn">
                  <div className="flex items-start gap-3">
                    <Wallet size={24} className="text-blue-600 mt-1 shrink-0" />
                    <div className="flex-1">
                      <h3 className="font-bold text-blue-900 mb-2">💳 পেমেন্ট তথ্য</h3>
                      <div className="space-y-2 text-blue-800 text-sm">
                        <p>
                          <strong>bKash নাম্বার:</strong>{' '}
                          <span className="font-mono bg-blue-100 px-2 py-1 rounded-lg font-bold text-blue-900">
                            01635222142
                          </span>
                        </p>
                        <p>
                          <strong>পেমেন্ট পদ্ধতি:</strong> Send Money
                        </p>
                        <p>
                          <strong>টাকা:</strong>{' '}
                          <span className="font-semibold">{formatTaka(total)}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Conditional: bKash TxID Field */}
              {paymentMethod === 'bkash' && (
                <div className="animate-fadeIn">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="label mb-0" htmlFor="bkash-txid">📱 bKash Transaction ID</label>
                    <button
                      type="button"
                      aria-label="bKash TxID সম্পর্কে সাহায্য"
                      onClick={() => setTxidHelp(!txidHelp)}
                      className="text-gray-400 hover:text-primary-600 transition-colors p-1"
                    >
                      <HelpCircle size={16} />
                    </button>
                  </div>
                  {txidHelp && (
                    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3.5 mb-2 text-xs text-blue-800 space-y-1.5">
                      <p className="font-bold">📱 bKash TxID কোথায় পাবেন?</p>
                      <p>১. bKash অ্যাপ খুলুন → "Send Money" করুন</p>
                      <p>২. পাঠানোর পর SMS আসবে — সেখানে <strong>TrxID</strong> লেখা থাকবে</p>
                      <p>৩. যেমন: <span className="font-mono bg-blue-100 px-1.5 py-0.5 rounded-lg">8N4K2M9X1P</span></p>
                      <p className="text-blue-600 font-medium">📲 bKash নম্বর: <span className="font-mono font-bold text-blue-900">01635222142</span></p>
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mb-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                    <strong>{formatTaka(total)}</strong> bKash করুন তারপর TxID নিচে দিন
                  </p>
                  <input 
                    id="bkash-txid"
                    className="input font-mono" 
                    type="text" 
                    placeholder="TxID যেমন: 8N4K2M9X1P"
                    value={txid} 
                    onChange={e => { setTxid(e.target.value.toUpperCase()); setError('') }} 
                  />
                  {txid.length > 0 && txid.length < 8 && (
                    <p className="text-xs text-red-500 mt-1">TxID কমপক্ষে ৮ অক্ষরের হতে হবে</p>
                  )}
                </div>
              )}

              {/* Conditional: Manual Payment Info */}
              {paymentMethod === 'manual' && (
                <div className="animate-fadeIn bg-amber-50 border border-amber-200 rounded-2xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                      <Phone size={20} className="text-amber-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-amber-800 mb-1">ম্যানুয়াল পেমেন্ট</p>
                      <p className="text-sm text-amber-700">
                        আপনার অনুরোধ জমা হলে অ্যাডমিন আপনার দেওয়া ফোন নম্বরে যোগাযোগ করবে। 
                        টাকা সরাসরি ক্যাশে পেমেন্ট করলে শেয়ার অনুমোদন করা হবে।
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <Disclaimer variant="halal" compact />
              <Disclaimer variant="investment-risk" compact />

              {/* Acknowledgment checkbox */}
              <label className="flex items-start gap-3 cursor-pointer group bg-emerald-50 border border-emerald-200 rounded-2xl p-3">
                <input
                  type="checkbox"
                  checked={acknowledged}
                  onChange={e => setAcknowledged(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600 cursor-pointer shrink-0"
                />
                <span className="text-xs text-emerald-800 leading-relaxed">
                  আমি বুঝতে পেরেছি যে এই বিনিয়োগ হালাল মুশারাকা নীতিতে হচ্ছে। প্রজেক্টে লাভ বা লোকসান হলে আমি সেটা সমানুপাতিক হারে বহন করব।
                </span>
              </label>

              <button
                type="button"
                onClick={() => setShowConfirm(true)}
                disabled={!canSubmit}
                className="btn-primary w-full py-3.5 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="শেয়ার কেনার অনুরোধ জমা দিন"
              >
                🛒 অনুরোধ জমা দিন
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
                        <span className="text-gray-500">পেমেন্ট মেথড</span>
                        <span className={`font-medium ${paymentMethod === 'bkash' ? 'text-purple-700' : 'text-amber-700'}`}>
                          {paymentMethod === 'bkash' ? '📱 bKash' : '💵 ম্যানুয়াল'}
                        </span>
                      </div>
                      {paymentMethod === 'bkash' && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">bKash TxID</span>
                          <span className="font-mono text-xs">{txid}</span>
                        </div>
                      )}
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

      {/* Project Updates / News Feed */}
      {updates.length > 0 && (
        <div className="card">
          <h2 className="font-bold text-base flex items-center gap-2 mb-4">
            <Newspaper size={18} className="text-primary-600" />
            প্রজেক্ট আপডেট
          </h2>
          <div className="space-y-3">
            {updates.map((u: ProjectUpdate) => (
              <div key={u.id} className="border border-gray-100 rounded-2xl p-3.5">
                {u.image_url && (
                  <img src={u.image_url} alt={u.title} className="w-full h-36 object-cover rounded-xl mb-3" />
                )}
                <p className="font-semibold text-gray-900 text-sm">{u.title}</p>
                {u.content && <p className="text-gray-500 text-xs mt-1 leading-relaxed">{u.content}</p>}
                <p className="text-gray-300 text-xs mt-2 flex items-center gap-1">
                  <Clock size={10} />
                  {u.author_name} &bull; {new Date(u.created_at).toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Success Screen */}
      {purchaseSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-5 text-center">
            {/* Success Animation */}
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                <CheckCircle size={40} className="text-white" />
              </div>
              <div className="absolute -top-2 -right-2 animate-pulse">
                <PartyPopper size={24} className="text-amber-500" />
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">🎉 অভিনন্দন!</h2>
              <p className="text-gray-500">আপনার শেয়ার কেনার অনুরোধ সফলভাবে জমা হয়েছে</p>
            </div>

            {/* Order Details Card */}
            <div className="bg-gradient-to-r from-primary-50 to-teal-50 rounded-2xl p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 text-sm">প্রজেক্ট</span>
                <span className="font-semibold text-gray-900">{purchaseSuccess.project_title}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 text-sm">শেয়ার</span>
                <span className="font-semibold text-gray-900">{purchaseSuccess.quantity}টি</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 text-sm">মোট পরিমাণ</span>
                <span className="font-bold text-xl text-primary-600">{formatTaka(purchaseSuccess.total_amount_paisa)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 text-sm">পেমেন্ট</span>
                <span className={`font-medium px-3 py-1 rounded-full text-sm ${
                  purchaseSuccess.payment_method === 'bkash' 
                    ? 'bg-purple-100 text-purple-700' 
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {purchaseSuccess.payment_method === 'bkash' ? '📱 bKash' : '💵 ম্যানুয়াল'}
                </span>
              </div>
            </div>

            {/* Next Steps */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-left">
              <p className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                <FileText size={16} />
                পরবর্তী পদক্ষেপ
              </p>
              <ul className="text-sm text-blue-700 space-y-1.5">
                {purchaseSuccess.payment_method === 'bkash' ? (
                  <>
                    <li>✓ অপেক্ষা করুন, অ্যাডমিন আপনার bKash পেমেন্ট যাচাই করবে</li>
                    <li>✓ অনুমোদনের পর আপনার পোর্টফোলিওতে শেয়ার যোগ হবে</li>
                  </>
                ) : (
                  <>
                    <li>✓ অ্যাডমিন শীঘ্রই আপনার সাথে যোগাযোগ করবে</li>
                    <li>✓ টাকা পেমেন্ট করার পর শেয়ার অনুমোদন হবে</li>
                  </>
                )}
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setPurchaseSuccess(null)
                  setQty(1)
                  navigate('/projects')
                }}
                className="flex-1 btn-secondary py-3"
              >
                প্রজেক্ট দেখুন
              </button>
              <button
                onClick={() => {
                  setPurchaseSuccess(null)
                  setQty(1)
                  navigate('/my-investments')
                }}
                className="flex-1 btn-primary py-3 flex items-center justify-center gap-2"
              >
                আমার বিনিয়োগ
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
