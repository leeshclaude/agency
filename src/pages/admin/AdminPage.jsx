import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

const TABS = ['Pending', 'Members']

export default function AdminPage() {
  const { isAdmin, isLoading } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('Pending')
  const [pending, setPending] = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [actioning, setActioning] = useState(null)

  useEffect(() => {
    if (!isLoading && !isAdmin) navigate('/', { replace: true })
  }, [isAdmin, isLoading, navigate])

  useEffect(() => {
    if (isAdmin) fetchAll()
  }, [isAdmin])

  async function fetchAll() {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: true })

    if (data) {
      setPending(data.filter((p) => p.status === 'pending'))
      setMembers(data.filter((p) => p.status === 'approved'))
    }
    setLoading(false)
  }

  async function setStatus(userId, status, profile) {
    setActioning(userId)
    await supabase.from('profiles').update({ status }).eq('id', userId)

    if (status === 'approved' && profile?.email) {
      try {
        await fetch('/api/notify-member-approved', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            full_name: profile.full_name,
            instagram_handle: profile.instagram_handle,
            email: profile.email,
          }),
        })
      } catch (e) {
        console.error('Failed to send approval email:', e)
      }
    }

    await fetchAll()
    setActioning(null)
  }

  if (isLoading || !isAdmin) return null

  return (
    <div style={{ background: '#faf8f6', minHeight: '100vh' }}>
      {/* Header */}
      <div className="px-4 pt-12 pb-4" style={{ borderBottom: '1px solid #ece4dc', background: '#fff' }}>
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => navigate('/settings')}
            className="flex items-center gap-1 text-sm mb-3"
            style={{ color: '#b09d8a' }}
          >
            ← Back to Settings
          </button>
          <p className="section-label mb-1">Admin</p>
          <h1 className="text-xl font-semibold" style={{ color: '#302820' }}>The Mama Edit</h1>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: '1px solid #ece4dc', background: '#fff' }}>
        <div className="max-w-2xl mx-auto flex">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-5 py-3 text-sm font-medium transition-all relative"
              style={{ color: tab === t ? '#c9a99a' : '#8e7a68' }}
            >
              {t}
              {t === 'Pending' && pending.length > 0 && (
                <span
                  className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-semibold"
                  style={{ background: '#c9a99a', color: '#fff' }}
                >
                  {pending.length}
                </span>
              )}
              {tab === t && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ background: '#c9a99a' }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-3">
        {loading ? (
          <div className="text-center py-12" style={{ color: '#b09d8a' }}>Loading…</div>
        ) : tab === 'Pending' ? (
          pending.length === 0 ? (
            <EmptyState icon="✅" text="No pending applications" />
          ) : (
            pending.map((p) => (
              <MemberCard
                key={p.id}
                profile={p}
                actioning={actioning === p.id}
                actions={
                  <>
                    <button
                      onClick={() => setStatus(p.id, 'approved', p)}
                      disabled={actioning === p.id}
                      className="btn-primary text-sm py-2 px-4"
                      style={{ width: 'auto' }}
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => setStatus(p.id, 'denied', p)}
                      disabled={actioning === p.id}
                      className="btn-danger text-sm py-2 px-4"
                    >
                      Deny
                    </button>
                  </>
                }
              />
            ))
          )
        ) : (
          members.length === 0 ? (
            <EmptyState icon="👥" text="No approved members yet" />
          ) : (
            members.map((p) => (
              <MemberCard
                key={p.id}
                profile={p}
                actioning={actioning === p.id}
                actions={
                  <button
                    onClick={() => setStatus(p.id, 'denied', p)}
                    disabled={actioning === p.id}
                    className="btn-danger text-sm py-2 px-4"
                  >
                    Remove
                  </button>
                }
              />
            ))
          )
        )}
      </div>
    </div>
  )
}

function MemberCard({ profile, actions, actioning }) {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-sm" style={{ color: '#302820' }}>{profile.full_name}</p>
            {profile.is_admin && (
              <span className="badge-approved text-xs">Admin</span>
            )}
          </div>
          <a
            href={`https://instagram.com/${profile.instagram_handle?.replace('@', '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm mt-0.5 inline-block"
            style={{ color: '#c9a99a' }}
          >
            {profile.instagram_handle} ↗
          </a>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: '#8e7a68' }}>
            <span>📧 {profile.email}</span>
            <span>👥 {profile.instagram_followers?.toLocaleString()} followers</span>
            <span>📍 {profile.location_city}, {profile.location_state}</span>
            <span>🗓 {new Date(profile.created_at).toLocaleDateString('en-AU')}</span>
          </div>
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        {actioning ? (
          <span className="text-sm" style={{ color: '#b09d8a' }}>Updating…</span>
        ) : actions}
      </div>
    </div>
  )
}

function EmptyState({ icon, text }) {
  return (
    <div className="text-center py-16">
      <span style={{ fontSize: 32 }}>{icon}</span>
      <p className="mt-3 text-sm" style={{ color: '#b09d8a' }}>{text}</p>
    </div>
  )
}
