import React from 'react'
import { useNavigate } from 'react-router-dom'

export default function Landing() {
  const navigate = useNavigate()

  const supportedAPIs = [
    { name: 'Stripe', category: 'Payments' },
    { name: 'OpenAI', category: 'AI & ML' },
    { name: 'Supabase', category: 'Database' },
    { name: 'Twilio', category: 'Messaging' },
    { name: 'GitHub', category: 'DevTools' },
    { name: 'SendGrid', category: 'Email' },
  ]

  return (
    <div className="min-h-screen bg-background text-white flex flex-col items-center justify-center px-4">
      <div className="max-w-3xl text-center space-y-6">
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight">
          ApiRadar — <span className="text-primary">Know before your APIs break</span>
        </h1>
        <p className="text-lg text-slate-400 max-w-xl mx-auto">
          Automated API breaking change monitoring, RSS & GitHub release intelligence, and OpenAPI diff alerts tailored to your tech stack.
        </p>

        <div className="flex items-center justify-center gap-4 pt-4">
          <button
            onClick={() => navigate('/register')}
            className="px-6 py-3 bg-primary hover:bg-primary/90 font-semibold rounded-lg shadow-lg transition"
          >
            Get Started
          </button>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-3 bg-surface border border-border hover:bg-border text-slate-200 font-semibold rounded-lg transition"
          >
            Login
          </button>
        </div>

        <div className="pt-12 border-t border-border/50">
          <p className="text-xs uppercase font-semibold text-muted tracking-wider mb-4">
            Supported API Catalogs
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {supportedAPIs.map((api) => (
              <div
                key={api.name}
                className="p-3 bg-surface border border-border rounded-lg flex items-center justify-between"
              >
                <span className="font-medium text-sm">{api.name}</span>
                <span className="text-xs text-muted">{api.category}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
