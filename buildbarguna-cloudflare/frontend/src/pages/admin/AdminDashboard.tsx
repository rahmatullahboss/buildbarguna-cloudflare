import { useQuery } from '@tanstack/react-query'
import { adminApi } from '../../lib/api'
import { formatTaka } from '../../lib/auth'
import { Users, Briefcase, PieChart, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function AdminDashboard() {
  const { data: users } = useQuery({ queryKey: ['admin-users'], queryFn: () => adminApi.users() })
  const { data: projects } = useQuery({ queryKey: ['admin-projects'], queryFn: () => adminApi.projects() })
  const { data: pending } = useQuery({ queryKey: ['admin-pending'], queryFn: () => adminApi.pendingShares() })

  const totalUsers = users?.success ? users.data.total : 0
  const totalProjects = projects?.success ? projects.data.total : 0
  const pendingCount = pending?.success ? pending.data.total : 0
  const totalCapital = projects?.success
    ? projects.data.items.reduce((s, p) => s + p.total_capital, 0) : 0

  return (
    <div className="space-y-6">
      {/* Hero banner */}
      <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 rounded-3xl p-5 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-36 h-36 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 flex items-center gap-3">
          <div className="bg-white/10 p-3 rounded-2xl text-2xl">⚙️</div>
          <div>
            <h1 className="text-2xl font-bold">অ্যাডমিন ড্যাশবোর্ড</h1>
            <p className="text-gray-300 text-sm mt-0.5">সামগ্রিক পরিসংখ্যান ও নিয়ন্ত্রণ</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-4 text-white shadow-md">
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-white/20 p-1.5 rounded-xl"><Users size={18} className="text-white" /></div>
            <span className="text-blue-100 text-sm">মোট মেম্বার</span>
          </div>
          <p className="text-3xl font-bold">{totalUsers}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl p-4 text-white shadow-md">
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-white/20 p-1.5 rounded-xl"><Briefcase size={18} className="text-white" /></div>
            <span className="text-purple-100 text-sm">প্রজেক্ট</span>
          </div>
          <p className="text-3xl font-bold">{totalProjects}</p>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-4 text-white shadow-md">
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-white/20 p-1.5 rounded-xl"><PieChart size={18} className="text-white" /></div>
            <span className="text-amber-100 text-sm">অপেক্ষমাণ</span>
          </div>
          <p className="text-3xl font-bold">{pendingCount}</p>
          {pendingCount > 0 && <p className="text-amber-200 text-xs mt-1">⚠️ অনুমোদন দরকার</p>}
        </div>
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-4 text-white shadow-md">
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-white/20 p-1.5 rounded-xl"><TrendingUp size={18} className="text-white" /></div>
            <span className="text-green-100 text-sm">মোট মূলধন</span>
          </div>
          <p className="text-2xl font-bold">{formatTaka(totalCapital)}</p>
        </div>
      </div>

      {/* Quick action cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {pendingCount > 0 && (
          <Link to="/admin/shares" className="card border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 hover:shadow-lg transition-all hover:-translate-y-0.5 group">
            <div className="flex items-center gap-3">
              <div className="bg-amber-100 group-hover:bg-amber-200 p-3 rounded-2xl transition-colors">⚠️</div>
              <div>
                <p className="font-bold text-amber-800">{pendingCount}টি শেয়ার অনুরোধ অপেক্ষমাণ</p>
                <p className="text-sm text-amber-600 mt-0.5">অনুমোদন দিতে ক্লিক করুন →</p>
              </div>
            </div>
          </Link>
        )}
        <Link to="/admin/earnings" className="card border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 hover:shadow-lg transition-all hover:-translate-y-0.5 group">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 group-hover:bg-green-200 p-3 rounded-2xl transition-colors">💰</div>
            <div>
              <p className="font-bold text-green-800">মুনাফা বিতরণ করুন</p>
              <p className="text-sm text-green-600 mt-0.5">মাসিক মুনাফা সেট ও বিতরণ →</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  )
}
