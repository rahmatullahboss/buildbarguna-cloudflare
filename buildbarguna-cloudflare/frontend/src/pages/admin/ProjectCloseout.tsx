import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../../lib/api'
import { formatTaka } from '../../lib/auth'
import { AlertTriangle, ArrowLeft, CheckCircle2, Lock, Wallet, TrendingUp, XCircle } from 'lucide-react'

type ChecklistState = {
  pending_purchases_resolved: boolean
  pending_expenses_resolved: boolean
  profits_resolved: boolean
  losses_resolved: boolean
}

const blockerActionMap: Record<string, { label: string; path: (projectId: string) => string }> = {
  PENDING_SHARE_PURCHASES: {
    label: 'শেয়ার অনুরোধ দেখুন',
    path: () => '/admin/shares'
  },
  PENDING_EXPENSE_ALLOCATIONS: {
    label: 'খরচ বরাদ্দ করুন',
    path: () => '/admin/company-expenses'
  },
  UNDISTRIBUTED_PROFIT: {
    label: 'মুনাফা ডিস্ট্রিবিউট করুন',
    path: (projectId) => `/admin/projects/${projectId}/distribute-profit`
  },
  OPS_RECONCILIATION_PENDING: {
    label: 'Compliance review করুন',
    path: (projectId) => `/admin/projects/${projectId}/compliance`
  },
  LOSS_SETTLEMENT_UNRESOLVED: {
    label: 'Loss review করুন',
    path: (projectId) => `/admin/projects/${projectId}/compliance`
  },
  LOSS_SETTLEMENT_REQUIRED: {
    label: 'Loss review করুন',
    path: (projectId) => `/admin/projects/${projectId}/compliance`
  }
}

