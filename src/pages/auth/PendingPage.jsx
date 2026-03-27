import { useAuth } from '../../contexts/AuthContext'

export default function PendingPage() {
  const { profile, signOut } = useAuth()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
      style={{ background: '#faf8f6' }}>
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
        style={{ background: '#edd5cc' }}
      >
        <span style={{ fontSize: 28 }}>⏳</span>
      </div>

      <h1 className="text-2xl font-semibold mb-3" style={{ color: '#302820' }}>
        Application received
      </h1>
      <p className="text-base mb-2" style={{ color: '#6e5e4f', maxWidth: 340 }}>
        Thank you{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}! Your request to join The Mama Edit has been submitted.
      </p>
      <p className="text-sm mb-8" style={{ color: '#8e7a68', maxWidth: 320 }}>
        We review all applications personally. You'll receive an email once you've been approved.
      </p>

      <div className="card p-5 w-full max-w-sm text-left mb-8">
        <p className="section-label mb-3">Your details</p>
        <div className="space-y-2 text-sm" style={{ color: '#4e4238' }}>
          <div className="flex justify-between">
            <span style={{ color: '#8e7a68' }}>Name</span>
            <span className="font-medium">{profile?.full_name || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: '#8e7a68' }}>Instagram</span>
            <span className="font-medium">{profile?.instagram_handle || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: '#8e7a68' }}>Location</span>
            <span className="font-medium">
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
