import React from 'react'

export type SeverityType = 'CRITICAL' | 'WARNING' | 'INFO' | string

interface SeverityBadgeProps {
  severity: SeverityType
}

export default function SeverityBadge({ severity }: SeverityBadgeProps) {
  const normSeverity = severity ? severity.toUpperCase() : 'INFO'

  let bgStyle = 'bg-[#10B981] text-white'
  let label = '🟢 INFO'

  if (normSeverity === 'CRITICAL') {
    bgStyle = 'bg-[#EF4444] text-white'
    label = '🔴 CRITICAL'
  } else if (normSeverity === 'WARNING') {
    bgStyle = 'bg-[#F59E0B] text-black'
    label = '🟡 WARNING'
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase shadow-sm ${bgStyle}`}
    >
      {label}
    </span>
  )
}
