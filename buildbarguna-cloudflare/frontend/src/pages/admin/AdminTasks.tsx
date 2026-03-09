import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { formatDate } from '../../lib/auth'
import { getToken } from '../../lib/apiToken'
import { Plus, Edit, Trash2, ToggleLeft, ToggleRight, Search, Clock, Link as LinkIcon, Facebook, Youtube } from 'lucide-react'

// Types
interface Task {
  id: number
  title: string
  destination_url: string
  platform: 'facebook' | 'youtube' | 'telegram' | 'other'
  points: number
  cooldown_seconds: number
  daily_limit: number
  is_one_time: number
  is_active: number
  created_at: string
}

// Platform icon helper
function PlatformIcon({ platform }: { platform: string }) {
  switch (platform) {
    case 'facebook': return <Facebook className="w-4 h-4 text-blue-600" />
    case 'youtube': return <Youtube className="w-4 h-4 text-red-600" />
    default: return <LinkIcon className="w-4 h-4 text-gray-600" />
  }
}

// API functions
async function fetchTasks(): Promise<{ success: boolean; data: Task[] }> {
  const token = getToken()
  const res = await fetch('/api/admin/tasks', {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  return res.json()
}

async function createTask(data: Partial<Task>): Promise<{ success: boolean; error?: string }> {
  const token = getToken()
  const res = await fetch('/api/admin/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(data)
  })
  return res.json()
}

async function updateTask(id: number, data: Partial<Task>): Promise<{ success: boolean }> {
  const token = getToken()
  const res = await fetch(`/api/admin/tasks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(data)
  })
  return res.json()
}

async function deleteTask(id: number): Promise<{ success: boolean }> {
  const token = getToken()
  const res = await fetch(`/api/admin/tasks/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  })
  return res.json()
}

async function toggleTask(id: number): Promise<{ success: boolean }> {
  const token = getToken()
  const res = await fetch(`/api/admin/tasks/${id}/toggle`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${token}` }
  })
  return res.json()
}

export default function AdminTasks() {
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  
  const { data: tasksData, isLoading } = useQuery({
    queryKey: ['admin-tasks'],
    queryFn: fetchTasks
  })

  const tasks: Task[] = tasksData?.success ? tasksData.data : []
  
  const filteredTasks = tasks.filter(t => 
    t.title.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleEdit = (task: Task) => {
    setEditingTask(task)
    setShowModal(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('আপনি কি এই টাস্কটি মুছতে চান?')) return
    await deleteTask(id)
    queryClient.invalidateQueries({ queryKey: ['admin-tasks'] })
  }

  const handleToggle = async (id: number) => {
    await toggleTask(id)
    queryClient.invalidateQueries({ queryKey: ['admin-tasks'] })
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingTask(null)
  }

  const handleSave = async (data: Partial<Task>) => {
    if (editingTask) {
      await updateTask(editingTask.id, data)
    } else {
      await createTask(data)
    }
    queryClient.invalidateQueries({ queryKey: ['admin-tasks'] })
    handleCloseModal()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">টাস্ক ব্যবস্থাপনা</h1>
          <p className="text-gray-500">টাস্ক তৈরি ও পরিচালনা করুন</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          নতুন টাস্ক
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="টাস্ক খুঁজুন..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
      </div>

      {/* Tasks Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">টাস্ক</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">প্ল্যাটফর্ম</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">পয়েন্ট</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">টাইমার</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">লিমিট</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">টাইপ</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">স্ট্যাটাস</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">অ্যাকশন</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center">
                  <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
                </td>
              </tr>
            ) : filteredTasks.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  কোনো টাস্ক পাওয়া যায়নি
                </td>
              </tr>
            ) : (
              filteredTasks.map(task => (
                <tr key={task.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="max-w-xs truncate font-medium text-gray-900">{task.title}</div>
                    <a 
                      href={task.destination_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-primary-600 hover:underline truncate block max-w-xs"
                    >
                      {task.destination_url}
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <PlatformIcon platform={task.platform} />
                      <span className="text-sm capitalize">{task.platform}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-bold text-primary-600">{task.points}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Clock className="w-3 h-3" />
                      {task.cooldown_seconds}সে
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600">
                      {task.is_one_time ? 'ওয়ান টাইম' : task.daily_limit + '/দিন'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {task.is_one_time ? (
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">ওয়ান টাইম</span>
                    ) : (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">দৈনিক</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {task.is_active ? (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">সক্রিয়</span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">নিষ্ক্রিয়</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggle(task.id)}
                        className={`p-1.5 rounded-lg ${task.is_active ? 'bg-green-100 text-green-600 hover:bg-green-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        title={task.is_active ? 'নিষ্ক্রিয় করুন' : 'সক্রিয় করুন'}
                      >
                        {task.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleEdit(task)}
                        className="p-1.5 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200"
                        title="সম্পাদনা"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(task.id)}
                        className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                        title="মুছুন"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Task Modal */}
      {showModal && (
        <TaskModal
          task={editingTask}
          onClose={handleCloseModal}
          onSave={handleSave}
        />
      )}
    </div>
  )
}

