import React, { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Rss, Layers, Globe, Settings as SettingsIcon, LogOut } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

export default function Sidebar() {
  const [isHovered, setIsHovered] = useState(false)
  const { logout } = useAuth()

  const navItems = [
    { to: '/dashboard/feed', icon: Rss, label: 'FEED' },
    { to: '/dashboard/stack', icon: Layers, label: 'STACK' },
    { to: '/dashboard/apis', icon: Globe, label: 'APIS' },
    { to: '/dashboard/settings', icon: SettingsIcon, label: 'SETTINGS' },
  ]

  return (
    <aside
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`fixed top-0 left-0 bottom-0 z-50 h-screen bg-[var(--dim)] border-r border-[var(--border-dark)] flex flex-col justify-between overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isHovered ? 'w-[220px]' : 'w-[64px]'
      }`}
    >
      <div>
        {/* Logo area */}
        <div className="h-[52px] flex items-center justify-center px-4 border-b border-[var(--border-dark)] relative">
          <span className="font-['Space_Mono'] text-[14px] text-[var(--cream)] font-bold tracking-widest whitespace-nowrap">
            {isHovered ? 'APIRADAR©' : 'AR©'}
          </span>
        </div>

        {/* Navigation */}
        <nav className="mt-8 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `h-[52px] flex items-center px-5 relative transition-colors duration-200 group ${
                    isActive
                      ? 'border-l-2 border-[var(--cream)] text-[var(--cream)] bg-[var(--black)]/40'
                      : 'border-l-2 border-transparent text-[var(--muted-dark)] hover:text-[var(--cream)]'
                  }`
                }
                data-cursor="hover"
              >
                <Icon className="w-5 h-5 shrink-0 transition-colors" />
                <span
                  className={`font-['Space_Mono'] text-[11px] font-bold tracking-[0.15em] ml-4 whitespace-nowrap transition-all duration-200 ${
                    isHovered
                      ? 'opacity-100 w-auto translate-x-0 delay-75'
                      : 'opacity-0 w-0 -translate-x-2 pointer-events-none'
                  }`}
                >
                  {item.label}
                </span>
              </NavLink>
            )
          })}
        </nav>
      </div>

      {/* Bottom Area */}
      <div className="p-4 border-t border-[var(--border-dark)] flex flex-col gap-4">
        <div className="flex items-center px-1 font-['Space_Mono'] text-[11px] text-[var(--muted-dark)] whitespace-nowrap">
          <span className="text-[var(--cream)] font-bold">06</span>
          {isHovered && (
            <span className="ml-3 tracking-[0.15em] text-[9px] uppercase opacity-80">
              MONITORING
            </span>
          )}
        </div>

        <button
          onClick={logout}
          className="h-10 flex items-center px-1 text-[var(--muted-dark)] hover:text-[var(--red)] transition-colors w-full"
          title="Logout"
          data-cursor="hover"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          <span
            className={`font-['Space_Mono'] text-[11px] tracking-[0.15em] ml-4 whitespace-nowrap transition-all duration-200 ${
              isHovered ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'
            }`}
          >
            LOGOUT
          </span>
        </button>
      </div>
    </aside>
  )
}
