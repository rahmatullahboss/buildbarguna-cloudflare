import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { adminApi, type CreateProjectBody, type AdminProject, type ProjectUpdate } from '../../lib/api'
import { formatTaka } from '../../lib/auth'
import ImageUpload from '../../components/ImageUpload'
import { Wallet, TrendingUp, Edit2, Trash2, CheckCircle, Plus, X, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'

// ─── Status config ──────────────────────────────────────────────────────────────
const statusLabel: Record<string, string> = {
  draft: 'খসড়া', active: 'সক্রিয়', closed: 'বন্ধ', completed: 'সম্পন্ন'
}
const statusBadge: Record<string, string> = {
  draft: 'badge-pending', active: 'badge-active', closed: 'badge-closed', completed: 'badge-completed'
}

const CATEGORIES = ['কৃষি', 'রিয়েল এস্টেট', 'প্রযুক্তি', 'উৎপাদন', 'সেবা', 'বাণিজ্য', 'অন্যান্য']

// ─── Empty form ─────────────────────────────────────────────────────────────────
const emptyForm = (): CreateProjectBody => ({
  title: '', description: '', total_capital: 0, total_shares: 0, share_price: 0,
  status: 'draft', location: '', category: '', start_date: '', expected_end_date: '', progress_pct: 0
})

export default function AdminProjects() {
  const qc = useQueryClient()

  // ── Modal & form state
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState<CreateProjectBody>(emptyForm())
  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState<'success' | 'error'>('success')

  // ── Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<AdminProject | null>(null)

  // ── Expanded project updates
  const [expandedUpdates, setExpandedUpdates] = useState<number | null>(null)
  const [updateForm, setUpdateForm] = useState({ title: '', content: '', image_url: '' })

  // ── Queries
  const { data, isLoading } = useQuery({ queryKey: ['admin-projects'], queryFn: () => adminApi.projects() })

  const { data: updatesData } = useQuery({
    queryKey: ['project-updates-admin', expandedUpdates],
    queryFn: () => adminApi.getProjectUpdates(expandedUpdates!),
    enabled: expandedUpdates !== null
  })
  const updates: ProjectUpdate[] = updatesData?.success ? (updatesData.data as ProjectUpdate[]) : []

  // ── Flash helper
  const flash = (message: string, type: 'success' | 'error' = 'success') => {
    setMsg(message); setMsgType(type)
    setTimeout(() => setMsg(''), 4000)
  }

  // ── Project CRUD mutations
  const createMutation = useMutation({
    mutationFn: () => {
      validateForm()
      return adminApi.createProject(prepareBody(form))
    },
    onSuccess: () => { flash('প্রজেক্ট তৈরি হয়েছে'); closeForm(); qc.invalidateQueries({ queryKey: ['admin-projects'] }) },
    onError: (e: Error) => flash(e.message, 'error')
  })

  const updateMutation = useMutation({
    mutationFn: () => adminApi.updateProject(editId!, prepareBody(form)),
    onSuccess: () => { flash('প্রজেক্ট আপডেট হয়েছে'); closeForm(); qc.invalidateQueries({ queryKey: ['admin-projects'] }) },
    onError: (e: Error) => flash(e.message, 'error')
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => adminApi.setProjectStatus(id, status),
    onSuccess: () => { flash('স্ট্যাটাস পরিবর্তন হয়েছে'); qc.invalidateQueries({ queryKey: ['admin-projects'] }) },
    onError: (e: Error) => flash(e.message, 'error')
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminApi.deleteProject(id),
    onSuccess: () => { flash('প্রজেক্ট মুছে ফেলা হয়েছে'); setDeleteConfirm(null); qc.invalidateQueries({ queryKey: ['admin-projects'] }) },
    onError: (e: Error) => { flash(e.message, 'error'); setDeleteConfirm(null) }
  })

  // ── Updates mutations
  const createUpdateMutation = useMutation({
    mutationFn: () => adminApi.createProjectUpdate(expandedUpdates!, { title: updateForm.title, content: updateForm.content, image_url: updateForm.image_url || undefined }),
    onSuccess: () => { flash('আপডেট পোস্ট হয়েছে'); setUpdateForm({ title: '', content: '', image_url: '' }); qc.invalidateQueries({ queryKey: ['project-updates-admin', expandedUpdates] }) },
    onError: (e: Error) => flash(e.message, 'error')
  })

  const deleteUpdateMutation = useMutation({
    mutationFn: (id: number) => adminApi.deleteProjectUpdate(id),
    onSuccess: () => { flash('আপডেট মুছে ফেলা হয়েছে'); qc.invalidateQueries({ queryKey: ['project-updates-admin', expandedUpdates] }) },
    onError: (e: Error) => flash(e.message, 'error')
  })

  // ── Form helpers
  function validateForm() {
    if (!form.title.trim()) throw new Error('প্রজেক্টের নাম দিন')
    if ((form.total_capital || 0) <= 0) throw new Error('মোট মূলধন সঠিক নয়')
    if ((form.total_shares || 0) <= 0) throw new Error('শেয়ার সংখ্যা সঠিক নয়')
    if ((form.share_price || 0) <= 0) throw new Error('শেয়ার মূল্য সঠিক নয়')
    const expected = (form.total_shares || 0) * (form.share_price || 0)
    if (Math.abs(expected - (form.total_capital || 0)) > 1) {
      throw new Error(`মূলধন (৳${form.total_capital}) শেয়ার সংখ্যা × মূল্য (৳${expected}) এর সমান হওয়া উচিত`)
    }
  }

  function prepareBody(f: CreateProjectBody): CreateProjectBody {
    return {
      ...f,
      total_capital: Math.round((f.total_capital || 0) * 100),  // taka → paisa
      share_price: Math.round((f.share_price || 0) * 100),
      location: f.location || undefined,
      category: f.category || undefined,
      start_date: f.start_date || undefined,
      expected_end_date: f.expected_end_date || undefined,
      progress_pct: f.progress_pct || undefined
    }
  }

  function openCreate() {
    setEditId(null); setForm(emptyForm()); setShowForm(true)
  }

  function openEdit(p: AdminProject) {
    setEditId(p.id)
    setForm({
      title: p.title, description: p.description || '',
      image_url: p.image_url || '', status: p.status,
      total_capital: p.total_capital / 100,  // paisa → taka for display
      total_shares: p.total_shares,
      share_price: p.share_price / 100,
      location: p.location || '', category: p.category || '',
      start_date: p.start_date || '', expected_end_date: p.expected_end_date || '',
      progress_pct: p.progress_pct || 0
    })
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false); setEditId(null); setForm(emptyForm())
  }

  function setF(key: keyof CreateProjectBody, value: unknown) {
    setForm(p => ({ ...p, [key]: value }))
  }

  const projects = data?.success ? data.data.items : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-700 via-primary-600 to-emerald-600 rounded-3xl p-5 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/15 p-2.5 rounded-2xl">
              <img src="/bbi logo.jpg" alt="BBI Logo" className="w-8 h-8 object-contain" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">প্রজেক্ট ব্যবস্থাপনা</h1>
              <p className="text-teal-100 text-sm mt-0.5">প্রজেক্ট তৈরি, সম্পাদনা ও পরিচালনা করুন</p>
            </div>
          </div>
          <button onClick={openCreate} className="bg-white text-primary-700 font-bold text-sm px-4 py-2 rounded-xl hover:bg-primary-50 transition-colors shadow-sm flex items-center gap-1">
            <Plus size={16} /> নতুন প্রজেক্ট
          </button>
        </div>
      </div>

      {/* Flash message */}
      {msg && (
        <div className={`border rounded-lg p-3 text-sm flex items-center gap-2 ${msgType === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {msgType === 'error' && <AlertTriangle size={16} />}
          {msg}
        </div>
      )}

      {/* Create / Edit form */}
      {showForm && (
        <div className="card border-primary-200 bg-primary-50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg">{editId ? 'প্রজেক্ট সম্পাদনা' : 'নতুন প্রজেক্ট তৈরি'}</h2>
            <button onClick={closeForm} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Required fields */}
            <div className="sm:col-span-2">
              <label className="label">প্রজেক্টের নাম <span className="text-red-500">*</span></label>
              <input className="input" value={form.title} onChange={e => setF('title', e.target.value)} placeholder="যেমন: টমেটো চাষ প্রজেক্ট ২০২৫" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">বিবরণ</label>
              <textarea className="input" rows={3} value={form.description} onChange={e => setF('description', e.target.value)} placeholder="প্রজেক্টের বিস্তারিত..." />
            </div>
            <div className="sm:col-span-2">
              <ImageUpload
                label="প্রজেক্টের ছবি (ঐচ্ছিক)"
                value={form.image_url ?? ''}
                onChange={url => setF('image_url', url)}
              />
            </div>
            <div>
              <label className="label">মোট মূলধন (টাকায়) <span className="text-red-500">*</span></label>
              <input className="input" type="number" value={form.total_capital || ''} onChange={e => setF('total_capital', Number(e.target.value))} placeholder="৫০০০০" />
            </div>
            <div>
              <label className="label">মোট শেয়ার সংখ্যা <span className="text-red-500">*</span></label>
              <input className="input" type="number" value={form.total_shares || ''} onChange={e => setF('total_shares', Number(e.target.value))} placeholder="১০০০" />
            </div>
            <div>
              <label className="label">প্রতি শেয়ার মূল্য (টাকায়) <span className="text-red-500">*</span></label>
              <input className="input" type="number" value={form.share_price || ''} onChange={e => setF('share_price', Number(e.target.value))} placeholder="৫০" />
            </div>
            <div>
              <label className="label">স্ট্যাটাস</label>
              <select className="input" value={form.status} onChange={e => setF('status', e.target.value)}>
                <option value="draft">খসড়া</option>
                <option value="active">সক্রিয়</option>
              </select>
            </div>

            {/* Optional enhanced fields */}
            <div className="sm:col-span-2 pt-2 border-t border-gray-200">
              <p className="text-sm font-medium text-gray-500 mb-3">ঐচ্ছিক তথ্য (পরে যোগ করা যাবে)</p>
            </div>
            <div>
              <label className="label">অবস্থান</label>
              <input className="input" value={form.location || ''} onChange={e => setF('location', e.target.value)} placeholder="যেমন: সিলেট, বাংলাদেশ" />
            </div>
            <div>
              <label className="label">বিভাগ</label>
              <select className="input" value={form.category || ''} onChange={e => setF('category', e.target.value)}>
                <option value="">নির্বাচন করুন</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">শুরুর তারিখ</label>
              <input className="input" type="date" value={form.start_date || ''} onChange={e => setF('start_date', e.target.value)} />
            </div>
            <div>
              <label className="label">প্রত্যাশিত শেষ তারিখ</label>
              <input className="input" type="date" value={form.expected_end_date || ''} onChange={e => setF('expected_end_date', e.target.value)} />
            </div>
            {editId && (
              <div>
                <label className="label">অগ্রগতি (%) — {form.progress_pct ?? 0}%</label>
                <input className="input" type="range" min={0} max={100} value={form.progress_pct ?? 0} onChange={e => setF('progress_pct', Number(e.target.value))} />
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-4">
            {editId ? (
              <button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending} className="btn-primary">
                {updateMutation.isPending ? 'সংরক্ষণ হচ্ছে...' : '💾 পরিবর্তন সংরক্ষণ'}
              </button>
            ) : (
              <button onClick={() => createMutation.mutate()} disabled={createMutation.isPending} className="btn-primary">
                {createMutation.isPending ? 'তৈরি হচ্ছে...' : '✅ তৈরি করুন'}
              </button>
            )}
            <button onClick={closeForm} className="btn-secondary">বাতিল</button>
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <div className="flex items-center gap-3 mb-3 text-red-600">
              <AlertTriangle size={24} />
              <h3 className="font-bold text-lg">প্রজেক্ট মুছবেন?</h3>
            </div>
            <p className="text-gray-600 text-sm mb-1">
              <strong>"{deleteConfirm.title}"</strong> প্রজেক্টটি সম্পূর্ণরূপে মুছে যাবে।
            </p>
            <p className="text-gray-500 text-xs mb-4">
              ⚠️ শেয়ার বা লেনদেন থাকলে মুছতে দেওয়া হবে না।
            </p>
            <div className="flex gap-3">
              <button onClick={() => deleteMutation.mutate(deleteConfirm.id)} disabled={deleteMutation.isPending} className="flex-1 bg-red-600 text-white font-bold py-2 px-4 rounded-xl hover:bg-red-700 disabled:opacity-50">
                {deleteMutation.isPending ? 'মুছছে...' : 'হ্যাঁ, মুছুন'}
              </button>
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 btn-secondary">বাতিল</button>
            </div>
          </div>
        </div>
      )}

      {/* Project list */}
      {isLoading ? <p className="text-gray-400 text-sm">লোড হচ্ছে...</p> : (
        <div className="space-y-4">
          {projects.length === 0 && <p className="text-gray-400 text-sm text-center py-8">কোনো প্রজেক্ট নেই। নতুন প্রজেক্ট তৈরি করুন।</p>}
          {projects.map(p => (
            <div key={p.id} className="card">
              {/* Progress bar */}
              {p.status === 'active' && (p.progress_pct ?? 0) > 0 && (
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>অগ্রগতি</span><span>{p.progress_pct}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${p.progress_pct}%` }} />
                  </div>
                </div>
              )}

              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-bold text-lg">{p.title}</h3>
                    <span className={statusBadge[p.status] ?? 'badge-pending'}>{statusLabel[p.status] ?? p.status}</span>
                    {p.category && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{p.category}</span>}
                    {p.location && <span className="text-xs text-gray-400">📍 {p.location}</span>}
                  </div>
                  {p.description && <p className="text-gray-500 text-sm line-clamp-2 mb-2">{p.description}</p>}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mt-2">
                    <div><p className="text-gray-400">মূলধন</p><p className="font-semibold">{formatTaka(p.total_capital)}</p></div>
                    <div><p className="text-gray-400">শেয়ার</p><p className="font-semibold">{p.sold_shares}/{p.total_shares}</p></div>
                    <div><p className="text-gray-400">প্রতি শেয়ার</p><p className="font-semibold">{formatTaka(p.share_price)}</p></div>
                    <div><p className="text-gray-400">বিক্রয়</p><p className="font-semibold">{formatTaka(p.sold_shares * p.share_price)}</p></div>
                  </div>
                  {(p.start_date || p.expected_end_date) && (
                    <p className="text-xs text-gray-400 mt-1.5">
                      {p.start_date && `📅 ${p.start_date}`}
                      {p.start_date && p.expected_end_date && ' → '}
                      {p.expected_end_date && p.expected_end_date}
                    </p>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex flex-col gap-2 shrink-0">
                  <Link to={`/admin/projects/${p.id}/finance`} className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1 justify-center">
                    <Wallet size={14} /> ফাইনান্স
                  </Link>
                  <Link to={`/admin/projects/${p.id}/compliance`} className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold py-1.5 px-3 rounded-xl hover:bg-emerald-100 flex items-center gap-1 justify-center">
                    <CheckCircle size={13} /> Compliance
                  </Link>
                  <Link to={`/admin/projects/${p.id}/distribute-profit`} className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1 justify-center">
                    <TrendingUp size={14} /> মুনাফা
                  </Link>
                  <button onClick={() => openEdit(p)} className="bg-blue-50 text-blue-600 border border-blue-200 text-xs font-semibold py-1.5 px-3 rounded-xl hover:bg-blue-100 flex items-center gap-1 justify-center">
                    <Edit2 size={13} /> সম্পাদনা
                  </button>

                  {/* Status transitions */}
                  {p.status === 'draft' && (
                    <button onClick={() => statusMutation.mutate({ id: p.id, status: 'active' })} className="btn-primary text-xs py-1.5 px-3">সক্রিয় করুন</button>
                  )}
                  {p.status === 'active' && (
                    <>
                      <Link to={`/admin/projects/${p.id}/closeout?mode=completed`} className="bg-green-50 text-green-700 border border-green-200 text-xs font-semibold py-1.5 px-3 rounded-xl hover:bg-green-100 flex items-center gap-1 justify-center">
                        <CheckCircle size={13} /> সম্পন্ন
                      </Link>
                      <Link to={`/admin/projects/${p.id}/closeout?mode=closed`} className="btn-secondary text-xs py-1.5 px-3 text-center">বন্ধ করুন</Link>
                    </>
                  )}
                  {p.status === 'closed' && (
                    <button onClick={() => statusMutation.mutate({ id: p.id, status: 'active' })} className="btn-primary text-xs py-1.5 px-3">আবার চালু করুন</button>
                  )}

                  {/* Delete — only for draft projects without data */}
                  <button onClick={() => setDeleteConfirm(p)} className="bg-red-50 text-red-600 border border-red-200 text-xs font-semibold py-1.5 px-3 rounded-xl hover:bg-red-100 flex items-center gap-1 justify-center">
                    <Trash2 size={13} /> মুছুন
                  </button>
                </div>
              </div>

              {/* Project Updates section */}
              <div className="mt-3 pt-3 border-t border-gray-100">
                <button
                  onClick={() => setExpandedUpdates(expandedUpdates === p.id ? null : p.id)}
                  className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-primary-600 transition-colors"
                >
                  {expandedUpdates === p.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  প্রজেক্ট আপডেট / নিউজ
                </button>

                {expandedUpdates === p.id && (
                  <div className="mt-3 space-y-3">
                    {/* New update form */}
                    <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                      <p className="text-xs font-semibold text-gray-500">নতুন আপডেট পোস্ট করুন</p>
                      <input className="input text-sm" placeholder="শিরোনাম" value={updateForm.title} onChange={e => setUpdateForm(f => ({ ...f, title: e.target.value }))} />
                      <textarea className="input text-sm" rows={2} placeholder="বিস্তারিত (ঐচ্ছিক)" value={updateForm.content} onChange={e => setUpdateForm(f => ({ ...f, content: e.target.value }))} />
                      <button
                        onClick={() => createUpdateMutation.mutate()}
                        disabled={createUpdateMutation.isPending || !updateForm.title.trim()}
                        className="btn-primary text-xs py-1.5 px-3"
                      >
                        {createUpdateMutation.isPending ? 'পোস্ট হচ্ছে...' : '📢 পোস্ট করুন'}
                      </button>
                    </div>

                    {/* Existing updates */}
                    {updates.length === 0 && <p className="text-xs text-gray-400 text-center py-2">কোনো আপডেট নেই</p>}
                    {updates.map(u => (
                      <div key={u.id} className="bg-white border border-gray-100 rounded-xl p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-sm">{u.title}</p>
                            {u.content && <p className="text-gray-500 text-xs mt-0.5">{u.content}</p>}
                            <p className="text-gray-300 text-xs mt-1">{u.author_name} • {new Date(u.created_at).toLocaleDateString('bn-BD')}</p>
                          </div>
                          <button onClick={() => deleteUpdateMutation.mutate(u.id)} className="text-red-400 hover:text-red-600 shrink-0">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
