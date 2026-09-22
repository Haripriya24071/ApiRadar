import React, { useState } from 'react'
import { Search, Bell, CheckCheck } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notificationsAPI } from '../../lib/api'
import { useAuth } from '../../hooks/useAuth'

export default function Navbar() {
  const { user } = useAuth()
  const [showDropdown, setShowDropdown] = useState(false)
  const queryClient = useQueryClient()

  const { data: countData } = useQuery({
    queryKey: ['notifications-count'],
    queryFn: () => notificationsAPI.getCount(),
    refetchInterval: 30000,
  })

  const { data: notificationsData } = useQuery({
    queryKey: ['notifications-list'],
    queryFn: () => notificationsAPI.list(),
    enabled: showDropdown,
  })

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsAPI.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-count'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-list'] })
    },
  })

  const unreadCount = countData?.unread || 0
  const notificationsList = notificationsData?.data || []

  const getSeverityBadgeClass = (severity: string) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL':
        return 'bg-critical/20 text-critical border-critical/30'
      case 'WARNING':
        return 'bg-warning/20 text-warning border-warning/30'
      default:
        return 'bg-info/20 text-info border-info/30'
    }
  }

  return (
    <header className="h-16 bg-surface border-b border-border flex items-center justify-between px-6 shrink-0 relative">
      <div className="relative w-80">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          type="text"
          placeholder="Search APIs..."
          className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm text-white placeholder-muted focus:outline-none focus:border-primary transition"
        />
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-border/50 relative transition"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-critical text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showDropdown && (
            <div className="absolute right-0 mt-2 w-80 bg-surface border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
              <div className="p-3 border-b border-border flex items-center justify-between">
                <span className="text-sm font-semibold text-white">Notifications</span>
                <button
                  onClick={() => markAllReadMutation.mutate()}
                  disabled={markAllReadMutation.isPending}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Mark all read
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-border/50">
                {notificationsList.length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted">No notifications</div>
                ) : (
                  notificationsList.map((n: any) => (
                    <div
                      key={n.id}
                      className={`p-3 text-xs transition ${
                        !n.is_read ? 'bg-primary/5' : 'hover:bg-border/30'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`px-1.5 py-0.5 border text-[10px] font-bold rounded uppercase ${getSeverityBadgeClass(
                            n.change_event?.severity
                          )}`}
                        >
                          {n.change_event?.severity || 'INFO'}
                        </span>
                        <span className="text-muted text-[10px]">
                          {n.created_at ? new Date(n.created_at).toLocaleDateString() : ''}
                        </span>
                      </div>
                      <p className="font-medium text-slate-200 line-clamp-2">
                        {n.change_event?.title || 'API Event'}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="w-9 h-9 bg-primary/20 border border-primary/40 text-primary font-bold rounded-full flex items-center justify-center text-sm shadow">
          {user?.email ? user.email[0].toUpperCase() : 'U'}
        </div>
      </div>
    </header>
  )
}
