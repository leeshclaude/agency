import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import Avatar from '../components/ui/Avatar'

const CHANNELS = [
  { id: 'intros', label: "Intro's", emoji: '✨' },
  { id: 'engagement', label: 'Engagement', emoji: '💕' },
  { id: 'brand-ops', label: 'Brand Ops', emoji: '💸' },
  { id: 'general', label: 'General', emoji: '💬' },
]

export default function ChatPage() {
  const { profile, isAdmin } = useAuth()
  const [activeChannel, setActiveChannel] = useState('general')
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
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
    const channel = supabase
      .channel('public:messages')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            // Only add to state if it belongs to the currently viewed channel
            if (payload.new.channel === activeChannelRef.current) {
              fetchNewMessage(payload.new.id)
            }
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
        id, content, created_at, user_id, channel,
        profiles:user_id (full_name, instagram_handle, avatar_url)
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
        id, content, created_at, user_id, channel,
        profiles:user_id (full_name, instagram_handle, avatar_url)
      `)
      .eq('id', id)
      .single()

    if (data) setMessages((prev) => {
      if (prev.find((m) => m.id === data.id)) return prev
      return [...prev, data]
    })
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

  function switchChannel(ch) {
    setActiveChannel(ch)
    setInput('')
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

  const activeChannelData = CHANNELS.find((c) => c.id === activeChannel)

  return (
    <div
      className="flex flex-col"
      style={{ height: '100svh', background: '#faf8f6' }}
    >
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
        <div
          className="flex"
          style={{ scrollbarWidth: 'none' }}
        >
          {CHANNELS.map((ch) => {
            const isActive = ch.id === activeChannel
            return (
              <button
                key={ch.id}
                onClick={() => switchChannel(ch.id)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-all"
                style={{
                  color: isActive ? '#c9a99a' : '#b09d8a',
                  borderBottom: isActive ? '2px solid #c9a99a' : '2px solid transparent',
                  background: 'transparent',
                  whiteSpace: 'nowrap',
                }}
              >
                <span>{ch.emoji}</span>
                <span>{ch.label}</span>
              </button>
            )
          })}
        </div>
      </div>

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

              return (
                <div key={gi} className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'} items-end`}>
                  {!isOwn && (
                    <div className="flex-shrink-0">
                      <Avatar avatarUrl={avatarUrl} name={name} size={32} />
                    </div>
                  )}

                  <div className={`flex flex-col gap-1 max-w-xs ${isOwn ? 'items-end' : 'items-start'}`}>
                    {!isOwn && (
                      <div className="flex items-baseline gap-1.5 px-1 mb-0.5">
                        <span className="text-xs font-semibold" style={{ color: '#4e4238' }}>{name}</span>
                        <span className="text-xs" style={{ color: '#b09d8a' }}>{handle}</span>
                      </div>
                    )}

                    {group.messages.map((msg, mi) => {
                      const isLast = mi === group.messages.length - 1
                      const isFirst = mi === 0
                      const canDelete = isOwn || isAdmin

                      return (
                        <MessageBubble
                          key={msg.id}
                          message={msg}
                          isOwn={isOwn}
                          isFirst={isFirst}
                          isLast={isLast}
                          canDelete={canDelete}
                          onDelete={() => deleteMessage(msg.id)}
                        />
                      )
                    })}

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

function MessageBubble({ message, isOwn, isFirst, isLast, canDelete, onDelete }) {
  const [showDelete, setShowDelete] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const longPressTimer = useRef(null)

  function handleTouchStart() {
    if (!canDelete) return
    longPressTimer.current = setTimeout(() => setShowDelete(true), 500)
  }

  function handleTouchEnd() {
    clearTimeout(longPressTimer.current)
  }

  function handleDelete() {
    if (confirmDelete) {
      onDelete()
      setShowDelete(false)
      setConfirmDelete(false)
    } else {
      setConfirmDelete(true)
    }
  }

  const radius = 18
  const sharpCorner = 5
  const ownStyle = {
    background: '#c9a99a',
    color: '#fff',
    borderTopLeftRadius: radius,
    borderTopRightRadius: isFirst ? radius : sharpCorner,
    borderBottomRightRadius: isLast ? sharpCorner : sharpCorner,
    borderBottomLeftRadius: radius,
  }
  const otherStyle = {
    background: '#fff',
    color: '#302820',
    border: '1px solid #ece4dc',
    borderTopLeftRadius: isFirst ? radius : sharpCorner,
    borderTopRightRadius: radius,
    borderBottomRightRadius: radius,
    borderBottomLeftRadius: isLast ? sharpCorner : sharpCorner,
  }

  return (
    <div className="relative">
      <div
        className={`flex items-center gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
        onMouseEnter={() => canDelete && setShowDelete(true)}
        onMouseLeave={() => { setShowDelete(false); setConfirmDelete(false) }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchEnd}
      >
        <div
          className="px-3.5 py-2 text-sm leading-relaxed"
          style={isOwn ? ownStyle : otherStyle}
        >
          {message.content}
        </div>

        {showDelete && (
          <button
            onClick={handleDelete}
            onTouchEnd={(e) => { e.preventDefault(); handleDelete() }}
            className="flex-shrink-0 text-xs px-2 py-1 rounded-lg"
            style={{ background: confirmDelete ? '#dc2626' : '#fee2e2', color: confirmDelete ? '#fff' : '#dc2626' }}
          >
            {confirmDelete ? 'Sure?' : '✕'}
          </button>
        )}
      </div>
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
