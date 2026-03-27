import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined) // undefined = loading
  const [profile, setProfile] = useState(undefined) // undefined = loading

  useEffect(() => {
    // getSession fires once on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) {
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
      }
    })

    // onAuthStateChange fires on login/logout — skip the initial INITIAL_SESSION
    // event since getSession() above already handles it
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') return
      setSession(session)
      if (session) {
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    setProfile(data ?? null)
  }

  async function refreshProfile() {
    if (session) await fetchProfile(session.user.id)
  }

  const isLoading = session === undefined || profile === undefined

  const value = {
    session,
    profile,
    refreshProfile,
    isLoading,
    isAuthenticated: !!session,
    isApproved: profile?.status === 'approved',
    isPending: profile?.status === 'pending',
    isDenied: profile?.status === 'denied',
    isAdmin: profile?.is_admin === true,
    signOut: () => supabase.auth.signOut(),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
