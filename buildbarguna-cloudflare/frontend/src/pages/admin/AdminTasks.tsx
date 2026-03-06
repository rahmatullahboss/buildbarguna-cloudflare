import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../../lib/api'
import { ToggleLeft, ToggleRight, Plus, Coins, Clock, List } from 'lucide-react'

const platformOptions = [
  { value: 'facebook', label: 'Facebook' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'other', label: 'অন্যান্য' }
]

export default function AdminTasks() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [activeTab, setActiveTab] = useState<'tasks' | 'task-types'>('tasks')
  const [form, setForm] = useState({ 
    title: '', 
    destination_url: '', 
    platform: 'facebook',
    points: 5,
    cooldown_seconds: 30,
    daily_limit: 20
  })
  const [msg, setMsg] = useState('')

  const { data, isLoading } = useQuery({ queryKey: ['admin-tasks'], queryFn: () => adminApi.tasks() })
  const { data: taskTypesData } = useQuery({ queryKey: ['task-types'], queryFn: () => adminApi.taskTypes() })

  const createMutation = useMutation({
    mutationFn: () => adminApi.createTask(form),
    onSuccess: (res) => {
      if (res.success) {
        setMsg('টাস্ক তৈরি হয়েছে')
        setForm({ title: '', destination_url: '', platform: 'facebook', points: 5, cooldown_seconds: 30, daily_limit: 20 })
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
  const taskTypes = taskTypesData?.success ? taskTypesData.data : []

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-sky-700 via-blue-600 to-indigo-600 rounded-3xl p-5 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/15 p-2.5 rounded-2xl text-2xl">✅</div>
            <div>
              <h1 className="text-2xl font-bold">টাস্ক ব্যবস্থাপনা</h1>
              <p className="text-sky-100 text-sm mt-0.5">ডেইলি টাস্ক এবং পয়েন্ট সেটিংস পরিচালনা করুন</p>
            </div>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="bg-white text-blue-700 font-bold text-sm px-4 py-2 rounded-xl hover:bg-blue-50 transition-colors shadow-sm flex items-center gap-1.5">
            <Plus size={15} /> নতুন টাস্ক
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('tasks')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'tasks'
              ? 'border-b-2 border-primary-600 text-primary-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          টাস্কসমূহ
        </button>
        <button
          onClick={() => setActiveTab('task-types')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'task-types'
              ? 'border-b-2 border-primary-600 text-primary-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          টাস্ক টাইপস (পয়েন্ট সেটিংস)
        </button>
      </div>

      {msg && <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm">{msg}</div>}

      {showForm && activeTab === 'tasks' && (
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
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label flex items-center gap-1">
                  <Coins size={14} /> পয়েন্ট
                </label>
                <input 
                  className="input" 
                  type="number" 
                  min="0"
                  value={form.points} 
                  onChange={e => setForm(p => ({ ...p, points: parseInt(e.target.value) || 0 }))} 
                />
              </div>
              <div>
                <label className="label flex items-center gap-1">
                  <Clock size={14} /> কোডাউন (সেকেন্ড)
                </label>
                <input 
                  className="input" 
                  type="number" 
                  min="0"
                  value={form.cooldown_seconds} 
                  onChange={e => setForm(p => ({ ...p, cooldown_seconds: parseInt(e.target.value) || 0 }))} 
                />
              </div>
              <div>
                <label className="label flex items-center gap-1">
                  <List size={14} /> ডেইলি লিমিট
                </label>
                <input 
                  className="input" 
                  type="number" 
                  min="1"
                  value={form.daily_limit} 
                  onChange={e => setForm(p => ({ ...p, daily_limit: parseInt(e.target.value) || 1 }))} 
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !form.title || !form.destination_url}
                className="btn-primary">{createMutation.isPending ? 'তৈরি হচ্ছে...' : 'তৈরি করুন'}</button>
              <button onClick={() => setShowForm(false)} className="btn-secondary">বাতিল</button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'tasks' && (
        isLoading ? <p className="text-gray-400 text-sm">লোড হচ্ছে...</p> : (
          <div className="space-y-3">
            {tasks.map(t => (
              <div key={t.id} className={`card flex items-center gap-4 ${!t.is_active ? 'opacity-50' : ''}`}>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{t.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{t.destination_url}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
                      <Coins size={10} /> {t.points || 5} পয়েন্ট
                    </span>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock size={10} /> {t.cooldown_seconds || 30}s
                    </span>
                    <span className="text-xs text-gray-500">{t.platform}</span>
                  </div>
                </div>
                <button onClick={() => toggleMutation.mutate(t.id)} className="shrink-0 text-gray-400 hover:text-primary-600 transition-colors">
                  {t.is_active ? <ToggleRight size={32} className="text-green-500" /> : <ToggleLeft size={32} />}
                </button>
              </div>
            ))}
          </div>
        )
      )}

      {activeTab === 'task-types' && (
        <div className="space-y-3">
          {taskTypes.map((tt: any) => (
            <div key={tt.id} className={`card flex items-center justify-between ${!tt.is_active ? 'opacity-50' : ''}`}>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{tt.display_name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{tt.name}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
                    <Coins size={10} /> {tt.base_points} পয়েন্ট
                  </span>
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Clock size={10} /> {tt.cooldown_seconds}s
                  </span>
                  <span className="text-xs text-gray-500">দৈনিক: {tt.daily_limit}</span>
                </div>
              </div>
              <button 
                onClick={() => adminApi.toggleTaskType(tt.id).then(() => qc.invalidateQueries({ queryKey: ['task-types'] }))}
                className="shrink-0 text-gray-400 hover:text-primary-600 transition-colors"
              >
                {tt.is_active ? <ToggleRight size={32} className="text-green-500" /> : <ToggleLeft size={32} />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
