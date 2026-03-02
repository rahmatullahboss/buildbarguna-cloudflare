import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../../lib/api'
import { formatTaka, formatDate } from '../../lib/auth'
import { UserCheck, UserX } from 'lucide-react'

export default function AdminUsers() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['admin-users'], queryFn: () => adminApi.users() })

  const toggleMutation = useMutation({
    mutationFn: (id: number) => adminApi.toggleUser(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] })
  })

  const users = data?.success ? data.data.items : []

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 rounded-3xl p-5 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 flex items-center gap-3">
          <div className="bg-white/15 p-2.5 rounded-2xl text-2xl">👥</div>
          <div>
            <h1 className="text-2xl font-bold">মেম্বার তালিকা</h1>
            <p className="text-blue-100 text-sm mt-0.5">মোট {data?.success ? data.data.total : 0} জন মেম্বার</p>
          </div>
        </div>
      </div>

      {isLoading ? <p className="text-gray-400 text-sm">লোড হচ্ছে...</p> : (
        <div className="space-y-3">
          {users.map(u => (
            <div key={u.id} className={`card flex items-center gap-4 ${!u.is_active ? 'opacity-60' : ''}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900">{u.name}</p>
                  {u.role === 'admin' && <span className="badge-active text-xs">অ্যাডমিন</span>}
                  {!u.is_active && <span className="badge-rejected text-xs">নিষ্ক্রিয়</span>}
                </div>
                <p className="text-sm text-gray-500">{u.phone}</p>
                <div className="flex gap-4 mt-1 text-xs text-gray-400">
                  <span>রেফারেল: <strong className="font-mono">{u.referral_code}</strong></span>
                  {u.referred_by && <span>রেফার: {u.referred_by}</span>}
                  <span>যোগ দিয়েছে: {formatDate(u.created_at)}</span>
                </div>
              </div>
              {u.role !== 'admin' && (
                <button onClick={() => toggleMutation.mutate(u.id)}
                  className={`shrink-0 flex items-center gap-1 text-xs py-1.5 px-3 rounded-lg border font-medium transition-colors
                    ${u.is_active
                      ? 'border-red-200 text-red-600 hover:bg-red-50'
                      : 'border-green-200 text-green-600 hover:bg-green-50'}`}>
                  {u.is_active ? <><UserX size={14} /> নিষ্ক্রিয়</> : <><UserCheck size={14} /> সক্রিয়</>}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
