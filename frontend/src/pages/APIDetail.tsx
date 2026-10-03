import React, { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ExternalLink,
  Plus,
  Check,
  Tag,
  Loader2,
  AlertCircle,
  Clock,
  ArrowLeft,
  Calendar,
  Github,
  FileCode,
  Info,
} from 'lucide-react'
import { apisAPI, changesAPI, getErrorMessage } from '../lib/api'
import { useStack } from '../hooks/useStack'
import { useToast } from '../store/toastStore'
import { APIDetailResponse, ChangeEventResponse } from '../types'
import ImpactCard from '../components/dashboard/ImpactCard'

export default function APIDetail() {
  const { slug } = useParams<{ slug: string }>()
  const { stacks, watchAPI, unwatchAPI, createStack } = useStack()
  const toast = useToast()

  const [activeSeverity, setActiveSeverity] = useState<string | null>(null)
  const [pageSize, setPageSize] = useState<number>(10)
  const [logoFailed, setLogoFailed] = useState(false)

  // Fetch API detail by slug
  const apiQuery = useQuery<APIDetailResponse>({
    queryKey: ['api-detail', slug],
    queryFn: () => apisAPI.getBySlug(slug || ''),
    enabled: Boolean(slug),
  })

  // Fetch API changes by slug
  const changesQuery = useQuery({
    queryKey: ['api-changes', slug, activeSeverity, pageSize],
    queryFn: () =>
      changesAPI.list({
        api_slug: slug,
        severity: activeSeverity || undefined,
        page: 1,
        page_size: pageSize,
      }),
    enabled: Boolean(slug),
  })

  const apiDetail = apiQuery.data
  const userStacks = stacks.data || []
  const currentStack = userStacks.length > 0 ? userStacks[0] : null

  // Check if watched
  const watchedItem = currentStack?.watched_apis?.find(
    (w) => w.api.id === apiDetail?.id || w.api.slug === slug
  )
  const isWatched = Boolean(watchedItem)

  const handleToggleWatch = async () => {
    if (!apiDetail) return

    try {
      if (!currentStack) {
        // Auto create stack if user has no stack yet
        const newStack = await createStack.mutateAsync('My Stack')
        await watchAPI.mutateAsync({
          stackId: newStack.id,
          apiId: apiDetail.id,
        })
        toast.success(`Now watching ${apiDetail.name}`)
        return
      }

      if (isWatched && watchedItem) {
        await unwatchAPI.mutateAsync({
          stackId: currentStack.id,
          apiId: apiDetail.id,
        })
        toast.success('Removed from watchlist')
      } else {
        await watchAPI.mutateAsync({
          stackId: currentStack.id,
          apiId: apiDetail.id,
        })
        toast.success(`Now watching ${apiDetail.name}`)
      }
    } catch (err: any) {
      toast.error(getErrorMessage(err))
    }
  }

  // Calculate live status badge
  const fetchedChanges = changesQuery.data?.items || []
  const allChanges = fetchedChanges.length > 0 ? fetchedChanges : (apiDetail?.recent_changes || [])
  const thirtyDaysAgo = new Date().getTime() - 30 * 24 * 60 * 60 * 1000

  const hasCriticalRecent = allChanges.some((c: ChangeEventResponse) => {
    const created = new Date(c.created_at).getTime()
    return c.severity === 'CRITICAL' && created >= thirtyDaysAgo
  })

  const hasWarningRecent = allChanges.some((c: ChangeEventResponse) => {
    return c.severity === 'WARNING'
  })

  let statusBadge = {
    label: 'NO CRITICAL CHANGES',
    className: 'severity-stamp info',
  }

  if (hasCriticalRecent) {
    statusBadge = {
      label: 'CRITICAL CHANGES DETECTED',
      className: 'severity-stamp critical',
    }
  } else if (hasWarningRecent) {
    statusBadge = {
      label: 'WARNING: CHANGES PENDING',
      className: 'severity-stamp warning',
    }
  }

  const severityTabs = [
    { label: 'ALL', value: null },
    { label: 'CRITICAL', value: 'CRITICAL' },
    { label: 'WARNING', value: 'WARNING' },
    { label: 'INFO', value: 'INFO' },
  ]

  if (apiQuery.isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] space-y-3 font-['Space_Mono'] text-xs text-[var(--muted-dark)] uppercase">
        <Loader2 className="w-8 h-8 text-[var(--cream)] animate-spin" />
        <p>LOADING API DETAILS...</p>
      </div>
    )
  }

  if (apiQuery.isError || !apiDetail) {
    return (
      <div className="bg-[var(--dim)] border border-[var(--critical)] p-8 text-center space-y-4 max-w-xl mx-auto my-8">
        <AlertCircle className="w-8 h-8 text-[var(--critical)] mx-auto" />
        <p className="font-['Space_Mono'] text-[var(--critical)] text-xs font-bold uppercase tracking-wider">
          API NOT FOUND IN CATALOG
        </p>
        <Link
          to="/dashboard/apis"
          className="px-4 py-2 bg-[var(--cream)] text-[var(--black)] text-xs font-['Space_Mono'] font-bold inline-flex items-center gap-2 uppercase tracking-wider hover:bg-[var(--red)] hover:text-white transition"
          data-cursor="hover"
        >
          <ArrowLeft className="w-4 h-4" /> BACK TO BROWSE APIS
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-6xl space-y-8 font-['Space_Grotesk'] text-[var(--cream)] pb-12">
      {/* Back Link */}
      <Link
        to="/dashboard/apis"
        className="inline-flex items-center gap-2 font-['Space_Mono'] text-xs font-bold text-[var(--muted-light)] hover:text-[var(--cream)] transition uppercase tracking-wider"
        data-cursor="hover"
      >
        <ArrowLeft className="w-4 h-4" /> BACK TO CATALOG
      </Link>

      {/* A. API Header Section */}
      <div className="bg-[var(--dim)] border border-[var(--border-dark)] p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            {apiDetail.logo_url && !logoFailed ? (
              <img
                src={apiDetail.logo_url}
                alt={apiDetail.name}
                className="w-16 h-16 object-contain bg-[var(--black)] p-2.5 border border-[var(--border-dark)] shrink-0"
                onError={() => setLogoFailed(true)}
              />
            ) : (
              <div className="w-16 h-16 bg-[var(--black)] border border-[var(--border-dark)] flex items-center justify-center font-['Space_Mono'] text-[var(--cream)] font-bold text-xl shrink-0">
                {apiDetail.name.substring(0, 2).toUpperCase()}
              </div>
            )}

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-bold text-[var(--cream)] tracking-tight">
                  {apiDetail.name}
                </h1>
                {apiDetail.category && (
                  <span className="font-['Space_Mono'] text-[10px] uppercase border border-[var(--border-dark)] px-2 py-0.5 text-[var(--muted-light)] tracking-widest">
                    {apiDetail.category}
                  </span>
                )}
              </div>

              {/* Status Badge */}
              <div className="pt-1">
                <span className={statusBadge.className}>
                  {statusBadge.label}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 font-['Space_Mono'] text-xs">
            <button
              onClick={handleToggleWatch}
              disabled={watchAPI.isPending || unwatchAPI.isPending}
              className={`px-5 py-3 font-bold uppercase tracking-wider transition flex items-center gap-2 ${
                isWatched
                  ? 'bg-[var(--black)] text-[var(--cream)] border border-[var(--border-dark)] hover:border-[var(--red)]'
                  : 'bg-[var(--cream)] hover:bg-[var(--red)] text-[var(--black)] hover:text-white'
              }`}
              data-cursor="hover"
            >
              {watchAPI.isPending || unwatchAPI.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isWatched ? (
                <>
                  <Check className="w-4 h-4" /> WATCHED IN STACK
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" /> + WATCH API
                </>
              )}
            </button>

            {apiDetail.changelog_url && (
              <a
                href={apiDetail.changelog_url}
                target="_blank"
                rel="noreferrer"
                className="px-5 py-3 bg-[var(--black)] border border-[var(--border-dark)] text-[var(--cream)] hover:border-[var(--cream)] text-xs font-bold uppercase tracking-wider transition flex items-center gap-2"
                data-cursor="hover"
              >
                CHANGELOG <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* B. Recent Changes Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-dark)] pb-4">
            <h2 className="text-2xl font-bold text-[var(--cream)] tracking-tight">
              Recent Signals
            </h2>

            {/* Severity Filter Tabs */}
            <div className="flex items-center gap-4 font-['Space_Mono'] text-xs">
              {severityTabs.map((tab) => (
                <button
                  key={tab.label}
                  onClick={() => setActiveSeverity(tab.value)}
                  className={`pb-1 transition-colors uppercase tracking-wider ${
                    activeSeverity === tab.value
                      ? 'text-[var(--cream)] font-bold border-b-2 border-[var(--cream)]'
                      : 'text-[var(--muted-dark)] hover:text-[var(--cream)]'
                  }`}
                  data-cursor="hover"
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {changesQuery.isLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="bg-[var(--dim)] border border-[var(--border-dark)] p-6 space-y-3 animate-pulse"
                >
                  <div className="h-5 w-1/3 bg-[var(--border-dark)]" />
                  <div className="h-4 w-full bg-[var(--border-dark)]/50" />
                </div>
              ))}
            </div>
          ) : allChanges.length === 0 ? (
            <div className="bg-[var(--dim)] border border-[var(--border-dark)] p-12 text-center text-[var(--muted-light)] font-['Space_Mono'] text-xs uppercase tracking-wider">
              NO CHANGE EVENTS LOGGED FOR THIS API
            </div>
          ) : (
            <div className="space-y-4">
              {allChanges.map((change: ChangeEventResponse, idx: number) => (
                <ImpactCard key={change.id} change={change} index={idx} />
              ))}

              {changesQuery.data?.total &&
                changesQuery.data.total > pageSize && (
                  <div className="pt-2 text-center">
                    <button
                      onClick={() => setPageSize((prev) => prev + 10)}
                      className="px-6 py-3 bg-[var(--cream)] text-[var(--black)] hover:bg-[var(--red)] hover:text-white font-['Space_Mono'] text-xs font-bold uppercase tracking-wider transition"
                      data-cursor="hover"
                    >
                      LOAD MORE SIGNALS
                    </button>
                  </div>
                )}
            </div>
          )}
        </div>

        {/* C. API Info Sidebar */}
        <div className="space-y-6">
          <div className="bg-[var(--dim)] border border-[var(--border-dark)] p-6 space-y-6">
            <h3 className="font-['Space_Mono'] text-xs font-bold text-[var(--cream)] uppercase tracking-widest border-b border-[var(--border-dark)] pb-3 flex items-center gap-2">
              <Info className="w-4 h-4 text-[var(--gold)]" /> API OVERVIEW
            </h3>

            <div className="space-y-5 text-xs font-['Space_Mono']">
              {/* Category */}
              <div>
                <span className="text-[var(--muted-dark)] block uppercase mb-1">Category</span>
                <span className="text-[var(--cream)] font-semibold">
                  {apiDetail.category || 'GENERAL'}
                </span>
              </div>

              {/* GitHub Repo Link */}
              {apiDetail.github_repo && (
                <div>
                  <span className="text-[var(--muted-dark)] block uppercase mb-1">GitHub Repository</span>
                  <a
                    href={
                      apiDetail.github_repo.startsWith('http')
                        ? apiDetail.github_repo
                        : `https://github.com/${apiDetail.github_repo}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-[var(--gold)] hover:underline font-bold"
                    data-cursor="hover"
                  >
                    <Github className="w-3.5 h-3.5" />
                    {apiDetail.github_repo}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              {/* OpenAPI Spec Link */}
              {apiDetail.openapi_spec_url && (
                <div>
                  <span className="text-[var(--muted-dark)] block uppercase mb-1">OpenAPI Specification</span>
                  <a
                    href={apiDetail.openapi_spec_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-[var(--gold)] hover:underline font-bold"
                    data-cursor="hover"
                  >
                    <FileCode className="w-3.5 h-3.5" />
                    VIEW OPENAPI SPEC
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              {/* First Added to ApiRadar Date */}
              <div>
                <span className="text-[var(--muted-dark)] block uppercase mb-1">First Monitored</span>
                <span className="text-[var(--cream)] flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[var(--muted-dark)]" />
                  {apiDetail.created_at
                    ? new Date(apiDetail.created_at).toLocaleDateString()
                    : 'RECENTLY'}
                </span>
              </div>

              {/* Last Scraped */}
              {apiDetail.last_scraped_at && (
                <div>
                  <span className="text-[var(--muted-dark)] block uppercase mb-1">Last Checked</span>
                  <span className="text-[var(--cream)] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[var(--muted-dark)]" />
                    {new Date(apiDetail.last_scraped_at).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
