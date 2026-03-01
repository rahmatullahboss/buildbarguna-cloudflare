import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute, AdminRoute } from './components/ProtectedRoute'
import Layout from './components/Layout'

// Eagerly loaded — needed immediately on any route
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'

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

// Minimal full-page loading fallback
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
        <p className="text-sm text-gray-400">লোড হচ্ছে...</p>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

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
        <Route path="/admin/shares"         element={<AdminRoute><Layout><AdminShares /></Layout></AdminRoute>} />
        <Route path="/admin/earnings"       element={<AdminRoute><Layout><AdminEarnings /></Layout></AdminRoute>} />
        <Route path="/admin/tasks"          element={<AdminRoute><Layout><AdminTasks /></Layout></AdminRoute>} />
        <Route path="/admin/users"          element={<AdminRoute><Layout><AdminUsers /></Layout></AdminRoute>} />
        <Route path="/admin/referrals"      element={<AdminRoute><Layout><AdminReferrals /></Layout></AdminRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
