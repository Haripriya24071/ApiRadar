import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, Globe, ArrowRight, Tag, Clock } from 'lucide-react'
import { apisAPI } from '../lib/api'
import { APICatalog } from '../types'

function timeAgo(dateString?: string | null): string {
  if (!dateString) return 'never'
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return 'recently'

  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

export default function BrowseAPIs() {
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [failedLogos, setFailedLogos] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm)
    }, 300)
    return () => clearTimeout(handler)
  }, [searchTerm])

  const useServerSearch = debouncedSearch.trim().length > 2

  const apisQuery = useQuery<APICatalog[]>({
    queryKey: ['apis', useServerSearch ? debouncedSearch : 'all'],
    queryFn: () =>
      useServerSearch
        ? apisAPI.search(debouncedSearch.trim())
        : apisAPI.list(),
  })

  const rawList = apisQuery.data || []
  const filteredList = useServerSearch
    ? rawList
    : rawList.filter((api) =>
        api.name.toLowerCase().includes(debouncedSearch.trim().toLowerCase())
      )

  const handleLogoError = (apiId: string) => {
    setFailedLogos((prev) => ({ ...prev, [apiId]: true }))
  }

  return (
    <div className="max-w-6xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Browse APIs</h1>
        <p className="text-sm text-muted mt-1">
          Explore the catalog of tracked third-party APIs and SDKs
        </p>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search APIs by name (e.g. Stripe, OpenAI)..."
          className="w-full pl-11 pr-4 py-2.5 bg-surface border border-border rounded-xl text-sm text-white placeholder:text-muted focus:outline-none focus:border-primary transition shadow-inner"
        />
      </div>

      {/* Loading Skeletons Grid (3 cols desktop, 1 col mobile) */}
      {apisQuery.isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-surface/50 border border-border rounded-xl p-5 space-y-4 animate-pulse"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-border/60 rounded-lg" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-2/3 bg-border/60 rounded" />
                  <div className="h-3 w-1/3 bg-border/40 rounded" />
                </div>
              </div>
              <div className="h-4 w-1/2 bg-border/40 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!apisQuery.isLoading && filteredList.length === 0 && (
        <div className="bg-surface border border-border rounded-xl p-10 text-center space-y-3">
          <Globe className="w-10 h-10 text-muted mx-auto" />
          <p className="text-slate-300 text-sm font-medium">
            No APIs found matching '{debouncedSearch || searchTerm}'
          </p>
          <p className="text-xs text-muted">
            Try searching for a different keyword or view all APIs.
          </p>
        </div>
      )}

      {/* Grid of API Cards (3 columns desktop, 1 column mobile) */}
      {!apisQuery.isLoading && filteredList.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {filteredList.map((item) => {
            const hasLogo = Boolean(item.logo_url) && !failedLogos[item.id]

            return (
              <div
                key={item.id}
                className="bg-surface border border-border hover:border-slate-700 rounded-xl p-5 shadow-md flex flex-col justify-between space-y-4 transition-all duration-200"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    {hasLogo ? (
                      <img
                        src={item.logo_url}
                        alt={item.name}
                        className="w-10 h-10 rounded-lg object-contain bg-white/5 p-1 border border-border"
                        onError={() => handleLogoError(item.id)}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-base shrink-0">
                        {item.name.substring(0, 1).toUpperCase()}
                      </div>
                    )}

                    <div className="min-w-0">
                      <h3 className="text-base font-bold text-white leading-tight truncate">
                        {item.name}
                      </h3>
                      {item.category && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-border/80 text-slate-300 mt-1">
                          <Tag className="w-2.5 h-2.5" />
                          {item.category}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-muted">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Last checked {timeAgo(item.last_scraped_at)}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-border/60">
                  <Link
                    to={`/dashboard/apis/${item.slug}`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition"
                  >
                    View Details <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