export default function ProjectCloseout() {
  const { projectId = '' } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const mode = searchParams.get('mode') === 'closed' ? 'closed' : 'completed'
  const [checklist, setChecklist] = useState<ChecklistState>({
    pending_purchases_resolved: false,
    pending_expenses_resolved: false,
    profits_resolved: false,
    losses_resolved: false
  })

  const previewQuery = useQuery({
    queryKey: ['project-closeout-preview', projectId, mode],
    queryFn: () => adminApi.getProjectCloseoutPreview(Number(projectId), mode),
    enabled: !!projectId
  })
  const monitorQuery = useQuery({
    queryKey: ['project-monitor', projectId],
    queryFn: () => adminApi.getProjectMonitor(Number(projectId)),
    enabled: !!projectId
  })

  const preview = previewQuery.data?.success ? previewQuery.data.data : null
  const monitor = monitorQuery.data?.success ? monitorQuery.data.data : null
  const allChecked = Object.values(checklist).every(Boolean)

  const mutation = useMutation({
    mutationFn: () => adminApi.executeProjectCloseout(Number(projectId), {
      mode,
      confirm_closeout: true,
      checklist
    }),
    onSuccess: async (res) => {
      if (!res.success) throw new Error(res.error)
      await qc.invalidateQueries({ queryKey: ['admin-projects'] })
      await qc.invalidateQueries({ queryKey: ['project-closeout-preview', projectId, mode] })
      navigate('/admin/projects')
    }
  })

  const title = mode === 'completed' ? 'প্রজেক্ট সম্পন্ন Closeout' : 'প্রজেক্ট বন্ধ Closeout'
  const canSubmit = !!preview?.can_closeout && allChecked && !mutation.isPending
  const blockers = preview?.blockers ?? []

  const checklistLabels = useMemo(() => ([
    { key: 'pending_purchases_resolved', label: 'শেয়ার কেনার pending অনুরোধ resolve করা হয়েছে' },
    { key: 'pending_expenses_resolved', label: 'company expense allocation resolve করা হয়েছে' },
    { key: 'profits_resolved', label: 'pending profit/loss review সম্পন্ন হয়েছে' },
    { key: 'losses_resolved', label: 'loss settlement blocker না থাকার বিষয়টি যাচাই করেছি' }
  ] as const), [])

  if (previewQuery.isLoading) {
    return <div className="card text-center py-10">Closeout preview লোড হচ্ছে...</div>
  }

  if (!previewQuery.data?.success || !preview) {
    return <div className="card text-center py-10 text-red-600">Closeout preview লোড করা যায়নি</div>
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-600 rounded-3xl p-5 text-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-slate-300 mb-2">Settlement Workflow</p>
            <h1 className="text-2xl font-bold">{title}</h1>
            <p className="text-sm text-slate-200 mt-1">{preview.project.title}</p>
          </div>
          <Link to="/admin/projects" className="bg-white/10 hover:bg-white/20 px-3 py-2 rounded-xl text-sm flex items-center gap-2">
            <ArrowLeft size={14} /> ফিরে যান
          </Link>
        </div>
      </div>

      <div className={`card border ${preview.can_closeout ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
        <div className="flex items-start gap-3">
          {preview.can_closeout ? <CheckCircle2 className="text-green-600 mt-0.5" size={20} /> : <Lock className="text-amber-600 mt-0.5" size={20} />}
          <div>
            <p className="font-semibold text-gray-900">{preview.can_closeout ? 'Closeout ready' : 'Closeout blocked'}</p>
            <p className="text-sm text-gray-600 mt-1">
              {preview.can_closeout
                ? 'Terminal status দেওয়ার আগে সব blocker clear হয়েছে। checklist confirm করে finalize করুন।'
                : 'নিচের blocker resolve না করে project finalize করা যাবে না।'}
            </p>
          </div>
        </div>
        {preview.existing_closeout_run && (
          <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            এই প্রজেক্টের settlement আগে চালানো হয়েছে। Run #{preview.existing_closeout_run.id} • {new Date(preview.existing_closeout_run.executed_at).toLocaleString()}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><TrendingUp size={18} className="text-emerald-600" /> Financial Snapshot</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">মোট আয়</span><span className="font-semibold">{formatTaka(preview.financials.total_revenue)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">সরাসরি খরচ</span><span className="font-semibold">{formatTaka(preview.financials.direct_expense)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">বরাদ্দকৃত company expense</span><span className="font-semibold">{formatTaka(preview.financials.company_expense_allocation)}</span></div>
            <div className="flex justify-between border-t pt-2"><span className="text-gray-700 font-medium">নিট ফলাফল</span><span className={`font-bold ${preview.financials.net_profit >= 0 ? 'text-green-700' : 'text-red-600'}`}>{formatTaka(preview.financials.net_profit)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">আগে ডিস্ট্রিবিউট হয়েছে</span><span className="font-semibold">{formatTaka(preview.financials.previously_distributed)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">অবিতরিত মুনাফা</span><span className="font-semibold text-amber-600">{formatTaka(preview.financials.available_profit)}</span></div>
          </div>
        </div>

        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Wallet size={18} className="text-blue-600" /> Settlement Snapshot</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">বিক্রিত শেয়ার</span><span className="font-semibold">{preview.settlement.total_shares_sold}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">মোট principal refund</span><span className="font-semibold">{formatTaka(preview.settlement.capital_refund_total)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">চূড়ান্ত profit pool</span><span className="font-semibold">{formatTaka(preview.settlement.final_profit_pool)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">pending share purchase</span><span className="font-semibold">{preview.settlement.pending_share_purchases}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">pending expense allocation</span><span className="font-semibold">{preview.settlement.pending_expense_allocations}</span></div>
          </div>
        </div>
      </div>

      {monitor && (
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-3">Project Monitor</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-4">
            <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3">
              <p className="text-gray-500 text-xs mb-1">Project members</p>
              <p className="font-semibold">{monitor.members.length}</p>
            </div>
            <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3">
              <p className="text-gray-500 text-xs mb-1">Shareholders</p>
              <p className="font-semibold">{monitor.summary.shareholders_count}</p>
            </div>
            <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3">
              <p className="text-gray-500 text-xs mb-1">Claimable</p>
              <p className="font-semibold">{formatTaka(monitor.summary.claimable_total)}</p>
            </div>
            <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3">
              <p className="text-gray-500 text-xs mb-1">Withdrawn</p>
              <p className="font-semibold">{formatTaka(monitor.summary.withdrawn_total)}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Assigned Members</h3>
              <div className="space-y-2">
                {monitor.members.length === 0 ? <p className="text-sm text-gray-500">কোনো assigned member নেই।</p> : monitor.members.map((member) => (
                  <div key={member.id} className="rounded-xl border border-gray-200 px-3 py-2">
                    <p className="font-medium text-sm text-gray-900">{member.user_name || `User #${member.user_id}`}</p>
                    <p className="text-xs text-gray-500 mt-1">{member.role_label || 'No role label'}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Shareholders</h3>
              <div className="space-y-2">
                {monitor.shareholders.length === 0 ? <p className="text-sm text-gray-500">কোনো shareholder নেই।</p> : monitor.shareholders.map((holder) => (
                  <div key={holder.user_id} className="rounded-xl border border-gray-200 px-3 py-2">
                    <div className="flex justify-between gap-3">
                      <div>
                        <p className="font-medium text-sm text-gray-900">{holder.user_name}</p>
                        <p className="text-xs text-gray-500 mt-1">{holder.quantity} শেয়ার • {(holder.ownership_bps / 100).toFixed(2)}%</p>
                      </div>
                      <div className="text-right text-xs">
                        <p className="text-amber-700 font-semibold">Claimable {formatTaka(holder.claimable_amount)}</p>
                        <p className="text-gray-600 mt-1">Withdrawn {formatTaka(holder.withdrawn_amount)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <h2 className="font-semibold text-gray-900 mb-3">Settlement Projection</h2>
        <div className="space-y-3">
          {preview.settlement_projection.length === 0 ? (
            <p className="text-sm text-gray-500">কোনো shareholder নেই।</p>
          ) : preview.settlement_projection.map((item) => (
            <div key={item.user_id} className="rounded-xl border border-gray-200 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-gray-900">{item.user_name}</p>
                  <p className="text-xs text-gray-500 mt-1">{item.shares_held} শেয়ার • {(item.ownership_bps / 100).toFixed(2)}%</p>
                </div>
                <div className="text-right text-sm">
                  <p className="text-emerald-700 font-semibold">মূলধন: {formatTaka(item.principal_refund_amount)}</p>
                  <p className="text-blue-700 font-semibold mt-1">চূড়ান্ত লাভ: {formatTaka(item.final_profit_amount)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h2 className="font-semibold text-gray-900 mb-3">Governance Snapshot</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
          <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3">
            <p className="text-gray-500 text-xs mb-1">চুক্তির ধরন</p>
            <p className="font-semibold uppercase">{preview.compliance.contract_type}</p>
          </div>
          <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3">
            <p className="text-gray-500 text-xs mb-1">Shariah screening</p>
            <p className="font-semibold">{preview.compliance.shariah_screening_status}</p>
          </div>
          <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3">
            <p className="text-gray-500 text-xs mb-1">Ops reconciliation</p>
            <p className="font-semibold">{preview.compliance.ops_reconciliation_status}</p>
          </div>
          <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3">
            <p className="text-gray-500 text-xs mb-1">Loss settlement</p>
            <p className="font-semibold">{preview.compliance.loss_settlement_status}</p>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><AlertTriangle size={18} className="text-amber-600" /> Blockers</h2>
        <div className="space-y-3">
          {blockers.length === 0 && (
            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              কোনো blocker নেই।
            </div>
          )}
          {blockers.map((blocker) => {
            const action = blockerActionMap[blocker.code]
            return (
              <div key={blocker.code} className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-amber-900 flex items-center gap-2"><XCircle size={16} /> {blocker.message}</p>
                    {(blocker.amount_paisa != null || blocker.count != null) && (
                      <p className="text-xs text-amber-700 mt-1">
                        {blocker.amount_paisa != null && <>পরিমাণ: {formatTaka(blocker.amount_paisa)}</>}
                        {blocker.amount_paisa != null && blocker.count != null && ' • '}
                        {blocker.count != null && <>সংখ্যা: {blocker.count}</>}
                      </p>
                    )}
                  </div>
                  {action && (
                    <Link to={action.path(projectId)} className="text-xs font-semibold text-amber-800 border border-amber-300 px-3 py-1.5 rounded-lg hover:bg-amber-100 whitespace-nowrap">
                      {action.label}
                    </Link>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="card">
        <h2 className="font-semibold text-gray-900 mb-3">Admin Checklist</h2>
        <div className="space-y-3">
          {checklistLabels.map((item) => (
            <label key={item.key} className="flex items-start gap-3 rounded-xl border border-gray-200 px-4 py-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-1"
                checked={checklist[item.key]}
                onChange={(e) => setChecklist((prev) => ({ ...prev, [item.key]: e.target.checked }))}
              />
              <span className="text-sm text-gray-700">{item.label}</span>
            </label>
          ))}
        </div>

        {mutation.isError && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {(mutation.error as Error).message}
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            onClick={() => mutation.mutate()}
            disabled={!canSubmit}
            className={`px-5 py-3 rounded-xl text-sm font-semibold ${canSubmit ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
          >
            {mode === 'completed' ? 'Finalize as Completed' : 'Finalize as Closed'}
          </button>
          <Link to="/admin/projects" className="px-5 py-3 rounded-xl text-sm font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50">
            বাতিল
          </Link>
        </div>
      </div>
    </div>
  )
}
