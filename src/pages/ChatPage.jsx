import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import Avatar from '../components/ui/Avatar'

const CHANNELS = [
  { id: 'general', label: 'General', emoji: '💬' },
  { id: 'intros', label: "Intro's", emoji: '✨' },
  { id: 'engagement', label: 'Engagement', emoji: '💕' },
  { id: 'brand-ops', label: 'Brand Ops', emoji: '💸' },
]

export default function ChatPage() {
  const { profile, isAdmin } = useAuth()
  const [mode, setMode] = useState('community') // 'community' | 'dm'
  const [activeChannel, setActiveChannel] = useState(null) // null = show channel list
  const [messages, setMessages] = useState([])
  const [channelPreviews, setChannelPreviews] = useState({})
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [unreadCounts, setUnreadCounts] = useState({})
  const [dmUnread, setDmUnread] = useState(0)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const activeChannelRef = useRef(activeChannel)
  const modeRef = useRef(mode)

  useEffect(() => {
    activeChannelRef.current = activeChannel
  }, [activeChannel])

  useEffect(() => {
    modeRef.current = mode
  }, [mode])

  useEffect(() => {
    if (activeChannel) fetchMessages(activeChannel)
  }, [activeChannel])

  useEffect(() => {
    loadUnreadCounts()
    fetchChannelPreviews()
    fetchDmUnread()
  }, [])

  useEffect(() => {
    const channel = supabase
      .channel('public:messages')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            if (payload.new.channel === activeChannelRef.current) {
              fetchNewMessage(payload.new.id)
              markChannelReadInDB(activeChannelRef.current)
            } else if (payload.new.user_id !== profile.id) {
              setUnreadCounts((c) => ({
                ...c,
                [payload.new.channel]: (c[payload.new.channel] || 0) + 1,
              }))
              // Refresh preview for the channel that got a new message
              fetchChannelPreview(payload.new.channel)
            }
          } else if (payload.eventType === 'UPDATE') {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === payload.new.id ? { ...m, is_pinned: payload.new.is_pinned } : m
              )
            )
          } else if (payload.eventType === 'DELETE') {
            setMessages((prev) => prev.filter((m) => m.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  // Realtime: reactions added/removed by other users
  useEffect(() => {
    const reactChannel = supabase
      .channel('public:message_reactions')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'message_reactions' }, (payload) => {
        if (payload.new.user_id === profile.id) return // already handled optimistically
        setMessages((prev) =>
          prev.map((m) =>
            m.id === payload.new.message_id
              ? { ...m, reactions: [...(m.reactions || []), payload.new] }
              : m
          )
        )
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'message_reactions' }, (payload) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === payload.old.message_id
              ? { ...m, reactions: (m.reactions || []).filter((r) => r.id !== payload.old.id) }
              : m
          )
        )
      })
      .subscribe()
    return () => supabase.removeChannel(reactChannel)
  }, [])

  // Realtime: DM badge
  useEffect(() => {
    const dmChannel = supabase
      .channel('admin_dms:badge')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'admin_dms' }, (payload) => {
        if (modeRef.current === 'dm') return
        const isFromMember = payload.new.sender_id !== profile.id
        if (!isFromMember) return
        if (!isAdmin && payload.new.member_id !== profile.id) return
        setDmUnread((n) => n + 1)
      })
      .subscribe()
    return () => supabase.removeChannel(dmChannel)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function fetchMessages(ch) {
    setLoading(true)
    setMessages([])
    const { data } = await supabase
      .from('messages')
      .select(`
        id, content, created_at, user_id, channel, is_pinned,
        profiles:user_id (full_name, instagram_handle, avatar_url, is_admin),
        reactions:message_reactions (id, emoji, user_id)
      `)
      .eq('channel', ch)
      .order('created_at', { ascending: true })
      .limit(200)

    if (data) setMessages(data)
    setLoading(false)
  }

  async function fetchNewMessage(id) {
    const { data } = await supabase
      .from('messages')
      .select(`
        id, content, created_at, user_id, channel, is_pinned,
        profiles:user_id (full_name, instagram_handle, avatar_url, is_admin),
        reactions:message_reactions (id, emoji, user_id)
      `)
      .eq('id', id)
      .single()

    if (data) setMessages((prev) => {
      if (prev.find((m) => m.id === data.id)) return prev
      return [...prev, data]
    })
  }

  async function fetchChannelPreviews() {
    const results = {}
    await Promise.all(
      CHANNELS.map(async (ch) => {
        const { data } = await supabase
          .from('messages')
          .select('content, created_at, profiles:user_id(full_name)')
          .eq('channel', ch.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (data) results[ch.id] = data
      })
    )
    setChannelPreviews(results)
  }

  async function fetchChannelPreview(channelId) {
    const { data } = await supabase
      .from('messages')
      .select('content, created_at, profiles:user_id(full_name)')
      .eq('channel', channelId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (data) setChannelPreviews((prev) => ({ ...prev, [channelId]: data }))
  }

  async function loadUnreadCounts() {
    const { data: reads } = await supabase
      .from('channel_reads')
      .select('channel, last_read_at')
      .eq('user_id', profile.id)

    const readMap = {}
    if (reads) reads.forEach((r) => { readMap[r.channel] = r.last_read_at })

    const counts = {}
    for (const ch of CHANNELS) {
      const readAt = readMap[ch.id] || profile.created_at || '1970-01-01T00:00:00Z'
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('channel', ch.id)
        .neq('user_id', profile.id)
        .gt('created_at', readAt)
      counts[ch.id] = count || 0
    }

    setUnreadCounts(counts)
  }

  async function markChannelReadInDB(channelId) {
    await supabase.from('channel_reads').upsert(
      { user_id: profile.id, channel: channelId, last_read_at: new Date().toISOString() },
      { onConflict: 'user_id,channel' }
    )
  }

  async function fetchDmUnread() {
    const lastRead = localStorage.getItem(`dm_last_read_${profile.id}`) || profile.created_at || '1970-01-01T00:00:00Z'
    let query = supabase
      .from('admin_dms')
      .select('*', { count: 'exact', head: true })
      .neq('sender_id', profile.id)
      .gt('created_at', lastRead)
    if (!isAdmin) query = query.eq('member_id', profile.id)
    const { count } = await query
    setDmUnread(count || 0)
  }

  function openChannel(channelId) {
    setActiveChannel(channelId)
    setInput('')
    setUnreadCounts((c) => ({ ...c, [channelId]: 0 }))
    markChannelReadInDB(channelId)
  }

  function backToList() {
    setActiveChannel(null)
    setMessages([])
    fetchChannelPreviews()
  }

  async function sendMessage(e) {
    e.preventDefault()
    const text = input.trim()
    if (!text || sending) return

    setSending(true)
    setInput('')

    const { error } = await supabase.from('messages').insert({
      user_id: profile.id,
      content: text,
      channel: activeChannel,
    })

    if (error) setInput(text)
    setSending(false)
    inputRef.current?.focus()
  }

  async function deleteMessage(id) {
    await supabase.from('messages').delete().eq('id', id)
  }

  async function pinMessage(id) {
    await supabase
      .from('messages')
      .update({ is_pinned: false })
      .eq('channel', activeChannel)
      .eq('is_pinned', true)
    await supabase.from('messages').update({ is_pinned: true }).eq('id', id)
    setMessages((prev) => prev.map((m) => ({ ...m, is_pinned: m.id === id })))
  }

  async function unpinMessage() {
    await supabase
      .from('messages')
      .update({ is_pinned: false })
      .eq('channel', activeChannel)
      .eq('is_pinned', true)
    setMessages((prev) => prev.map((m) => ({ ...m, is_pinned: false })))
  }

  async function toggleReaction(messageId, emoji) {
    const msg = messages.find((m) => m.id === messageId)
    const existing = msg?.reactions?.find((r) => r.emoji === emoji && r.user_id === profile.id)
    if (existing) {
      await supabase.from('message_reactions').delete().eq('id', existing.id)
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, reactions: m.reactions.filter((r) => r.id !== existing.id) }
            : m
        )
      )
    } else {
      const { data } = await supabase
        .from('message_reactions')
        .insert({ message_id: messageId, user_id: profile.id, emoji })
        .select()
        .single()
      if (data) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? { ...m, reactions: [...(m.reactions || []), data] }
              : m
          )
        )
      }
    }
  }

  // Group consecutive messages from the same sender
  const groups = []
  for (const msg of messages) {
    const last = groups[groups.length - 1]
    if (last && last.userId === msg.user_id) {
      last.messages.push(msg)
    } else {
      groups.push({ userId: msg.user_id, messages: [msg] })
    }
  }

  const pinnedMessage = messages.find((m) => m.is_pinned)
  const activeChannelData = CHANNELS.find((c) => c.id === activeChannel)

  // ── Header title logic ──────────────────────────
  let headerTitle = 'Group Chat'
  if (mode === 'dm') headerTitle = isAdmin ? 'DM Inbox' : 'Message Admin'
  else if (activeChannel) headerTitle = `${activeChannelData?.emoji} ${activeChannelData?.label}`

  const showModeToggle = !activeChannel || mode === 'dm'
  const showBackArrow = mode === 'community' && activeChannel !== null
  const totalGroupUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0)

  return (
    <div className="flex flex-col" style={{ height: '100svh', background: '#FEF9FB' }}>

      {/* Header */}
      <div
        className="flex-shrink-0 pt-12 pb-3"
        style={{ background: '#FEF9FB', borderBottom: '1px solid #FAE8EF' }}
      >
        <div className="max-w-lg mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {showBackArrow && (
              <button
                onClick={backToList}
                className="text-base font-medium mr-1"
                style={{ color: '#6B4A57' }}
              >
                ←
              </button>
            )}
            <div>
              <p className="section-label mb-0.5">Community</p>
              <h1 className="text-lg" style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600, color: '#2C1A22' }}>
                {headerTitle}
              </h1>
            </div>
          </div>

          {/* Mode toggle — hidden when inside a community channel */}
          {showModeToggle && (
            <div
              className="flex rounded-xl overflow-hidden"
              style={{ border: '1px solid #F2A7BE' }}
            >
              <button
                onClick={() => { setMode('community'); setActiveChannel(null); setMessages([]) }}
                className="px-3 py-1.5 text-xs font-medium transition-all flex items-center gap-1"
                style={{
                  background: mode === 'community' ? '#D4688A' : '#FEF9FB',
                  color: mode === 'community' ? '#fff' : '#6B4A57',
                }}
              >
                💬 Group
                {totalGroupUnread > 0 && mode !== 'community' && (
                  <span
                    className="inline-flex items-center justify-center rounded-full font-semibold"
                    style={{ background: '#D4688A', color: '#fff', fontSize: 9, minWidth: 14, height: 14, padding: '0 3px' }}
                  >
                    {totalGroupUnread > 9 ? '9+' : totalGroupUnread}
                  </span>
                )}
              </button>
              <button
                onClick={() => {
                  setMode('dm')
                  setDmUnread(0)
                  localStorage.setItem(`dm_last_read_${profile.id}`, new Date().toISOString())
                }}
                className="px-3 py-1.5 text-xs font-medium transition-all flex items-center gap-1"
                style={{
                  background: mode === 'dm' ? '#D4688A' : '#FEF9FB',
                  color: mode === 'dm' ? '#fff' : '#6B4A57',
                }}
              >
                💌 Admin
                {dmUnread > 0 && mode !== 'dm' && (
                  <span
                    className="inline-flex items-center justify-center rounded-full font-semibold"
                    style={{ background: '#D4688A', color: '#fff', fontSize: 9, minWidth: 14, height: 14, padding: '0 3px' }}
                  >
                    {dmUnread > 9 ? '9+' : dmUnread}
                  </span>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* DM Admin mode */}
      {mode === 'dm' && (
        isAdmin ? <AdminDMInbox adminProfile={profile} /> : <DMAdminThread profile={profile} />
      )}

      {/* Community mode — channel list */}
      {mode === 'community' && !activeChannel && (
        <div className="flex-1 overflow-y-auto">
          {CHANNELS.map((ch) => {
            const unread = unreadCounts[ch.id] || 0
            const preview = channelPreviews[ch.id]
            return (
              <button
                key={ch.id}
                onClick={() => openChannel(ch.id)}
                className="w-full flex items-center gap-3 px-4 py-3.5 transition-all active:bg-gray-50"
                style={{ borderBottom: '1px solid #FAE8EF', background: '#FEF9FB' }}
              >
                {/* Channel emoji avatar */}
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: '#FAE8EF', fontSize: 22 }}
                >
                  {ch.emoji}
                </div>

                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className="font-semibold text-sm"
                      style={{ color: '#2C1A22', fontWeight: unread > 0 ? 700 : 600 }}
                    >
                      {ch.label}
                    </p>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {preview?.created_at && (
                        <span className="text-xs" style={{ color: '#6B4A57' }}>
                          {new Date(preview.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                      {unread > 0 && (
                        <span
                          className="inline-flex items-center justify-center rounded-full font-semibold"
                          style={{
                            background: '#D4688A',
                            color: '#fff',
                            fontSize: 10,
                            minWidth: 18,
                            height: 18,
                            padding: '0 4px',
                          }}
                        >
                          {unread > 9 ? '9+' : unread}
                        </span>
                      )}
                    </div>
                  </div>
                  <p
                    className="text-xs truncate mt-0.5"
                    style={{ color: unread > 0 ? '#2C1A22' : '#6B4A57', fontWeight: unread > 0 ? 500 : 400 }}
                  >
                    {preview
                      ? `${preview.profiles?.full_name}: ${preview.content}`
                      : 'No messages yet'}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Community mode — open channel chat */}
      {mode === 'community' && activeChannel && <>

        {/* Pinned message banner */}
        {pinnedMessage && (
          <div
            className="flex-shrink-0 flex items-center gap-3 px-4 py-2.5"
            style={{ background: '#FEF9FB', borderBottom: '1px solid #FAE8EF' }}
          >
            <span style={{ fontSize: 14, flexShrink: 0 }}>📌</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold mb-0.5" style={{ color: '#6B4A57' }}>
                {pinnedMessage.profiles?.full_name}
              </p>
              <p className="text-xs truncate" style={{ color: '#2C1A22' }}>
                {pinnedMessage.content}
              </p>
            </div>
            {isAdmin && (
              <button
                onClick={unpinMessage}
                className="flex-shrink-0 text-xs px-2 py-1 rounded-lg"
                style={{ color: '#6B4A57', background: '#FAE8EF' }}
              >
                Unpin
              </button>
            )}
          </div>
        )}

        {/* Messages — pt-48 gives first bubble room for context menu above it */}
        <div className="flex-1 overflow-y-auto px-4 pt-48 pb-4">
          <div className="max-w-lg mx-auto space-y-4">
            {loading ? (
              <div className="text-center py-12" style={{ color: '#6B4A57' }}>Loading…</div>
            ) : messages.length === 0 ? (
              <div className="text-center py-16">
                <span style={{ fontSize: 32 }}>{activeChannelData?.emoji}</span>
                <p className="mt-3 text-sm font-medium" style={{ color: '#2C1A22' }}>
                  {activeChannelData?.label}
                </p>
                <p className="mt-1 text-sm" style={{ color: '#6B4A57' }}>
                  No messages yet. Be the first to post!
                </p>
              </div>
            ) : (
              groups.map((group, gi) => {
                const isOwn = group.userId === profile.id
                const firstMsg = group.messages[0]
                const name = firstMsg.profiles?.full_name || 'Unknown'
                const handle = firstMsg.profiles?.instagram_handle || ''
                const avatarUrl = firstMsg.profiles?.avatar_url || null
                const senderIsAdmin = firstMsg.profiles?.is_admin === true

                return (
                  <div
                    key={gi}
                    className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'} items-end`}
                  >
                    {!isOwn && (
                      <div className="flex-shrink-0">
                        <Avatar avatarUrl={avatarUrl} name={name} size={32} />
                      </div>
                    )}

                    <div className={`flex flex-col gap-1 ${isOwn ? 'items-end' : 'items-start'}`}>
                      {!isOwn && (
                        <div className="flex items-center gap-1.5 px-1 mb-0.5 flex-wrap">
                          <span className="text-xs font-semibold" style={{ color: '#2C1A22' }}>{name}</span>
                          {senderIsAdmin && (
                            <span
                              className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                              style={{ background: '#FAE8EF', color: '#6B4A57', fontSize: 10 }}
                            >
                              Admin
                            </span>
                          )}
                          {handle && (
                            <a
                              href={`https://instagram.com/${handle.replace('@', '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs"
                              style={{ color: '#D4688A' }}
                            >
                              {handle} ↗
                            </a>
                          )}
                        </div>
                      )}

                      {group.messages.map((msg, mi) => {
                        const isFirst = mi === 0
                        const isLast = mi === group.messages.length - 1
                        const canDelete = isOwn || isAdmin

                        return (
                          <MessageBubble
                            key={msg.id}
                            message={msg}
                            isOwn={isOwn}
                            isFirst={isFirst}
                            isLast={isLast}
                            canDelete={canDelete}
                            canPin={isAdmin}
                            onDelete={() => deleteMessage(msg.id)}
                            onPin={() => pinMessage(msg.id)}
                            reactions={msg.reactions || []}
                            currentUserId={profile.id}
                            onReact={(emoji) => toggleReaction(msg.id, emoji)}
                          />
                        )
                      })}

                      <span className="text-xs px-1" style={{ color: '#6B4A57' }}>
                        {new Date(group.messages[group.messages.length - 1].created_at).toLocaleTimeString('en-AU', {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Input */}
        <div
          className="flex-shrink-0 px-4 py-3"
          style={{
            background: '#FEF9FB',
            borderTop: '1px solid #FAE8EF',
            paddingBottom: 'calc(env(safe-area-inset-bottom) + 80px)',
          }}
        >
          <form onSubmit={sendMessage} className="max-w-lg mx-auto flex gap-2">
            <input
              ref={inputRef}
              className="input-field flex-1"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Message ${activeChannelData?.emoji} ${activeChannelData?.label}…`}
              autoComplete="off"
              style={{ paddingTop: 10, paddingBottom: 10 }}
            />
            <button
              type="submit"
              disabled={!input.trim() || sending}
              className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-95"
              style={{
                background: input.trim() ? '#D4688A' : '#FAE8EF',
                color: input.trim() ? '#fff' : '#6B4A57',
              }}
            >
              <SendIcon />
            </button>
          </form>
        </div>

      </>}
    </div>
  )
}

// ─────────────────────────────────────────────────
// Admin DM Inbox (shown to admin only)
// ─────────────────────────────────────────────────
function AdminDMInbox({ adminProfile }) {
  const [conversations, setConversations] = useState([])
  const [activeMember, setActiveMember] = useState(null)
  const [threadMessages, setThreadMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [threadLoading, setThreadLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    fetchConversations()
  }, [])

  useEffect(() => {
    if (activeMember) fetchThread(activeMember.id)
  }, [activeMember])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [threadMessages])

  async function fetchConversations() {
    setLoading(true)
    const { data } = await supabase
      .from('admin_dms')
      .select('member_id, content, created_at, profiles:member_id(id, full_name, instagram_handle, avatar_url)')
      .order('created_at', { ascending: false })
    if (data) {
      const seen = new Set()
      const convos = []
      for (const row of data) {
        if (!seen.has(row.member_id)) {
          seen.add(row.member_id)
          convos.push(row)
        }
      }
      setConversations(convos)
    }
    setLoading(false)
  }

  async function fetchThread(memberId) {
    setThreadLoading(true)
    const { data } = await supabase
      .from('admin_dms')
      .select('*, sender:sender_id(full_name, avatar_url, is_admin), reactions:admin_dm_reactions(id, emoji, user_id)')
      .eq('member_id', memberId)
      .order('created_at', { ascending: true })
    if (data) setThreadMessages(data)
    setThreadLoading(false)
  }

  async function deleteDmMessage(id) {
    await supabase.from('admin_dms').delete().eq('id', id)
    setThreadMessages((prev) => prev.filter((m) => m.id !== id))
  }

  async function toggleDmReaction(messageId, emoji) {
    const msg = threadMessages.find((m) => m.id === messageId)
    const existing = msg?.reactions?.find((r) => r.emoji === emoji && r.user_id === adminProfile.id)
    if (existing) {
      await supabase.from('admin_dm_reactions').delete().eq('id', existing.id)
      setThreadMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, reactions: m.reactions.filter((r) => r.id !== existing.id) }
            : m
        )
      )
    } else {
      const { data } = await supabase
        .from('admin_dm_reactions')
        .insert({ message_id: messageId, user_id: adminProfile.id, emoji })
        .select().single()
      if (data) {
        setThreadMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? { ...m, reactions: [...(m.reactions || []), data] }
              : m
          )
        )
      }
    }
  }

  async function sendReply(e) {
    e.preventDefault()
    const text = input.trim()
    if (!text || sending || !activeMember) return
    setSending(true)
    setInput('')
    await supabase.from('admin_dms').insert({
      member_id: activeMember.id,
      sender_id: adminProfile.id,
      content: text,
    })
    await fetchThread(activeMember.id)
    setSending(false)
  }

  if (activeMember) {
    return (
      <>
        {/* Thread header */}
        <div
          className="flex-shrink-0 flex items-center gap-3 px-4 py-3"
          style={{ background: '#FEF9FB', borderBottom: '1px solid #FAE8EF' }}
        >
          <button
            onClick={() => { setActiveMember(null); setThreadMessages([]) }}
            className="text-sm font-medium flex-shrink-0"
            style={{ color: '#6B4A57' }}
          >
            ←
          </button>
          <Avatar avatarUrl={activeMember.avatar_url} name={activeMember.full_name} size={36} />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm" style={{ color: '#2C1A22' }}>{activeMember.full_name}</p>
            <a
              href={`https://instagram.com/${activeMember.instagram_handle?.replace('@', '')}`}
              target="_blank" rel="noopener noreferrer"
              className="text-xs" style={{ color: '#D4688A' }}
            >
              {activeMember.instagram_handle} ↗
            </a>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 pt-48 pb-4">
          <div className="max-w-lg mx-auto space-y-4">
            {threadLoading ? (
              <div className="text-center py-12" style={{ color: '#6B4A57' }}>Loading…</div>
            ) : (() => {
              const groups = []
              for (const msg of threadMessages) {
                const last = groups[groups.length - 1]
                if (last && last.senderId === msg.sender_id) last.messages.push(msg)
                else groups.push({ senderId: msg.sender_id, messages: [msg] })
              }
              return groups.map((group, gi) => {
                const isOwn = group.senderId === adminProfile.id
                const firstMsg = group.messages[0]
                return (
                  <div key={gi} className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'} items-end`}>
                    {!isOwn && (
                      <div className="flex-shrink-0">
                        <Avatar avatarUrl={activeMember.avatar_url} name={activeMember.full_name} size={32} />
                      </div>
                    )}
                    <div className={`flex flex-col gap-1 ${isOwn ? 'items-end' : 'items-start'}`}>
                      {group.messages.map((msg, mi) => (
                        <MessageBubble
                          key={msg.id}
                          message={msg}
                          isOwn={isOwn}
                          isFirst={mi === 0}
                          isLast={mi === group.messages.length - 1}
                          canDelete={true}
                          canPin={false}
                          onDelete={() => deleteDmMessage(msg.id)}
                          onPin={() => {}}
                          reactions={msg.reactions || []}
                          currentUserId={adminProfile.id}
                          onReact={(emoji) => toggleDmReaction(msg.id, emoji)}
                        />
                      ))}
                      <span className="text-xs px-1" style={{ color: '#6B4A57' }}>
                        {new Date(group.messages[group.messages.length - 1].created_at).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                )
              })
            })()}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Reply input */}
        <div
          className="flex-shrink-0 px-4 py-3"
          style={{
            background: '#FEF9FB',
            borderTop: '1px solid #FAE8EF',
            paddingBottom: 'calc(env(safe-area-inset-bottom) + 80px)',
          }}
        >
          <form onSubmit={sendReply} className="max-w-lg mx-auto flex gap-2">
            <input
              className="input-field flex-1"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Reply to ${activeMember.full_name}…`}
              autoComplete="off"
              style={{ paddingTop: 10, paddingBottom: 10 }}
            />
            <button
              type="submit"
              disabled={!input.trim() || sending}
              className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-95"
              style={{
                background: input.trim() ? '#D4688A' : '#FAE8EF',
                color: input.trim() ? '#fff' : '#6B4A57',
              }}
            >
              <SendIcon />
            </button>
          </form>
        </div>
      </>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {loading ? (
        <div className="text-center py-12" style={{ color: '#6B4A57' }}>Loading…</div>
      ) : conversations.length === 0 ? (
        <div className="text-center py-16">
          <span style={{ fontSize: 32 }}>💌</span>
          <p className="mt-3 text-sm" style={{ color: '#6B4A57' }}>No member messages yet</p>
        </div>
      ) : (
        conversations.map((convo) => (
          <button
            key={convo.member_id}
            onClick={() => setActiveMember(convo.profiles)}
            className="w-full flex items-center gap-3 px-4 py-4 transition-all active:bg-gray-50"
            style={{ borderBottom: '1px solid #FAE8EF', background: '#FEF9FB' }}
          >
            <Avatar avatarUrl={convo.profiles?.avatar_url} name={convo.profiles?.full_name} size={48} />
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-sm" style={{ color: '#2C1A22' }}>
                  {convo.profiles?.full_name}
                </p>
                <span className="text-xs flex-shrink-0" style={{ color: '#6B4A57' }}>
                  {new Date(convo.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                </span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: '#6B4A57' }}>
                {convo.profiles?.instagram_handle}
              </p>
              <p className="text-xs truncate mt-1" style={{ color: '#6B4A57' }}>
                {convo.content}
              </p>
            </div>
          </button>
        ))
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────
// DM Admin Thread
// ─────────────────────────────────────────────────
function DMAdminThread({ profile }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    fetchDMs()

    const channel = supabase
      .channel('admin_dms:member')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'admin_dms', filter: `member_id=eq.${profile.id}` },
        (payload) => {
          setMessages((prev) => {
            if (prev.find((m) => m.id === payload.new.id)) return prev
            return [...prev, { ...payload.new, sender: null }]
          })
          fetchDMs()
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function fetchDMs() {
    const { data } = await supabase
      .from('admin_dms')
      .select('*, sender:sender_id(full_name, avatar_url, is_admin), reactions:admin_dm_reactions(id, emoji, user_id)')
      .eq('member_id', profile.id)
      .order('created_at', { ascending: true })
    if (data) setMessages(data)
    setLoading(false)
  }

  async function deleteDmMessage(id) {
    await supabase.from('admin_dms').delete().eq('id', id)
    setMessages((prev) => prev.filter((m) => m.id !== id))
  }

  async function toggleDmReaction(messageId, emoji) {
    const msg = messages.find((m) => m.id === messageId)
    const existing = msg?.reactions?.find((r) => r.emoji === emoji && r.user_id === profile.id)
    if (existing) {
      await supabase.from('admin_dm_reactions').delete().eq('id', existing.id)
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, reactions: m.reactions.filter((r) => r.id !== existing.id) }
            : m
        )
      )
    } else {
      const { data } = await supabase
        .from('admin_dm_reactions')
        .insert({ message_id: messageId, user_id: profile.id, emoji })
        .select().single()
      if (data) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? { ...m, reactions: [...(m.reactions || []), data] }
              : m
          )
        )
      }
    }
  }

  async function sendDM(e) {
    e.preventDefault()
    const text = input.trim()
    if (!text || sending) return
    setSending(true)
    setInput('')
    await supabase.from('admin_dms').insert({
      member_id: profile.id,
      sender_id: profile.id,
      content: text,
    })
    setSending(false)
    inputRef.current?.focus()
  }

  return (
    <>
      {/* Info banner */}
      <div
        className="flex-shrink-0 flex items-center gap-3 px-4 py-3"
        style={{ background: '#FEF9FB', borderBottom: '1px solid #FAE8EF' }}
      >
        <span style={{ fontSize: 20 }}>💌</span>
        <p className="text-xs" style={{ color: '#6B4A57' }}>
          Private messages with The Mama Edit admin. Only you and admin can see this.
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 pt-48 pb-4">
        <div className="max-w-lg mx-auto space-y-4">
          {loading ? (
            <div className="text-center py-12" style={{ color: '#6B4A57' }}>Loading…</div>
          ) : messages.length === 0 ? (
            <div className="text-center py-16">
              <span style={{ fontSize: 32 }}>💌</span>
              <p className="mt-3 text-sm font-medium" style={{ color: '#2C1A22' }}>Message Admin</p>
              <p className="mt-1 text-sm" style={{ color: '#6B4A57' }}>
                Send a private message and admin will get back to you.
              </p>
            </div>
          ) : (() => {
            const groups = []
            for (const msg of messages) {
              const last = groups[groups.length - 1]
              if (last && last.senderId === msg.sender_id) last.messages.push(msg)
              else groups.push({ senderId: msg.sender_id, messages: [msg] })
            }
            return groups.map((group, gi) => {
              const isOwn = group.senderId === profile.id
              const firstMsg = group.messages[0]
              return (
                <div key={gi} className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'} items-end`}>
                  {!isOwn && (
                    <div className="flex-shrink-0">
                      <Avatar avatarUrl={firstMsg.sender?.avatar_url} name={firstMsg.sender?.full_name || 'Admin'} size={32} />
                    </div>
                  )}
                  <div className={`flex flex-col gap-1 ${isOwn ? 'items-end' : 'items-start'}`}>
                    {!isOwn && (
                      <span className="text-xs px-1" style={{ fontFamily: 'DM Sans, sans-serif', color: '#6B4A57' }}>Admin</span>
                    )}
                    {group.messages.map((msg, mi) => (
                      <MessageBubble
                        key={msg.id}
                        message={msg}
                        isOwn={isOwn}
                        isFirst={mi === 0}
                        isLast={mi === group.messages.length - 1}
                        canDelete={isOwn}
                        canPin={false}
                        onDelete={() => deleteDmMessage(msg.id)}
                        onPin={() => {}}
                        reactions={msg.reactions || []}
                        currentUserId={profile.id}
                        onReact={(emoji) => toggleDmReaction(msg.id, emoji)}
                      />
                    ))}
                    <span className="text-xs px-1" style={{ color: '#6B4A57' }}>
                      {new Date(group.messages[group.messages.length - 1].created_at).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              )
            })
          })()}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div
        className="flex-shrink-0 px-4 py-3"
        style={{
          background: '#FEF9FB',
          borderTop: '1px solid #FAE8EF',
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 80px)',
        }}
      >
        <form onSubmit={sendDM} className="max-w-lg mx-auto flex gap-2">
          <input
            ref={inputRef}
            className="input-field flex-1"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Message admin…"
            autoComplete="off"
            style={{ paddingTop: 10, paddingBottom: 10 }}
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-95"
            style={{
              background: input.trim() ? '#D4688A' : '#FAE8EF',
              color: input.trim() ? '#fff' : '#6B4A57',
            }}
          >
            <SendIcon />
          </button>
        </form>
      </div>
    </>
  )
}

const QUICK_REACTIONS = ['❤️', '😂', '😮', '😢', '👏', '🔥']

function MessageBubble({ message, isOwn, isFirst, isLast, canDelete, canPin, onDelete, onPin, reactions, currentUserId, onReact }) {
  const [showMenu, setShowMenu] = useState(false)
  const [copyDone, setCopyDone] = useState(false)
  const longPressTimer = useRef(null)
  const menuRef = useRef(null)

  // Close menu when tapping outside
  useEffect(() => {
    if (!showMenu) return
    function onOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', onOutside)
    document.addEventListener('touchstart', onOutside)
    return () => {
      document.removeEventListener('mousedown', onOutside)
      document.removeEventListener('touchstart', onOutside)
    }
  }, [showMenu])

  function handleTouchStart() {
    longPressTimer.current = setTimeout(() => setShowMenu(true), 450)
  }

  function handleTouchEnd() {
    clearTimeout(longPressTimer.current)
  }

  function handleBubbleClick(e) {
    e.stopPropagation()
    setShowMenu((v) => !v)
  }

  async function handleCopy(e) {
    e.stopPropagation()
    try { await navigator.clipboard.writeText(message.content) } catch {}
    setCopyDone(true)
    setShowMenu(false)
    setTimeout(() => setCopyDone(false), 2000)
  }

  function handleDelete(e) {
    e.stopPropagation()
    onDelete()
    setShowMenu(false)
  }

  function handlePin(e) {
    e.stopPropagation()
    onPin()
    setShowMenu(false)
  }

  // Group reactions by emoji
  const grouped = {}
  for (const r of (reactions || [])) {
    if (!grouped[r.emoji]) grouped[r.emoji] = { count: 0, hasReacted: false }
    grouped[r.emoji].count++
    if (r.user_id === currentUserId) grouped[r.emoji].hasReacted = true
  }
  const hasReactions = Object.keys(grouped).length > 0

  const radius = 18
  const sharp = 5
  const ownStyle = {
    background: '#D4688A',
    color: '#fff',
    borderTopLeftRadius: radius,
    borderTopRightRadius: isFirst ? radius : sharp,
    borderBottomRightRadius: isLast ? sharp : sharp,
    borderBottomLeftRadius: radius,
  }
  const otherStyle = {
    background: '#FEF9FB',
    color: '#2C1A22',
    border: '1px solid #FAE8EF',
    borderTopLeftRadius: isFirst ? radius : sharp,
    borderTopRightRadius: radius,
    borderBottomRightRadius: radius,
    borderBottomLeftRadius: isLast ? sharp : sharp,
  }

  return (
    <div
      ref={menuRef}
      style={{ position: 'relative', display: 'inline-block', maxWidth: '100%' }}
    >
      {/* Context menu — appears above bubble on tap/long-press */}
      {showMenu && (
        <div
          className="absolute z-30"
          style={{
            bottom: 'calc(100% + 8px)',
            [isOwn ? 'right' : 'left']: 0,
            background: '#FEF9FB',
            borderRadius: 16,
            boxShadow: '0 4px 24px rgba(0,0,0,0.14)',
            border: '1px solid #FAE8EF',
            overflow: 'hidden',
            minWidth: 220,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Quick reactions row */}
          <div
            className="flex items-center justify-between px-3 py-2.5"
            style={{ borderBottom: '1px solid #FAE8EF' }}
          >
            {QUICK_REACTIONS.map((e) => (
              <button
                key={e}
                onClick={(ev) => { ev.stopPropagation(); onReact(e); setShowMenu(false) }}
                onTouchEnd={(ev) => { ev.preventDefault(); onReact(e); setShowMenu(false) }}
                className="transition-transform active:scale-125"
                style={{ fontSize: 24, lineHeight: 1 }}
              >
                {e}
              </button>
            ))}
          </div>

          {/* Action rows */}
          <button
            onClick={handleCopy}
            className="w-full flex items-center justify-between px-4 py-3 text-sm active:bg-gray-50 transition-colors"
            style={{ color: '#2C1A22' }}
          >
            <span>{copyDone ? 'Copied!' : 'Copy'}</span>
            <span style={{ fontSize: 16 }}>📋</span>
          </button>

          {canPin && (
            <button
              onClick={handlePin}
              className="w-full flex items-center justify-between px-4 py-3 text-sm active:bg-gray-50 transition-colors"
              style={{ color: '#2C1A22', borderTop: '1px solid #FAE8EF' }}
            >
              <span>{message.is_pinned ? 'Unpin' : 'Pin'}</span>
              <span style={{ fontSize: 16 }}>📌</span>
            </button>
          )}

          {canDelete && (
            <button
              onClick={handleDelete}
              className="w-full flex items-center justify-between px-4 py-3 text-sm active:bg-gray-50 transition-colors"
              style={{ color: '#8C3A55', borderTop: '1px solid #FAE8EF' }}
            >
              <span>Delete</span>
              <span style={{ fontSize: 16 }}>🗑️</span>
            </button>
          )}
        </div>
      )}

      {/* Message bubble */}
      <div
        className="px-3.5 py-2 text-sm leading-relaxed"
        style={isOwn ? ownStyle : otherStyle}
        onClick={handleBubbleClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchEnd}
      >
        {message.content}
      </div>

      {/* Reaction pills */}
      {hasReactions && (
        <div className={`flex flex-wrap gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
          {Object.entries(grouped).map(([emoji, { count, hasReacted }]) => (
            <button
              key={emoji}
              onClick={(e) => { e.stopPropagation(); onReact(emoji) }}
              className="flex items-center gap-0.5 rounded-full text-xs font-medium transition-all"
              style={{
                background: hasReacted ? '#FAE8EF' : '#FAE8EF',
                border: `1px solid ${hasReacted ? '#D4688A' : 'transparent'}`,
                color: '#2C1A22',
                fontSize: 12,
                padding: '2px 8px',
              }}
            >
              {emoji} {count}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function SendIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22,2 15,22 11,13 2,9" />
    </svg>
  )
}
