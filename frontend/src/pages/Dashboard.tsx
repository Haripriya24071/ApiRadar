import React from 'react'
import { Outlet } from 'react-router-dom'
import PageWrapper from '../components/layout/PageWrapper'
import { useStack } from '../hooks/useStack'
import { useChanges } from '../hooks/useChanges'
import { Layers, AlertTriangle, Calendar } from 'lucide-react'

export default function Dashboard() {
  const { stacks } = useStack()
  const { changes, criticalChanges } = useChanges()

  const userStacks = stacks.data || []
  const totalWatchedAPIs = userStacks.reduce(
    (acc, stack) => acc + (stack.watched_apis?.length || 0),
    0
  )

  const criticalCount = criticalChanges.data?.length || 0

  const totalChangesCount = changes.data?.total || 0

  return (
    <PageWrapper>
      <div className="space-y-6">
        {/* Persistent Quick Stats Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-surface border border-border rounded-xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted uppercase tracking-wider">
                Watched APIs
              </p>
              <p className="text-2xl font-bold text-white mt-1">{totalWatchedAPIs}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Layers className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-surface border border-border rounded-xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted uppercase tracking-wider">
                Critical Alerts
              </p>
              <p className="text-2xl font-bold text-critical mt-1">{criticalCount}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-critical/10 border border-critical/20 flex items-center justify-center text-critical">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-surface border border-border rounded-xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted uppercase tracking-wider">
                Total Changes
              </p>
              <p className="text-2xl font-bold text-white mt-1">{totalChangesCount}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-warning/10 border border-warning/20 flex items-center justify-center text-warning">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Dashboard sub-page route outlet */}
        <Outlet />
      </div>
    </PageWrapper>
  )
}
