import React from 'react'
import { NavLink } from 'react-router-dom'
import { Rss, Layers, Globe, Settings as SettingsIcon, LogOut } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

export default function Sidebar() {
  const { logout } = useAuth()

  const navItems = [
    { to: '/dashboard/feed', icon: Rss, label: 'Change Feed' },
    { to: '/dashboard/stack', icon: Layers, label: 'My Stack' },
    { to: '/dashboard/apis', icon: Globe, label: 'Browse APIs' },
    { to: '/dashboard/settings', icon: SettingsIcon, label: 'Settings' },
  ]

  return (
    <aside className="w-64 bg-surface border-r border-border flex flex-col justify-between h-screen shrink-0">
      <div>
        <div className="h-16 flex items-center px-6 border-b border-border">
          <span className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>🛰️</span> ApiRadar
          </span>
        </div>

        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition ${
                    isActive
                      ? 'bg-primary/15 text-primary border-l-4 border-primary'
                      : 'text-slate-400 hover:text-white hover:bg-border/50'
                  }`
                }
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-border">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-slate-400 hover:text-critical hover:bg-critical/10 transition"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  )
}
