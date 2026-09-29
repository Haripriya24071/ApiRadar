import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Search, Bell, X, CheckCheck } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notificationsAPI } from '../../lib/api'
import { useAuthStore } from '../../store/authStore'

export default function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const queryClient = useQueryClient()

  const [showSearchOverlay, setShowSearchOverlay] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false)

  // Track notifications
  const { data: countData } = useQuery({
    queryKey: ['notifications-count'],
    queryFn: () => notificationsAPI.getCount(),
    refetchInterval: 30000,
  })

  const { data: notificationsData } = useQuery({
    queryKey: ['notifications-list'],
    queryFn: () => notificationsAPI.list(),
    enabled: showNotificationsDropdown,
  })

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsAPI.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-count'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-list'] })
    },
  })

  const unreadCount = countData?.unread_count || 0
  const notificationsList = notificationsData?.data || []

  // ESC key to close search overlay
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowSearchOverlay(false)
        setShowNotificationsDropdown(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Route Breadcrumb mapping
  const getBreadcrumb = () => {
    const path = location.pathname
    if (path.includes('/dashboard/feed')) return '00_1 · CHANGE FEED'
    if (path.includes('/dashboard/stack')) return '00_2 · MY STACK'
    if (path.includes('/dashboard/apis')) return '00_3 · BROWSE APIS'
    if (path.includes('/dashboard/settings')) return '00_4 · SETTINGS'
    return '00_0 · DASHBOARD'
  }

  // Available APIs for search overlay
  const apis = [
    { name: 'Stripe API', slug: 'stripe', category: 'Payments & Financial Infrastructure' },
    { name: 'OpenAI API', slug: 'openai', category: 'AI & Machine Learning Models' },
    { name: 'Supabase API', slug: 'supabase', category: 'Backend-as-a-Service & Database' },
    { name: 'Twilio API', slug: 'twilio', category: 'Communications & Telephony' },
    { name: 'GitHub REST API', slug: 'github', category: 'Version Control & Developer Tools' },
    { name: 'SendGrid API', slug: 'sendgrid', category: 'Transactional & Marketing Email' },
  ]

  const filteredApis = searchQuery.trim()
    ? apis.filter(
        (a) =>
          a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : apis

  return (
    <>
      <header className="fixed top-0 left-[64px] right-0 h-[52px] z-40 bg-[var(--black)] border-b border-[var(--border-dark)] px-8 flex items-center justify-between">
        {/* LEFT: Dynamic Breadcrumb */}
        <div className="flex flex-col justify-center">
          <span className="font-['Space_Mono'] text-[10px] text-[var(--muted-dark)] tracking-[0.15em] uppercase">
            {getBreadcrumb()}
          </span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className="w-[4px] h-[4px] rounded-full bg-[#4A7C59] animate-pulse" />
            <span className="font-['Space_Mono'] text-[9px] text-[var(--muted-light)] tracking-[0.1em] uppercase">
              MONITORING ACTIVE
            </span>
          </div>
        </div>

        {/* CENTER: empty */}
        <div />

        {/* RIGHT: Actions */}
        <div className="flex items-center gap-6">
          {/* Search Trigger */}
          <button
            onClick={() => setShowSearchOverlay(true)}
            className="flex items-center gap-2 text-[var(--muted-dark)] hover:text-[var(--cream)] transition-colors"
            data-cursor="hover"
          >
            <Search className="w-5 h-5" />
            <span className="font-['Space_Mono'] text-[10px] tracking-[0.15em]">
              SEARCH
            </span>
          </button>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
              className="p-1 text-[var(--muted-dark)] hover:text-[var(--cream)] relative transition-colors"
              data-cursor="hover"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[var(--red)] text-[var(--white)] font-['Space_Mono'] text-[9px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotificationsDropdown && (
              <div className="absolute right-0 mt-3 w-80 bg-[var(--dim)] border border-[var(--border-dark)] shadow-2xl z-50">
                <div className="p-3 border-b border-[var(--border-dark)] flex items-center justify-between">
                  <span className="font-['Space_Mono'] text-[10px] font-bold text-[var(--cream)] uppercase tracking-wider">
                    NOTIFICATIONS ({unreadCount})
                  </span>
                  <button
                    onClick={() => markAllReadMutation.mutate()}
                    disabled={markAllReadMutation.isPending}
                    className="font-['Space_Mono'] text-[9px] text-[var(--gold)] hover:underline flex items-center gap-1"
                  >
                    <CheckCheck className="w-3 h-3" />
                    CLEAR ALL
                  </button>
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-[var(--border-dark)]">
                  {notificationsList.length === 0 ? (
                    <div className="p-4 text-center font-['Space_Mono'] text-[11px] text-[var(--muted-dark)]">
                      NO UNREAD ALERTS
                    </div>
                  ) : (
                    notificationsList.map((n: any) => (
                      <div
                        key={n.id}
                        className={`p-3 text-xs transition ${
                          !n.is_read ? 'bg-[var(--black)]/60' : 'hover:bg-[var(--black)]/30'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="severity-stamp critical">
                            {n.change_event?.severity || 'CRITICAL'}
                          </span>
                          <span className="font-['Space_Mono'] text-[9px] text-[var(--muted-dark)]">
                            {n.created_at ? new Date(n.created_at).toLocaleDateString() : ''}
                          </span>
                        </div>
                        <p className="font-medium text-[var(--cream)] line-clamp-2 mt-1">
                          {n.change_event?.title || 'API Change Event'}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Avatar (32px Sharp Square) */}
          <div className="w-8 h-8 bg-[var(--dim)] border border-[var(--border-dark)] flex items-center justify-center font-['Space_Mono'] text-[13px] font-bold text-[var(--cream)] select-none">
            {user?.email ? user.email[0].toUpperCase() : 'A'}
          </div>
        </div>
      </header>

      {/* FULL-SCREEN SEARCH OVERLAY */}
      {showSearchOverlay && (
        <div className="fixed inset-0 z-[200] bg-[rgba(13,13,11,0.97)] p-8 md:p-16 flex flex-col justify-start animate-fade-in">
          {/* Close button */}
          <button
            onClick={() => setShowSearchOverlay(false)}
            className="absolute top-8 right-8 font-['Space_Mono'] text-[24px] text-[var(--cream)] hover:text-[var(--red)] transition-colors"
            data-cursor="hover"
          >
            ×
          </button>

          {/* Background Header Text */}
          <div className="text-center mb-8">
            <span className="display-text text-[var(--border-dark)] block select-none">
              SEARCH
            </span>
          </div>

          {/* Input Box */}
          <div className="max-w-3xl mx-auto w-full">
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search APIs..."
              className="w-full bg-transparent border-b border-[var(--cream)] pb-4 text-[24px] md:text-[32px] font-['Space_Grotesk'] text-[var(--cream)] placeholder-[var(--muted-dark)] focus:outline-none"
              data-cursor="text"
            />
          </div>

          {/* Results List */}
          <div className="max-w-3xl mx-auto w-full mt-10 divide-y divide-[var(--border-dark)] overflow-y-auto max-h-[50vh]">
            {filteredApis.length === 0 ? (
              <div className="py-8 font-['Space_Mono'] text-[12px] text-[var(--muted-dark)] uppercase">
                NO MATCHING APIS FOUND
              </div>
            ) : (
              filteredApis.map((api) => (
                <div
                  key={api.slug}
                  onClick={() => {
                    navigate(`/dashboard/apis/${api.slug}`)
                    setShowSearchOverlay(false)
                  }}
                  className="py-4 px-2 flex items-center justify-between hover:bg-[var(--dim)] transition-colors cursor-pointer group"
                  data-cursor="hover"
                >
                  <span className="font-['Space_Grotesk'] text-[18px] font-bold text-[var(--cream)] group-hover:text-[var(--red)] transition-colors">
                    {api.name}
                  </span>
                  <span className="font-['Space_Mono'] text-[11px] text-[var(--muted-dark)] uppercase">
                    {api.category}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </>
  )
}
