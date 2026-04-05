import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import Avatar from '../../components/ui/Avatar'

const TABS = ['Pending', 'Members', 'DMs']

export default function AdminPage() {
  const { isAdmin, isLoading } = useAuth()
  const navigate = useNavigate()
  const { profile: adminProfile } = useAuth()
  const [tab, setTab] = useState('Pending')
  const [pending, setPending] = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [actioning, setActioning] = useState(null)
  const [dmConversations, setDmConversations] = useState([])
  const [activeDm, setActiveDm] = useState(null) // member profile object
  const [dmMessages, setDmMessages] = useState([])
  const [dmInput, setDmInput] = useState('')
  const [dmLoading, setDmLoading] = useState(false)
  const [dmSending, setDmSending] = useState(false)
  const dmBottomRef = useRef(null)

  useEffect(() => {
    if (!isLoading && !isAdmin) navigate('/', { replace: true })
  }, [isAdmin, isLoading, navigate])

  useEffect(() => {
    if (isAdmin) fetchAll()
  }, [isAdmin])

  useEffect(() => {
    if (tab === 'DMs') fetchDmConversations()
  }, [tab])

  useEffect(() => {
    if (activeDm) fetchDmThread(activeDm.id)
  }, [activeDm])

  useEffect(() => {
    dmBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [dmMessages])

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
        const { data: { session } } = await supabase.auth.getSession()
        await fetch('/api/notify-member-approved', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(session ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
          },
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

  async function fetchDmConversations() {
    // Get all distinct member_ids who have sent DMs, with their last message
    const { data } = await supabase
      .from('admin_dms')
      .select('member_id, content, created_at, profiles:member_id(id, full_name, instagram_handle, avatar_url)')
      .order('created_at', { ascending: false })

    if (!data) return
    // Deduplicate by member_id (keep latest message per member)
    const seen = new Set()
    const convos = []
    for (const row of data) {
      if (!seen.has(row.member_id)) {
        seen.add(row.member_id)
        convos.push(row)
      }
    }
    setDmConversations(convos)
  }

  async function fetchDmThread(memberId) {
    setDmLoading(true)
    const { data } = await supabase
      .from('admin_dms')
      .select('*, sender:sender_id(full_name, avatar_url, is_admin)')
      .eq('member_id', memberId)
      .order('created_at', { ascending: true })
    if (data) setDmMessages(data)
    setDmLoading(false)
  }

  async function sendDmReply(e) {
    e.preventDefault()
    const text = dmInput.trim()
    if (!text || dmSending || !activeDm) return
    setDmSending(true)
    setDmInput('')
    await supabase.from('admin_dms').insert({
      member_id: activeDm.id,
      sender_id: adminProfile.id,
      content: text,
    })
    await fetchDmThread(activeDm.id)
    setDmSending(false)
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

      {/* DMs tab — full width, IG-style, no container padding */}
      {tab === 'DMs' && (
        activeDm ? (
          // ── Thread view ──────────────────────────────────
          <div className="flex flex-col" style={{ height: 'calc(100vh - 140px)' }}>
            {/* Thread header */}
            <div
              className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
              style={{ background: '#fff', borderBottom: '1px solid #ece4dc' }}
            >
              <button
                onClick={() => { setActiveDm(null); setDmMessages([]) }}
                className="text-sm font-medium flex-shrink-0"
                style={{ color: '#b09d8a' }}
              >
                ←
              </button>
              <Avatar avatarUrl={activeDm.avatar_url} name={activeDm.full_name} size={36} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm" style={{ color: '#302820' }}>{activeDm.full_name}</p>
                <a
                  href={`https://instagram.com/${activeDm.instagram_handle?.replace('@','')}`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-xs" style={{ color: '#c9a99a' }}
                >
                  {activeDm.instagram_handle} ↗
                </a>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {dmLoading ? (
                <p className="text-center text-sm py-8" style={{ color: '#b09d8a' }}>Loading…</p>
              ) : dmMessages.length === 0 ? (
                <p className="text-center text-sm py-8" style={{ color: '#b09d8a' }}>No messages yet</p>
              ) : dmMessages.map((msg) => {
                const fromAdmin = msg.sender?.is_admin
                return (
                  <div key={msg.id} className={`flex gap-2 ${fromAdmin ? 'flex-row-reverse' : 'flex-row'} items-end`}>
                    {!fromAdmin && (
                      <Avatar avatarUrl={activeDm.avatar_url} name={activeDm.full_name} size={28} />
                    )}
                    <div className={`flex flex-col gap-0.5 ${fromAdmin ? 'items-end' : 'items-start'}`}>
                      <div
                        className="px-3.5 py-2.5 text-sm leading-relaxed"
                        style={{
                          background: fromAdmin ? '#c9a99a' : '#f5f0ec',
                          color: fromAdmin ? '#fff' : '#302820',
                          borderRadius: fromAdmin ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                          maxWidth: 260,
                        }}
                      >
                        {msg.content}
                      </div>
                      <span className="text-xs px-1" style={{ color: '#b09d8a' }}>
                        {new Date(msg.created_at).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                )
              })}
              <div ref={dmBottomRef} />
            </div>

            {/* Reply input */}
            <form
              onSubmit={sendDmReply}
              className="flex-shrink-0 flex gap-2 px-4 py-3"
              style={{ background: '#fff', borderTop: '1px solid #ece4dc' }}
            >
              <input
                className="input-field flex-1"
                value={dmInput}
                onChange={(e) => setDmInput(e.target.value)}
                placeholder={`Reply to ${activeDm.full_name}…`}
                autoComplete="off"
                style={{ paddingTop: 10, paddingBottom: 10 }}
              />
              <button
                type="submit"
                disabled={!dmInput.trim() || dmSending}
                className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all"
                style={{
                  background: dmInput.trim() ? '#c9a99a' : '#ece4dc',
                  color: dmInput.trim() ? '#fff' : '#b09d8a',
                }}
              >
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22,2 15,22 11,13 2,9" />
                </svg>
              </button>
            </form>
          </div>
        ) : (
          // ── Inbox list ───────────────────────────────────
          <div>
            {dmConversations.length === 0 ? (
              <EmptyState icon="💌" text="No member messages yet" />
            ) : (
              dmConversations.map((convo) => (
                <button
                  key={convo.member_id}
                  onClick={() => setActiveDm(convo.profiles)}
                  className="w-full flex items-center gap-3 px-4 py-4 transition-all active:bg-gray-50"
                  style={{ borderBottom: '1px solid #f5f0ec', background: '#fff' }}
                >
                  <Avatar avatarUrl={convo.profiles?.avatar_url} name={convo.profiles?.full_name} size={48} />
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-sm" style={{ color: '#302820' }}>
                        {convo.profiles?.full_name}
                      </p>
                      <span className="text-xs flex-shrink-0" style={{ color: '#b09d8a' }}>
                        {new Date(convo.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: '#8e7a68' }}>
                      {convo.profiles?.instagram_handle}
                    </p>
                    <p className="text-xs truncate mt-1" style={{ color: '#b09d8a' }}>
                      {convo.content}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        )
      )}

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-3">
        {loading && tab !== 'DMs' ? (
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
