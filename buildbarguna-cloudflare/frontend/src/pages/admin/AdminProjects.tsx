import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { adminApi, type CreateProjectBody } from '../../lib/api'
import { formatTaka } from '../../lib/auth'
import ImageUpload from '../../components/ImageUpload'
import { Wallet, TrendingUp } from 'lucide-react'

const statusLabel: Record<string, string> = { draft: 'খসড়া', active: 'সক্রিয়', closed: 'বন্ধ' }
const statusBadge: Record<string, string> = { draft: 'badge-pending', active: 'badge-active', closed: 'badge-closed' }

const emptyForm: CreateProjectBody = { title: '', description: '', total_capital: 0, total_shares: 0, share_price: 0, status: 'draft' }

export default function AdminProjects() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState<CreateProjectBody>(emptyForm)
  const [msg, setMsg] = useState('')

  const { data, isLoading } = useQuery({ queryKey: ['admin-projects'], queryFn: () => adminApi.projects() })
  const { data: r2Data } = useQuery({ queryKey: ['r2-url'], queryFn: () => adminApi.r2Url() })
  const r2Url = r2Data?.success ? (r2Data.data as { url: string }).url : ''

  const createMutation = useMutation({
    mutationFn: () => {
      // Validate amounts client-side before sending
      if (!form.title.trim()) throw new Error('প্রজেক্টের নাম দিন')
      if (form.total_capital <= 0 || !Number.isFinite(form.total_capital))
        throw new Error('মোট মূলধন সঠিক নয়')
      if (form.total_shares <= 0 || !Number.isInteger(form.total_shares))
        throw new Error('শেয়ার সংখ্যা সঠিক নয়')
      if (form.share_price <= 0 || !Number.isFinite(form.share_price))
        throw new Error('শেয়ার মূল্য সঠিক নয়')
      // Sanity: total_capital should equal total_shares × share_price
      const expected = form.total_shares * form.share_price
      if (Math.abs(expected - form.total_capital) > 1) {
        throw new Error(`মূলধন (৳${form.total_capital}) শেয়ার সংখ্যা × মূল্য (৳${expected}) এর সমান হওয়া উচিত`)
      }
      return adminApi.createProject({
        ...form,
        total_capital: Math.round(form.total_capital * 100),  // taka → paisa (integer)
        share_price: Math.round(form.share_price * 100)
      })
    },
    onSuccess: (res) => {
      if (res.success) { setMsg('প্রজেক্ট তৈরি হয়েছে'); setForm(emptyForm); setShowForm(false); qc.invalidateQueries({ queryKey: ['admin-projects'] }) }
    },
    onError: (e: Error) => setMsg(e.message)
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => adminApi.setProjectStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-projects'] })
  })

  const projects = data?.success ? data.data.items : []

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-teal-700 via-primary-600 to-emerald-600 rounded-3xl p-5 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/15 p-2.5 rounded-2xl">
              <img src="/bbi logo.jpg" alt="BBI Logo" className="w-8 h-8 object-contain" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">প্রজেক্ট ব্যবস্থাপনা</h1>
              <p className="text-teal-100 text-sm mt-0.5">প্রজেক্ট তৈরি ও পরিচালনা করুন</p>
            </div>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="bg-white text-primary-700 font-bold text-sm px-4 py-2 rounded-xl hover:bg-primary-50 transition-colors shadow-sm">
            + নতুন প্রজেক্ট
          </button>
        </div>
      </div>

      {msg && <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm">{msg}</div>}

      {/* Create form */}
      {showForm && (
        <div className="card border-primary-200 bg-primary-50">
          <h2 className="font-bold text-lg mb-4">নতুন প্রজেক্ট তৈরি</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">প্রজেক্টের নাম</label>
              <input className="input" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">বিবরণ</label>
              <textarea className="input" rows={3} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <ImageUpload
                label="প্রজেক্টের ছবি (ঐচ্ছিক)"
                value={form.image_url ?? ''}
                onChange={url => setForm(p => ({ ...p, image_url: url }))}
              />
            </div>
            <div>
              <label className="label">মোট মূলধন (টাকায়)</label>
              <input className="input" type="number" value={form.total_capital || ''} onChange={e => setForm(p => ({ ...p, total_capital: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="label">মোট শেয়ার সংখ্যা</label>
              <input className="input" type="number" value={form.total_shares || ''} onChange={e => setForm(p => ({ ...p, total_shares: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="label">প্রতি শেয়ার মূল্য (টাকায়)</label>
              <input className="input" type="number" value={form.share_price || ''} onChange={e => setForm(p => ({ ...p, share_price: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="label">স্ট্যাটাস</label>
              <select className="input" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                <option value="draft">খসড়া</option>
                <option value="active">সক্রিয়</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={() => createMutation.mutate()} disabled={createMutation.isPending} className="btn-primary">
              {createMutation.isPending ? 'তৈরি হচ্ছে...' : 'তৈরি করুন'}
            </button>
            <button onClick={() => setShowForm(false)} className="btn-secondary">বাতিল</button>
          </div>
        </div>
      )}

      {/* Project list */}
      {isLoading ? <p className="text-gray-400 text-sm">লোড হচ্ছে...</p> : (
        <div className="space-y-4">
          {projects.map(p => (
            <div key={p.id} className="card">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-lg">{p.title}</h3>
                    <span className={statusBadge[p.status]}>{statusLabel[p.status]}</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mt-3">
                    <div><p className="text-gray-400">মূলধন</p><p className="font-semibold">{formatTaka(p.total_capital)}</p></div>
                    <div><p className="text-gray-400">শেয়ার</p><p className="font-semibold">{p.sold_shares}/{p.total_shares}</p></div>
                    <div><p className="text-gray-400">প্রতি শেয়ার</p><p className="font-semibold">{formatTaka(p.share_price)}</p></div>
                    <div><p className="text-gray-400">বিক্রয়</p><p className="font-semibold">{formatTaka(p.sold_shares * p.share_price)}</p></div>
                  </div>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <Link
                    to={`/admin/projects/${p.id}/finance`}
                    className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1 justify-center"
                  >
                    <Wallet size={14} /> ফাইনান্স
                  </Link>
                  {p.status === 'draft' && (
                    <button onClick={() => statusMutation.mutate({ id: p.id, status: 'active' })} className="btn-primary text-xs py-1.5 px-3">সক্রিয় করুন</button>
                  )}
                  {p.status === 'active' && (
                    <button onClick={() => statusMutation.mutate({ id: p.id, status: 'closed' })} className="btn-secondary text-xs py-1.5 px-3">বন্ধ করুন</button>
                  )}
                  {p.status === 'closed' && (
                    <button onClick={() => statusMutation.mutate({ id: p.id, status: 'active' })} className="btn-primary text-xs py-1.5 px-3">আবার চালু করুন</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
