import React from 'react'
import { Plus, Layers, Loader2, AlertCircle } from 'lucide-react'
import { useStack } from '../hooks/useStack'
import PackageUploader from '../components/stack/PackageUploader'
import WatchedAPIList from '../components/stack/WatchedAPIList'

export default function MyStack() {
  const { stacks, createStack } = useStack()

  if (stacks.isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm text-muted">Loading your API stack profile...</p>
      </div>
    )
  }

  if (stacks.isError) {
    return (
      <div className="p-6 bg-critical/10 border border-critical/30 rounded-xl text-critical flex items-center gap-3 max-w-2xl">
        <AlertCircle className="w-6 h-6 shrink-0" />
        <div>
          <h3 className="font-semibold text-sm">Failed to load stack profile</h3>
          <p className="text-xs text-critical/80 mt-1">
            {(stacks.error as any)?.message || 'An unexpected error occurred while fetching your stack.'}
          </p>
        </div>
      </div>
    )
  }

  const stackList = stacks.data || []
  const hasStack = stackList.length > 0
  const currentStack = hasStack ? stackList[0] : null
  const count = currentStack?.watched_apis?.length || 0

  const handleCreateStack = () => {
    createStack.mutate('My Stack')
  }

  return (
    <div className="max-w-4xl space-y-8">
      {!hasStack ? (
        <div className="bg-surface border border-border rounded-xl p-8 text-center space-y-4 max-w-xl mx-auto my-12 shadow-lg">
          <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto">
            <Layers className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h1 className="text-xl font-bold text-white">Create Your API Stack Profile</h1>
            <p className="text-sm text-muted">
              Start monitoring your project's third-party APIs for breaking changes, version updates, and deprecation notices.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={handleCreateStack}
              disabled={createStack.isPending}
              className="px-6 py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-medium text-sm rounded-lg shadow-md transition inline-flex items-center gap-2"
            >
              {createStack.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating Stack...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Create Stack
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/80 pb-4">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                {currentStack?.name || 'My Stack'}
              </h1>
              <p className="text-sm text-muted mt-1">
                {count} {count === 1 ? 'API' : 'APIs'} being monitored
              </p>
            </div>
          </div>

          {/* Package Uploader on top */}
          {currentStack && (
            <PackageUploader stackId={currentStack.id} />
          )}

          {/* Watched API List below */}
          {currentStack && (
            <WatchedAPIList
              stackId={currentStack.id}
              watchedApis={currentStack.watched_apis || []}
            />
          )}
        </>
      )}
    </div>
  )
}
