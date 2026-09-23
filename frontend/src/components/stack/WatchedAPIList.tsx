import React, { useState } from 'react'
import { X, Layers, Loader2, Globe, Tag } from 'lucide-react'
import { WatchedAPI, useStack } from '../../hooks/useStack'

interface WatchedAPIListProps {
  stackId: string
  watchedApis: WatchedAPI[]
}

export default function WatchedAPIList({ stackId, watchedApis }: WatchedAPIListProps) {
  const { unwatchAPI } = useStack()
  const [removingApiId, setRemovingApiId] = useState<string | null>(null)

  const handleRemove = async (apiId: string) => {
    setRemovingApiId(apiId)
    try {
      await unwatchAPI.mutateAsync({ stackId, apiId })
    } catch (err) {
      console.error('Failed to unwatch API:', err)
    } finally {
      setRemovingApiId(null)
    }
  }

  if (!watchedApis || watchedApis.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-xl p-8 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-border/50 border border-border flex items-center justify-center text-muted mx-auto">
          <Layers className="w-6 h-6" />
        </div>
        <p className="text-slate-300 text-sm font-medium">
          No APIs watched yet. Upload your package.json to get started.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-6 shadow-md space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Layers className="w-5 h-5 text-primary" />
          Watched APIs ({watchedApis.length})
        </h2>
      </div>

      <div className="divide-y divide-border/60">
        {watchedApis.map((item) => {
          const isRemoving = removingApiId === item.api.id || (unwatchAPI.isPending && unwatchAPI.variables?.apiId === item.api.id)

          return (
            <div
              key={item.id || item.api.id}
              className="py-3.5 flex items-center justify-between gap-4 first:pt-0 last:pb-0 hover:bg-background/30 px-2 rounded-lg transition"
            >
              <div className="flex items-center gap-3.5">
                {item.api.logo_url ? (
                  <img
                    src={item.api.logo_url}
                    alt={item.api.name}
                    className="w-9 h-9 rounded-lg object-contain bg-white/5 p-1.5 border border-border"
                    onError={(e) => {
                      ;(e.target as HTMLElement).style.display = 'none'
                    }}
                  />
                ) : (
                  <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                    {item.api.name.substring(0, 2).toUpperCase()}
                  </div>
                )}

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">
                      {item.api.name}
                    </span>
                    {item.api.category && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-border text-slate-300 flex items-center gap-1">
                        <Tag className="w-2.5 h-2.5" />
                        {item.api.category}
                      </span>
                    )}
                  </div>

                  {item.sdk_version && (
                    <div className="flex items-center gap-1.5 text-xs text-muted font-mono">
                      <Globe className="w-3 h-3" />
                      <span>{item.sdk_version}</span>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => handleRemove(item.api.id)}
                disabled={isRemoving}
                title={`Remove ${item.api.name} from watchlist`}
                className="p-1.5 rounded-lg text-muted hover:text-critical hover:bg-critical/10 transition border border-transparent hover:border-critical/20 disabled:opacity-50"
              >
                {isRemoving ? (
                  <Loader2 className="w-4 h-4 animate-spin text-critical" />
                ) : (
                  <X className="w-4 h-4" />
                )}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
