import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../../lib/api'
import { ToggleLeft, ToggleRight, Plus } from 'lucide-react'

const platformOptions = [
  { value: 'facebook', label: 'Facebook' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'other', label: 'অন্যান্য' }
]

export default function AdminTasks() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', destination_url: '', platform: 'facebook' })
  const [msg, setMsg] = useState('')

  const { data, isLoading } = useQuery({ queryKey: ['admin-tasks'], queryFn: () => adminApi.tasks() })

  const createMutation = useMutation({
    mutationFn: () => adminApi.createTask(form),
    onSuccess: (res) => {
      if (res.success) {
        setMsg('টাস্ক তৈরি হয়েছে')
        setForm({ title: '', destination_url: '', platform: 'facebook' })
        setShowForm(false)
        qc.invalidateQueries({ queryKey: ['admin-tasks'] })
      }
    }
  })

  const toggleMutation = useMutation({
    mutationFn: (id: number) => adminApi.toggleTask(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-tasks'] })
  })

  const tasks = data?.success ? data.data : []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">টাস্ক ব্যবস্থাপনা</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> নতুন টাস্ক
        </button>
      </div>

      {msg && <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm">{msg}</div>}

      {showForm && (
        <div className="card border-primary-200 bg-primary-50">
          <h2 className="font-bold text-lg mb-4">নতুন টাস্ক যোগ করুন</h2>
          <div className="space-y-4">
            <div>
              <label className="label">টাস্কের নাম</label>
              <input className="input" placeholder="যেমন: Facebook পেজে লাইক দিন"
                value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
            </div>
            <div>
              <label className="label">লিংক (URL)</label>
              <input className="input" type="url" placeholder="https://facebook.com/..."
                value={form.destination_url} onChange={e => setForm(p => ({ ...p, destination_url: e.target.value }))} />
            </div>
            <div>
              <label className="label">প্ল্যাটফর্ম</label>
              <select className="input" value={form.platform} onChange={e => setForm(p => ({ ...p, platform: e.target.value }))}>
                {platformOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="flex gap-3">
              <button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !form.title || !form.destination_url}
                className="btn-primary">{createMutation.isPending ? 'তৈরি হচ্ছে...' : 'তৈরি করুন'}</button>
              <button onClick={() => setShowForm(false)} className="btn-secondary">বাতিল</button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? <p className="text-gray-400 text-sm">লোড হচ্ছে...</p> : (
        <div className="space-y-3">
          {tasks.map(t => (
            <div key={t.id} className={`card flex items-center gap-4 ${!t.is_active ? 'opacity-50' : ''}`}>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{t.title}</p>
                <p className="text-xs text-gray-400 mt-0.5 truncate">{t.destination_url}</p>
                <span className="text-xs text-gray-500 mt-1 inline-block">{t.platform}</span>
              </div>
              <button onClick={() => toggleMutation.mutate(t.id)} className="shrink-0 text-gray-400 hover:text-primary-600 transition-colors">
                {t.is_active ? <ToggleRight size={32} className="text-green-500" /> : <ToggleLeft size={32} />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
