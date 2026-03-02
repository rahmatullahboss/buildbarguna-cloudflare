import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../../lib/api'
import { formatTaka, currentMonth } from '../../lib/auth'
import { TrendingUp, AlertTriangle, CheckCircle, Calculator, DollarSign } from 'lucide-react'

export default function AdminEarnings() {
  const qc = useQueryClient()
  const [rateForm, setRateForm] = useState({ project_id: 0, month: currentMonth(), rate_percent: '' })
  const [distMonth, setDistMonth] = useState(currentMonth())
  const [msg, setMsg] = useState('')
  const [errMsg, setErrMsg] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)

  const { data: projects } = useQuery({ queryKey: ['admin-projects'], queryFn: () => adminApi.projects() })
  const { data: rates } = useQuery({ queryKey: ['profit-rates'], queryFn: () => adminApi.profitRates() })

  const setRateMutation = useMutation({
    mutationFn: () => adminApi.setProfitRate({
      project_id: rateForm.project_id,
      month: rateForm.month,
      rate_percent: parseFloat(rateForm.rate_percent)
    }),
    onSuccess: (res) => {
      if (res.success) {
        setMsg('✅ মুনাফার হার সফলভাবে নির্ধারণ করা হয়েছে')
        setErrMsg('')
        setRateForm(p => ({ ...p, rate_percent: '' }))
        qc.invalidateQueries({ queryKey: ['profit-rates'] })
      } else setErrMsg((res as any).error)
    }
  })

  const distributeMutation = useMutation({
    mutationFn: () => adminApi.distributeEarnings(distMonth),
    onSuccess: (res) => {
      if (res.success) {
        setMsg(`✅ ${distMonth} মাসের মুনাফা সফলভাবে বিতরণ সম্পন্ন হয়েছে!`)
        setErrMsg('')
        setShowConfirm(false)
        qc.invalidateQueries({ queryKey: ['profit-rates'] })
      } else {
        setErrMsg((res as any).error)
        setShowConfirm(false)
      }
    }
  })

  const projectList = projects?.success ? projects.data.items : []
  const rateList = rates?.success ? rates.data : []

  // Preview calculation for selected project + rate
  const selectedProject = projectList.find(p => p.id === rateForm.project_id)
  const ratePercent = parseFloat(rateForm.rate_percent) || 0
  const rateBps = Math.round(ratePercent * 100)
  const previewEarning = selectedProject && rateBps > 0
    ? Math.floor((selectedProject.total_capital * rateBps) / 10000)
    : null

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-green-700 via-emerald-600 to-teal-600 rounded-3xl p-5 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 flex items-center gap-3">
          <div className="bg-white/15 p-2.5 rounded-2xl text-2xl">💰</div>
          <div>
            <h1 className="text-2xl font-bold">মুনাফা বিতরণ</h1>
            <p className="text-green-100 text-sm mt-0.5">প্রজেক্টের মুনাফার হার নির্ধারণ ও বিতরণ করুন</p>
          </div>
        </div>
      </div>

      {msg && (
        <div className="flex items-start gap-2 bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm">
          <CheckCircle size={16} className="mt-0.5 shrink-0" /> {msg}
          <button onClick={() => setMsg('')} className="ml-auto text-green-400 hover:text-green-600">✕</button>
        </div>
      )}
      {errMsg && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" /> {errMsg}
          <button onClick={() => setErrMsg('')} className="ml-auto text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* Step 1: Set profit rate */}
      <div className="card">
        <h2 className="font-bold text-lg mb-1 flex items-center gap-2">
          <span className="bg-primary-100 text-primary-700 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">১</span>
          মুনাফার হার নির্ধারণ করুন
        </h2>
        <p className="text-sm text-gray-500 mb-4">প্রতিটি প্রজেক্টের জন্য মাসিক মুনাফার হার (%) সেট করুন</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="label">প্রজেক্ট</label>
            <select className="input" value={rateForm.project_id}
              onChange={e => setRateForm(p => ({ ...p, project_id: Number(e.target.value) }))}>
              <option value={0}>প্রজেক্ট বেছে নিন</option>
              {projectList.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </div>
          <div>
            <label className="label">মাস</label>
            <input className="input" type="month" value={rateForm.month}
              onChange={e => setRateForm(p => ({ ...p, month: e.target.value }))} />
          </div>
          <div>
            <label className="label">মুনাফার হার (%)</label>
            <div className="relative">
              <input className="input pr-8" type="number" step="0.01" min="0" max="100" placeholder="যেমন: 5.00"
                value={rateForm.rate_percent}
                onChange={e => setRateForm(p => ({ ...p, rate_percent: e.target.value }))} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
            </div>
          </div>
        </div>

        {/* Live preview */}
        {previewEarning !== null && selectedProject && (
          <div className="mt-4 bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-center gap-3">
            <Calculator size={16} className="text-blue-500 shrink-0" />
            <div className="text-sm text-blue-700">
              <span className="font-semibold">পূর্বরূপ হিসাব: </span>
              মোট মূলধন {formatTaka(selectedProject.total_capital)} × {ratePercent.toFixed(2)}% ({rateBps} bps)
              = <span className="font-bold text-blue-900">{formatTaka(previewEarning)}</span> এই মাসে বিতরণ হবে
            </div>
          </div>
        )}

        <button onClick={() => { setMsg(''); setErrMsg(''); setRateMutation.mutate() }}
          disabled={setRateMutation.isPending || !rateForm.project_id || !rateForm.rate_percent || ratePercent <= 0}
          className="btn-primary mt-4">
          {setRateMutation.isPending ? 'সেট হচ্ছে...' : '✓ হার নির্ধারণ করুন'}
        </button>
      </div>

      {/* Step 2: Distribute */}
      <div className="card border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
        <h2 className="font-bold text-lg mb-1 flex items-center gap-2 text-green-800">
          <span className="bg-green-200 text-green-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">২</span>
          মুনাফা বিতরণ করুন
        </h2>
        <p className="text-sm text-green-700 mb-4">
          নির্বাচিত মাসের নির্ধারিত হার অনুযায়ী সকল শেয়ারহোল্ডারের অ্যাকাউন্টে মুনাফা যোগ হবে।
          একই মাসে দ্বিতীয়বার চালালে কোনো পরিবর্তন হবে না (idempotent)।
        </p>

        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="label">মাস নির্বাচন করুন</label>
            <input className="input" type="month" value={distMonth} onChange={e => setDistMonth(e.target.value)} />
          </div>
          {!showConfirm ? (
            <button onClick={() => setShowConfirm(true)} className="btn-primary flex items-center gap-2">
              <DollarSign size={16} /> মুনাফা বিতরণ করুন
            </button>
          ) : (
            <div className="flex items-center gap-2 bg-white border border-amber-200 rounded-lg px-3 py-2">
              <AlertTriangle size={16} className="text-amber-500" />
              <span className="text-sm text-amber-700 font-medium">{distMonth} মাসে বিতরণ নিশ্চিত করুন?</span>
              <button onClick={() => { setMsg(''); setErrMsg(''); distributeMutation.mutate() }}
                disabled={distributeMutation.isPending}
                className="btn-primary text-sm py-1 px-3">
                {distributeMutation.isPending ? 'বিতরণ হচ্ছে...' : 'হ্যাঁ, বিতরণ করুন'}
              </button>
              <button onClick={() => setShowConfirm(false)} className="text-sm text-gray-500 hover:text-gray-700 px-2">বাতিল</button>
            </div>
          )}
        </div>
      </div>

      {/* Rate history table */}
      <div className="card">
        <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
          <TrendingUp size={18} /> নির্ধারিত মুনাফার হার
        </h2>
        {rateList.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">কোনো হার নির্ধারণ করা হয়নি</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-2 font-medium">প্রজেক্ট</th>
                  <th className="pb-2 font-medium">মাস</th>
                  <th className="pb-2 font-medium text-right">হার (bps)</th>
                  <th className="pb-2 font-medium text-right">হার (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rateList.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="py-2.5 font-semibold text-gray-900">{r.title}</td>
                    <td className="py-2.5 text-gray-500 font-mono">{r.month}</td>
                    <td className="py-2.5 text-right text-gray-400 font-mono">{r.rate}</td>
                    <td className="py-2.5 text-right font-bold text-green-600">{(r.rate / 100).toFixed(2)}%</td>
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
