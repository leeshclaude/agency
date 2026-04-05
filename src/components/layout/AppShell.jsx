import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import BottomNav from './BottomNav'

const CHANNELS = ['general', 'intros', 'engagement', 'brand-ops']

export default function AppShell({ children }) {
  const { profile } = useAuth()
  const location = useLocation()
  const [totalUnread, setTotalUnread] = useState(0)
  const isChatPage = location.pathname === '/chat'

  // Reset badge when user is on the chat page
  useEffect(() => {
    if (isChatPage) setTotalUnread(0)
  }, [isChatPage])

  // Load initial unread count
  useEffect(() => {
    if (!profile) return
    fetchTotalUnread()

    // Subscribe to new messages — increment badge if user isn't on chat page
    const channel = supabase
      .channel('appshell:messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          if (payload.new.user_id !== profile.id && !isChatPageRef.current) {
            setTotalUnread((n) => n + 1)
          }
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [profile])

  // Keep a ref so the realtime callback always has the latest value
  const isChatPageRef = useRef(isChatPage)
  useEffect(() => {
    isChatPageRef.current = isChatPage
    if (isChatPage) setTotalUnread(0)
  }, [isChatPage])

  async function fetchTotalUnread() {
    if (isChatPage) return

    const { data: reads } = await supabase
      .from('channel_reads')
      .select('channel, last_read_at')
      .eq('user_id', profile.id)

    const readMap = {}
    if (reads) reads.forEach((r) => { readMap[r.channel] = r.last_read_at })

    let total = 0
    for (const ch of CHANNELS) {
      const readAt = readMap[ch] || profile.created_at || '1970-01-01T00:00:00Z'
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('channel', ch)
        .neq('user_id', profile.id)
        .gt('created_at', readAt)
      total += count || 0
    }

    setTotalUnread(total)
  }

  return (
    <div style={{ background: '#faf8f6', minHeight: '100svh' }}>
      <main>{children}</main>
      <BottomNav chatUnread={totalUnread} />
    </div>
  )
}
