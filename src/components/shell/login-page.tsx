import { useState, type FormEvent } from 'react'
import { useAuth } from '@/lib/auth-context'

export function LoginPage() {
  const { status, signInWithPassword, signUp, sendMagicLink } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [useMagicLink, setUseMagicLink] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (status === 'authenticated') {
    return null
  }

  if (sent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f6f8] p-6">
        <div className="w-full max-w-sm rounded-xl border border-[#e1e4e9] bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-[#e8e9ff] text-xl font-bold text-[#5c61d9]">
            ✉️
          </div>
          <h1 className="mb-2 text-lg font-semibold text-[#242932]">Check your email</h1>
          <p className="text-sm text-[#858e9d]">
            We sent a magic link to <strong className="text-[#343b46]">{email}</strong>.
          </p>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (useMagicLink) {
        await sendMagicLink(email)
        setSent(true)
      } else if (isSignUp) {
        await signUp(email, password)
      } else {
        await signInWithPassword(email, password)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong'
      // Clean up common Supabase error messages
      if (message.includes('rate_limit')) {
        setError('Too many requests. Please wait a moment and try again.')
      } else if (message.includes('Invalid login credentials')) {
        setError('Incorrect email or password.')
      } else if (message.includes('User already registered')) {
        setError('An account with this email already exists. Sign in instead.')
      } else {
        setError(message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f6f8] p-6">
      <div className="w-full max-w-sm rounded-xl border border-[#e1e4e9] bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-2.5 text-xl font-semibold tracking-[-0.03em] text-[#242932]">
          <span className="grid size-8 place-items-center rounded-[9px] bg-[#5c61d9] text-[15px] font-bold text-white">k</span>
          kikis
        </div>

        <h1 className="mb-1 text-lg font-semibold text-[#242932]">
          {useMagicLink ? 'Sign in' : isSignUp ? 'Create account' : 'Sign in'}
        </h1>
        <p className="mb-6 text-sm text-[#858e9d]">
          {useMagicLink
            ? 'Enter your email to receive a magic link.'
            : isSignUp
              ? 'Create a password to get started.'
              : 'Enter your email and password.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs font-medium text-[#49515e] mb-1.5">Email</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="h-9 w-full rounded-md border border-[#e7e9ed] bg-[#fbfcfd] px-3 text-sm text-[#515966] outline-none placeholder:text-[#a2a9b4] focus:border-[#a6a9ed] focus:ring-2 focus:ring-[#eeeeff]"
            />
          </div>

          {!useMagicLink && (
            <div>
              <label htmlFor="password" className="block text-xs font-medium text-[#49515e] mb-1.5">Password</label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isSignUp ? 'At least 6 characters' : 'Your password'}
                className="h-9 w-full rounded-md border border-[#e7e9ed] bg-[#fbfcfd] px-3 text-sm text-[#515966] outline-none placeholder:text-[#a2a9b4] focus:border-[#a6a9ed] focus:ring-2 focus:ring-[#eeeeff]"
              />
            </div>
          )}

          {error && (
            <p className="text-xs text-red-500">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !email || (!useMagicLink && !password)}
            className="inline-flex h-9 w-full items-center justify-center rounded-lg bg-[#5c61d9] px-4 text-sm font-medium text-white shadow-[0_3px_8px_rgba(92,97,217,0.2)] transition hover:bg-[#5055cf] disabled:opacity-50"
          >
            {loading
              ? 'Please wait…'
              : useMagicLink
                ? 'Send magic link'
                : isSignUp
                  ? 'Create account'
                  : 'Sign in'}
          </button>
        </form>

        <div className="mt-5 space-y-2 text-center text-xs text-[#858e9d]">
          {useMagicLink ? (
            <button
              type="button"
              onClick={() => { setUseMagicLink(false); setError(null) }}
              className="text-[#5c61d9] hover:underline"
            >
              Sign in with password instead
            </button>
          ) : (
            <button
              type="button"
              onClick={() => { setUseMagicLink(true); setError(null) }}
              className="text-[#5c61d9] hover:underline"
            >
              Send magic link instead
            </button>
          )}
          {!useMagicLink && (
            <div>
              {isSignUp ? (
                <button
                  type="button"
                  onClick={() => { setIsSignUp(false); setError(null) }}
                  className="text-[#5c61d9] hover:underline"
                >
                  Already have an account? Sign in
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => { setIsSignUp(true); setError(null) }}
                  className="text-[#5c61d9] hover:underline"
                >
                  No account? Create one
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
