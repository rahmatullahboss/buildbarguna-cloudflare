import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute, AdminRoute } from './components/ProtectedRoute'
import Layout from './components/Layout'
import { isLoggedIn } from './lib/auth'

// Eagerly loaded — needed immediately on any route
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Tutorial from './pages/Tutorial'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import CompleteProfile from './pages/CompleteProfile'
import EditProfile from './pages/EditProfile'

// Smart root route: redirect logged-in users to dashboard
function RootRoute() {
  return isLoggedIn() ? <Navigate to="/dashboard" replace /> : <Home />
}

// Lazy loaded — code split per page
const Dashboard       = lazy(() => import('./pages/Dashboard'))
const Projects        = lazy(() => import('./pages/Projects'))
const ProjectDetail   = lazy(() => import('./pages/ProjectDetail'))
const MyInvestments   = lazy(() => import('./pages/MyInvestments'))
const Earnings        = lazy(() => import('./pages/Earnings'))
const Rewards         = lazy(() => import('./pages/Rewards'))
const Portfolio       = lazy(() => import('./pages/Portfolio'))
const Withdraw        = lazy(() => import('./pages/Withdraw'))
const Referrals       = lazy(() => import('./pages/Referrals'))
const MemberRegistration = lazy(() => import('./pages/MemberRegistration'))
const Membership = lazy(() => import('./pages/Membership'))
const Tasks         = lazy(() => import('./pages/Tasks'))

// Admin pages — lazy loaded
const AdminDashboard  = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminWithdrawals= lazy(() => import('./pages/admin/AdminWithdrawals'))
const AdminProjects   = lazy(() => import('./pages/admin/AdminProjects'))
const AdminShares     = lazy(() => import('./pages/admin/AdminShares'))

const AdminRewards    = lazy(() => import('./pages/admin/AdminRewards'))
const AdminUsers      = lazy(() => import('./pages/admin/AdminUsers'))
const AdminMembers    = lazy(() => import('./pages/admin/AdminMembers'))
const AdminReferrals  = lazy(() => import('./pages/admin/AdminReferrals'))
const ProjectFinance  = lazy(() => import('./pages/admin/ProjectFinance'))
const ProfitDistribution = lazy(() => import('./pages/admin/ProfitDistribution'))
const CompanyExpenses = lazy(() => import('./pages/admin/CompanyExpenses'))
const CompanyFund     = lazy(() => import('./pages/admin/CompanyFund'))
const AuditLog        = lazy(() => import('./pages/admin/AuditLog'))
const AdminTutorial   = lazy(() => import('./pages/admin/AdminTutorial'))
const AdminTasks = lazy(() => import('./pages/admin/AdminTasks'))
const MyProfits       = lazy(() => import('./pages/MyProfits'))

// Guide pages
const UserGuide = lazy(() => import('./pages/UserGuide'))
const AdminGuide = lazy(() => import('./pages/AdminGuide'))

// Minimal full-page loading fallback with shimmer cards
function PageLoader() {
  return (
    <div className="space-y-4 p-4 max-w-5xl mx-auto w-full">
      {/* Hero shimmer */}
      <div className="shimmer rounded-3xl h-28 w-full" />
      {/* Stat cards shimmer */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1,2,3,4].map(i => <div key={i} className="shimmer rounded-2xl h-24" />)}
      </div>
      {/* Content shimmer */}
      <div className="shimmer rounded-2xl h-16 w-full" />
      <div className="shimmer rounded-2xl h-32 w-full" />
    </div>
  )
}

