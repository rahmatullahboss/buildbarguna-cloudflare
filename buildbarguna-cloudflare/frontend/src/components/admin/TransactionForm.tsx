import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { financeApi, type TransactionCategory } from '../../lib/api'

interface TransactionFormProps {
  projectId: number
  onSuccess?: () => void
  editData?: {
    id: number
    transaction_type: 'expense' | 'revenue'
    amount: number
    category: string
    description: string | null
    transaction_date: string
  }
  onEditCancel?: () => void
}

export default function TransactionForm({ projectId, onSuccess, editData, onEditCancel }: TransactionFormProps) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    transaction_type: 'expense' as 'expense' | 'revenue',
    amount: '',
    category: '',
    description: '',
    transaction_date: new Date().toISOString().split('T')[0]
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Load categories based on transaction type
  const { data: categoriesData } = useQuery({
    queryKey: ['categories', form.transaction_type],
    queryFn: () => financeApi.getCategories(form.transaction_type)
  })
  const categories: TransactionCategory[] = categoriesData?.success ? (categoriesData.data as TransactionCategory[]) : []

  // Set edit data
  useEffect(() => {
    if (editData) {
      setForm({
        transaction_type: editData.transaction_type,
        amount: String(editData.amount / 100), // paisa to taka
        category: editData.category,
        description: editData.description || '',
        transaction_date: editData.transaction_date
      })
    }
  }, [editData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const amountPaisa = Math.round(parseFloat(form.amount) * 100) // taka to paisa
      if (amountPaisa <= 0) throw new Error('পরিমাণ সঠিক নয়')

      const body = {
        project_id: projectId,
        transaction_type: form.transaction_type,
        amount: amountPaisa,
        category: form.category,
        description: form.description || undefined,
        transaction_date: form.transaction_date
      }

      let res
      if (editData) {
        res = await financeApi.updateTransaction(editData.id, body)
      } else {
        res = await financeApi.addTransaction(body)
      }

      if (res.success) {
        // Reset form
        setForm({
          transaction_type: form.transaction_type,
          amount: '',
          category: '',
          description: '',
          transaction_date: new Date().toISOString().split('T')[0]
        })
        onSuccess?.()
      } else {
        setError((res as any).error || 'ব্যর্থ হয়েছে')
      }
    } catch (err: any) {
      setError(err.message || 'কিছু ভুল হয়েছে')
    } finally {
      setLoading(false)
    }
  }

  // Update categories when type changes
  useEffect(() => {
    setForm(p => ({ ...p, category: '' }))
  }, [form.transaction_type])

  return (
    <div className="card border-primary-200 bg-primary-50">
      <h2 className="font-bold text-lg mb-4">
        {editData ? 'এন্ট্রি সম্পাদনা' : 'নতুন এন্ট্রি'}
      </h2>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Transaction Type Toggle */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setForm({ ...form, transaction_type: 'expense' })}
            className={`flex-1 py-3 rounded-xl font-bold transition-all ${
              form.transaction_type === 'expense'
                ? 'bg-red-500 text-white shadow-lg'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            📤 খরচ
          </button>
          <button
            type="button"
            onClick={() => setForm({ ...form, transaction_type: 'revenue' })}
            className={`flex-1 py-3 rounded-xl font-bold transition-all ${
              form.transaction_type === 'revenue'
                ? 'bg-green-500 text-white shadow-lg'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            📥 আয়
          </button>
        </div>

        {/* Amount */}
        <div>
          <label className="label">পরিমাণ (টাকা)</label>
          <input
            className="input"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={form.amount}
            onChange={e => setForm({ ...form, amount: e.target.value })}
            required
          />
        </div>

        {/* Category */}
        <div>
          <label className="label">ক্যাটাগরি</label>
          <select
            className="input"
            value={form.category}
            onChange={e => setForm({ ...form, category: e.target.value })}
            required
          >
            <option value="">ক্যাটাগরি নির্বাচন করুন</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.name}>{cat.name}</option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div>
          <label className="label">বিবরণ (ঐচ্ছিক)</label>
          <textarea
            className="input"
            rows={2}
            placeholder="এন্ট্রির বিবরণ..."
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
          />
        </div>

        {/* Date */}
        <div>
          <label className="label">তারিখ</label>
          <input
            className="input"
            type="date"
            value={form.transaction_date}
            onChange={e => setForm({ ...form, transaction_date: e.target.value })}
            required
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className={`flex-1 py-3 rounded-xl font-bold text-white transition-all ${
              form.transaction_type === 'expense'
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-green-500 hover:bg-green-600'
            } disabled:opacity-50`}
          >
            {loading ? '⏳ প্রসেসিং...' : editData ? '✏️ আপডেট করুন' : (
              form.transaction_type === 'expense' ? '📤 খরচ এন্ট্রি' : '📥 আয় এন্ট্রি'
            )}
          </button>
          {editData && onEditCancel && (
            <button
              type="button"
              onClick={onEditCancel}
              className="btn-secondary"
            >
              বাতিল
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
