import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Spinner from './components/ui/Spinner'
import AppShell from './components/layout/AppShell'
import { useEffect } from 'react'
import { supabase } from './lib/supabase'

// Auth pages
import LoginPage from './pages/auth/LoginPage'
import SignUpPage from './pages/auth/SignUpPage'
import PendingPage from './pages/auth/PendingPage'
import DeniedPage from './pages/auth/DeniedPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'

// App pages
import HomePage from './pages/HomePage'
import ChatPage from './pages/ChatPage'
import SessionsPage from './pages/SessionsPage'
import RateCardPage from './pages/RateCardPage'

// Admin
import AdminPage from './pages/admin/AdminPage'

// Handles Supabase email links (password reset, magic links)
// Supabase puts tokens in the URL hash: /#access_token=...&type=recovery
function AuthCallbackHandler() {
  const navigate = useNavigate()

  useEffect(() => {
    const hash = window.location.hash
    if (!hash) return

    const params = new URLSearchParams(hash.replace('#', ''))
    const type = params.get('type')

    if (type === 'recovery') {
      // Let Supabase process the token, then send to reset page
      supabase.auth.getSession().then(() => {
        navigate('/reset-password', { replace: true })
      })
    }
  }, [navigate])

  return null
}

function RouterGuard() {
  const { isLoading, isAuthenticated, isApproved, isPending, isDenied, isAdmin } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#faf8f6' }}>
        <Spinner size={32} />
      </div>
    )
  }

  return (
    <>
      <AuthCallbackHandler />
      <Routes>
        {/* Public */}
        <Route path="/login" element={!isAuthenticated ? <LoginPage /> : <Navigate to="/" replace />} />
        <Route path="/signup" element={!isAuthenticated ? <SignUpPage /> : <Navigate to="/" replace />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Awaiting approval */}
        <Route
          path="/pending"
          element={
            isAuthenticated && isPending ? <PendingPage /> :
            !isAuthenticated ? <Navigate to="/login" replace /> :
            <Navigate to="/" replace />
          }
        />

        {/* Denied */}
        <Route
          path="/denied"
          element={
            isAuthenticated && isDenied ? <DeniedPage /> :
            !isAuthenticated ? <Navigate to="/login" replace /> :
            <Navigate to="/" replace />
          }
        />

        {/* Admin */}
        <Route
          path="/admin"
          element={
            !isAuthenticated ? <Navigate to="/login" replace /> :
            isAdmin ? <AdminPage /> :
            <Navigate to="/" replace />
          }
        />

        {/* Protected app routes */}
        <Route
          path="/*"
          element={
            !isAuthenticated ? <Navigate to="/login" replace /> :
            isPending ? <Navigate to="/pending" replace /> :
            isDenied ? <Navigate to="/denied" replace /> :
            isApproved ? (
              <AppShell>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/chat" element={<ChatPage />} />
                  <Route path="/sessions" element={<SessionsPage />} />
                  <Route path="/rate-card" element={<RateCardPage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </AppShell>
            ) : <Navigate to="/login" replace />
          }
        />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <RouterGuard />
      </AuthProvider>
    </BrowserRouter>
  )
}
