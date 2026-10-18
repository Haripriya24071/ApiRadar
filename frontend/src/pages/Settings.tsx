import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Settings() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="max-w-4xl space-y-8 font-['Space_Grotesk'] text-[var(--cream)] pb-16">
      <div>
        <div className="editorial-label mb-2">00_4 // SETTINGS</div>
        <h1 className="text-4xl font-bold text-[var(--cream)] tracking-tight mb-2">
          Terminal Settings
        </h1>
        <p className="text-xs font-['Space_Mono'] text-[var(--muted-light)] uppercase tracking-wider">
          {user ? 'Manage your account and notification preferences' : 'You are using ApiRadar as a guest'}
        </p>
      </div>

      {!user ? (
        <div className="bg-[var(--dim)] border border-[var(--border-dark)] p-8 space-y-5">
          <h2 className="font-['Space_Mono'] text-xs font-bold text-[var(--cream)] uppercase tracking-widest">
            GUEST MODE
          </h2>
          <p className="text-sm text-[var(--muted-light)] leading-relaxed">
            Your watchlist and resolved changes are saved in this browser. Sign in only if you want to sync your watchlist across devices and receive notifications.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-3 bg-[var(--cream)] text-[var(--black)] hover:bg-[var(--red)] hover:text-[var(--white)] font-['Space_Mono'] text-xs font-bold uppercase tracking-widest transition"
            data-cursor="hover"
          >
            OPTIONAL SIGN IN →
          </button>
        </div>
      ) : (
        <>
          <div className="bg-[var(--dim)] border border-[var(--border-dark)] p-8 space-y-4">
            <h2 className="font-['Space_Mono'] text-xs font-bold text-[var(--cream)] uppercase tracking-widest border-b border-[var(--border-dark)] pb-3">
              PROFILE CREDENTIALS
            </h2>
            <div>
              <label className="block text-[11px] font-['Space_Mono'] text-[var(--muted-dark)] uppercase mb-2">
                Registered Email
              </label>
              <div className="px-4 py-3 bg-[var(--black)] border border-[var(--border-dark)] text-[var(--cream)] text-xs font-['Space_Mono']">
                {user.email}
              </div>
            </div>
          </div>

          <div className="bg-[var(--dim)] border border-[var(--border-dark)] p-8 space-y-5">
            <h2 className="font-['Space_Mono'] text-xs font-bold text-[var(--cream)] uppercase tracking-widest border-b border-[var(--border-dark)] pb-3">
              NOTIFICATION DISPATCH
            </h2>
            <p className="text-xs text-[var(--muted-light)]">
              Account notifications are available while you are signed in.
            </p>
            <div className="space-y-4 pt-2">
              <label className="flex items-center gap-3 text-xs font-['Space_Mono'] text-[var(--cream)] cursor-pointer" data-cursor="hover">
                <input type="checkbox" defaultChecked className="accent-[var(--red)] w-4 h-4" />
                EMAIL DIGEST NOTIFICATIONS FOR CRITICAL SEVERITY EVENTS
              </label>
              <label className="flex items-center gap-3 text-xs font-['Space_Mono'] text-[var(--cream)] cursor-pointer" data-cursor="hover">
                <input type="checkbox" defaultChecked className="accent-[var(--red)] w-4 h-4" />
                WEEKLY SUMMARY REPORT OF MONITORED STACK APIS
              </label>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={logout}
              className="px-6 py-3 bg-[var(--black)] text-[var(--critical)] border border-[var(--critical)] hover:bg-[var(--critical)] hover:text-[var(--white)] font-['Space_Mono'] text-xs font-bold uppercase tracking-widest transition"
              data-cursor="hover"
            >
              SIGN OUT
            </button>
          </div>
        </>
      )}
    </div>
  )
}
