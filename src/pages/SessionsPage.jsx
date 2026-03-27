import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function SessionsPage() {
  const { profile, isAdmin } = useAuth()
  const [sessions, setSessions] = useState([])
  const [registrations, setRegistrations] = useState([]) // session IDs the user is registered for
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingSession, setEditingSession] = useState(null)
  const [regCounts, setRegCounts] = useState({}) // { sessionId: count }
  const [expandedRegs, setExpandedRegs] = useState(null) // admin: show who registered

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    const [{ data: sess }, { data: myRegs }] = await Promise.all([
      supabase.from('sessions').select('*').order('session_date', { ascending: true }),
      supabase.from('session_registrations').select('session_id').eq('user_id', profile.id),
    ])

    if (sess) {
      // Filter to upcoming + today
      const upcoming = sess.filter((s) => new Date(s.session_date) >= new Date(Date.now() - 3600000))
      setSessions(upcoming)

      // Fetch reg counts
      const counts = {}
      await Promise.all(
        upcoming.map(async (s) => {
          const { count } = await supabase
            .from('session_registrations')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', s.id)
          counts[s.id] = count || 0
        })
      )
      setRegCounts(counts)
    }

    if (myRegs) setRegistrations(myRegs.map((r) => r.session_id))
    setLoading(false)
  }

  async function register(sessionId) {
    const { error } = await supabase.from('session_registrations').insert({
      session_id: sessionId,
      user_id: profile.id,
    })
    if (!error) {
      setRegistrations((prev) => [...prev, sessionId])
      setRegCounts((prev) => ({ ...prev, [sessionId]: (prev[sessionId] || 0) + 1 }))
    }
  }

  async function unregister(sessionId) {
    await supabase.from('session_registrations')
      .delete()
      .eq('session_id', sessionId)
      .eq('user_id', profile.id)
    setRegistrations((prev) => prev.filter((id) => id !== sessionId))
    setRegCounts((prev) => ({ ...prev, [sessionId]: Math.max(0, (prev[sessionId] || 1) - 1) }))
  }

  async function deleteSession(sessionId) {
    await supabase.from('sessions').delete().eq('id', sessionId)
    setSessions((prev) => prev.filter((s) => s.id !== sessionId))
  }

  async function fetchRegistrants(sessionId) {
    if (expandedRegs === sessionId) {
      setExpandedRegs(null)
      return
    }
    const { data } = await supabase
      .from('session_registrations')
      .select('registered_at, profiles:user_id (full_name, instagram_handle, email)')
      .eq('session_id', sessionId)
      .order('registered_at', { ascending: true })

    setExpandedRegs({ id: sessionId, data: data || [] })
  }

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="section-label mb-1">Upcoming</p>
          <h1 className="text-2xl font-semibold" style={{ color: '#302820' }}>Sessions</h1>
        </div>
        {isAdmin && (
          <button
            onClick={() => { setEditingSession(null); setShowModal(true) }}
            className="text-sm font-medium px-4 py-2 rounded-xl transition-all"
            style={{ background: '#c9a99a', color: '#fff' }}
          >
            + New
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12" style={{ color: '#b09d8a' }}>Loading…</div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-16">
          <span style={{ fontSize: 36 }}>📅</span>
          <p className="mt-3 text-sm" style={{ color: '#b09d8a' }}>No upcoming sessions</p>
          {isAdmin && (
            <button
              onClick={() => { setEditingSession(null); setShowModal(true) }}
              className="mt-4 text-sm font-medium"
              style={{ color: '#c9a99a' }}
            >
              Create the first one
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => {
            const isRegistered = registrations.includes(session.id)
            const count = regCounts[session.id] || 0
            const isFull = count >= session.max_capacity
            const isExpanded = expandedRegs?.id === session.id

            return (
              <SessionCard
                key={session.id}
                session={session}
                isRegistered={isRegistered}
                isFull={isFull}
                count={count}
                isAdmin={isAdmin}
                onRegister={() => register(session.id)}
                onUnregister={() => unregister(session.id)}
                onEdit={() => { setEditingSession(session); setShowModal(true) }}
                onDelete={() => deleteSession(session.id)}
                onViewRegistrants={() => fetchRegistrants(session.id)}
                expandedRegs={isExpanded ? expandedRegs?.data : null}
              />
            )
          })}
        </div>
      )}

      {showModal && (
        <SessionModal
          session={editingSession}
          profileId={profile.id}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); fetchData() }}
        />
      )}
    </div>
  )
}

