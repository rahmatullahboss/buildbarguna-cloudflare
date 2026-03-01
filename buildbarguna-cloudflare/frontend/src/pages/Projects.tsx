import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { projectsApi, type ProjectItem } from '../lib/api'
import { formatTaka } from '../lib/auth'
import { Briefcase, TrendingUp } from 'lucide-react'
import Disclaimer from '../components/Disclaimer'

export default function Projects() {
  const { data, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list()
  })

  if (isLoading) return <div className="text-center py-12 text-gray-400">লোড হচ্ছে...</div>

  const projects = data?.success ? data.data.items : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">লাইভ প্রজেক্টসমূহ</h1>
        <p className="text-gray-500 text-sm mt-1">শেয়ার কিনে বিনিয়োগ শুরু করুন</p>
      </div>

      <Disclaimer variant="halal" />
      <Disclaimer variant="investment-risk" compact />

      {projects.length === 0 && (
        <div className="card text-center py-12">
          <Briefcase size={48} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">কোনো প্রজেক্ট পাওয়া যায়নি</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((p: ProjectItem) => {
          const soldPct = Math.round((p.sold_shares / p.total_shares) * 100)
          const available = p.total_shares - p.sold_shares
          return (
            <div key={p.id} className="card hover:shadow-md transition-shadow flex flex-col">
              {p.image_url && (
                <img src={p.image_url} alt={p.title} className="w-full h-40 object-cover rounded-lg mb-4" />
              )}
              <h3 className="font-bold text-gray-900 text-lg mb-1">{p.title}</h3>
              {p.description && <p className="text-gray-500 text-sm mb-3 line-clamp-2">{p.description}</p>}

              <div className="space-y-2 mb-4 flex-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">মোট মূলধন</span>
                  <span className="font-semibold">{formatTaka(p.total_capital)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">প্রতি শেয়ার</span>
                  <span className="font-semibold text-primary-600">{formatTaka(p.share_price)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">বাকি শেয়ার</span>
                  <span className={`font-semibold ${available === 0 ? 'text-red-500' : 'text-green-600'}`}>
                    {available}/{p.total_shares}
                  </span>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-gray-100 rounded-full h-2 mt-1">
                  <div className="bg-primary-500 h-2 rounded-full transition-all" style={{ width: `${soldPct}%` }} />
                </div>
                <p className="text-xs text-gray-400 text-right">{soldPct}% বিক্রিত</p>
              </div>

              <Link
                to={`/projects/${p.id}`}
                className={`btn-primary text-center text-sm ${available === 0 ? 'opacity-50 pointer-events-none' : ''}`}
              >
                {available === 0 ? 'শেয়ার শেষ' : 'শেয়ার কিনুন'}
              </Link>
            </div>
          )
        })}
      </div>
    </div>
  )
}
