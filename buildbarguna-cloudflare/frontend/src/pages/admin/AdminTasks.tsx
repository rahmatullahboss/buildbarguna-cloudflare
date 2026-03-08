import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../../lib/api'
import { ToggleLeft, ToggleRight, Plus, Coins, Clock, List, Edit2, X, Trash2 } from 'lucide-react'

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
  const [editingTask, setEditingTask] = useState<any>(null)
  const [editingTaskType, setEditingTaskType] = useState<any>(null)
  const [form, setForm] = useState({
    title: '',
    destination_url: '',
    platform: 'facebook',
    points: 5,
    cooldown_seconds: 30,
    daily_limit: 20,
    is_one_time: 0
  })
  const [taskTypeForm, setTaskTypeForm] = useState({
    name: '',
    display_name: '',
    base_points: 5,
    cooldown_seconds: 30,
    daily_limit: 20
  })
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  const { data, isLoading, error: tasksError } = useQuery({ 
    queryKey: ['admin-tasks'], 
    queryFn: () => adminApi.tasks(),
    retry: 2
  })
  const { data: taskTypesData, error: taskTypesError } = useQuery({ 
    queryKey: ['task-types'], 
    queryFn: () => adminApi.taskTypes(),
    retry: 2
  })

  const createMutation = useMutation({
    mutationFn: () => adminApi.createTask(form),
    onSuccess: (res) => {
      if (res.success) {
        setMsg('টাস্ক তৈরি হয়েছে')
        setForm({ title: '', destination_url: '', platform: 'facebook', points: 5, cooldown_seconds: 30, daily_limit: 20, is_one_time: 0 })
        setShowForm(false)
        qc.invalidateQueries({ queryKey: ['admin-tasks'] })
      }
    },
    onError: (error: any) => {
      setError(error?.message || 'টাস্ক তৈরি করতে সমস্যা হচ্ছে')
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: any }) => adminApi.updateTask(id, body),
    onSuccess: (res) => {
      if (res.success) {
        setMsg('টাস্ক আপডেট হয়েছে')
        setEditingTask(null)
        setForm({ title: '', destination_url: '', platform: 'facebook', points: 5, cooldown_seconds: 30, daily_limit: 20, is_one_time: 0 })
        setShowForm(false)
        qc.invalidateQueries({ queryKey: ['admin-tasks'] })
      }
    },
    onError: (error: any) => {
      setError(error?.message || 'টাস্ক আপডেট করতে সমস্যা হচ্ছে')
    }
  })

  const createTaskTypeMutation = useMutation({
    mutationFn: () => adminApi.createTaskType(taskTypeForm),
    onSuccess: (res) => {
      if (res.success) {
        setMsg('টাস্ক টাইপ তৈরি হয়েছে')
        setTaskTypeForm({ name: '', display_name: '', base_points: 5, cooldown_seconds: 30, daily_limit: 20 })
        qc.invalidateQueries({ queryKey: ['task-types'] })
      }
    },
    onError: (error: any) => {
      setError(error?.message || 'টাস্ক টাইপ তৈরি করতে সমস্যা হচ্ছে')
    }
  })

  const updateTaskTypeMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: any }) => adminApi.updateTaskType(id, body),
    onSuccess: (res) => {
      if (res.success) {
        setMsg('টাস্ক টাইপ আপডেট হয়েছে')
        setEditingTaskType(null)
        setTaskTypeForm({ name: '', display_name: '', base_points: 5, cooldown_seconds: 30, daily_limit: 20 })
        qc.invalidateQueries({ queryKey: ['task-types'] })
      }
    },
    onError: (error: any) => {
      setError(error?.message || 'টাস্ক টাইপ আপডেট করতে সমস্যা হচ্ছে')
    }
  })

  const toggleMutation = useMutation({
    mutationFn: (id: number) => adminApi.toggleTask(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-tasks'] }),
    onError: () => setError('টাস্ক টগল করতে সমস্যা হচ্ছে')
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminApi.deleteTask(id),
    onSuccess: (res) => {
      if (res.success) {
        setMsg('টাস্ক মুছে ফেলা হয়েছে')
        qc.invalidateQueries({ queryKey: ['admin-tasks'] })
      }
    },
    onError: (error: any) => {
      setError(error?.message || 'টাস্ক মুছতে সমস্যা হচ্ছে')
    }
  })

  const tasks = data?.success ? data.data : []
  const taskTypes = taskTypesData?.success ? taskTypesData.data : []

  // Helper to open edit form for task
  const handleEditTask = (task: any) => {
    setEditingTask(task)
    setForm({
      title: task.title,
      destination_url: task.destination_url,
      platform: task.platform,
      points: task.points,
      cooldown_seconds: task.cooldown_seconds,
      daily_limit: task.daily_limit,
      is_one_time: task.is_one_time || 0
    })
    setShowForm(true)
  }

  // Helper to open edit form for task type
  const handleEditTaskType = (taskType: any) => {
    setEditingTaskType(taskType)
    setTaskTypeForm({
      name: taskType.name,
      display_name: taskType.display_name,
      base_points: taskType.base_points,
      cooldown_seconds: taskType.cooldown_seconds,
      daily_limit: taskType.daily_limit
    })
    setActiveTab('task-types')
  }

  // Handle form submit (create or update)
  const handleSubmit = () => {
    if (editingTask) {
      updateMutation.mutate({ id: editingTask.id, body: form })
    } else {
      createMutation.mutate()
    }
  }

  // Handle task type form submit (create or update)
  const handleTaskTypeSubmit = () => {
    if (editingTaskType) {
      updateTaskTypeMutation.mutate({ id: editingTaskType.id, body: taskTypeForm })
    } else {
      createTaskTypeMutation.mutate()
    }
  }

  // Close forms
  const handleCloseForm = () => {
    setShowForm(false)
    setEditingTask(null)
    setForm({ title: '', destination_url: '', platform: 'facebook', points: 5, cooldown_seconds: 30, daily_limit: 20, is_one_time: 0 })
  }

  const handleCloseTaskTypeForm = () => {
    setEditingTaskType(null)
    setTaskTypeForm({ name: '', display_name: '', base_points: 5, cooldown_seconds: 30, daily_limit: 20 })
  }

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
      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{error}</div>}
      {tasksError && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">টাস্ক লোড করা যায়নি</div>}
      {taskTypesError && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">টাস্ক টাইপস লোড করা যায়নি</div>}

      {showForm && activeTab === 'tasks' && (
        <div className="card border-primary-200 bg-primary-50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg">{editingTask ? 'টাস্ক সম্পাদনা করুন' : 'নতুন টাস্ক যোগ করুন'}</h2>
            <button onClick={handleCloseForm} className="text-gray-500 hover:text-gray-700">
              <X size={20} />
            </button>
          </div>
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
            {/* One Time Toggle */}
            <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <input
                type="checkbox"
                id="is_one_time"
                checked={form.is_one_time === 1}
                onChange={e => setForm(p => ({ ...p, is_one_time: e.target.checked ? 1 : 0 }))}
                className="w-5 h-5 text-amber-600"
              />
              <div>
                <label htmlFor="is_one_time" className="font-medium text-amber-800 cursor-pointer">ওয়ান টাইম টাস্ক</label>
                <p className="text-xs text-amber-600">একবারই করা যাবে, প্রতিদিন নয়</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending || !form.title || !form.destination_url}
                className="btn-primary">{updateMutation.isPending ? 'আপডেট হচ্ছে...' : createMutation.isPending ? 'তৈরি হচ্ছে...' : editingTask ? 'আপডেট করুন' : 'তৈরি করুন'}</button>
              <button onClick={handleCloseForm} className="btn-secondary">বাতিল</button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'tasks' && (
        isLoading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="card h-20 animate-pulse bg-gray-50" />)}
          </div>
        ) : tasks.length === 0 ? (
          <div className="card text-center py-10">
            <List size={36} className="mx-auto mb-2 text-gray-200" />
            <p className="text-gray-400 text-sm">কোনো টাস্ক নেই</p>
            <button onClick={() => setShowForm(true)} className="mt-3 text-primary-600 hover:text-primary-700 text-sm font-medium">নতুন টাস্ক যোগ করুন</button>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map(t => (
              <div key={t.id} className={`card flex items-center gap-4 ${!t.is_active ? 'opacity-50' : ''}`}>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900">{t.title}</p>
                    {t.is_one_time === 1 && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">ওয়ান টাইম</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{t.destination_url}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
                      <Coins size={10} /> {t.points || 5} পয়েন্ট
                    </span>
                    {t.is_one_time !== 1 && (
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock size={10} /> {t.cooldown_seconds || 30}s
                      </span>
                    )}
                    <span className="text-xs text-gray-500">{t.platform}</span>
                  </div>
                </div>
                <button 
                  onClick={() => handleEditTask(t)} 
                  className="shrink-0 text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors"
                  title="সম্পাদনা"
                >
                  <Edit2 size={18} />
                </button>
                <button 
                  onClick={() => {
                    if (confirm(`"${t.title}" টাস্কটি মুছে ফেলতে চান?`)) {
                      deleteMutation.mutate(t.id)
                    }
                  }} 
                  className="shrink-0 text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"
                  title="মুছে ফেলুন"
                >
                  <Trash2 size={18} />
                </button>
                <button onClick={() => toggleMutation.mutate(t.id)} className="shrink-0 text-gray-400 hover:text-primary-600 transition-colors">
                  {t.is_active ? <ToggleRight size={32} className="text-green-500" /> : <ToggleLeft size={32} />}
                </button>
              </div>
            ))}
          </div>
        )
      )}

      {activeTab === 'task-types' && (
        isLoading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="card h-20 animate-pulse bg-gray-50" />)}
          </div>
        ) : taskTypes.length === 0 ? (
          <div className="card text-center py-10">
            <Coins size={36} className="mx-auto mb-2 text-gray-200" />
            <p className="text-gray-400 text-sm">কোনো টাস্ক টাইপ নেই</p>
            <p className="text-gray-300 text-xs mt-1">টাস্ক টাইপস তৈরি করুন পয়েন্ট সেটিংস এর জন্য</p>
          </div>
        ) : (
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
        )
      )}
    </div>
  )
}
