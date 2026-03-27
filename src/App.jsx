import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Spinner from './components/ui/Spinner'
import AppShell from './components/layout/AppShell'

// Auth pages
import LoginPage from './pages/auth/LoginPage'
import SignUpPage from './pages/auth/SignUpPage'
import PendingPage from './pages/auth/PendingPage'
import DeniedPage from './pages/auth/DeniedPage'

// App pages
import HomePage from './pages/HomePage'
import ChatPage from './pages/ChatPage'
import SessionsPage from './pages/SessionsPage'
import RateCardPage from './pages/RateCardPage'

// Admin
import AdminPage from './pages/admin/AdminPage'

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
    <Routes>
      {/* Public */}
      <Route path="/login" element={!isAuthenticated ? <LoginPage /> : <Navigate to="/" replace />} />
      <Route path="/signup" element={!isAuthenticated ? <SignUpPage /> : <Navigate to="/" replace />} />

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

      {/* Admin — accessible to admin who is also approved */}
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
