import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../store/toastStore'
import { getErrorMessage } from '../lib/api'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const { login } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await login(email, password)
      toast.success('Welcome back!')
      navigate('/dashboard/feed')
    } catch (err: any) {
      const msg = getErrorMessage(err)
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--black)] text-[var(--cream)] px-4 font-['Space_Grotesk']">
      <div className="max-w-md w-full bg-[var(--dim)] border border-[var(--border-dark)] p-8 md:p-10 shadow-2xl relative">
        <div className="editorial-label mb-4 text-center">00_0 // AUTHENTICATION</div>
        <h2 className="text-3xl font-bold text-center text-[var(--cream)] tracking-tight mb-2">
          Welcome Back
        </h2>
        <p className="text-xs font-['Space_Mono'] text-[var(--muted-light)] text-center mb-8 uppercase tracking-widest">
          Sign in to your ApiRadar terminal
        </p>

        {error && (
          <div className="mb-6 p-3 bg-[var(--black)] border border-[var(--critical)] text-[var(--critical)] text-xs font-['Space_Mono'] uppercase tracking-wider text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[11px] font-['Space_Mono'] uppercase tracking-wider text-[var(--muted-light)] mb-2">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-[var(--black)] border border-[var(--border-dark)] text-[var(--cream)] placeholder-[var(--muted-dark)] font-['Space_Mono'] text-xs focus:outline-none focus:border-[var(--cream)] transition"
              placeholder="you@domain.com"
              data-cursor="text"
            />
          </div>

          <div>
            <label className="block text-[11px] font-['Space_Mono'] uppercase tracking-wider text-[var(--muted-light)] mb-2">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-[var(--black)] border border-[var(--border-dark)] text-[var(--cream)] placeholder-[var(--muted-dark)] font-['Space_Mono'] text-xs focus:outline-none focus:border-[var(--cream)] transition"
              placeholder="••••••••"
              data-cursor="text"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-[var(--cream)] hover:bg-[var(--red)] text-[var(--black)] hover:text-[var(--white)] font-['Space_Mono'] text-xs font-bold uppercase tracking-widest transition disabled:opacity-50 flex items-center justify-center mt-2"
            data-cursor="hover"
          >
            {loading ? 'AUTHENTICATING...' : 'SIGN IN →'}
          </button>
        </form>

        <p className="mt-8 text-center text-xs font-['Space_Mono'] text-[var(--muted-light)]">
          DON'T HAVE AN ACCOUNT?{' '}
          <Link
            to="/register"
            className="text-[var(--gold)] hover:underline font-bold"
            data-cursor="hover"
          >
            REGISTER HERE
          </Link>
        </p>
      </div>
    </div>
  )
}
