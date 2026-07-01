import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { companyExpensesApi as api, type CompanyExpense, type CompanyExpenseCategory, type CompanyExpenseSummary } from '../../lib/api'
import { formatTaka, formatDate } from '../../lib/auth'
import { Plus, RefreshCw, Trash2, Eye, Building2, Calendar, DollarSign, PieChart, AlertCircle, CheckCircle, Clock } from 'lucide-react'

export default function CompanyExpenses() {
  const qc = useQueryClient()
  
  // State
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState<'all' | 'pending' | 'allocated'>('all')
  const [selectedExpense, setSelectedExpense] = useState<CompanyExpense | null>(null)
  
  // Form state
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState<number | ''>('')
  const [categoryName, setCategoryName] = useState('')
  const [description, setDescription] = useState('')
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0])
  const [allocationMethod, setAllocationMethod] = useState<'by_project_value' | 'by_revenue' | 'equal' | 'company_only'>('by_project_value')
  const [notes, setNotes] = useState('')

  // Queries
  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ['company-expenses-summary'],
    queryFn: () => api.summary('month')
  })

  const { data: expensesData, isLoading: expensesLoading } = useQuery({
    queryKey: ['company-expenses-list', filter],
    queryFn: () => api.list({ 
      allocated: filter === 'all' ? undefined : filter === 'allocated'
    })
  })

  const { data: categoriesData } = useQuery({
    queryKey: ['company-expense-categories'],
    queryFn: () => api.categories()
  })

  // Mutations
  const addMutation = useMutation({
    mutationFn: (body: Parameters<typeof api.add>[0]) => api.add(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['company-expenses-list'] })
      qc.invalidateQueries({ queryKey: ['company-expenses-summary'] })
      resetForm()
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['company-expenses-list'] })
      qc.invalidateQueries({ queryKey: ['company-expenses-summary'] })
    }
  })

  const recalculateMutation = useMutation({
    mutationFn: () => api.recalculate(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['company-expenses-list'] })
      qc.invalidateQueries({ queryKey: ['company-expenses-summary'] })
    }
  })

  const resetForm = () => {
    setShowForm(false)
    setAmount('')
    setCategoryId('')
    setCategoryName('')
    setDescription('')
    setExpenseDate(new Date().toISOString().split('T')[0])
    setAllocationMethod('by_project_value')
    setNotes('')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!amount || !categoryName) return

    addMutation.mutate({
      amount: parseInt(amount) * 100, // Convert to paisa
      category_id: categoryId === '' ? undefined : Number(categoryId),
      category_name: categoryName,
      description: description || undefined,
      expense_date: expenseDate,
      allocation_method: allocationMethod,
      notes: notes || undefined
    })
  }

  const handleCategoryChange = (id: number) => {
    setCategoryId(id)
    const cat = categoriesData && 'data' in categoriesData && categoriesData.data
      ? categoriesData.data.find((c: CompanyExpenseCategory) => c.id === id)
      : undefined
    if (cat) setCategoryName(cat.name)
  }

  const summary: CompanyExpenseSummary | null = summaryData && 'data' in summaryData ? summaryData.data : null
  const expenses: CompanyExpense[] = expensesData && 'data' in expensesData ? (expensesData.data as any).items : []
  const categories: CompanyExpenseCategory[] = categoriesData && 'data' in categoriesData ? categoriesData.data : []

  const allocationMethodLabels = {
    'by_project_value': 'প্রজেক্ট মূল্য অনুযায়ী',
    'by_revenue': 'আয় অনুযায়ী',
    'equal': 'সমান ভাগে',
    'company_only': 'শুধু কোম্পানি'
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-rose-700 via-pink-600 to-purple-600 rounded-3xl p-5 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/15 p-2 rounded-xl">
                <Building2 size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold">কোম্পানি খরচ</h1>
                <p className="text-white/70 text-sm">কোম্পানির সাধারণ খরচ ব্যবস্থাপনা</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => recalculateMutation.mutate()}
                disabled={recalculateMutation.isPending}
                className="bg-white/15 hover:bg-white/25 text-white font-semibold text-sm px-4 py-2 rounded-xl transition flex items-center gap-2"
              >
                <RefreshCw size={16} className={recalculateMutation.isPending ? 'animate-spin' : ''} />
                পুনর্গণনা
              </button>
              <button
                onClick={() => setShowForm(true)}
                className="bg-white text-rose-700 font-bold text-sm px-4 py-2 rounded-xl hover:bg-rose-50 transition flex items-center gap-2"
              >
                <Plus size={16} /> নতুন খরচ
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {summaryLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => (
            <div key={i} className="shimmer rounded-2xl h-24" />
          ))}
        </div>
      ) : summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <DollarSign size={16} /> মোট খরচ
            </div>
            <p className="text-xl font-bold text-gray-900">{formatTaka(summary.total_expenses)}</p>
            <p className="text-xs text-gray-400">গত ৩০ দিনে</p>
          </div>
          
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-green-600 text-sm mb-1">
              <CheckCircle size={16} /> বরাদ্দকৃত
            </div>
            <p className="text-xl font-bold text-green-600">{formatTaka(summary.total_allocated)}</p>
            <p className="text-xs text-gray-400">প্রজেক্টে</p>
          </div>
          
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-amber-600 text-sm mb-1">
              <Clock size={16} /> অপেক্ষমান
            </div>
            <p className="text-xl font-bold text-amber-600">{formatTaka(summary.pending_allocation)}</p>
            <p className="text-xs text-gray-400">বরাদ্দ বাকি</p>
          </div>
          
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <PieChart size={16} /> মোট এন্ট্রি
            </div>
            <p className="text-xl font-bold text-gray-900">{summary.expenses_count}</p>
            <p className="text-xs text-gray-400">ট্রানজেকশন</p>
          </div>
        </div>
      )}

      {/* Category Breakdown */}
      {summary && summary.by_category.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-3">ক্যাটাগরি অনুযায়ী খরচ</h3>
          <div className="space-y-2">
            {summary.by_category.map((cat, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <span className="text-gray-600">{cat.category_name}</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{formatTaka(cat.total_amount)}</span>
                  <span className="text-xs text-gray-400">({cat.count})</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {(['all', 'pending', 'allocated'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition ${
              filter === f 
                ? 'bg-rose-600 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f === 'all' ? 'সব' : f === 'pending' ? 'বরাদ্দ বাকি' : 'বরাদ্দ হয়েছে'}
          </button>
        ))}
      </div>

      {/* Expenses List */}
      <div className="space-y-2">
        {expensesLoading ? (
          [1,2,3].map(i => <div key={i} className="shimmer rounded-2xl h-20" />)
        ) : expenses.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center">
            <AlertCircle size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">কোনো খরচ পাওয়া যায়নি</p>
          </div>
        ) : (
          expenses.map(expense => (
            <div
              key={expense.id}
              className="bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{expense.category_name}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    expense.is_allocated 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {expense.is_allocated ? 'বরাদ্দ হয়েছে' : 'বরাদ্দ বাকি'}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Calendar size={14} /> {formatDate(expense.expense_date)}
                  </span>
                  <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                    {allocationMethodLabels[expense.allocation_method]}
                  </span>
                </div>
                {expense.description && (
                  <p className="text-sm text-gray-500 mt-1">{expense.description}</p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <p className="font-bold text-lg text-gray-900">{formatTaka(expense.amount)}</p>
                <div className="flex gap-1">
                  {!expense.is_allocated && expense.allocation_method !== 'company_only' && (
                    <button
                      onClick={() => {/* TODO: Allocate */}}
                      aria-label="বরাদ্দ করুন"
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      title="বরাদ্দ করুন"
                    >
                      <RefreshCw size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedExpense(expense)}
                    aria-label="বিস্তারিত"
                    className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition"
                    title="বিস্তারিত"
                  >
                    <Eye size={16} />
                  </button>
                  {!expense.is_allocated && (
                    <button
                      onClick={() => {
                        if (confirm('আপনি কি নিশ্চিত?')) deleteMutation.mutate(expense.id)
                      }}
                      disabled={deleteMutation.isPending}
                      aria-label="মুছুন"
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                      title="মুছুন"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">নতুন কোম্পানি খরচ</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  পরিমাণ (টাকা)
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900"
                  placeholder="0"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ক্যাটাগরি
                </label>
                <select
                  value={categoryId}
                  onChange={e => handleCategoryChange(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900"
                >
                  <option value="">নতুন ক্যাটাগরি</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                {!categoryId && (
                  <input
                    type="text"
                    value={categoryName}
                    onChange={e => setCategoryName(e.target.value)}
                    className="w-full mt-2 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900"
                    placeholder="ক্যাটাগরি নাম"
                    required={!categoryId}
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  তারিখ
                </label>
                <input
                  type="date"
                  value={expenseDate}
                  onChange={e => setExpenseDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  বরাদ্দ পদ্ধতি
                </label>
                <select
                  value={allocationMethod}
                  onChange={e => setAllocationMethod(e.target.value as any)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900"
                >
                  <option value="by_project_value">প্রজেক্ট মূল্য অনুযায়ী (প্রস্তাবিত)</option>
                  <option value="by_revenue">আয় অনুযায়ী</option>
                  <option value="equal">সমান ভাগে</option>
                  <option value="company_only">শুধু কোম্পানি (বরাদ্দ নয়)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  বিবরণ
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
                  rows={2}
                  placeholder="ঐচ্ছিক"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  নোট
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
                  rows={2}
                  placeholder="ঐচ্ছিক"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={addMutation.isPending}
                  className="flex-1 px-4 py-3 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700 transition disabled:opacity-50"
                >
                  {addMutation.isPending ? 'যোগ হচ্ছে...' : 'যোগ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedExpense && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">খরচ বিস্তারিত</h2>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">ক্যাটাগরি</span>
                <span className="font-medium text-gray-900 dark:text-white">{selectedExpense.category_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">পরিমাণ</span>
                <span className="font-bold text-lg text-gray-900 dark:text-white">{formatTaka(selectedExpense.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">তারিখ</span>
                <span className="text-gray-900 dark:text-white">{formatDate(selectedExpense.expense_date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">বরাদ্দ পদ্ধতি</span>
                <span className="text-gray-900 dark:text-white">{allocationMethodLabels[selectedExpense.allocation_method]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">স্ট্যাটাস</span>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  selectedExpense.is_allocated 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {selectedExpense.is_allocated ? 'বরাদ্দ হয়েছে' : 'বরাদ্দ বাকি'}
                </span>
              </div>
              {selectedExpense.description && (
                <div>
                  <span className="text-gray-500">বিবরণ</span>
                  <p className="text-gray-900 dark:text-white mt-1">{selectedExpense.description}</p>
                </div>
              )}
              {selectedExpense.notes && (
                <div>
                  <span className="text-gray-500">নোট</span>
                  <p className="text-gray-900 dark:text-white mt-1">{selectedExpense.notes}</p>
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedExpense(null)}
              className="w-full mt-6 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              বন্ধ
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
