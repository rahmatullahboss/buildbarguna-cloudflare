import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminApi, type UpdateProjectComplianceBody } from '../../lib/api'
import { ArrowLeft, CheckCircle2, ShieldCheck } from 'lucide-react'

const defaultForm: UpdateProjectComplianceBody = {
  contract_type: 'musharakah',
  shariah_screening_status: 'pending',
  ops_reconciliation_status: 'pending',
  loss_settlement_status: 'not_applicable',
  prohibited_activities_screened: false,
  asset_backing_confirmed: false,
  profit_ratio_disclosed: false,
  loss_sharing_clause_confirmed: false,
  principal_risk_notice_confirmed: false,
  use_of_proceeds: '',
  profit_loss_policy: '',
  principal_risk_notice: '',
  shariah_notes: '',
  ops_notes: '',
  loss_settlement_notes: '',
  external_reviewer_name: ''
}

function asBool(value: number | boolean | null | undefined) {
  return value === true || value === 1
}

export default function ProjectCompliance() {
  const { projectId = '' } = useParams()
  const qc = useQueryClient()
  const [form, setForm] = useState<UpdateProjectComplianceBody>(defaultForm)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const complianceQuery = useQuery({
    queryKey: ['project-compliance', projectId],
    queryFn: () => adminApi.getProjectCompliance(Number(projectId)),
    enabled: !!projectId
  })

  useEffect(() => {
    if (!complianceQuery.data?.success) return
    const profile = complianceQuery.data.data.profile
    setForm({
      contract_type: profile.contract_type,
      shariah_screening_status: profile.shariah_screening_status,
      ops_reconciliation_status: profile.ops_reconciliation_status,
      loss_settlement_status: profile.loss_settlement_status,
      prohibited_activities_screened: asBool(profile.prohibited_activities_screened),
      asset_backing_confirmed: asBool(profile.asset_backing_confirmed),
      profit_ratio_disclosed: asBool(profile.profit_ratio_disclosed),
      loss_sharing_clause_confirmed: asBool(profile.loss_sharing_clause_confirmed),
      principal_risk_notice_confirmed: asBool(profile.principal_risk_notice_confirmed),
      use_of_proceeds: profile.use_of_proceeds || '',
      profit_loss_policy: profile.profit_loss_policy || '',
      principal_risk_notice: profile.principal_risk_notice || '',
      shariah_notes: profile.shariah_notes || '',
      ops_notes: profile.ops_notes || '',
      loss_settlement_notes: profile.loss_settlement_notes || '',
      external_reviewer_name: profile.external_reviewer_name || ''
    })
  }, [complianceQuery.data])

  const mutation = useMutation({
    mutationFn: () => adminApi.updateProjectCompliance(Number(projectId), form),
    onSuccess: async (res) => {
      if (!res.success) {
        setError(res.error)
        setMessage('')
        return
      }
      setMessage('Compliance profile সেভ হয়েছে')
      setError('')
      await qc.invalidateQueries({ queryKey: ['project-compliance', projectId] })
      await qc.invalidateQueries({ queryKey: ['project-closeout-preview', projectId] })
    },
    onError: (err: Error) => {
      setError(err.message || 'Compliance profile সেভ করা যায়নি')
      setMessage('')
    }
  })

  const project = complianceQuery.data?.success ? complianceQuery.data.data.project : null

  if (complianceQuery.isLoading) {
    return <div className="card text-center py-10">Compliance profile লোড হচ্ছে...</div>
  }

  if (!complianceQuery.data?.success || !project) {
    return <div className="card text-center py-10 text-red-600">Compliance profile লোড করা যায়নি</div>
  }

  const checkboxes: Array<{ key: keyof UpdateProjectComplianceBody; label: string }> = [
    { key: 'prohibited_activities_screened', label: 'Prohibited activity screening সম্পন্ন' },
    { key: 'asset_backing_confirmed', label: 'Asset backing / বাস্তব ব্যবসা নিশ্চিত' },
    { key: 'profit_ratio_disclosed', label: 'Profit ratio investor-কে disclose করা হয়েছে' },
    { key: 'loss_sharing_clause_confirmed', label: 'Loss sharing clause documented' },
    { key: 'principal_risk_notice_confirmed', label: 'Principal risk notice explicitly disclosed' }
  ]

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-700 rounded-3xl p-5 text-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-emerald-100 mb-2">Governance</p>
            <h1 className="text-2xl font-bold">Project Compliance</h1>
            <p className="text-sm text-white/80 mt-1">{project.title}</p>
          </div>
          <Link to="/admin/projects" className="bg-white/10 hover:bg-white/20 px-3 py-2 rounded-xl text-sm flex items-center gap-2">
            <ArrowLeft size={14} /> ফিরে যান
          </Link>
        </div>
      </div>

      <div className="card border border-emerald-200 bg-emerald-50">
        <div className="flex items-start gap-3">
          <ShieldCheck className="text-emerald-600 mt-0.5" size={20} />
          <div className="text-sm text-emerald-900">
            <p className="font-semibold">এখান থেকে ৩টা critical control enforce হবে</p>
            <p className="mt-1">১) project investable কি না, ২) loss settlement documented কি না, ৩) closeout-এর আগে ops reconciliation complete কি না।</p>
          </div>
        </div>
      </div>

      {message && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 flex items-center gap-2">
          <CheckCircle2 size={16} /> {message}
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-900">Core Classification</h2>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Contract Type</label>
            <select
              className="input w-full"
              value={form.contract_type}
              onChange={(e) => setForm((prev) => ({ ...prev, contract_type: e.target.value as UpdateProjectComplianceBody['contract_type'] }))}
            >
              <option value="musharakah">Musharakah</option>
              <option value="mudarabah">Mudarabah</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Shariah Screening Status</label>
            <select
              className="input w-full"
              value={form.shariah_screening_status}
              onChange={(e) => setForm((prev) => ({ ...prev, shariah_screening_status: e.target.value as UpdateProjectComplianceBody['shariah_screening_status'] }))}
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="needs_revision">Needs Revision</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Ops Reconciliation Status</label>
            <select
              className="input w-full"
              value={form.ops_reconciliation_status}
              onChange={(e) => setForm((prev) => ({ ...prev, ops_reconciliation_status: e.target.value as UpdateProjectComplianceBody['ops_reconciliation_status'] }))}
            >
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Loss Settlement Status</label>
            <select
              className="input w-full"
              value={form.loss_settlement_status}
              onChange={(e) => setForm((prev) => ({ ...prev, loss_settlement_status: e.target.value as UpdateProjectComplianceBody['loss_settlement_status'] }))}
            >
              <option value="not_applicable">Not Applicable</option>
              <option value="pending_review">Pending Review</option>
              <option value="resolved">Resolved</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">External Reviewer / Scholar</label>
            <input
              className="input w-full"
              value={form.external_reviewer_name || ''}
              onChange={(e) => setForm((prev) => ({ ...prev, external_reviewer_name: e.target.value }))}
              placeholder="যেমন: Mufti / Shariah Advisor নাম"
            />
          </div>
        </div>

        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-900">Mandatory Checklist</h2>
          <div className="space-y-3">
            {checkboxes.map((item) => (
              <label key={String(item.key)} className="flex items-start gap-3 rounded-xl border border-gray-200 px-4 py-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={Boolean(form[item.key])}
                  onChange={(e) => setForm((prev) => ({ ...prev, [item.key]: e.target.checked }))}
                />
                <span className="text-sm text-gray-700">{item.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-900">Investor Disclosures</h2>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Use of Proceeds</label>
            <textarea className="input w-full min-h-[110px]" value={form.use_of_proceeds || ''} onChange={(e) => setForm((prev) => ({ ...prev, use_of_proceeds: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Profit / Loss Policy</label>
            <textarea className="input w-full min-h-[110px]" value={form.profit_loss_policy || ''} onChange={(e) => setForm((prev) => ({ ...prev, profit_loss_policy: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Principal Risk Notice</label>
            <textarea className="input w-full min-h-[110px]" value={form.principal_risk_notice || ''} onChange={(e) => setForm((prev) => ({ ...prev, principal_risk_notice: e.target.value }))} />
          </div>
        </div>

        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-900">Internal Review Notes</h2>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Shariah Notes</label>
            <textarea className="input w-full min-h-[90px]" value={form.shariah_notes || ''} onChange={(e) => setForm((prev) => ({ ...prev, shariah_notes: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Ops Reconciliation Notes</label>
            <textarea className="input w-full min-h-[90px]" value={form.ops_notes || ''} onChange={(e) => setForm((prev) => ({ ...prev, ops_notes: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Loss Settlement Notes</label>
            <textarea className="input w-full min-h-[90px]" value={form.loss_settlement_notes || ''} onChange={(e) => setForm((prev) => ({ ...prev, loss_settlement_notes: e.target.value }))} />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="px-5 py-3 rounded-xl text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {mutation.isPending ? 'সেভ হচ্ছে...' : 'Compliance Profile Save করুন'}
          </button>
          <Link to={`/admin/projects/${projectId}/closeout?mode=completed`} className="px-5 py-3 rounded-xl text-sm font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50">
            Complete closeout preview
          </Link>
        </div>
      </div>
    </div>
  )
}
