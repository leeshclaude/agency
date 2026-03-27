import { useAuth } from '../../contexts/AuthContext'

export default function DeniedPage() {
  const { signOut } = useAuth()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
      style={{ background: '#faf8f6' }}>
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
        style={{ background: '#fef2f2' }}
      >
        <span style={{ fontSize: 28 }}>🚫</span>
      </div>

      <h1 className="text-2xl font-semibold mb-3" style={{ color: '#302820' }}>
        Application not approved
      </h1>
      <p className="text-sm mb-8" style={{ color: '#8e7a68', maxWidth: 320 }}>
        Unfortunately your application to The Mama Edit wasn't successful at this time.
        If you think this is a mistake, please reach out to us directly.
      </p>

      <button onClick={signOut} className="btn-secondary max-w-xs">
        Sign out
      </button>
    </div>
  )
}
