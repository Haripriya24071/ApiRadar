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
import { apisAPI, changesAPI } from '../lib/api'
import { useStack } from '../hooks/useStack'
import { APIDetailResponse, ChangeEventResponse } from '../types'
import ImpactCard from '../components/dashboard/ImpactCard'

export default function APIDetail() {
  const { slug } = useParams<{ slug: string }>()
  const { stacks, watchAPI, unwatchAPI, createStack } = useStack()

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

    if (!currentStack) {
      // Auto create stack if user has no stack yet
      const newStack = await createStack.mutateAsync('My Stack')
      await watchAPI.mutateAsync({
        stackId: newStack.id,
        apiId: apiDetail.id,
      })
      return
    }

    if (isWatched && watchedItem) {
      await unwatchAPI.mutateAsync({
        stackId: currentStack.id,
        apiId: apiDetail.id,
      })
    } else {
      await watchAPI.mutateAsync({
        stackId: currentStack.id,
        apiId: apiDetail.id,
      })
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
    label: '🟢 No critical changes',
    style: 'bg-info/10 text-info border-info/30',
  }

  if (hasCriticalRecent) {
    statusBadge = {
      label: '🔴 Critical changes detected',
      style: 'bg-critical/10 text-critical border-critical/30',
    }
  } else if (hasWarningRecent) {
    statusBadge = {
      label: '🟡 Warning — changes pending',
      style: 'bg-warning/10 text-warning border-warning/30',
    }
  }

  const severityTabs = [
    { label: 'All', value: null },
    { label: '🔴 Critical', value: 'CRITICAL' },
    { label: '🟡 Warning', value: 'WARNING' },
    { label: '🟢 Info', value: 'INFO' },
  ]

  if (apiQuery.isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] space-y-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm text-muted">Loading API details...</p>
      </div>
    )
  }

  if (apiQuery.isError || !apiDetail) {
    return (
      <div className="bg-surface border border-critical/30 rounded-xl p-8 text-center space-y-4 max-w-xl mx-auto my-8">
        <AlertCircle className="w-8 h-8 text-critical mx-auto" />
        <p className="text-slate-200 text-sm font-semibold">
          API not found in catalog
        </p>
        <Link
          to="/dashboard/apis"
          className="px-4 py-2 bg-primary text-white rounded-lg text-xs font-semibold inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Browse APIs
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-6xl space-y-8">
      {/* Back Link */}
      <Link
        to="/dashboard/apis"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-white transition"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Catalog
      </Link>

      {/* A. API Header Section */}
      <div className="bg-surface border border-border rounded-xl p-6 shadow-lg space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            {apiDetail.logo_url && !logoFailed ? (
              <img
                src={apiDetail.logo_url}
                alt={apiDetail.name}
                className="w-14 h-14 rounded-xl object-contain bg-white/5 p-2 border border-border shrink-0"
                onError={() => setLogoFailed(true)}
              />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xl shrink-0">
                {apiDetail.name.substring(0, 2).toUpperCase()}
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  {apiDetail.name}
                </h1>
                {apiDetail.category && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-border text-slate-300">
                    <Tag className="w-3 h-3" />
                    {apiDetail.category}
                  </span>
                )}
              </div>

              {/* Status Badge */}
              <div className="pt-0.5">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${statusBadge.style}`}
                >
                  {statusBadge.label}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleWatch}
              disabled={watchAPI.isPending || unwatchAPI.isPending}
              className={`px-4 py-2.5 rounded-lg text-xs font-semibold shadow-md transition flex items-center gap-2 ${
                isWatched
                  ? 'bg-info/10 hover:bg-info/20 text-info border border-info/30'
                  : 'bg-primary hover:bg-primary/90 text-white'
              }`}
            >
              {watchAPI.isPending || unwatchAPI.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isWatched ? (
                <>
                  <Check className="w-4 h-4" /> Watched in Stack
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" /> + Watch API
                </>
              )}
            </button>

            {apiDetail.changelog_url && (
              <a
                href={apiDetail.changelog_url}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2.5 bg-background border border-border hover:border-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-semibold transition flex items-center gap-2"
              >
                View Changelog <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* B. Recent Changes Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-white tracking-tight">
              Recent Changes
            </h2>

            {/* Severity Filter Tabs */}
            <div className="flex items-center gap-2 bg-surface p-1 border border-border rounded-lg">
              {severityTabs.map((tab) => (
                <button
                  key={tab.label}
                  onClick={() => setActiveSeverity(tab.value)}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                    activeSeverity === tab.value
                      ? 'bg-primary text-white'
                      : 'text-muted hover:text-slate-200'
                  }`}
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
                  className="bg-surface/50 border border-border rounded-xl p-6 space-y-3 animate-pulse"
                >
                  <div className="h-5 w-1/3 bg-border/60 rounded" />
                  <div className="h-4 w-full bg-border/40 rounded" />
                </div>
              ))}
            </div>
          ) : allChanges.length === 0 ? (
            <div className="bg-surface border border-border rounded-xl p-8 text-center text-muted text-sm">
              No change events logged for this API.
            </div>
          ) : (
            <div className="space-y-4">
              {allChanges.map((change: ChangeEventResponse) => (
                <ImpactCard key={change.id} change={change} />
              ))}

              {changesQuery.data?.total &&
                changesQuery.data.total > pageSize && (
                  <div className="pt-2 text-center">
                    <button
                      onClick={() => setPageSize((prev) => prev + 10)}
                      className="px-5 py-2.5 bg-surface border border-border hover:border-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition"
                    >
                      Load More Changes
                    </button>
                  </div>
                )}
            </div>
          )}
        </div>

        {/* C. API Info Sidebar */}
        <div className="space-y-6">
          <div className="bg-surface border border-border rounded-xl p-6 shadow-md space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-border pb-3 flex items-center gap-2">
              <Info className="w-4 h-4 text-primary" /> API Overview
            </h3>

            <div className="space-y-4 text-xs">
              {/* Category */}
              <div>
                <span className="text-muted block font-medium mb-1">Category</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-background text-slate-200 font-semibold border border-border">
                  <Tag className="w-3 h-3 text-primary" />
                  {apiDetail.category || 'General'}
                </span>
              </div>

              {/* GitHub Repo Link */}
              {apiDetail.github_repo && (
                <div>
                  <span className="text-muted block font-medium mb-1">GitHub Repository</span>
                  <a
                    href={
                      apiDetail.github_repo.startsWith('http')
                        ? apiDetail.github_repo
                        : `https://github.com/${apiDetail.github_repo}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-primary hover:underline font-semibold"
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
                  <span className="text-muted block font-medium mb-1">OpenAPI Specification</span>
                  <a
                    href={apiDetail.openapi_spec_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-primary hover:underline font-semibold"
                  >
                    <FileCode className="w-3.5 h-3.5" />
                    View OpenAPI Spec
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              {/* First Added to ApiRadar Date */}
              <div>
                <span className="text-muted block font-medium mb-1">First Added</span>
                <span className="text-slate-200 font-medium flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-muted" />
                  {apiDetail.created_at
                    ? new Date(apiDetail.created_at).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                    : 'Recently'}
                </span>
              </div>

              {/* Last Scraped */}
              {apiDetail.last_scraped_at && (
                <div>
                  <span className="text-muted block font-medium mb-1">Last Checked</span>
                  <span className="text-slate-200 font-medium flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-muted" />
                    {new Date(apiDetail.last_scraped_at).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
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
