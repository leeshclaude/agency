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
  const [activeChannel, setActiveChannel] = useState('general')
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [unreadCounts, setUnreadCounts] = useState({})
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const activeChannelRef = useRef(activeChannel)

  useEffect(() => {
    activeChannelRef.current = activeChannel
  }, [activeChannel])

  useEffect(() => {
    fetchMessages(activeChannel)
  }, [activeChannel])

  useEffect(() => {
    loadUnreadCounts()
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
              // Increment unread badge for channels the user isn't currently viewing
              setUnreadCounts((c) => ({
                ...c,
                [payload.new.channel]: (c[payload.new.channel] || 0) + 1,
              }))
            }
          } else if (payload.eventType === 'UPDATE') {
            // Update is_pinned in real time for all users
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
        profiles:user_id (full_name, instagram_handle, avatar_url, is_admin)
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
        profiles:user_id (full_name, instagram_handle, avatar_url, is_admin)
      `)
      .eq('id', id)
      .single()

    if (data) setMessages((prev) => {
      if (prev.find((m) => m.id === data.id)) return prev
      return [...prev, data]
    })
  }

  async function loadUnreadCounts() {
    // Get last-read timestamps for all channels
    const { data: reads } = await supabase
      .from('channel_reads')
      .select('channel, last_read_at')
      .eq('user_id', profile.id)

    const readMap = {}
    if (reads) reads.forEach((r) => { readMap[r.channel] = r.last_read_at })

    // Count unread messages per non-active channel
    const counts = {}
    for (const ch of CHANNELS) {
      if (ch.id === activeChannelRef.current) {
        counts[ch.id] = 0
        continue
      }
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
    // Mark active channel as read in DB
    await markChannelReadInDB(activeChannelRef.current)
  }

  async function markChannelReadInDB(channelId) {
    await supabase.from('channel_reads').upsert(
      { user_id: profile.id, channel: channelId, last_read_at: new Date().toISOString() },
      { onConflict: 'user_id,channel' }
    )
  }

  function switchChannel(channelId) {
    setActiveChannel(channelId)
    setInput('')
    setUnreadCounts((c) => ({ ...c, [channelId]: 0 }))
    markChannelReadInDB(channelId)
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
    // Unpin current pinned message in this channel first
    await supabase
      .from('messages')
      .update({ is_pinned: false })
      .eq('channel', activeChannel)
      .eq('is_pinned', true)
    // Pin selected message
    await supabase.from('messages').update({ is_pinned: true }).eq('id', id)
    // Update local state immediately
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

  return (
    <div className="flex flex-col" style={{ height: '100svh', background: '#faf8f6' }}>

      {/* Header */}
      <div
        className="flex-shrink-0 pt-12 pb-0"
        style={{ background: '#fff', borderBottom: '1px solid #ece4dc' }}
      >
        <div className="max-w-lg mx-auto px-4 pb-3">
          <p className="section-label mb-0.5">Community</p>
          <h1 className="text-lg font-semibold" style={{ color: '#302820' }}>Group Chat</h1>
        </div>

        {/* Channel tabs */}
        <div className="flex">
          {CHANNELS.map((ch) => {
            const isActive = ch.id === activeChannel
            const unread = unreadCounts[ch.id] || 0
            return (
              <button
                key={ch.id}
                onClick={() => switchChannel(ch.id)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-all relative"
                style={{
                  color: isActive ? '#c9a99a' : '#b09d8a',
                  borderBottom: isActive ? '2px solid #c9a99a' : '2px solid transparent',
                  background: 'transparent',
                  whiteSpace: 'nowrap',
                }}
              >
                <span>{ch.emoji}</span>
                <span>{ch.label}</span>
                {unread > 0 && (
                  <span
                    className="inline-flex items-center justify-center rounded-full font-semibold"
                    style={{
                      background: '#c9a99a',
                      color: '#fff',
                      fontSize: 10,
                      minWidth: 16,
                      height: 16,
                      padding: '0 4px',
                      lineHeight: '16px',
                    }}
                  >
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Pinned message banner */}
      {pinnedMessage && (
        <div
          className="flex-shrink-0 flex items-center gap-3 px-4 py-2.5"
          style={{ background: '#fdf6f3', borderBottom: '1px solid #ece4dc' }}
        >
          <span style={{ fontSize: 14, flexShrink: 0 }}>📌</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold mb-0.5" style={{ color: '#b09d8a' }}>
              {pinnedMessage.profiles?.full_name}
            </p>
            <p className="text-xs truncate" style={{ color: '#4e4238' }}>
              {pinnedMessage.content}
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={unpinMessage}
              className="flex-shrink-0 text-xs px-2 py-1 rounded-lg"
              style={{ color: '#b09d8a', background: '#ece4dc' }}
            >
              Unpin
            </button>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-lg mx-auto space-y-4">
          {loading ? (
            <div className="text-center py-12" style={{ color: '#b09d8a' }}>Loading…</div>
          ) : messages.length === 0 ? (
            <div className="text-center py-16">
              <span style={{ fontSize: 32 }}>{activeChannelData?.emoji}</span>
              <p className="mt-3 text-sm font-medium" style={{ color: '#4e4238' }}>
                {activeChannelData?.label}
              </p>
              <p className="mt-1 text-sm" style={{ color: '#b09d8a' }}>
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
                  {/* Avatar — others only */}
                  {!isOwn && (
                    <div className="flex-shrink-0">
                      <Avatar avatarUrl={avatarUrl} name={name} size={32} />
                    </div>
                  )}

                  {/* Bubble column */}
                  <div className={`flex flex-col gap-1 ${isOwn ? 'items-end' : 'items-start'}`}>
                    {/* Name + admin badge */}
                    {!isOwn && (
                      <div className="flex items-center gap-1.5 px-1 mb-0.5 flex-wrap">
                        <span className="text-xs font-semibold" style={{ color: '#4e4238' }}>{name}</span>
                        {senderIsAdmin && (
                          <span
                            className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                            style={{ background: '#edd5cc', color: '#8e7a68', fontSize: 10 }}
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
                            style={{ color: '#c9a99a' }}
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
                        />
                      )
                    })}

                    {/* Timestamp */}
                    <span className="text-xs px-1" style={{ color: '#b09d8a' }}>
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
          background: '#fff',
          borderTop: '1px solid #ece4dc',
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
              background: input.trim() ? '#c9a99a' : '#ece4dc',
              color: input.trim() ? '#fff' : '#b09d8a',
            }}
          >
            <SendIcon />
          </button>
        </form>
      </div>
    </div>
  )
}

function MessageBubble({ message, isOwn, isFirst, isLast, canDelete, canPin, onDelete, onPin }) {
  const [showActions, setShowActions] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const longPressTimer = useRef(null)

  function handleTouchStart() {
    if (!canDelete && !canPin) return
    longPressTimer.current = setTimeout(() => setShowActions(true), 500)
  }

  function handleTouchEnd() {
    clearTimeout(longPressTimer.current)
  }

  function handleDelete() {
    if (confirmDelete) {
      onDelete()
      setShowActions(false)
      setConfirmDelete(false)
    } else {
      setConfirmDelete(true)
    }
  }

  const radius = 18
  const sharp = 5
  const ownStyle = {
    background: '#c9a99a',
    color: '#fff',
    borderTopLeftRadius: radius,
    borderTopRightRadius: isFirst ? radius : sharp,
    borderBottomRightRadius: isLast ? sharp : sharp,
    borderBottomLeftRadius: radius,
  }
  const otherStyle = {
    background: '#fff',
    color: '#302820',
    border: '1px solid #ece4dc',
    borderTopLeftRadius: isFirst ? radius : sharp,
    borderTopRightRadius: radius,
    borderBottomRightRadius: radius,
    borderBottomLeftRadius: isLast ? sharp : sharp,
  }

  return (
    <div
      className="flex items-center gap-2"
      onMouseEnter={() => (canDelete || canPin) && setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setConfirmDelete(false) }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchEnd}
    >
      {/* Bubble */}
      <div
        className="px-3.5 py-2 text-sm leading-relaxed"
        style={isOwn ? ownStyle : otherStyle}
      >
        {message.content}
      </div>

      {/* Action buttons — always to the right of the bubble */}
      {showActions && (
        <div className="flex items-center gap-1 flex-shrink-0">
          {canPin && (
            <button
              onClick={onPin}
              onTouchEnd={(e) => { e.preventDefault(); onPin(); setShowActions(false) }}
              className="text-xs px-2 py-1 rounded-lg"
              style={{ background: '#f5f0ec', color: '#8e7a68' }}
              title="Pin message"
            >
              📌
            </button>
          )}
          {canDelete && (
            <button
              onClick={handleDelete}
              onTouchEnd={(e) => { e.preventDefault(); handleDelete() }}
              className="text-xs px-2 py-1 rounded-lg"
              style={{
                background: confirmDelete ? '#dc2626' : '#fee2e2',
                color: confirmDelete ? '#fff' : '#dc2626',
              }}
            >
              {confirmDelete ? 'Sure?' : '✕'}
            </button>
          )}
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
