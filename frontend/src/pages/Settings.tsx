import React from 'react'
import { useAuth } from '../hooks/useAuth'

export default function Settings() {
  const { user, logout } = useAuth()

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Account Settings</h1>
        <p className="text-sm text-muted">Manage your profile and notification preferences</p>
      </div>

      <div className="bg-surface border border-border rounded-xl p-6 shadow-md space-y-4">
        <h2 className="text-lg font-semibold text-white">Profile Information</h2>
        <div>
          <label className="block text-xs font-medium text-muted mb-1">Email Address</label>
          <div className="px-4 py-2.5 bg-background border border-border rounded-lg text-slate-200 text-sm font-mono">
            {user?.email || 'N/A'}
          </div>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl p-6 shadow-md space-y-4">
        <h2 className="text-lg font-semibold text-white">Notification Preferences</h2>
        <p className="text-sm text-muted">Configure how and when you receive breaking change digests.</p>
        <div className="space-y-3 pt-2">
          <label className="flex items-center gap-3 text-sm text-slate-300 cursor-pointer">
            <input type="checkbox" defaultChecked className="rounded border-border text-primary focus:ring-primary bg-background" />
            Email digest notifications for CRITICAL severity events
          </label>
          <label className="flex items-center gap-3 text-sm text-slate-300 cursor-pointer">
            <input type="checkbox" defaultChecked className="rounded border-border text-primary focus:ring-primary bg-background" />
            Weekly summary report of watched API changes
          </label>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl p-6 shadow-md space-y-2">
        <h2 className="text-lg font-semibold text-white">Connected Stack Profiles</h2>
        <p className="text-sm text-muted">You are currently monitoring stack profiles linked to this account.</p>
      </div>

      <div className="pt-4">
        <button
          onClick={logout}
          className="px-6 py-2.5 bg-critical/10 hover:bg-critical/20 text-critical border border-critical/30 font-medium rounded-lg transition"
        >
          Logout of ApiRadar
        </button>
      </div>
    </div>
  )
}
