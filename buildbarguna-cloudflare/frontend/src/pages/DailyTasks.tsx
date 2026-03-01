import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tasksApi, type TaskItem } from '../lib/api'
import { CheckCircle, Circle, ExternalLink, Facebook, Youtube, Send } from 'lucide-react'

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
  const { data, isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => tasksApi.list(),
    staleTime: 30_000
  })

  const completeMutation = useMutation({
    mutationFn: (id: number) => tasksApi.complete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] })
  })

  const tasks = data?.success ? data.data : []
  const completed = tasks.filter(t => t.completed).length
  const allDone = tasks.length > 0 && completed === tasks.length

  // One-click: open link AND mark complete simultaneously
  function handleVisitAndComplete(task: TaskItem) {
    window.open(`/api/tasks/${task.id}/redirect`, '_blank', 'noopener,noreferrer')
    if (!task.completed) {
      completeMutation.mutate(task.id)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">ডেইলি টাস্ক</h1>
        <p className="text-gray-500 text-sm mt-1">আমাদের সোশ্যাল মিডিয়া পেজ ফলো করুন</p>
      </div>

      {/* Progress card */}
      <div className={`card transition-colors ${allDone ? 'bg-green-50 border-green-100' : ''}`}>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">আজকের অগ্রগতি</span>
          <span className={`text-sm font-bold ${allDone ? 'text-green-600' : 'text-primary-600'}`}>
            {completed}/{tasks.length}
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${allDone ? 'bg-green-500' : 'bg-primary-500'}`}
            style={{ width: tasks.length ? `${(completed / tasks.length) * 100}%` : '0%' }}
          />
        </div>
        {allDone && (
          <p className="text-sm text-green-600 font-medium mt-2 flex items-center gap-1">
            <CheckCircle size={16} /> 🎉 আজকের সব টাস্ক সম্পন্ন! ধন্যবাদ।
          </p>
        )}
        {!allDone && tasks.length > 0 && (
          <p className="text-xs text-gray-400 mt-2">
            লিংকে ক্লিক করলে স্বয়ংক্রিয়ভাবে সম্পন্ন হবে
          </p>
        )}
      </div>

      {/* Task list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="card h-20 animate-pulse bg-gray-50" />)}
        </div>
      ) : tasks.length === 0 ? (
        <div className="card text-center py-10">
          <ExternalLink size={36} className="mx-auto mb-2 text-gray-200" />
          <p className="text-gray-400 text-sm">আজকের জন্য কোনো টাস্ক নেই</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task: TaskItem) => (
            <button
              key={task.id}
              onClick={() => handleVisitAndComplete(task)}
              disabled={!!task.completed || completeMutation.isPending}
              aria-label={`${task.title} — ${task.completed ? 'সম্পন্ন' : 'ভিজিট করুন'}`}
              className={`card w-full text-left flex items-center gap-4 transition-all
                ${task.completed
                  ? 'bg-green-50 border-green-100 cursor-default'
                  : `${platformBg[task.platform] ?? 'bg-white'} hover:shadow-md active:scale-[0.99] cursor-pointer`
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
                <p className="text-xs text-gray-400 mt-0.5">{platformLabel[task.platform] ?? 'লিংক'}</p>
              </div>

              {/* CTA */}
              <div className="flex-shrink-0">
                {task.completed ? (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">✓ সম্পন্ন</span>
                ) : (
                  <span className="text-xs bg-primary-100 text-primary-700 px-3 py-1.5 rounded-full font-medium flex items-center gap-1">
                    <ExternalLink size={11} /> ভিজিট করুন
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Info note */}
      <p className="text-xs text-gray-400 text-center">
        📅 টাস্কগুলো প্রতিদিন মধ্যরাতে রিসেট হয়
      </p>
    </div>
  )
}
