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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">অ্যাডমিন ড্যাশবোর্ড</h1>
        <p className="text-gray-500 text-sm mt-1">সামগ্রিক পরিসংখ্যান</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-blue-100 p-2 rounded-lg"><Users size={20} className="text-blue-600" /></div>
            <span className="text-sm text-gray-500">মোট মেম্বার</span>
          </div>
          <p className="text-2xl font-bold">{totalUsers}</p>
        </div>
        <div className="card">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-purple-100 p-2 rounded-lg"><Briefcase size={20} className="text-purple-600" /></div>
            <span className="text-sm text-gray-500">প্রজেক্ট</span>
          </div>
          <p className="text-2xl font-bold">{totalProjects}</p>
        </div>
        <div className="card">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-yellow-100 p-2 rounded-lg"><PieChart size={20} className="text-yellow-600" /></div>
            <span className="text-sm text-gray-500">অপেক্ষমাণ</span>
          </div>
          <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
        </div>
        <div className="card">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-green-100 p-2 rounded-lg"><TrendingUp size={20} className="text-green-600" /></div>
            <span className="text-sm text-gray-500">মোট মূলধন</span>
          </div>
          <p className="text-2xl font-bold text-green-700">{formatTaka(totalCapital)}</p>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {pendingCount > 0 && (
          <Link to="/admin/shares" className="card border-yellow-200 bg-yellow-50 hover:shadow-md transition-shadow">
            <p className="font-bold text-yellow-800">⚠️ {pendingCount}টি শেয়ার অনুরোধ অপেক্ষমাণ</p>
            <p className="text-sm text-yellow-600 mt-1">অনুমোদন দিতে ক্লিক করুন →</p>
          </Link>
        )}
        <Link to="/admin/earnings" className="card border-green-200 bg-green-50 hover:shadow-md transition-shadow">
          <p className="font-bold text-green-800">💰 মুনাফা বিতরণ করুন</p>
          <p className="text-sm text-green-600 mt-1">মাসিক মুনাফা সেট ও বিতরণ →</p>
        </Link>
      </div>
    </div>
  )
}