function SessionCard({ session, isRegistered, isFull, count, isAdmin, onRegister, onUnregister, onEdit, onDelete, onViewRegistrants, expandedRegs }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const date = new Date(session.session_date)
  const dateStr = date.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })
  const timeStr = date.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })

  return (
    <div className="card overflow-hidden">
      {/* Top accent */}
      <div className="h-1" style={{ background: '#c9a99a' }} />
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <h3 className="font-semibold" style={{ color: '#302820' }}>{session.title}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-full"
                style={{ background: '#f5f0ec', color: '#8e7a68' }}
              >
                {session.session_type}
              </span>
              <span className="text-xs" style={{ color: '#b09d8a' }}>
                {count}/{session.max_capacity} spots
              </span>
            </div>
          </div>
          {isAdmin && (
            <div className="flex gap-1">
              <button onClick={onEdit} className="btn-ghost text-xs px-2 py-1">Edit</button>
              {confirmDelete ? (
                <button onClick={onDelete} className="btn-danger text-xs px-2 py-1">Confirm</button>
              ) : (
                <button onClick={() => setConfirmDelete(true)} className="btn-danger text-xs px-2 py-1">Delete</button>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 text-sm mb-3" style={{ color: '#6e5e4f' }}>
          <span>📅 {dateStr}</span>
        </div>
        <div className="flex items-center gap-4 text-sm mb-4" style={{ color: '#6e5e4f' }}>
          <span>🕐 {timeStr} AEST</span>
        </div>

        {session.description && (
          <p className="text-sm mb-4" style={{ color: '#6e5e4f' }}>{session.description}</p>
        )}

        {/* Link — shown only when registered */}
        {isRegistered && (
          <div
            className="rounded-xl p-3 mb-4 flex items-center gap-2"
            style={{ background: '#d1fae5' }}
          >
            <span>🔗</span>
            <a
              href={session.meeting_link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium break-all"
              style={{ color: '#065f46' }}
            >
              {session.meeting_link}
            </a>
          </div>
        )}

        <div className="flex gap-2">
          {isRegistered ? (
            <button
              onClick={onUnregister}
              className="btn-secondary text-sm py-2"
            >
              Cancel registration
            </button>
          ) : isFull ? (
            <button disabled className="btn-secondary text-sm py-2 opacity-50 cursor-not-allowed">
              Session full
            </button>
          ) : (
            <button onClick={onRegister} className="btn-primary text-sm py-2">
              Register for this session
            </button>
          )}
        </div>

        {isAdmin && (
          <div className="mt-3">
            <button
              onClick={onViewRegistrants}
              className="text-xs font-medium"
              style={{ color: '#c9a99a' }}
            >
              {expandedRegs !== null ? '▲ Hide registrants' : `▼ View registrants (${count})`}
            </button>

            {expandedRegs !== null && (
              <div className="mt-3 space-y-2">
                {expandedRegs.length === 0 ? (
                  <p className="text-xs" style={{ color: '#b09d8a' }}>No one registered yet</p>
                ) : (
                  expandedRegs.map((r, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs" style={{ color: '#4e4238' }}>
                      <span className="font-medium">{r.profiles?.full_name}</span>
                      <span style={{ color: '#b09d8a' }}>{r.profiles?.instagram_handle}</span>
                      <span style={{ color: '#b09d8a' }}>{r.profiles?.email}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function SessionModal({ session, profileId, onClose, onSaved }) {
  const [form, setForm] = useState({
    title: session?.title || '',
    description: session?.description || '',
    session_date: session?.session_date ? session.session_date.slice(0, 16) : '',
    session_type: session?.session_type || 'Group Call',
    meeting_link: session?.meeting_link || '',
    max_capacity: session?.max_capacity || 20,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  async function handleSave() {
    if (!form.title.trim()) return setError('Title is required.')
    if (!form.session_date) return setError('Date and time is required.')
    if (!form.meeting_link.trim()) return setError('Meeting link is required.')
    setLoading(true)
    setError('')

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      session_date: new Date(form.session_date).toISOString(),
      session_type: form.session_type,
      meeting_link: form.meeting_link.trim(),
      max_capacity: parseInt(form.max_capacity),
    }

    if (session) {
      const { error: e } = await supabase.from('sessions').update(payload).eq('id', session.id)
      if (e) setError(e.message)
      else onSaved()
    } else {
      const { error: e } = await supabase.from('sessions').insert({ ...payload, created_by: profileId })
      if (e) setError(e.message)
      else onSaved()
    }
    setLoading(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      style={{ background: 'rgba(48,40,32,0.4)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-lg mx-auto rounded-t-3xl px-5 pt-5 pb-8 space-y-4"
        style={{ background: '#faf8f6', maxHeight: '85vh', overflowY: 'auto' }}
      >
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-semibold" style={{ color: '#302820' }}>
            {session ? 'Edit session' : 'New session'}
          </h2>
          <button onClick={onClose} className="btn-ghost px-2 py-1 text-sm">✕</button>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: '#4e4238' }}>Title</label>
          <input className="input-field" value={form.title} onChange={set('title')} placeholder="Session title" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: '#4e4238' }}>Description (optional)</label>
          <textarea
            className="input-field"
            value={form.description}
            onChange={set('description')}
            rows={2}
            style={{ resize: 'none' }}
            placeholder="What will you cover?"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: '#4e4238' }}>Date & Time</label>
          <input className="input-field" type="datetime-local" value={form.session_date} onChange={set('session_date')} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: '#4e4238' }}>Type</label>
          <select className="input-field" value={form.session_type} onChange={set('session_type')}>
            <option value="Group Call">Group Call</option>
            <option value="FaceTime">FaceTime</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: '#4e4238' }}>Zoom / FaceTime link</label>
          <input className="input-field" type="url" value={form.meeting_link} onChange={set('meeting_link')} placeholder="https://…" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: '#4e4238' }}>Max capacity</label>
          <input className="input-field" type="number" min="1" value={form.max_capacity} onChange={set('max_capacity')} />
        </div>

        {error && <p className="text-sm" style={{ color: '#dc2626' }}>{error}</p>}

        <button onClick={handleSave} disabled={loading} className="btn-primary">
          {loading ? 'Saving…' : session ? 'Save changes' : 'Create session'}
        </button>
      </div>
    </div>
  )
}
