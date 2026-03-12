import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { profitApi, type FinancialAuditLogEntry } from '../../lib/api'
import { formatTaka, formatDate } from '../../lib/auth'
import { Shield, Filter, ChevronLeft, ChevronRight } from 'lucide-react'

const ENTITY_LABELS: Record<string, string> = {
  profit_distribution: 'প্রফিট ডিস্ট্রিবিউশন',
  company_fund: 'কোম্পানি ফান্ড',
  user_balance: 'ইউজার ব্যালেন্স',
  shareholder_profit: 'শেয়ারহোল্ডার প্রফিট'
}

const ACTION_LABELS: Record<string, string> = {
  create: 'তৈরি',
  distribute: 'বিতরণ',
  cancel: 'বাতিল',
  credit: 'জমা',
  debit: 'খরচ',
  withdraw: 'উত্তোলন',
  approve: 'অনুমোদিত',
  reject: 'প্রত্যাখ্যান',
  adjust: 'সমন্বয়'
}

const ACTION_COLORS: Record<string, string> = {
  create: 'bg-blue-100 text-blue-700',
  distribute: 'bg-green-100 text-green-700',
  cancel: 'bg-red-100 text-red-700',
  credit: 'bg-emerald-100 text-emerald-700',
  debit: 'bg-orange-100 text-orange-700',
  withdraw: 'bg-amber-100 text-amber-700',
  approve: 'bg-green-100 text-green-700',
  reject: 'bg-red-100 text-red-700',
  adjust: 'bg-purple-100 text-purple-700'
}

export default function AuditLog() {
  const [page, setPage] = useState(1)
  const [entityFilter, setEntityFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['audit-log', page, entityFilter, actionFilter],
    queryFn: () => profitApi.getAuditLog(page, entityFilter || undefined, actionFilter || undefined)
  })

  const result = data?.success ? data.data : null
  const items = result?.items ?? []
  const pagination = result?.pagination

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-700 via-gray-600 to-zinc-700 rounded-3xl p-5 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Shield size={24} /> ফিন্যান্সিয়াল অডিট লগ
          </h1>
          <p className="text-white/70 text-sm mt-1">সকল আর্থিক কার্যক্রমের অপরিবর্তনযোগ্য রেকর্ড</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={16} className="text-gray-500" />
          <span className="text-sm font-medium text-gray-600">ফিল্টার</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <select
            value={entityFilter}
            onChange={e => { setEntityFilter(e.target.value); setPage(1) }}
            className="input text-sm"
          >
            <option value="">সব ধরন</option>
            {Object.entries(ENTITY_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
          <select
            value={actionFilter}
            onChange={e => { setActionFilter(e.target.value); setPage(1) }}
            className="input text-sm"
          >
            <option value="">সব অ্যাকশন</option>
            {Object.entries(ACTION_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Log Entries */}
      <div className="card">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="shimmer rounded-xl h-16 w-full" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Shield size={48} className="mx-auto mb-3 opacity-40" />
            <p>কোনো অডিট লগ পাওয়া যায়নি</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((entry: FinancialAuditLogEntry) => (
              <div key={entry.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ACTION_COLORS[entry.action] || 'bg-gray-100 text-gray-700'}`}>
                        {ACTION_LABELS[entry.action] || entry.action}
                      </span>
                      <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                        {ENTITY_LABELS[entry.entity_type] || entry.entity_type}
                      </span>
                      <span className="text-xs text-gray-400">#{entry.entity_id}</span>
                    </div>
                    {entry.description && (
                      <p className="text-sm text-gray-700 mt-1">{entry.description}</p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                      <span>{entry.actor_name || `User #${entry.actor_id}`}</span>
                      <span>•</span>
                      <span>{formatDate(entry.created_at)}</span>
                    </div>
                  </div>
                  {entry.amount_paisa != null && entry.amount_paisa !== 0 && (
                    <span className={`text-sm font-bold ${entry.amount_paisa > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {entry.amount_paisa > 0 ? '+' : ''}{formatTaka(entry.amount_paisa)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.total > pagination.limit && (
          <div className="flex items-center justify-between mt-4 pt-3 border-t">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="flex items-center gap-1 text-sm text-gray-600 disabled:opacity-40"
            >
              <ChevronLeft size={16} /> আগের
            </button>
            <span className="text-sm text-gray-500">
              পৃষ্ঠা {page} / {Math.ceil(pagination.total / pagination.limit)}
            </span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={!pagination.hasMore}
              className="flex items-center gap-1 text-sm text-gray-600 disabled:opacity-40"
            >
              পরের <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
