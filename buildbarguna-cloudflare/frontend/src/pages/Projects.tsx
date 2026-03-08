import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { projectsApi, type ProjectItem } from '../lib/api'
import { formatTaka } from '../lib/auth'
import { Briefcase, TrendingUp, Users, ArrowRight } from 'lucide-react'
import Disclaimer from '../components/Disclaimer'

export default function Projects() {
  const { data, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list()
  })

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-400 text-sm">প্রজেক্ট লোড হচ্ছে...</p>
      </div>
    </div>
  )

  const projects = data?.success ? data.data.items : []

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="bg-gradient-to-r from-primary-700 to-teal-600 rounded-3xl p-5 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10">
          <h1 className="text-2xl font-bold"><img src="/bbi logo.jpg" alt="BBI Logo" className="inline h-6 w-6 mr-2 object-contain" />লাইভ প্রজেক্টসমূহ</h1>
          <p className="text-primary-100 text-sm mt-1">শেয়ার কিনে বিনিয়োগ শুরু করুন</p>
        </div>
      </div>

      <Disclaimer variant="halal" />
      <Disclaimer variant="investment-risk" compact />

      {projects.length === 0 && (
        <div className="card text-center py-16">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Briefcase size={32} className="text-gray-300" />
          </div>
          <p className="text-gray-500 font-medium">কোনো প্রজেক্ট পাওয়া যায়নি</p>
          <p className="text-gray-400 text-sm mt-1">শীঘ্রই নতুন প্রজেক্ট আসছে</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {projects.map((p: ProjectItem, idx: number) => {
          const soldPct = Math.round((p.sold_shares / p.total_shares) * 100)
          const available = p.total_shares - p.sold_shares
          const isSoldOut = available === 0
          return (
            <div key={p.id} className="card hover:shadow-lg transition-all hover:-translate-y-0.5 flex flex-col overflow-hidden p-0 slide-up" style={{animationDelay: `${idx * 0.08}s`}}>
              {/* Project image or gradient banner */}
              {p.image_url ? (
                <img src={p.image_url} alt={p.title} className="w-full h-44 object-cover" />
              ) : (
                <div className="w-full h-36 bg-gradient-to-br from-primary-600 to-teal-500 flex items-center justify-center relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                  <img src="/bbi logo.jpg" alt="BBI Logo" className="w-16 h-16 object-contain" />
                </div>
              )}

              <div className="p-4 flex flex-col flex-1">
                {/* Title + status */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-bold text-gray-900 text-base leading-tight">{p.title}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold shrink-0 ${isSoldOut ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {isSoldOut ? 'শেষ' : '● সক্রিয়'}
                  </span>
                </div>

                {p.description && <p className="text-gray-500 text-xs mb-3 line-clamp-2">{p.description}</p>}

                {/* Key metrics */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-primary-50 rounded-xl p-2.5 text-center">
                    <p className="text-xs text-gray-400 mb-0.5">প্রতি শেয়ার</p>
                    <p className="font-bold text-primary-700 text-sm">{formatTaka(p.share_price)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-2.5 text-center">
                    <p className="text-xs text-gray-400 mb-0.5">বাকি শেয়ার</p>
                    <p className={`font-bold text-sm ${isSoldOut ? 'text-red-600' : 'text-emerald-600'}`}>
                      {available}/{p.total_shares}
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span className="flex items-center gap-1"><Users size={10} /> {p.sold_shares} বিক্রিত</span>
                    <span>{soldPct}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${soldPct > 80 ? 'bg-red-400' : 'bg-primary-500'}`}
                      style={{ width: `${soldPct}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-400 mb-4">
                  <span className="flex items-center gap-1"><TrendingUp size={10} className="text-primary-500" /> মোট মূলধন</span>
                  <span className="font-semibold text-gray-700">{formatTaka(p.total_capital)}</span>
                </div>

                <Link
                  to={`/projects/${p.id}`}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all mt-auto
                    ${isSoldOut
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-primary-600 hover:bg-primary-700 text-white shadow-sm hover:shadow-md'}`}
                >
                  {isSoldOut ? 'শেয়ার শেষ' : (<>শেয়ার কিনুন <ArrowRight size={14} /></>)}
                </Link>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
