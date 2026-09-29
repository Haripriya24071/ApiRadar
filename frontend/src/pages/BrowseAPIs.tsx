import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apisAPI } from '../lib/api'
import { APICatalog } from '../types'

export default function BrowseAPIs() {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')

  const apisQuery = useQuery<APICatalog[]>({
    queryKey: ['apis-catalog'],
    queryFn: () => apisAPI.list(),
  })

  const rawList = apisQuery.data || []

  const categories = [
    { label: 'ALL', key: 'ALL' },
    { label: 'PAYMENTS', key: 'Payments' },
    { label: 'AI/ML', key: 'AI' },
    { label: 'MESSAGING', key: 'Communications' },
    { label: 'AUTH', key: 'Auth' },
    { label: 'DEVTOOLS', key: 'Developer Tools' },
    { label: 'EMAIL', key: 'Email' },
  ]

  // Filter list by category and search string
  const filteredList = rawList.filter((api) => {
    const matchesSearch =
      !searchTerm ||
      api.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (api.category && api.category.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesCategory =
      selectedCategory === 'ALL' ||
      (api.category && api.category.toLowerCase().includes(selectedCategory.toLowerCase()))

    return matchesSearch && matchesCategory
  })

  // Format scraped relative time string
  const formatTimeAgo = (dateStr?: string | null) => {
    if (!dateStr) return '2H AGO'
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return 'RECENT'
    const diffHours = Math.floor((new Date().getTime() - date.getTime()) / (1000 * 60 * 60))
    if (diffHours < 1) return 'JUST NOW'
    if (diffHours < 24) return `${diffHours}H AGO`
    return `${Math.floor(diffHours / 24)}D AGO`
  }

  return (
    <div className="min-h-screen bg-[var(--black)] text-[var(--cream)] pb-16">
      {/* HEADER */}
      <div className="pt-8 md:pt-12 px-6 md:px-10 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="editorial-label mb-3">00_3 // API DIRECTORY</div>
          <h1 className="font-['Space_Grotesk'] text-[clamp(40px,5vw,80px)] font-bold leading-[0.9] tracking-tight text-[var(--cream)] whitespace-pre-line">
            Every API.
            <br />
            Watched.
          </h1>
        </div>

        <div className="font-['Space_Mono'] text-[90px] md:text-[120px] font-bold text-[var(--border-dark)] leading-none select-none">
          {String(filteredList.length).padStart(2, '0')}
        </div>
      </div>

      {/* CATEGORY FILTER */}
      <div className="px-6 md:px-10 my-4 flex flex-wrap items-center gap-6 font-['Space_Mono'] text-[11px] tracking-[0.15em] uppercase">
        {categories.map((cat) => {
          const isActive = selectedCategory === cat.key
          return (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key)}
              className={`transition-colors cursor-pointer ${
                isActive
                  ? 'text-[var(--cream)] font-bold underline underline-offset-4 decoration-2'
                  : 'text-[var(--muted-dark)] hover:text-[var(--cream)]'
              }`}
              data-cursor="hover"
            >
              {cat.label}
            </button>
          )
        })}
      </div>

      {/* SEARCH INPUT */}
      <div className="mx-6 md:mx-10 my-8">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="SEARCH..."
          className="w-full bg-transparent border-b border-[var(--cream)] pb-3 font-['Space_Grotesk'] text-[24px] text-[var(--cream)] placeholder-[var(--muted-dark)] focus:outline-none"
          data-cursor="text"
        />
      </div>

      {/* API GRID */}
      <div className="px-6 md:px-10">
        {apisQuery.isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-1 bg-[var(--border-dark)] border border-[var(--border-dark)]">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-[var(--dim)] p-6 h-[220px] animate-pulse flex flex-col justify-between"
              >
                <div className="h-6 w-3/4 bg-[var(--border-dark)]" />
                <div className="h-4 w-1/2 bg-[var(--border-dark)]" />
                <div className="h-4 w-1/3 bg-[var(--border-dark)]" />
              </div>
            ))}
          </div>
        )}

        {!apisQuery.isLoading && filteredList.length === 0 && (
          <div className="py-20 text-center border border-[var(--border-dark)] bg-[var(--dim)]">
            <p className="font-['Space_Mono'] text-[12px] text-[var(--muted-dark)] uppercase">
              NO APIS FOUND MATCHING "{searchTerm}"
            </p>
          </div>
        )}

        {!apisQuery.isLoading && filteredList.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-[1px] bg-[var(--border-dark)] border border-[var(--border-dark)]">
            {filteredList.map((item) => (
              <div
                key={item.id}
                onClick={() => navigate(`/dashboard/apis/${item.slug}`)}
                className="bg-[var(--dim)] p-6 flex flex-col justify-between h-[220px] transition-colors duration-250 hover:bg-[var(--cream)] hover:text-[var(--black)] cursor-pointer group"
                data-cursor="hover"
              >
                {/* Top */}
                <div>
                  <h3 className="font-['Space_Grotesk'] text-[24px] font-semibold tracking-tight text-[var(--cream)] group-hover:text-[var(--black)] transition-colors">
                    {item.name}
                  </h3>
                  <div className="font-['Space_Mono'] text-[10px] text-[var(--muted-dark)] group-hover:text-[var(--muted-dark)] uppercase mt-1">
                    {item.category || 'THIRD-PARTY API'}
                  </div>
                </div>

                {/* Middle */}
                <div className="flex items-center gap-2 font-['Space_Mono'] text-[12px] my-2">
                  <div className="w-2 h-2 rounded-full bg-[#4A7C59]" />
                  <span className="text-[var(--cream)] group-hover:text-[var(--black)] transition-colors font-medium">
                    HEALTHY / WATCHED
                  </span>
                </div>

                {/* Bottom Row */}
                <div className="pt-3 border-t border-[var(--border-dark)] group-hover:border-[var(--border-light)] flex items-center justify-between font-['Space_Mono'] text-[11px] transition-colors">
                  <span className="text-[var(--muted-dark)] group-hover:text-[var(--muted-dark)] uppercase">
                    LAST CHECKED {formatTimeAgo(item.last_scraped_at)}
                  </span>
                  <span className="text-[var(--gold)] group-hover:text-[var(--black)] font-bold transition-colors">
                    VIEW →
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
