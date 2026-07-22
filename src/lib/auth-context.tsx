import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { Profile } from '@/types/database'
import { useNavigate } from 'react-router-dom'

type AuthStatus = 'loading' | 'unauthenticated' | 'authenticated'

type AuthContextValue = {
  status: AuthStatus
  user: User | null
  profile: Profile | null
  signInWithPassword: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  sendMagicLink: (email: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  status: 'loading',
  user: null,
  profile: null,
  signInWithPassword: async () => {},
  signUp: async () => {},
  sendMagicLink: async () => {},
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const navigate = useNavigate()
  const initialized = useRef(false)

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (data) setProfile(data)
  }, [])

  const bootstrapIfNeeded = useCallback(async (userId: string, session: Session) => {
    const displayName = session.user.user_metadata?.full_name ?? session.user.email?.split('@')[0] ?? 'User'
    const { error } = await supabase.rpc('bootstrap_new_user', {
      user_id: userId,
      display_name: displayName,
    })
    if (error && !error.message.includes('duplicate key') && !error.message.includes('already exists')) {
      console.error('Bootstrap failed:', error)
    }
    await fetchProfile(userId)
  }, [fetchProfile])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      initialized.current = true
      if (session?.user) {
        setUser(session.user)
        setStatus('authenticated')
        fetchProfile(session.user.id)
      } else {
        setStatus('unauthenticated')
        navigate('/login', { replace: true })
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user)
          setStatus('authenticated')
          if (event === 'SIGNED_IN') {
            await bootstrapIfNeeded(session.user.id, session)
          } else {
            fetchProfile(session.user.id)
          }
          if (initialized.current) {
            navigate('/board', { replace: true })
          }
        } else if (event === 'SIGNED_OUT' && initialized.current) {
          setUser(null)
          setProfile(null)
          setStatus('unauthenticated')
          navigate('/login', { replace: true })
        }
      },
    )

    return () => subscription.unsubscribe()
  }, [fetchProfile, bootstrapIfNeeded, navigate])

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }, [])

  const signUp = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: undefined },
    })
    if (error) throw error
    // If the user was just created, bootstrap eagerly
    if (data.user && data.session) {
      await bootstrapIfNeeded(data.user.id, data.session)
    }
  }, [bootstrapIfNeeded])

  const sendMagicLink = useCallback(async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    })
    if (error) throw error
  }, [])

  const signOut = useCallback(async () => {
    const confirmed = window.confirm('Sign out of Kikis?')
    if (!confirmed) return
    await supabase.auth.signOut()
  }, [])

  return (
    <AuthContext.Provider value={{ status, user, profile, signInWithPassword, signUp, sendMagicLink, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
