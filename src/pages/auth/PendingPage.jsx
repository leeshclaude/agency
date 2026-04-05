import { useAuth } from '../../contexts/AuthContext'

export default function PendingPage() {
  const { profile, signOut } = useAuth()

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
      style={{ background: '#FEF9FB' }}
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
        style={{ background: '#FAE8EF' }}
      >
        <span style={{ fontSize: 28 }}>⏳</span>
      </div>

      <h1
        className="text-2xl mb-3"
        style={{ fontFamily: 'Josefin Sans, sans-serif', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#2C1A22' }}
      >
        Application received
      </h1>
      <p className="text-base mb-2" style={{ fontFamily: 'DM Sans, sans-serif', color: '#6B4A57', maxWidth: 340 }}>
        Thank you{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}! Your request to join The Mama Edit has been submitted.
      </p>
      <p className="text-sm mb-8" style={{ fontFamily: 'DM Sans, sans-serif', color: '#6B4A57', maxWidth: 320 }}>
        We review all applications personally. You'll receive an email once you've been approved.
      </p>

      <div className="card p-5 w-full max-w-sm text-left mb-8">
        <p className="section-label mb-4">Your details</p>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between items-center">
            <span style={{ fontFamily: 'DM Sans, sans-serif', color: '#6B4A57' }}>Name</span>
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, color: '#2C1A22' }}>{profile?.full_name || '—'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span style={{ fontFamily: 'DM Sans, sans-serif', color: '#6B4A57' }}>Instagram</span>
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, color: '#2C1A22' }}>{profile?.instagram_handle || '—'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span style={{ fontFamily: 'DM Sans, sans-serif', color: '#6B4A57' }}>Location</span>
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, color: '#2C1A22' }}>
              {profile?.location_city && profile?.location_state
                ? `${profile.location_city}, ${profile.location_state}`
                : '—'}
            </span>
          </div>
        </div>
      </div>

      <button onClick={signOut} className="btn-ghost text-sm">
        Sign out
      </button>
    </div>
  )
}
