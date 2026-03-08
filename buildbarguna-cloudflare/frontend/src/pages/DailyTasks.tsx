import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tasksApi, pointsApi, type TaskItem } from '../lib/api'
import { CheckCircle, Circle, ExternalLink, Facebook, Youtube, Send, Coins, Clock } from 'lucide-react'
import { useState, useEffect } from 'react'

const platformIcon: Record<string, React.ReactNode> = {
  facebook: <Facebook size={18} className="text-blue-600" />,
  youtube:  <Youtube size={18} className="text-red-600" />,
  telegram: <Send size={18} className="text-sky-500" />,
  other:    <ExternalLink size={18} className="text-gray-500" />
}

const platformLabel: Record<string, string> = {
  facebook: 'Facebook', youtube: 'YouTube', telegram: 'Telegram', other: 'লিংক'
}

const platformBg: Record<string, string> = {
  facebook: 'bg-blue-50',
  youtube:  'bg-red-50',
  telegram: 'bg-sky-50',
  other:    'bg-gray-50'
}

export default function DailyTasks() {
  const qc = useQueryClient()
  const [cooldowns, setCooldowns] = useState<Record<number, number>>({})
  
  const { data: tasksData, isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => tasksApi.list(),
    staleTime: 30_000
  })
  
  const { data: pointsData } = useQuery({
    queryKey: ['points'],
    queryFn: () => pointsApi.getBalance(),
    staleTime: 60_000
  })

  const completeMutation = useMutation({
    mutationFn: (id: number) => tasksApi.complete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['points'] })
    }
  })

  const tasks = tasksData?.success ? tasksData.data : []
  const points = pointsData?.success ? pointsData.data : null
  const completed = tasks.filter(t => t.completed).length
  const totalPoints = tasks.filter(t => t.completed).reduce((sum, t) => sum + (t.points_earned || 0), 0)
  const allDone = tasks.length > 0 && completed === tasks.length

  // Cooldown timer with visual feedback
  useEffect(() => {
    const timer = setInterval(() => {
      setCooldowns(prev => {
        const updated: Record<number, number> = {}
        let hasActive = false
        let justExpired = false
        
        Object.entries(prev).forEach(([taskId, remaining]) => {
          if (remaining > 0) {
            const newRemaining = remaining - 1
            updated[parseInt(taskId)] = newRemaining
            hasActive = true
            
            // Check if cooldown just expired (was 1, now 0)
            if (remaining === 1) {
              justExpired = true
            }
          }
        })
        
        // Trigger haptic feedback if available when cooldown expires
        // Note: navigator.vibrate() is not supported on iOS Safari
        if (justExpired && 'vibrate' in navigator) {
          try {
            navigator.vibrate(50) // Short vibration
          } catch (e) {
            // Silently fail on unsupported browsers
          }
        }
        
        return hasActive ? updated : prev
      })
    }, 1000)
    
    return () => clearInterval(timer)
  }, [])

  function handleOpenLink(task: TaskItem) {
    // Open the destination URL directly - this will work in all browsers and Capacitor
    window.open(task.destination_url, '_blank', 'noopener,noreferrer')
    
    // Track the click in background - user opened the link
    tasksApi.trackClick(task.id).catch(console.error)
    
    // Start cooldown
    if (!cooldowns[task.id] && !task.completed) {
      setCooldowns(prev => ({ ...prev, [task.id]: task.cooldown_seconds || 30 }))
    }
  }

  function handleComplete(task: TaskItem) {
    if (!task.completed) {
      completeMutation.mutate(task.id)
    }
  }

  return (
    <div className="space-y-6">
      {/* Points Summary Card */}
      {points && (
        <div className="card bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-amber-100 p-2 rounded-xl">
                <Coins size={24} className="text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-amber-700 font-medium">আপনার পয়েন্ট</p>
                <p className="text-2xl font-bold text-amber-900">{points.available_points} পয়েন্ট</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-amber-600">এই মাসে</p>
              <p className="text-lg font-bold text-amber-800">+{points.monthly_earned}</p>
            </div>
          </div>
        </div>
      )}

      {/* Hero banner */}
      <div className={`rounded-3xl p-5 text-white relative overflow-hidden transition-all ${allDone
        ? 'bg-gradient-to-r from-green-600 to-emerald-500'
        : 'bg-gradient-to-r from-sky-700 via-blue-600 to-indigo-600'}`}>
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10">
          <h1 className="text-2xl font-bold">{allDone ? '🎉 ডেইলি টাস্ক' : '✅ ডেইলি টাস্ক'}</h1>
          <p className="text-blue-100 text-sm mt-1">আমাদের সোশ্যাল মিডিয়া পেজ ফলো করুন এবং পয়েন্ট অর্জন করুন</p>
          {totalPoints > 0 && (
            <p className="text-amber-100 text-xs mt-2 flex items-center gap-1">
              <Coins size={12} /> আজকে {totalPoints} পয়েন্ট অর্জন করেছেন
            </p>
          )}
        </div>
      </div>

      {/* Progress card */}
      <div className={`card transition-all ${allDone ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200' : ''}`}>
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm font-semibold text-gray-700">আজকের অগ্রগতি</span>
          <span className={`text-sm font-bold px-3 py-0.5 rounded-full ${allDone ? 'bg-green-100 text-green-700' : 'bg-primary-100 text-primary-700'}`}>
            {completed}/{tasks.length}
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
          <div
            className={`h-3 rounded-full transition-all duration-700 ${allDone ? 'bg-gradient-to-r from-green-400 to-emerald-500' : 'bg-gradient-to-r from-primary-400 to-teal-500'}`}
            style={{ width: tasks.length ? `${(completed / tasks.length) * 100}%` : '0%' }}
          />
        </div>
        {allDone && (
          <p className="text-sm text-green-700 font-semibold mt-3 flex items-center gap-1.5 bg-green-100 rounded-xl px-3 py-2">
            <CheckCircle size={16} /> 🎉 আজকের সব টাস্ক সম্পন্ন! ধন্যবাদ।
          </p>
        )}
        {!allDone && tasks.length > 0 && (
          <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
            <ExternalLink size={11} /> লিংকে ক্লিক করে {tasks[0]?.cooldown_seconds || 30} সেকেন্ড অপেক্ষা করুন, তারপর সম্পন্ন করুন
          </p>
        )}
      </div>

      {/* Task list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="card h-24 animate-pulse bg-gray-50" />)}
        </div>
      ) : tasks.length === 0 ? (
        <div className="card text-center py-10">
          <ExternalLink size={36} className="mx-auto mb-2 text-gray-200" />
          <p className="text-gray-400 text-sm">আজকের জন্য কোনো টাস্ক নেই</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task: TaskItem) => {
            const cooldownRemaining = cooldowns[task.id] || 0
            const canComplete = cooldownRemaining === 0 && task.clicked_at
            
            return (
              <div
                key={task.id}
                className={`card flex items-center gap-4 transition-all
                  ${task.completed
                    ? 'bg-green-50 border-green-100 cursor-default'
                    : `${platformBg[task.platform] ?? 'bg-white'} hover:shadow-md cursor-pointer`
                  }`}
              >
                {/* Status icon */}
                <div className="flex-shrink-0">
                  {task.completed
                    ? <CheckCircle size={26} className="text-green-500" />
                    : <Circle size={26} className="text-gray-200" />
                  }
                </div>

                {/* Platform icon */}
                <div className="flex-shrink-0 w-8 flex justify-center">
                  {platformIcon[task.platform] ?? platformIcon.other}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm ${task.completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                    {task.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-amber-600 font-medium flex items-center gap-0.5">
                      <Coins size={10} /> {task.points} পয়েন্ট
                    </span>
                    <span className="text-gray-300">•</span>
                    <span className="text-xs text-gray-400">{platformLabel[task.platform] ?? 'লিংক'}</span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex-shrink-0 flex flex-col items-end gap-1">
                  {task.completed ? (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">✓ সম্পন্ন</span>
                  ) : cooldownRemaining > 0 ? (
                    <>
                      <button
                        onClick={() => handleOpenLink(task)}
                        className="text-xs bg-primary-100 text-primary-700 px-3 py-1.5 rounded-full font-medium flex items-center gap-1 hover:bg-primary-200 transition-colors"
                      >
                        <ExternalLink size={11} /> ওপেন
                      </button>
                      <span className={`text-xs font-medium flex items-center gap-1 transition-colors ${
                        cooldownRemaining <= 5 ? 'text-green-600 animate-pulse' : 'text-orange-600'
                      }`}>
                        <Clock size={10} /> {cooldownRemaining}s
                      </span>
                    </>
                  ) : task.clicked_at ? (
                    <button
                      onClick={() => handleComplete(task)}
                      disabled={completeMutation.isPending}
                      className="text-xs bg-green-500 text-white px-3 py-1.5 rounded-full font-medium hover:bg-green-600 transition-colors disabled:opacity-50 motion-safe:animate-bounce"
                    >
                      {completeMutation.isPending ? '...' : '✓ সম্পন্ন'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleOpenLink(task)}
                      className="text-xs bg-primary-100 text-primary-700 px-3 py-1.5 rounded-full font-medium flex items-center gap-1 hover:bg-primary-200 transition-colors"
                    >
                      <ExternalLink size={11} /> ভিজিট করুন
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Info note */}
      <p className="text-xs text-gray-400 text-center">
        📅 টাস্কগুলো প্রতিদিন মধ্যরাতে রিসেট হয় • পয়েন্টগুলো মাস শেষে রিওয়ার্ডে পরিবর্তন করা যাবে
      </p>
    </div>
  )
}
