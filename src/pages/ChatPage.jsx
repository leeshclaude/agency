import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import Avatar from '../components/ui/Avatar'

export default function ChatPage() {
  const { profile, isAdmin } = useAuth()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    fetchMessages()

    // Realtime subscription
    const channel = supabase
      .channel('public:messages')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            // Fetch full message with profile join
            fetchNewMessage(payload.new.id)
          } else if (payload.eventType === 'DELETE') {
            setMessages((prev) => prev.filter((m) => m.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  function scrollToBottom() {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  async function fetchMessages() {
    setLoading(true)
    const { data } = await supabase
      .from('messages')
      .select(`
        id, content, created_at, user_id,
        profiles:user_id (full_name, instagram_handle, avatar_url)
      `)
      .order('created_at', { ascending: true })
      .limit(200)

    if (data) setMessages(data)
    setLoading(false)
  }

  async function fetchNewMessage(id) {
    const { data } = await supabase
      .from('messages')
      .select(`
        id, content, created_at, user_id,
        profiles:user_id (full_name, instagram_handle, avatar_url)
      `)
      .eq('id', id)
      .single()

    if (data) setMessages((prev) => {
      // Avoid duplicates
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
    })

    if (error) {
      setInput(text) // restore on failure
    }
    setSending(false)
    inputRef.current?.focus()
  }

  async function deleteMessage(id) {
    await supabase.from('messages').delete().eq('id', id)
  }

  return (
    <div
      className="flex flex-col"
      style={{ height: '100svh', background: '#faf8f6' }}
    >
      {/* Header */}
      <div
        className="flex-shrink-0 px-4 pt-12 pb-4"
        style={{ background: '#fff', borderBottom: '1px solid #ece4dc' }}
      >
        <div className="max-w-lg mx-auto">
          <p className="section-label mb-0.5">Community</p>
          <h1 className="text-lg font-semibold" style={{ color: '#302820' }}>Group Chat</h1>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-lg mx-auto space-y-3">
          {loading ? (
            <div className="text-center py-12" style={{ color: '#b09d8a' }}>Loading messages…</div>
          ) : messages.length === 0 ? (
            <div className="text-center py-16">
              <span style={{ fontSize: 32 }}>💬</span>
              <p className="mt-3 text-sm" style={{ color: '#b09d8a' }}>
                No messages yet. Say hello!
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isOwn={msg.user_id === profile.id}
                isAdmin={isAdmin}
                onDelete={() => deleteMessage(msg.id)}
              />
            ))
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
            placeholder="Say something…"
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

function MessageBubble({ message, isOwn, isAdmin, onDelete }) {
  const [showDelete, setShowDelete] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const name = message.profiles?.full_name || 'Unknown'
  const handle = message.profiles?.instagram_handle || ''
  const avatarUrl = message.profiles?.avatar_url || null
  const time = new Date(message.created_at).toLocaleTimeString('en-AU', {
    hour: 'numeric',
    minute: '2-digit',
  })

  return (
    <div
      className={`flex ${isOwn ? 'flex-col items-end' : 'flex-row items-end gap-2'}`}
      onMouseEnter={() => setShowDelete(true)}
      onMouseLeave={() => { setShowDelete(false); setConfirmDelete(false) }}
    >
      {!isOwn && (
        <div className="flex-shrink-0 mb-1">
          <Avatar avatarUrl={avatarUrl} name={name} size={32} />
        </div>
      )}
      <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
      {!isOwn && (
        <div className="flex items-baseline gap-1.5 mb-1 px-1">
          <span className="text-xs font-semibold" style={{ color: '#4e4238' }}>{name}</span>
          <span className="text-xs" style={{ color: '#b09d8a' }}>{handle}</span>
        </div>
      )}
      <div className="relative flex items-end gap-2">
        {isAdmin && !isOwn && showDelete && (
          <button
            onClick={() => {
              if (confirmDelete) onDelete()
              else setConfirmDelete(true)
            }}
            className="text-xs px-2 py-1 rounded-lg flex-shrink-0"
            style={{ background: '#fee2e2', color: '#dc2626' }}
          >
            {confirmDelete ? 'Sure?' : '✕'}
          </button>
        )}
        <div
          className="max-w-xs px-4 py-2.5 rounded-2xl text-sm"
          style={
            isOwn
              ? { background: '#c9a99a', color: '#fff', borderBottomRightRadius: 6 }
              : { background: '#fff', color: '#302820', border: '1px solid #ece4dc', borderBottomLeftRadius: 6 }
          }
        >
          {message.content}
        </div>
        {isOwn && showDelete && (
          <button
            onClick={() => {
              if (confirmDelete) onDelete()
              else setConfirmDelete(true)
            }}
            className="text-xs px-2 py-1 rounded-lg flex-shrink-0"
            style={{ background: '#fee2e2', color: '#dc2626' }}
          >
            {confirmDelete ? 'Sure?' : '✕'}
          </button>
        )}
      </div>
      <span className="text-xs mt-1 px-1" style={{ color: '#b09d8a' }}>{time}</span>
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
