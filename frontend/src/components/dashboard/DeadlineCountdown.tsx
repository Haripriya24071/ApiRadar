import React from 'react'

interface DeadlineCountdownProps {
  deadline_date: string | null
}

export default function DeadlineCountdown({ deadline_date }: DeadlineCountdownProps) {
  if (!deadline_date) return null

  const deadline = new Date(deadline_date)
  if (isNaN(deadline.getTime())) return null

  const today = new Date()
  // Reset time portions for accurate day count comparisons
  today.setHours(0, 0, 0, 0)
  deadline.setHours(0, 0, 0, 0)

  const diffTime = deadline.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return (
      <span className="text-xs font-semibold text-[#EF4444] flex items-center gap-1">
        ⛔ Overdue
      </span>
    )
  }

  if (diffDays <= 7) {
    return (
      <span className="text-xs font-semibold text-[#EF4444] flex items-center gap-1">
        ⚠️ {diffDays} {diffDays === 1 ? 'day' : 'days'} left
      </span>
    )
  }

  if (diffDays <= 30) {
    return (
      <span className="text-xs font-medium text-[#F59E0B] flex items-center gap-1">
        {diffDays} {diffDays === 1 ? 'day' : 'days'} left
      </span>
    )
  }

  return (
    <span className="text-xs font-medium text-muted flex items-center gap-1">
      {diffDays} days left
    </span>
  )
}
