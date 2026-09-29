import React, { useState } from 'react'
import DeadlineCountdown from './DeadlineCountdown'
import { ChangeEventResponse } from '../../hooks/useChanges'

interface ImpactCardProps {
  change: ChangeEventResponse
  index?: number
  onMarkResolved?: () => void
}

export default function ImpactCard({ change, index = 0, onMarkResolved }: ImpactCardProps) {
  const [isFlipped, setIsFlipped] = useState(false)

  // Format section index like T-001
  const formattedIndex = `T-${String(index + 1).padStart(3, '0')}`

  // Format source label
  const formatSource = (src: string) => {
    if (!src) return 'UNKNOWN'
    const lower = src.toLowerCase()
    if (lower === 'rss') return 'RSS'
    if (lower === 'github') return 'GITHUB'
    if (lower.includes('openapi')) return 'OPENAPI'
    return src.toUpperCase()
  }

  const affected = change.affected_endpoints || []
  const severityClass = (change.severity || 'INFO').toLowerCase()

  return (
    <div className="w-full h-[340px] relative [perspective:1000px] select-none">
      {/* 3D Flip Container */}
      <div
        className={`w-full h-full relative transition-transform duration-600 ease-[cubic-bezier(0.16,1,0.3,1)] [transform-style:preserve-3d] ${
          isFlipped ? '[transform:rotateY(180deg)]' : ''
        }`}
      >
        {/* FRONT FACE */}
        <div className="absolute inset-0 [backface-visibility:hidden] flex flex-col justify-between bg-[var(--dim)] border border-[var(--border-dark)] overflow-hidden">
          {/* Header Strip */}
          <div className="px-5 py-3 border-b border-[var(--border-dark)] flex items-center justify-between">
            <span className={`severity-stamp ${severityClass}`}>
              {change.severity || 'INFO'}
            </span>
            <div className="font-['Space_Mono'] text-[10px] text-[var(--muted-dark)] uppercase tracking-wider flex items-center gap-2">
              <span>{change.api?.name || 'API'}</span>
              <span>·</span>
              <span>{change.created_at ? new Date(change.created_at).toLocaleDateString() : 'RECENT'}</span>
            </div>
          </div>

          {/* Main Content */}
          <div className="p-5 flex-1 flex flex-col justify-start">
            <div className="font-['Space_Mono'] text-[10px] text-[var(--muted-dark)] tracking-widest uppercase">
              {formattedIndex}
            </div>

            <h3 className="font-['Space_Grotesk'] text-[20px] font-semibold text-[var(--cream)] leading-snug mt-2 line-clamp-2">
              {change.title}
            </h3>

            {change.what_changed && (
              <p className="font-['Space_Grotesk'] text-[13px] font-light text-[var(--muted-light)] mt-2 line-clamp-2 leading-relaxed">
                {change.what_changed}
              </p>
            )}

            {/* Affected Endpoints */}
            {affected.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5 max-h-[50px] overflow-hidden">
                {affected.slice(0, 3).map((endpoint, idx) => (
                  <span
                    key={idx}
                    className="font-['Space_Mono'] text-[11px] bg-[var(--black)] border border-[var(--border-dark)] px-2 py-0.5 text-[var(--gold)]"
                  >
                    {endpoint}
                  </span>
                ))}
                {affected.length > 3 && (
                  <span className="font-['Space_Mono'] text-[11px] text-[var(--muted-dark)] px-1 py-0.5">
                    +{affected.length - 3} MORE
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Footer Strip */}
          <div className="px-5 py-3 border-t border-[var(--border-dark)] flex items-center justify-between font-['Space_Mono'] text-[10px]">
            <span className="text-[var(--muted-dark)] tracking-wider">
              SRC: {formatSource(change.source)}
            </span>

            <div className="flex items-center gap-3">
              {change.effort_estimate && (
                <span className="text-[var(--muted-dark)] tracking-wider">
                  [{change.effort_estimate.toUpperCase()}]
                </span>
              )}
              <button
                onClick={() => setIsFlipped(true)}
                className="text-[var(--gold)] font-bold hover:underline tracking-wider"
                data-cursor="hover"
              >
                FLIP FOR GUIDE →
              </button>
            </div>
          </div>
        </div>

        {/* BACK FACE */}
        <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col justify-between bg-[var(--cream)] text-[var(--black)] border border-[var(--border-light)] overflow-hidden">
          {/* Header */}
          <div className="px-5 py-3 border-b border-[var(--border-light)] flex items-center justify-between font-['Space_Mono'] text-[11px] font-bold text-[var(--muted-dark)] uppercase">
            <span>MIGRATION GUIDE</span>
            <span>{change.api?.name || 'API'}</span>
          </div>

          {/* Content */}
          <div className="p-5 flex-1 overflow-y-auto flex flex-col justify-between">
            <div>
              <p className="font-['Space_Grotesk'] text-[15px] font-normal leading-relaxed text-[var(--black)]">
                {change.migration_summary || 'No explicit migration steps provided for this change.'}
              </p>
            </div>

            <div className="mt-4 pt-4 border-t border-[var(--border-light)]/60 flex flex-wrap items-center justify-between gap-2 font-['Space_Mono'] text-[11px]">
              {change.deadline_date ? (
                <div className="flex items-center gap-2">
                  <span className="text-[var(--muted-dark)] font-bold">DEADLINE:</span>
                  <DeadlineCountdown deadline_date={change.deadline_date} />
                </div>
              ) : (
                <span className="text-[var(--muted-dark)]">NO DEADLINE SPECIFIED</span>
              )}

              {change.effort_estimate && (
                <div>
                  <span className="text-[var(--muted-dark)] font-bold mr-1">EFFORT:</span>
                  <span className="font-bold uppercase text-[var(--black)]">
                    {change.effort_estimate}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-[var(--border-light)] flex items-center justify-between font-['Space_Mono'] text-[10px]">
            <button
              onClick={() => setIsFlipped(false)}
              className="text-[var(--muted-dark)] font-bold hover:text-[var(--black)] tracking-wider"
              data-cursor="hover"
            >
              ← FLIP BACK
            </button>

            {onMarkResolved && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onMarkResolved()
                }}
                className="bg-[var(--black)] text-[var(--cream)] font-['Space_Mono'] text-[10px] font-bold px-3 py-1.5 hover:bg-[var(--red)] hover:text-[var(--white)] transition-colors uppercase"
                data-cursor="hover"
              >
                MARK RESOLVED ✓
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
