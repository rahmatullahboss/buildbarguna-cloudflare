import { Link, useLocation, useNavigate } from 'react-router-dom'
import { authApi, clearToken } from '../lib/api'
import { getUser, isAdmin } from '../lib/auth'
import {
  Home, Briefcase, PieChart, TrendingUp, CheckSquare,
  LogOut, Settings, Menu, X, ChevronRight, BarChart2, ArrowDownCircle, Gift, Building2, BookOpen
} from 'lucide-react'
import { useState } from 'react'

// Bottom nav shows 5 most important items on mobile
const bottomNav = [
  { to: '/dashboard', label: 'হোম', icon: Home },
  { to: '/projects', label: 'প্রজেক্ট', icon: Briefcase },
  { to: '/earnings', label: 'মুনাফা', icon: TrendingUp },
  { to: '/withdraw', label: 'উত্তোলন', icon: ArrowDownCircle },
  { to: '/tutorial', label: 'গাইড', icon: BookOpen },
]

const memberNav = [
  { to: '/dashboard', label: 'ড্যাশবোর্ড', icon: Home },
  { to: '/projects', label: 'প্রজেক্টসমূহ', icon: Briefcase },
  { to: '/my-investments', label: 'আমার বিনিয়োগ', icon: PieChart },
  { to: '/earnings', label: 'মুনাফা', icon: TrendingUp },
  { to: '/tasks', label: 'ডেইলি টাস্ক', icon: CheckSquare },
  { to: '/rewards', label: 'রিওয়ার্ড', icon: Gift },
  { to: '/portfolio', label: 'পোর্টফোলিও', icon: BarChart2 },
  { to: '/withdraw', label: 'উত্তোলন', icon: ArrowDownCircle },
  { to: '/referrals', label: 'রেফারেল', icon: Gift },
  { to: '/tutorial', label: 'গাইড', icon: BookOpen },
]

const adminNav = [
  { to: '/admin/withdrawals', label: 'উত্তোলন', icon: ArrowDownCircle },
  { to: '/admin', label: 'অ্যাডমিন ড্যাশবোর্ড', icon: Settings },
  { to: '/admin/projects', label: 'প্রজেক্ট ব্যবস্থাপনা', icon: Briefcase },
  { to: '/admin/shares', label: 'শেয়ার অনুমোদন', icon: PieChart },
  { to: '/admin/earnings', label: 'মুনাফা বিতরণ', icon: TrendingUp },
  { to: '/admin/tasks', label: 'টাস্ক ব্যবস্থাপনা', icon: CheckSquare },
  { to: '/admin/rewards', label: 'রিওয়ার্ড ব্যবস্থাপনা', icon: Gift },
  { to: '/admin/users', label: 'মেম্বার তালিকা', icon: Home },
  { to: '/admin/members', label: 'মেম্বারশিপ', icon: CheckSquare },
  { to: '/admin/referrals', label: 'রেফারেল ব্যবস্থাপনা', icon: Gift },
  { to: '/admin/company-expenses', label: 'কোম্পানি খরচ', icon: Building2 },
  { to: '/admin/tutorial', label: 'গাইড', icon: BookOpen },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const user = getUser()
  const [menuOpen, setMenuOpen] = useState(false)

  const admin = isAdmin()

  async function handleLogout() {
    await authApi.logout()
    clearToken()
    navigate('/login')
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Top bar — fixed height, never scrolls */}
      <header className="bg-gradient-to-r from-primary-800 via-primary-700 to-teal-700 text-white z-50 shadow-lg flex-shrink-0">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">
          <Link to="/dashboard" className="font-bold text-lg tracking-tight flex items-center gap-2">
            <img src="/bbi logo.jpg" alt="BBI Logo" className="h-8 w-8 object-contain" />
            <span className="hidden sm:inline">বিল্ড বরগুনা</span>
            <span className="sm:hidden">BBI</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-sm opacity-90 bg-white/10 px-3 py-1 rounded-full">{user?.name}</span>
            <button onClick={() => setMenuOpen(!menuOpen)} className="p-1.5 rounded-xl hover:bg-white/20 transition-colors">
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </header>

      {/* Body row — fills remaining height, no overflow */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar — scrolls independently, never affects page */}
        <aside className={`
          fixed inset-y-0 left-0 z-40 w-64 bg-white shadow-xl transform transition-transform duration-200 pt-[calc(3.5rem+var(--sat))]
          flex flex-col
          ${menuOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:static lg:translate-x-0 lg:shadow-none lg:border-r lg:border-gray-200
          lg:pt-0 lg:h-full
        `}>
          {/* Nav links — scrollable if items overflow */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            {/* Member section */}
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 pb-1 pt-1">মেম্বার</p>
            {memberNav.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setMenuOpen(false)}
                aria-label={label}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${location.pathname === to
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
              >
                <Icon size={18} />
                {label}
                {location.pathname === to && <ChevronRight size={14} className="ml-auto" />}
              </Link>
            ))}

            {/* Admin section — only shown to admins */}
            {admin && (
              <>
                <div className="pt-3 pb-1">
                  <div className="border-t border-gray-100 mb-2" />
                  <p className="text-xs font-semibold text-amber-500 uppercase tracking-wider px-3">অ্যাডমিন</p>
                </div>
                {adminNav.map(({ to, label, icon: Icon }) => (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setMenuOpen(false)}
                    aria-label={label}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                      ${location.pathname === to
                        ? 'bg-amber-50 text-amber-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
                  >
                    <Icon size={18} />
                    {label}
                    {location.pathname === to && <ChevronRight size={14} className="ml-auto text-amber-500" />}
                  </Link>
                ))}
              </>
            )}
          </nav>

          {/* Logout — always pinned at bottom of sidebar */}
          <div className="flex-shrink-0 p-4 border-t border-gray-100">
            <button
              onClick={handleLogout}
              aria-label="লগআউট করুন"
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-600 transition-colors w-full px-3 py-2 rounded-lg hover:bg-red-50"
            >
              <LogOut size={18} />
              লগআউট
            </button>
          </div>
        </aside>

        {/* Overlay for mobile */}
        {menuOpen && <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setMenuOpen(false)} />}

        {/* Main content — scrolls independently, pb-20 on mobile for bottom nav */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24 lg:pb-6">
          <div key={location.pathname} className="max-w-5xl mx-auto w-full page-enter">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile bottom navigation — hidden on lg+ */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 shadow-2xl">
        <div className="flex items-center justify-around h-16 px-2 pb-[var(--sab)]">
          {bottomNav.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to
            return (
              <Link
                key={to}
                to={to}
                aria-label={label}
                className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-2xl transition-all duration-200 min-w-0 flex-1 mx-0.5
                  ${active
                    ? 'text-primary-700 bg-primary-50'
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
              >
                <Icon size={21} strokeWidth={active ? 2.5 : 1.8} />
                <span className={`text-[10px] font-semibold truncate ${active ? 'text-primary-700' : 'text-gray-400'}`}>{label}</span>
                {active && <span className="w-4 h-0.5 rounded-full bg-primary-500" />}
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
