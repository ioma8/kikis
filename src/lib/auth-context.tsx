import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react'
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
  const mounted = useRef(true)
  const bootstrapPromises = useRef(new Map<string, Promise<void>>())

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    setProfile(data ?? null)
  }, [])

  const bootstrapIfNeeded = useCallback(
    async (userId: string, session: Session) => {
      const existing = bootstrapPromises.current.get(userId)
      if (existing) return existing

      const promise = (async () => {
        const displayName =
          session.user.user_metadata?.full_name ?? session.user.email?.split('@')[0] ?? 'User'
        const { error } = await supabase.rpc('bootstrap_new_user', {
          p_user_id: userId,
          p_display_name: displayName,
        })
        if (error) throw error
        await fetchProfile(userId)
      })()

      bootstrapPromises.current.set(userId, promise)
      try {
        await promise
      } finally {
        bootstrapPromises.current.delete(userId)
      }
    },
    [fetchProfile],
  )

  useEffect(() => {
    mounted.current = true
    supabase.auth
      .getSession()
      .then(async ({ data: { session } }) => {
        initialized.current = true
        if (!mounted.current) return
        if (session?.user) {
          try {
            await bootstrapIfNeeded(session.user.id, session)
          } catch (err) {
            console.error('Bootstrap failed:', err)
          }
          if (!mounted.current) return
          setUser(session.user)
          setStatus('authenticated')
          if (window.location.pathname === '/login' || window.location.pathname === '/') {
            navigate('/board', { replace: true })
          }
        } else {
          setStatus('unauthenticated')
          navigate('/login', { replace: true })
        }
      })
      .catch((err) => {
        if (!mounted.current) return
        console.error('Failed to restore session:', err)
        setStatus('unauthenticated')
        navigate('/login', { replace: true })
      })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        if (event === 'SIGNED_IN') {
          void bootstrapIfNeeded(session.user.id, session)
            .then(() => {
              if (!mounted.current) return
              setUser(session.user)
              setStatus('authenticated')
              if (window.location.pathname === '/login' || window.location.pathname === '/') {
                navigate('/board', { replace: true })
              }
            })
            .catch((err) => {
              if (mounted.current) console.error('Bootstrap failed:', err)
            })
        } else {
          setUser(session.user)
          setStatus('authenticated')
          void fetchProfile(session.user.id).catch((err) =>
            console.error('Failed to load profile:', err),
          )
        }
      } else if (event === 'SIGNED_OUT' && initialized.current) {
        setUser(null)
        setProfile(null)
        setStatus('unauthenticated')
        navigate('/login', { replace: true })
      }
    })

    return () => {
      mounted.current = false
      void subscription.unsubscribe()
    }
  }, [fetchProfile, bootstrapIfNeeded, navigate])

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }, [])

  const signUp = useCallback(
    async (email: string, password: string) => {
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
    },
    [bootstrapIfNeeded],
  )

  const sendMagicLink = useCallback(async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    })
    if (error) throw error
  }, [])

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }, [])

  return (
    <AuthContext.Provider
      value={{ status, user, profile, signInWithPassword, signUp, sendMagicLink, signOut }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
