import { TrendingUp, TrendingDown, Wallet, Percent, Coins, PiggyBank } from 'lucide-react'
import { formatTaka } from '../../lib/auth'

interface FinancialSummaryCardProps {
  data: {
    total_revenue: number
    total_expense: number
    net_profit: number
    profit_margin_percent: number
    total_distributed: number
    undistributed_profit: number
  }
}

export default function FinancialSummaryCard({ data }: FinancialSummaryCardProps) {
  const isProfit = data.net_profit >= 0

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
      {/* Total Revenue */}
      <div className="bg-gradient-to-br from-green-400 to-green-600 rounded-2xl p-4 text-white shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-green-100 text-xs font-medium">মোট আয়</p>
            <p className="text-xl font-bold mt-1">{formatTaka(data.total_revenue)}</p>
          </div>
          <div className="bg-white/20 rounded-xl p-2">
            <TrendingUp size={18} />
          </div>
        </div>
      </div>

      {/* Total Expense */}
      <div className="bg-gradient-to-br from-red-400 to-red-600 rounded-2xl p-4 text-white shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-red-100 text-xs font-medium">মোট খরচ</p>
            <p className="text-xl font-bold mt-1">{formatTaka(data.total_expense)}</p>
          </div>
          <div className="bg-white/20 rounded-xl p-2">
            <TrendingDown size={18} />
          </div>
        </div>
      </div>

      {/* Net Profit */}
      <div className={`bg-gradient-to-br rounded-2xl p-4 text-white shadow-lg ${
        isProfit ? 'from-blue-500 to-blue-700' : 'from-orange-500 to-orange-700'
      }`}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-blue-100 text-xs font-medium">নেট {isProfit ? 'লাভ' : 'লস'}</p>
            <p className="text-xl font-bold mt-1">{formatTaka(Math.abs(data.net_profit))}</p>
            <p className="text-xs text-blue-200 mt-1">মার্জিন: {data.profit_margin_percent.toFixed(1)}%</p>
          </div>
          <div className="bg-white/20 rounded-xl p-2">
            {isProfit ? <PiggyBank size={18} /> : <TrendingDown size={18} />}
          </div>
        </div>
      </div>

      {/* Distributed */}
      <div className="bg-gradient-to-br from-purple-400 to-purple-600 rounded-2xl p-4 text-white shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-purple-100 text-xs font-medium">বিতরণ করা</p>
            <p className="text-xl font-bold mt-1">{formatTaka(data.total_distributed)}</p>
          </div>
          <div className="bg-white/20 rounded-xl p-2">
            <Wallet size={18} />
          </div>
        </div>
      </div>

      {/* Undistributed Profit */}
      <div className={`bg-gradient-to-br rounded-2xl p-4 text-white shadow-lg ${
        data.undistributed_profit > 0 ? 'from-amber-400 to-amber-600' : 'from-gray-400 to-gray-600'
      }`}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-amber-100 text-xs font-medium">অবিতরিত</p>
            <p className="text-xl font-bold mt-1">{formatTaka(data.undistributed_profit)}</p>
          </div>
          <div className="bg-white/20 rounded-xl p-2">
            <Coins size={18} />
          </div>
        </div>
      </div>

      {/* Profit Margin */}
      <div className="bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-2xl p-4 text-white shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-cyan-100 text-xs font-medium">লাভের হার</p>
            <p className="text-xl font-bold mt-1">{data.profit_margin_percent.toFixed(1)}%</p>
          </div>
          <div className="bg-white/20 rounded-xl p-2">
            <Percent size={18} />
        </div>
          </div>
      </div>
    </div>
  )
}
