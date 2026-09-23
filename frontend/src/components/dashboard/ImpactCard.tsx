import React, { useState } from 'react'
import { Clock, CheckCircle2, ChevronDown, ChevronUp, Terminal, Radio } from 'lucide-react'
import SeverityBadge from './SeverityBadge'
import DeadlineCountdown from './DeadlineCountdown'
import { ChangeEventResponse } from '../../hooks/useChanges'

interface ImpactCardProps {
  change: ChangeEventResponse
  onMarkResolved?: () => void
}

export default function ImpactCard({ change, onMarkResolved }: ImpactCardProps) {
  const [showFullMigration, setShowFullMigration] = useState(false)

  // Format source chip string nicely
  const formatSource = (src: string) => {
    if (!src) return 'via Unknown'
    const lower = src.toLowerCase()
    if (lower === 'rss') return 'via RSS'
    if (lower === 'github') return 'via GitHub'
    if (lower.includes('openapi')) return 'via OpenAPI Diff'
    return `via ${src}`
  }

  const affected = change.affected_endpoints || []
  const hasMigration = Boolean(change.migration_summary)

  return (
    <div className="bg-[#111118] border border-[#1E1E2E] hover:border-slate-700 rounded-xl p-5 shadow-lg transition-all duration-200 space-y-4">
      {/* Top row: SeverityBadge on left, API logo + name on right/center, DeadlineCountdown far right */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <SeverityBadge severity={change.severity} />

          {change.api && (
            <div className="flex items-center gap-2 bg-background/50 border border-border/60 px-2.5 py-1 rounded-lg">
              {change.api.logo_url ? (
                <img
                  src={change.api.logo_url}
                  alt={change.api.name}
                  className="w-4 h-4 object-contain bg-white/10 rounded"
                  onError={(e) => {
                    ;(e.target as HTMLElement).style.display = 'none'
                  }}
                />
              ) : null}
              <span className="text-xs font-semibold text-slate-200">
                {change.api.name}
              </span>
            </div>
          )}
        </div>

        <DeadlineCountdown deadline_date={change.deadline_date || null} />
      </div>

      {/* Title */}
      <h3 className="text-lg font-bold text-white tracking-tight leading-snug">
        {change.title}
      </h3>

      {/* What changed section */}
      {change.what_changed && (
        <p className="text-sm text-slate-300/90 leading-relaxed">
          {change.what_changed}
        </p>
      )}

      {/* Affected endpoints */}
      {affected.length > 0 && (
        <div className="space-y-2 pt-1">
          <div className="text-[11px] font-semibold text-muted uppercase tracking-wider flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-primary" />
            Affected Endpoints ({affected.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {affected.map((endpoint, idx) => (
              <code
                key={idx}
                className="px-2.5 py-1 bg-background border border-border rounded-md text-xs font-mono text-slate-200 shadow-inner"
              >
                {endpoint}
              </code>
            ))}
          </div>
        </div>
      )}

      {/* Divider line */}
      <div className="border-t border-[#1E1E2E] my-3" />

      {/* Bottom section */}
      <div className="space-y-3">
        {/* Migration summary with toggle */}
        {hasMigration && (
          <div className="bg-background/40 border border-border/50 rounded-lg p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200">
                Migration Guide
              </span>
              <button
                type="button"
                onClick={() => setShowFullMigration(!showFullMigration)}
                className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
              >
                {showFullMigration ? (
                  <>
                    Show less <ChevronUp className="w-3.5 h-3.5" />
                  </>
                ) : (
                  <>
                    Show more <ChevronDown className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
            <p
              className={`text-xs text-slate-300 leading-relaxed ${
                !showFullMigration ? 'line-clamp-2' : ''
              }`}
            >
              {change.migration_summary}
            </p>
          </div>
        )}

        {/* Bottom row chips and actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            {/* Effort estimate chip */}
            {change.effort_estimate && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-background border border-border rounded-md text-xs font-medium text-slate-300">
                <Clock className="w-3.5 h-3.5 text-primary" />
                {change.effort_estimate}
              </span>
            )}

            {/* Source chip */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-background border border-border rounded-md text-xs font-medium text-muted">
              <Radio className="w-3 h-3 text-slate-400" />
              {formatSource(change.source)}
            </span>
          </div>

          {/* Mark Resolved button */}
          {onMarkResolved && (
            <button
              type="button"
              onClick={onMarkResolved}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-info/10 hover:bg-info/20 text-info border border-info/30 rounded-lg text-xs font-semibold transition"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Mark Resolved
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