// Task Modal Component
function TaskModal({ 
  task, 
  onClose, 
  onSave 
}: { 
  task: Task | null
  onClose: () => void
  onSave: (data: Partial<Task>) => void 
}) {
  const [title, setTitle] = useState(task?.title || '')
  const [destinationUrl, setDestinationUrl] = useState(task?.destination_url || '')
  const [platform, setPlatform] = useState(task?.platform || 'facebook')
  const [points, setPoints] = useState(task?.points?.toString() || '10')
  const [cooldownSeconds, setCooldownSeconds] = useState(task?.cooldown_seconds?.toString() || '10')
  const [dailyLimit, setDailyLimit] = useState(task?.daily_limit?.toString() || '5')
  const [isOneTime, setIsOneTime] = useState(task?.is_one_time === 1)
  const [isActive, setIsActive] = useState(task?.is_active !== 0)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const data = {
      title,
      destination_url: destinationUrl,
      platform,
      points: parseInt(points) || 10,
      cooldown_seconds: parseInt(cooldownSeconds) || 10,
      daily_limit: parseInt(dailyLimit) || 5,
      is_one_time: isOneTime ? 1 : 0,
      is_active: isActive ? 1 : 0
    }

    await onSave(data)
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          {task ? 'টাস্ক সম্পাদনা' : 'নতুন টাস্ক'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">টাস্কের নাম *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="যেমন: ফেসবুক পেজ লাইক করুন"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">লিংক *</label>
            <input
              type="url"
              value={destinationUrl}
              onChange={e => setDestinationUrl(e.target.value)}
              required
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="https://..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">প্ল্যাটফর্ম</label>
              <select
                value={platform}
                onChange={e => setPlatform(e.target.value as 'facebook' | 'youtube' | 'telegram' | 'other')}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="facebook">Facebook</option>
                <option value="youtube">YouTube</option>
                <option value="telegram">Telegram</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">পয়েন্ট *</label>
              <input
                type="number"
                value={points}
                onChange={e => setPoints(e.target.value)}
                required
                min="1"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">টাইমার (সেকেন্ড) *</label>
              <input
                type="number"
                value={cooldownSeconds}
                onChange={e => setCooldownSeconds(e.target.value)}
                required
                min="1"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">দৈনিক লিমিট</label>
              <input
                type="number"
                value={dailyLimit}
                onChange={e => setDailyLimit(e.target.value)}
                min="1"
                disabled={isOneTime}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isOneTime}
                onChange={e => setIsOneTime(e.target.checked)}
                className="w-4 h-4 text-primary-600 rounded"
              />
              <span className="text-sm text-gray-700">ওয়ান টাইম টাস্ক</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isActive}
                onChange={e => setIsActive(e.target.checked)}
                className="w-4 h-4 text-primary-600 rounded"
              />
              <span className="text-sm text-gray-700">সক্রিয়</span>
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50"
            >
              {saving ? 'সেভ হচ্ছে...' : 'সেভ করুন'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
