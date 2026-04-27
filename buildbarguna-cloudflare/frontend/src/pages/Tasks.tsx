import { useState, useEffect } from 'react'
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
      role="button"
      tabIndex={isDisabled ? -1 : 0}
      aria-disabled={isDisabled}
      onClick={handleTaskClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleTaskClick()
        }
      }}
      className={`bg-white rounded-xl p-4 shadow-sm border cursor-pointer transition-all hover:shadow-md focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-primary-500 ${isCompleted ? 'border-success-200 bg-success-50' : 'border-gray-100 hover:border-primary-300'}`}
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

// Simple inline confirmation component with countdown timer
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
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0)
  
  // Countdown timer effect
  useEffect(() => {
    if (cooldownRemaining <= 0) return
    
    const timer = setInterval(() => {
      setCooldownRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    
    return () => clearInterval(timer)
  }, [cooldownRemaining])
  
  // Start countdown when component mounts - use wait_seconds from task if available
  useEffect(() => {
    // Use wait_seconds from task (set by start mutation) or fallback to cooldown_seconds
    const initialWait = task.wait_seconds || task.cooldown_seconds || 0
    setCooldownRemaining(initialWait)
  }, [task.wait_seconds, task.cooldown_seconds])

  const completeMutation = useMutation({
    mutationFn: () => tasksApi.complete(task.id),
    onSuccess: (res) => {
      if (res.success) {
        onComplete()
      }
    },
    onError: () => {
      setIsClicked(false)
    },
    onSettled: () => {
      setIsClicked(false)
    }
  })

  // Handle click - disable immediately and call API
  const handleClick = () => {
    if (isClicked || completeMutation.isPending) return
    setIsClicked(true)
    completeMutation.mutate()
  }

  const handleCancel = () => {
    onCancel()
  }

  // Show countdown if waiting for cooldown
  const isDisabled = cooldownRemaining > 0 || isClicked || completeMutation.isPending

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-50">
      <div className="max-w-md mx-auto flex items-center gap-3">
        <div className="flex-1">
          <p className="font-medium text-gray-900">{task.title}</p>
          {cooldownRemaining > 0 ? (
            <p className="text-sm text-orange-600">
              অপেক্ষা করুন: {cooldownRemaining} সেকেন্ড
            </p>
          ) : (
            <p className="text-sm text-success-600">+{task.points} পয়েন্ট অর্জন করতে কনফার্ম করুন</p>
          )}
        </div>
        
        {/* Cancel Button */}
        <button
          onClick={handleCancel}
          className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg font-medium hover:bg-gray-200 text-sm"
        >
          বাতিল
        </button>
        
        {/* Confirm Button */}
        <button
          onClick={handleClick}
          disabled={isDisabled}
          className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2
            ${isDisabled 
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
              : 'bg-success-600 text-white hover:bg-success-700'}`}
        >
          {isClicked || completeMutation.isPending ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              প্রসেসিং...
            </>
          ) : cooldownRemaining > 0 ? (
            <>
              <span className="w-4 h-4 bg-orange-500 rounded-full animate-pulse" />
              অপেক্ষা
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4" />
              কনফার্ম
            </>
          )}
        </button>
      </div>
    </div>
  )
}

export default function Tasks() {
  const queryClient = useQueryClient()
  const [activeTask, setActiveTask] = useState<TaskListItem | null>(null)

  const { data: tasksData, isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => tasksApi.list()
  })

  const tasks = tasksData?.success ? tasksData.data : null

  // All tasks in one list
  const allTasks = tasks?.tasks || []
  const userPoints = tasks?.user_points

  // Start task - call API and open link
  const startTaskMutation = useMutation({
    mutationFn: async (task: TaskListItem) => {
      // Validate task has destination URL
      if (!task.destination_url || task.destination_url.trim() === '') {
        throw new Error('Task has no destination URL. Please contact admin.')
      }
      
      // Open the destination URL in a new tab FIRST
      // This must happen from user interaction to avoid popup blocker
      window.open(task.destination_url, '_blank', 'noopener,noreferrer')
      
      // Then call API to record start time
      const response = await tasksApi.start(task.id)
      
      // Get wait_seconds from response if successful
      let waitSeconds = 0
      if (response.success && response.data) {
        waitSeconds = response.data.wait_seconds || 0
      }
      
      return { task, success: response.success, wait_seconds: waitSeconds }
    },
    onSuccess: (result) => {
      // Set active task for confirmation with wait_seconds
      setActiveTask({ ...result.task, wait_seconds: result.wait_seconds })
    },
    onError: () => {
      // Error handled silently — task card remains clickable
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

  const displayTasks = allTasks

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