export default function App() {
  return (
    <>
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public — logged in users go directly to dashboard */}
        <Route path="/" element={<RootRoute />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/tutorial" element={<Layout><Tutorial /></Layout>} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/complete-profile" element={<CompleteProfile />} />
        <Route path="/profile/edit" element={<ProtectedRoute><Layout><EditProfile /></Layout></ProtectedRoute>} />

        {/* Protected member routes */}
        <Route path="/dashboard"      element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
        <Route path="/projects"       element={<ProtectedRoute><Layout><Projects /></Layout></ProtectedRoute>} />
        <Route path="/projects/:id"   element={<ProtectedRoute><Layout><ProjectDetail /></Layout></ProtectedRoute>} />
        <Route path="/my-investments" element={<ProtectedRoute><Layout><MyInvestments /></Layout></ProtectedRoute>} />
        <Route path="/earnings"       element={<ProtectedRoute><Layout><Earnings /></Layout></ProtectedRoute>} />
        <Route path="/rewards"        element={<ProtectedRoute><Layout><Rewards /></Layout></ProtectedRoute>} />
        <Route path="/portfolio"      element={<ProtectedRoute><Layout><Portfolio /></Layout></ProtectedRoute>} />
        <Route path="/withdraw"       element={<ProtectedRoute><Layout><Withdraw /></Layout></ProtectedRoute>} />
        <Route path="/referrals"      element={<ProtectedRoute><Layout><Referrals /></Layout></ProtectedRoute>} />
        <Route path="/tasks"         element={<ProtectedRoute><Layout><Tasks /></Layout></ProtectedRoute>} />
        <Route path="/member-registration" element={<ProtectedRoute><MemberRegistration /></ProtectedRoute>} />
        <Route path="/membership" element={<ProtectedRoute><Layout><Membership /></Layout></ProtectedRoute>} />
        <Route path="/guide" element={<ProtectedRoute><Layout><UserGuide /></Layout></ProtectedRoute>} />
        <Route path="/my/profits" element={<ProtectedRoute><Layout><MyProfits /></Layout></ProtectedRoute>} />

        {/* Admin routes */}
        <Route path="/admin"                element={<AdminRoute><Layout><AdminDashboard /></Layout></AdminRoute>} />
        <Route path="/admin/withdrawals"    element={<AdminRoute><Layout><AdminWithdrawals /></Layout></AdminRoute>} />
        <Route path="/admin/projects"       element={<AdminRoute><Layout><AdminProjects /></Layout></AdminRoute>} />
        <Route path="/admin/projects/:projectId/finance" element={<AdminRoute><Layout><ProjectFinance /></Layout></AdminRoute>} />
        <Route path="/admin/projects/:projectId/distribute-profit" element={<AdminRoute><Layout><ProfitDistribution /></Layout></AdminRoute>} />
        <Route path="/admin/company-expenses" element={<AdminRoute><Layout><CompanyExpenses /></Layout></AdminRoute>} />
        <Route path="/admin/company-fund"     element={<AdminRoute><Layout><CompanyFund /></Layout></AdminRoute>} />
        <Route path="/admin/audit-log"        element={<AdminRoute><Layout><AuditLog /></Layout></AdminRoute>} />
        <Route path="/admin/shares"         element={<AdminRoute><Layout><AdminShares /></Layout></AdminRoute>} />

        <Route path="/admin/rewards"        element={<AdminRoute><Layout><AdminRewards /></Layout></AdminRoute>} />
        <Route path="/admin/tasks"         element={<AdminRoute><Layout><AdminTasks /></Layout></AdminRoute>} />
        <Route path="/admin/users"          element={<AdminRoute><Layout><AdminUsers /></Layout></AdminRoute>} />
        <Route path="/admin/members"        element={<AdminRoute><Layout><AdminMembers /></Layout></AdminRoute>} />
        <Route path="/admin/referrals"      element={<AdminRoute><Layout><AdminReferrals /></Layout></AdminRoute>} />
        <Route path="/admin/tutorial"       element={<AdminRoute><Layout><AdminTutorial /></Layout></AdminRoute>} />
        <Route path="/admin/guide"          element={<AdminRoute><Layout><AdminGuide /></Layout></AdminRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>

    {/* Floating WhatsApp Button — visible on ALL pages */}
    <a
      href="https://wa.me/8801635222142"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="WhatsApp এ মেসেজ দিন"
      className="fixed right-4 bottom-20 lg:bottom-6 z-[999] bg-green-500 hover:bg-green-600 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    </a>
    </>
  )
}
