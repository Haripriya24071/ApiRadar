import React, { useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import PageWrapper from '../components/layout/PageWrapper'
import { useChanges } from '../hooks/useChanges'
import { X } from 'lucide-react'

export default function Dashboard() {
  const navigate = useNavigate()
  const { criticalChanges } = useChanges()
  const [dismissedBanner, setDismissedBanner] = useState(false)

  const criticalItems = criticalChanges.data || []
  const count = criticalItems.length

  // Extract unique API names from critical changes
  const affectedApis = Array.from(
    new Set(
      criticalItems
        .map((item: any) => item.api?.name || item.api_name || 'API')
        .filter(Boolean)
    )
  )

  const apiNamesStr =
    affectedApis.length > 0 ? affectedApis.join(', ') : 'STRIPE, OPENAI'

  const showBanner = count > 0 && !dismissedBanner

  return (
    <PageWrapper>
      {/* CRITICAL ALERT BANNER */}
      {showBanner && (
        <div className="w-full bg-[var(--red)] text-[var(--white)] px-6 py-2.5 flex items-center justify-between border-b border-[var(--border-dark)] font-['Space_Mono'] text-[11px] font-bold tracking-[0.1em] uppercase">
          <div
            onClick={() => navigate('/dashboard/feed?severity=CRITICAL')}
            className="flex items-center gap-2 cursor-pointer hover:underline flex-1"
            data-cursor="hover"
          >
            <span>⚑</span>
            <span>
              {count} CRITICAL CHANGE{count > 1 ? 'S' : ''} DETECTED — {apiNamesStr} — REVIEW NOW →
            </span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation()
              setDismissedBanner(true)
            }}
            className="p-1 hover:opacity-80 transition-opacity ml-4"
            data-cursor="hover"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Dashboard Sub-routes Outlet */}
      <div className="p-6 md:p-8">
        <Outlet />
      </div>
    </PageWrapper>
  )
}
