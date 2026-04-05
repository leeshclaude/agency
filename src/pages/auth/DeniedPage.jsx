import { useAuth } from '../../contexts/AuthContext'

export default function DeniedPage() {
  const { signOut } = useAuth()

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
      style={{ background: '#FEF9FB' }}
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
        style={{ background: '#FAE8EF' }}
      >
        <span style={{ fontSize: 28 }}>🚫</span>
      </div>

      <h1
        className="text-2xl mb-3"
        style={{ fontFamily: 'Josefin Sans, sans-serif', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#2C1A22' }}
      >
        Application not approved
      </h1>
      <p className="text-sm mb-8" style={{ fontFamily: 'DM Sans, sans-serif', color: '#6B4A57', maxWidth: 320 }}>
        Unfortunately your application to The Mama Edit wasn't successful at this time.
        If you think this is a mistake, please reach out to us directly.
      </p>

      <button onClick={signOut} className="btn-secondary max-w-xs">
        Sign out
      </button>
    </div>
  )
}
