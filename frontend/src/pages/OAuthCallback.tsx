import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function OAuthCallback() {
  const [searchParams] = useSearchParams()
  const [message, setMessage] = useState('VERIFYING YOUR SIGN-IN…')
  const completeOAuth = useAuth().completeOAuth
  const navigate = useNavigate()
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    if (searchParams.get('status') !== 'success') {
      setMessage('SIGN-IN DID NOT COMPLETE. RETURNING TO SIGN-IN…')
      navigate('/login', { replace: true })
      return
    }
    completeOAuth()
      .then(() => navigate('/dashboard/feed', { replace: true }))
      .catch(() => {
        setMessage('WE COULD NOT FINISH SIGN-IN. PLEASE TRY AGAIN.')
        window.setTimeout(() => navigate('/login', { replace: true }), 1800)
      })
  }, [completeOAuth, navigate, searchParams])

  return (
    <main className="min-h-screen flex items-center justify-center bg-[var(--black)] text-[var(--cream)] px-6">
      <div className="text-center">
        <div className="mx-auto mb-5 h-10 w-10 rounded-full border border-[var(--border-dark)] border-t-[var(--red)] animate-spin" />
        <p className="font-['Space_Mono'] text-[10px] tracking-widest">{message}</p>
      </div>
    </main>
  )
}
