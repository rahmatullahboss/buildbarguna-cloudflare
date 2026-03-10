import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tasksApi, type TaskListItem } from '../lib/api'
import { Play, CheckCircle, Clock, Facebook, Youtube, Link as LinkIcon, AlertCircle, ExternalLink, RotateCcw } from 'lucide-react'

// Platform icon helper
function PlatformIcon({ platform }: { platform: string }) {
  switch (platform) {
    case 'facebook': return <Facebook className="w-5 h-5 text-blue-600" />
    case 'youtube': return <Youtube className="w-5 h-5 text-red-600" />
    case 'telegram': return <LinkIcon className="w-5 h-5 text-blue-500" />
    default: return <LinkIcon className="w-5 h-5 text-gray-600" />
  }
}

// Task Card Component with inline confirm
function TaskCard({ 
  task, 
  onStartTask 
}: { 
  task: TaskListItem
  onStartTask: (task: TaskListItem) => void
}) {
  const isCompleted = task.is_one_time ? task.completed_ever : task.completed_today
  const isDisabled = isCompleted || task.remaining_count <= 0

  // Handle task click - open link directly
  const handleTaskClick = () => {
    if (isDisabled) return
    onStartTask(task)
  }

  return (
    <div 
      onClick={handleTaskClick}
      className={`bg-white rounded-xl p-4 shadow-sm border cursor-pointer transition-all hover:shadow-md ${isCompleted ? 'border-success-200 bg-success-50' : 'border-gray-100 hover:border-primary-300'}`}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
          <PlatformIcon platform={task.platform} />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{task.title}</h3>
          
          <div className="flex items-center gap-3 mt-1 text-sm">
            <span className="text-primary-600 font-bold">{task.points} পয়েন্ট</span>
            <span className="text-gray-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {task.cooldown_seconds}সে
            </span>
            {task.is_one_time && (
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">ওয়ান টাইম</span>
            )}
          </div>

          {/* Status */}
          <div className="mt-2">
            {isCompleted ? (
              <span className="text-success-600 flex items-center gap-1 text-sm">
                <CheckCircle className="w-4 h-4" />
                {task.is_one_time ? 'সম্পন্ন হয়েছে' : 'আজ সম্পন্ন'}
              </span>
            ) : task.remaining_count <= 0 ? (
              <span className="text-orange-600 flex items-center gap-1 text-sm">
                <AlertCircle className="w-4 h-4" />
                লিমিট শেষ
              </span>
            ) : (
              <span className="text-primary-600 text-sm flex items-center gap-1">
                <ExternalLink className="w-3 h-3" />
                ক্লিক করে লিংকে যান
              </span>
            )}
          </div>
        </div>

        <div
          className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2
            ${isDisabled 
              ? 'bg-gray-100 text-gray-400' 
              : 'bg-primary-600 text-white hover:bg-primary-700'}`}
        >
          {isCompleted ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <>
              <Play className="w-4 h-4" />
              শুরু
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// Simple inline confirmation component
function ConfirmButton({ 
  task, 
  onComplete,
  onCancel 
}: { 
  task: TaskListItem
  onComplete: () => void
  onCancel: () => void
}) {
  const [isClicked, setIsClicked] = useState(false)

  const completeMutation = useMutation({
    mutationFn: () => tasksApi.complete(task.id),
    onSuccess: (res) => {
      if (res.success) {
        onComplete()
      }
    },
    onSettled: () => {
      // Reset clicked state after API finishes (success or error)
      setIsClicked(false)
    }
  })

  // Handle click - hide button immediately, then call API
  const handleClick = () => {
    setIsClicked(true)
    completeMutation.mutate()
  }

  // Don't render if already clicked (hides immediately)
  if (isClicked) {
    return null
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-50">
      <div className="max-w-md mx-auto flex items-center gap-3">
        <div className="flex-1">
          <p className="font-medium text-gray-900">{task.title}</p>
          <p className="text-sm text-success-600">+{task.points} পয়েন্ট অর্জন করতে কনফার্ম করুন</p>
        </div>
        <button
          onClick={handleClick}
          disabled={completeMutation.isPending}
          className="px-4 py-2 bg-success-600 text-white rounded-lg font-medium hover:bg-success-700 disabled:opacity-50 flex items-center gap-2"
        >
          <CheckCircle className="w-4 h-4" />
          কনফার্ম
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg font-medium hover:bg-gray-200"
        >
          বাতিল
        </button>
      </div>
    </div>
  )
}

export default function Tasks() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'daily' | 'one-time'>('daily')
  const [activeTask, setActiveTask] = useState<TaskListItem | null>(null)

  const { data: tasksData, isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => tasksApi.list()
  })

  const tasks = tasksData?.success ? tasksData.data : null

  const dailyTasks = tasks?.daily_tasks || []
  const oneTimeTasks = tasks?.one_time_tasks || []
  const userPoints = tasks?.user_points

  // Start task - call API and open link
  const startTaskMutation = useMutation({
    mutationFn: async (task: TaskListItem) => {
      console.log('[Task] Starting task:', {
        id: task.id,
        title: task.title,
        destination_url: task.destination_url,
        platform: task.platform
      })
      
      // Validate task has destination URL
      if (!task.destination_url || task.destination_url.trim() === '') {
        throw new Error('Task has no destination URL. Please contact admin.')
      }
      
      // Open window IMMEDIATELY (before async call) to avoid popup blocker
      const newWindow = window.open('about:blank', '_blank', 'noopener,noreferrer')
      
      if (!newWindow) {
        console.error('[Task] Failed to open popup window - blocked by browser?')
        // Fallback: open directly in same tab
        window.location.href = task.destination_url
        return { task, success: true }
      }
      
      try {
        // Call start API to record start time
        console.log('[Task] Calling API for task:', task.id)
        const response = await tasksApi.start(task.id)
        console.log('[Task] API Response:', response)
        
        // Update the opened window with actual URL
        if (response.success && response.data?.destination_url) {
          console.log('[Task] Navigating to:', response.data.destination_url)
          // Use replace to avoid breaking back button
          newWindow.location.replace(response.data.destination_url)
        } else if (response.error) {
          console.error('[Task] API returned error:', response.error)
          newWindow.close()
          throw new Error(response.error)
        } else {
          console.error('[Task] Invalid response structure:', response)
          newWindow.close()
          throw new Error('Invalid response from server')
        }
        
        return { task, success: response.success }
      } catch (error) {
        console.error('[Task] Error starting task:', error)
        // Close window if API fails
        if (newWindow && !newWindow.closed) {
          newWindow.close()
        }
        throw error
      }
    },
    onSuccess: (result) => {
      console.log('[Task] Success:', result)
      if (result.success) {
        setActiveTask(result.task)
      }
    },
    onError: (error) => {
      console.error('[Task] Mutation error:', error)
      alert(error instanceof Error ? error.message : 'Task start failed. Please try again.')
    }
  })

  const handleStartTask = (task: TaskListItem) => {
    startTaskMutation.mutate(task)
  }

  const handleComplete = () => {
    setActiveTask(null)
    queryClient.invalidateQueries({ queryKey: ['tasks'] })
    queryClient.invalidateQueries({ queryKey: ['points'] })
  }

  const handleCancel = () => {
    setActiveTask(null)
  }

  const displayTasks = activeTab === 'daily' ? dailyTasks : oneTimeTasks

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-700 to-primary-500 rounded-2xl p-5 text-white">
        <h1 className="text-2xl font-bold">টাস্ক সমূহ</h1>
        <p className="text-primary-100 mt-1">টাস্ক সম্পন্ন করে পয়েন্ট অর্জন করুন</p>
        
        {/* Points Display */}
        {userPoints && (
          <div className="flex gap-6 mt-4 pt-4 border-t border-white/20">
            <div>
              <p className="text-primary-200 text-xs">বর্তমান পয়েন্ট</p>
              <p className="text-2xl font-bold">{userPoints.available_points}</p>
            </div>
            <div>
              <p className="text-primary-200 text-xs">এই মাসে</p>
              <p className="text-xl font-semibold">{userPoints.monthly_earned}</p>
            </div>
            <div>
              <p className="text-primary-200 text-xs">সারাজীবনে</p>
              <p className="text-xl font-semibold">{userPoints.lifetime_earned}</p>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('daily')}
          className={`flex-1 py-3 rounded-xl font-medium transition-colors
            ${activeTab === 'daily' 
              ? 'bg-primary-600 text-white' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          দৈনিক টাস্ক ({dailyTasks.length})
        </button>
        <button
          onClick={() => setActiveTab('one-time')}
          className={`flex-1 py-3 rounded-xl font-medium transition-colors
            ${activeTab === 'one-time' 
              ? 'bg-primary-600 text-white' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          ওয়ান টাইম ({oneTimeTasks.length})
        </button>
      </div>

      {/* Task List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-500 mt-2">লোড হচ্ছে...</p>
        </div>
      ) : displayTasks.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <p className="text-gray-500">কোনো টাস্ক পাওয়া যায়নি</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayTasks.map(task => (
            <TaskCard 
              key={task.id} 
              task={task}
              onStartTask={handleStartTask}
            />
          ))}
        </div>
      )}

      {/* Bottom Confirmation Bar */}
      {activeTask && (
        <ConfirmButton 
          task={activeTask}
          onComplete={handleComplete}
          onCancel={handleCancel}
        />
      )}
    </div>
  )
}
