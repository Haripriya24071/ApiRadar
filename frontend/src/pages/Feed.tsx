import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useChanges, ChangeEventResponse } from '../hooks/useChanges'
import { useToast } from '../store/toastStore'
import { changesAPI } from '../lib/api'
import ImpactCard from '../components/dashboard/ImpactCard'

export default function Feed() {
  const navigate = useNavigate()
  const toast = useToast()
  const [activeSeverity, setActiveSeverity] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'newest' | 'deadline'>('newest')
  const [page, setPage] = useState<number>(1)
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set())

  const pageSize = 12

  const { changes, criticalChanges } = useChanges({
    severity: activeSeverity || undefined,
    page,
    page_size: pageSize,
  })

  const handleSeverityChange = (severity: string | null) => {
    setActiveSeverity(severity)
    setPage(1)
  }

  const handleMarkResolved = async (id: string) => {
    setResolvedIds((prev) => new Set(prev).add(id))
    toast.success('Change event marked as resolved')
    try {
      await changesAPI.resolve(id)
    } catch (err) {
      console.error('Failed to mark resolved on backend:', err)
    }
  }

  const totalItems = changes.data?.total || 0
  const rawItems = changes.data?.items || []
  const visibleItems = rawItems.filter((item: ChangeEventResponse) => !resolvedIds.has(item.id))

  // Compute severity counts
  const criticalCount = criticalChanges.data?.length || 0
  const warningCount = rawItems.filter((i: any) => i.severity === 'WARNING').length
  const infoCount = rawItems.filter((i: any) => i.severity === 'INFO').length

  // Sort visible items if deadline sort is selected
  const sortedItems = [...visibleItems].sort((a, b) => {
    if (sortBy === 'deadline') {
      if (!a.deadline_date) return 1
      if (!b.deadline_date) return -1
      return new Date(a.deadline_date).getTime() - new Date(b.deadline_date).getTime()
    }
    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
  })

  const severityTabs = [
    { label: 'ALL', value: null },
    { label: 'CRITICAL', value: 'CRITICAL' },
    { label: 'WARNING', value: 'WARNING' },
    { label: 'INFO', value: 'INFO' },
  ]

  const tickerItems = [
    'BREAKING CHANGE DETECTED',
    'STRIPE API UPDATED',
    'OPENAI DEPRECATION NOTICE',
    'GITHUB AUTH SPEC CHANGE',
    'SUPABASE SCHEMA DIFF',
    'TWILIO API SUNSET',
  ]

  return (
    <div className="min-h-screen bg-[var(--black)] text-[var(--cream)]">
      {/* PAGE HEADER */}
      <div className="pt-8 md:pt-12 px-6 md:px-10 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="editorial-label mb-3">00_1 // CHANGE FEED</div>
          <h1 className="font-['Space_Grotesk'] text-[clamp(40px,5vw,72px)] font-bold leading-[0.9] tracking-tight text-[var(--cream)]">
            Intelligence
            <br />
            Briefing
          </h1>
        </div>

        {/* Stat Pills Column */}
        <div className="flex flex-col gap-2 self-start md:self-auto font-['Space_Mono'] text-[10px] uppercase">
          <div className="severity-stamp critical">
            {criticalCount} CRITICAL
          </div>
          <div className="severity-stamp warning">
            {warningCount} WARNING
          </div>
          <div className="severity-stamp info">
            {infoCount} INFO
          </div>
        </div>
      </div>

      {/* TICKER BAND */}
      <div className="ticker-band border-y border-[var(--border-dark)]">
        <div className="ticker-inner">
          {[...tickerItems, ...tickerItems, ...tickerItems].map((item, idx) => (
            <span key={idx} className="inline-flex items-center gap-3">
              {item} <span className="opacity-50">·</span>
            </span>
          ))}
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="sticky top-[52px] z-30 bg-[var(--black)] border-b border-[var(--border-dark)] px-6 md:px-10 py-4 flex flex-wrap items-center justify-between gap-4">
        {/* Severity Tabs */}
        <div className="flex items-center gap-6 font-['Space_Mono'] text-[11px] uppercase tracking-wider">
          {severityTabs.map((tab) => {
            const isActive = activeSeverity === tab.value
            return (
              <button
                key={tab.label}
                onClick={() => handleSeverityChange(tab.value)}
                className={`pb-1 transition-colors relative ${
                  isActive
                    ? 'text-[var(--cream)] font-bold border-b-2 border-[var(--cream)]'
                    : 'text-[var(--muted-dark)] hover:text-[var(--cream)]'
                }`}
                data-cursor="hover"
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Sort Toggle */}
        <div className="flex items-center gap-2 font-['Space_Mono'] text-[10px] text-[var(--muted-dark)] uppercase">
          <span>SORT:</span>
          <button
            onClick={() => setSortBy(sortBy === 'newest' ? 'deadline' : 'newest')}
            className="text-[var(--gold)] font-bold hover:underline tracking-wider"
            data-cursor="hover"
          >
            {sortBy === 'newest' ? 'NEWEST →' : 'DEADLINE →'}
          </button>
        </div>
      </div>

      {/* FEED CONTENT */}
      <div className="px-6 md:px-10 py-10">
        {changes.isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-[320px] bg-[var(--dim)] border border-[var(--border-dark)] animate-pulse p-6 flex flex-col justify-between"
              >
                <div className="h-4 w-24 bg-[var(--border-dark)]" />
                <div className="h-8 w-3/4 bg-[var(--border-dark)]" />
                <div className="h-16 w-full bg-[var(--border-dark)]/50" />
                <div className="h-4 w-1/2 bg-[var(--border-dark)]" />
              </div>
            ))}
          </div>
        )}

        {changes.isError && (
          <div className="p-12 text-center border border-[var(--critical)] bg-[var(--dim)] space-y-4 max-w-xl mx-auto my-8">
            <div className="font-['Space_Mono'] text-[12px] text-[var(--critical)] uppercase tracking-widest">
              SYSTEM ERROR // FAILED TO FETCH SIGNALS
            </div>
            <p className="font-['Space_Grotesk'] text-[14px] text-[var(--muted-light)]">
              Could not connect to ApiRadar backend service. Please verify backend state.
            </p>
            <button
              onClick={() => changes.refetch()}
              className="bg-[var(--cream)] text-[var(--black)] font-['Space_Mono'] text-[11px] font-bold px-5 py-2.5 hover:bg-[var(--red)] hover:text-[var(--white)] transition-colors uppercase"
              data-cursor="hover"
            >
              RETRY FETCH
            </button>
          </div>
        )}

        {!changes.isLoading && !changes.isError && sortedItems.length === 0 && (
          <div className="py-20 text-center flex flex-col items-center justify-center">
            <h2 className="display-text text-[var(--border-dark)] whitespace-pre-line leading-none mb-6">
              NO SIGNALS{'\n'}DETECTED
            </h2>
            <p className="font-['Space_Grotesk'] text-[14px] font-light text-[var(--muted-light)] mb-8">
              Add APIs to your stack to begin monitoring.
            </p>
            <button
              onClick={() => navigate('/dashboard/stack')}
              className="font-['Space_Mono'] text-[12px] font-bold text-[var(--cream)] border-b border-[var(--cream)] pb-1 hover:text-[var(--red)] hover:border-[var(--red)] transition-colors tracking-widest uppercase"
              data-cursor="hover"
            >
              GO TO STACK →
            </button>
          </div>
        )}

        {!changes.isLoading && !changes.isError && sortedItems.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-[1px] bg-[var(--border-dark)] border border-[var(--border-dark)]">
            {sortedItems.map((item: ChangeEventResponse, index: number) => (
              <ImpactCard
                key={item.id}
                change={item}
                index={index}
                onMarkResolved={() => handleMarkResolved(item.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
