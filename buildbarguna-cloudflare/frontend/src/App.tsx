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
const DailyTasks      = lazy(() => import('./pages/DailyTasks'))
const Portfolio       = lazy(() => import('./pages/Portfolio'))
const Withdraw        = lazy(() => import('./pages/Withdraw'))
const Referrals       = lazy(() => import('./pages/Referrals'))

// Admin pages — lazy loaded
const AdminDashboard  = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminWithdrawals= lazy(() => import('./pages/admin/AdminWithdrawals'))
const AdminProjects   = lazy(() => import('./pages/admin/AdminProjects'))
const AdminShares     = lazy(() => import('./pages/admin/AdminShares'))
const AdminEarnings   = lazy(() => import('./pages/admin/AdminEarnings'))
const AdminTasks      = lazy(() => import('./pages/admin/AdminTasks'))
const AdminUsers      = lazy(() => import('./pages/admin/AdminUsers'))
const AdminReferrals  = lazy(() => import('./pages/admin/AdminReferrals'))
const ProjectFinance  = lazy(() => import('./pages/admin/ProjectFinance'))
const ProfitDistribution = lazy(() => import('./pages/admin/ProfitDistribution'))
const CompanyExpenses = lazy(() => import('./pages/admin/CompanyExpenses'))
const AdminTutorial   = lazy(() => import('./pages/admin/AdminTutorial'))

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
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public — logged in users go directly to dashboard */}
        <Route path="/" element={<RootRoute />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/tutorial" element={<Layout><Tutorial /></Layout>} />

        {/* Protected member routes */}
        <Route path="/dashboard"      element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
        <Route path="/projects"       element={<ProtectedRoute><Layout><Projects /></Layout></ProtectedRoute>} />
        <Route path="/projects/:id"   element={<ProtectedRoute><Layout><ProjectDetail /></Layout></ProtectedRoute>} />
        <Route path="/my-investments" element={<ProtectedRoute><Layout><MyInvestments /></Layout></ProtectedRoute>} />
        <Route path="/earnings"       element={<ProtectedRoute><Layout><Earnings /></Layout></ProtectedRoute>} />
        <Route path="/tasks"          element={<ProtectedRoute><Layout><DailyTasks /></Layout></ProtectedRoute>} />
        <Route path="/portfolio"      element={<ProtectedRoute><Layout><Portfolio /></Layout></ProtectedRoute>} />
        <Route path="/withdraw"       element={<ProtectedRoute><Layout><Withdraw /></Layout></ProtectedRoute>} />
        <Route path="/referrals"      element={<ProtectedRoute><Layout><Referrals /></Layout></ProtectedRoute>} />

        {/* Admin routes */}
        <Route path="/admin"                element={<AdminRoute><Layout><AdminDashboard /></Layout></AdminRoute>} />
        <Route path="/admin/withdrawals"    element={<AdminRoute><Layout><AdminWithdrawals /></Layout></AdminRoute>} />
        <Route path="/admin/projects"       element={<AdminRoute><Layout><AdminProjects /></Layout></AdminRoute>} />
        <Route path="/admin/projects/:projectId/finance" element={<AdminRoute><Layout><ProjectFinance /></Layout></AdminRoute>} />
        <Route path="/admin/projects/:projectId/distribute-profit" element={<AdminRoute><Layout><ProfitDistribution /></Layout></AdminRoute>} />
        <Route path="/admin/company-expenses" element={<AdminRoute><Layout><CompanyExpenses /></Layout></AdminRoute>} />
        <Route path="/admin/shares"         element={<AdminRoute><Layout><AdminShares /></Layout></AdminRoute>} />
        <Route path="/admin/earnings"       element={<AdminRoute><Layout><AdminEarnings /></Layout></AdminRoute>} />
        <Route path="/admin/tasks"          element={<AdminRoute><Layout><AdminTasks /></Layout></AdminRoute>} />
        <Route path="/admin/users"          element={<AdminRoute><Layout><AdminUsers /></Layout></AdminRoute>} />
        <Route path="/admin/referrals"      element={<AdminRoute><Layout><AdminReferrals /></Layout></AdminRoute>} />
        <Route path="/admin/tutorial"       element={<AdminRoute><Layout><AdminTutorial /></Layout></AdminRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
