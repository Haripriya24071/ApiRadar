import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Radio, RefreshCw, ChevronLeft, ChevronRight, Layers } from 'lucide-react'
import { useChanges, ChangeEventResponse } from '../hooks/useChanges'
import ImpactCard from '../components/dashboard/ImpactCard'

export default function Feed() {
  const navigate = useNavigate()
  const [activeSeverity, setActiveSeverity] = useState<string | null>(null)
  const [activeApiSlug, setActiveApiSlug] = useState<string | null>(null)
  const [page, setPage] = useState<number>(1)
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set())

  const pageSize = 10

  const { changes } = useChanges({
    severity: activeSeverity || undefined,
    api_slug: activeApiSlug || undefined,
    page,
    page_size: pageSize,
  })

  const handleSeverityChange = (severity: string | null) => {
    setActiveSeverity(severity)
    setPage(1)
  }

  const handleMarkResolved = (id: string) => {
    setResolvedIds((prev) => new Set(prev).add(id))
  }

  const totalItems = changes.data?.total || 0
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const rawItems = changes.data?.items || []
  const visibleItems = rawItems.filter((item: ChangeEventResponse) => !resolvedIds.has(item.id))

  const severityTabs = [
    { label: 'All', value: null },
    { label: '🔴 Critical', value: 'CRITICAL' },
    { label: '🟡 Warning', value: 'WARNING' },
    { label: '🟢 Info', value: 'INFO' },
  ]

  return (
    <div className="max-w-4xl space-y-6">
      {/* A. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Change Feed</h1>
          <p className="text-sm text-muted mt-1">
            Breaking changes across your watched APIs
          </p>
        </div>
        <div className="text-xs font-semibold px-3 py-1.5 rounded-full bg-surface border border-border text-slate-300 self-start sm:self-auto">
          {totalItems} {totalItems === 1 ? 'change' : 'changes'} detected
        </div>
      </div>

      {/* B. Filter Bar */}
      <div className="border-b border-border flex items-center gap-6 overflow-x-auto pb-1 scrollbar-none">
        {severityTabs.map((tab) => {
          const isActive = activeSeverity === tab.value
          return (
            <button
              key={tab.label}
              onClick={() => handleSeverityChange(tab.value)}
              className={`pb-2.5 text-sm font-semibold transition relative whitespace-nowrap ${
                isActive
                  ? 'text-primary'
                  : 'text-muted hover:text-slate-200'
              }`}
            >
              {tab.label}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          )
        })}
      </div>

      {/* C. Change List */}
      <div className="space-y-4">
        {changes.isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-surface/50 border border-border rounded-xl p-6 space-y-4 animate-pulse"
              >
                <div className="flex justify-between items-center">
                  <div className="h-6 w-24 bg-border/60 rounded-full" />
                  <div className="h-4 w-20 bg-border/60 rounded" />
                </div>
                <div className="h-6 w-3/4 bg-border/60 rounded" />
                <div className="h-4 w-full bg-border/40 rounded" />
                <div className="h-10 w-full bg-border/30 rounded" />
              </div>
            ))}
          </div>
        )}

        {changes.isError && (
          <div className="bg-surface border border-critical/30 rounded-xl p-8 text-center space-y-4">
            <p className="text-critical text-sm font-medium">
              Failed to load changes. Is your backend running?
            </p>
            <button
              onClick={() => changes.refetch()}
              className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        )}

        {!changes.isLoading && !changes.isError && visibleItems.length === 0 && (
          <div className="bg-surface border border-border rounded-xl p-10 text-center space-y-4 my-6">
            <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto">
              <Radio className="w-7 h-7" />
            </div>
            <div className="space-y-1 max-w-sm mx-auto">
              <h3 className="text-base font-semibold text-white">No changes detected yet</h3>
              <p className="text-xs text-muted">
                Add APIs to your stack and run the scraper to see changes here
              </p>
            </div>
            <div>
              <button
                onClick={() => navigate('/dashboard/stack')}
                className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-2 shadow-md transition"
              >
                <Layers className="w-4 h-4" />
                Go to My Stack
              </button>
            </div>
          </div>
        )}

        {!changes.isLoading &&
          !changes.isError &&
          visibleItems.length > 0 &&
          visibleItems.map((item: ChangeEventResponse) => (
            <ImpactCard
              key={item.id}
              change={item}
              onMarkResolved={() => handleMarkResolved(item.id)}
            />
          ))}
      </div>

      {/* D. Pagination */}
      {!changes.isLoading && !changes.isError && totalItems > 0 && (
        <div className="flex items-center justify-between border-t border-border pt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-4 py-2 bg-surface border border-border rounded-lg text-xs font-medium text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>

          <span className="text-xs font-medium text-muted">
            Page {page} of {totalPages}
          </span>

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-4 py-2 bg-surface border border-border rounded-lg text-xs font-medium text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
