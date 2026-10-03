import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../store/toastStore'
import { getErrorMessage } from '../lib/api'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const { register } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      const msg = 'Password must be at least 8 characters long'
      setError(msg)
      toast.warning(msg)
      return
    }

    if (password !== confirmPassword) {
      const msg = 'Passwords do not match'
      setError(msg)
      toast.warning(msg)
      return
    }

    setLoading(true)

    try {
      await register(email, password)
      toast.success('Account created!')
      navigate('/dashboard/stack')
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
        <div className="editorial-label mb-4 text-center">00_0 // REGISTRATION</div>
        <h2 className="text-3xl font-bold text-center text-[var(--cream)] tracking-tight mb-2">
          Create Account
        </h2>
        <p className="text-xs font-['Space_Mono'] text-[var(--muted-light)] text-center mb-8 uppercase tracking-widest">
          Start monitoring API breaking changes
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
              placeholder="At least 8 characters"
              data-cursor="text"
            />
          </div>

          <div>
            <label className="block text-[11px] font-['Space_Mono'] uppercase tracking-wider text-[var(--muted-light)] mb-2">
              Confirm Password
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 bg-[var(--black)] border border-[var(--border-dark)] text-[var(--cream)] placeholder-[var(--muted-dark)] font-['Space_Mono'] text-xs focus:outline-none focus:border-[var(--cream)] transition"
              placeholder="Re-enter password"
              data-cursor="text"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-[var(--cream)] hover:bg-[var(--red)] text-[var(--black)] hover:text-[var(--white)] font-['Space_Mono'] text-xs font-bold uppercase tracking-widest transition disabled:opacity-50 flex items-center justify-center mt-2"
            data-cursor="hover"
          >
            {loading ? 'INITIALIZING TERMINAL...' : 'GET STARTED →'}
          </button>
        </form>

        <p className="mt-8 text-center text-xs font-['Space_Mono'] text-[var(--muted-light)]">
          ALREADY HAVE AN ACCOUNT?{' '}
          <Link
            to="/login"
            className="text-[var(--gold)] hover:underline font-bold"
            data-cursor="hover"
          >
            SIGN IN HERE
          </Link>
        </p>
      </div>
    </div>
  )
}
