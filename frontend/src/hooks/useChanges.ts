import { useQuery } from '@tanstack/react-query'
import { changesAPI } from '../lib/api'
import { useStack } from './useStack'
import { useAuthStore } from '../store/authStore'

export interface APIBase {
  id: string
  name: string
  slug: string
  category?: string
  logo_url?: string
}

export interface ChangeEventResponse {
  id: string
  api_id: string
  source: string
  severity: 'CRITICAL' | 'WARNING' | 'INFO' | string
  title: string
  what_changed?: string | null
  affected_endpoints?: string[] | null
  deadline_date?: string | null
  migration_summary?: string | null
  effort_estimate?: string | null
  published_at?: string | null
  created_at: string
  api: APIBase
}

export interface PaginatedChangesResponse {
  items: ChangeEventResponse[]
  total: number
  page: number
  page_size: number
}

export interface ChangesFilterParams {
  severity?: string
  api_slug?: string
  api_slugs?: string
  page?: number
  page_size?: number
}

export function useChanges(params?: ChangesFilterParams) {
  const user = useAuthStore((state) => state.user)
  const { stacks } = useStack()
  const guestSlugs = !user
    ? (stacks.data?.[0]?.watched_apis || []).map((watch) => watch.api.slug).filter(Boolean).join(',')
    : undefined
  const requestParams = { ...params, api_slugs: params?.api_slugs ?? guestSlugs }
  const changes = useQuery<PaginatedChangesResponse>({
    queryKey: ['changes', requestParams],
    queryFn: () => changesAPI.list(requestParams),
    refetchInterval: 60_000,
  })

  const criticalChanges = useQuery<ChangeEventResponse[]>({
    queryKey: ['changes', 'critical', guestSlugs],
    queryFn: () => changesAPI.getCritical({ api_slugs: guestSlugs }),
    refetchInterval: 60_000,
  })

  const getChange = (id: string) => {
    return useQuery<ChangeEventResponse>({
      queryKey: ['changes', id],
      queryFn: () => changesAPI.getById(id),
      enabled: Boolean(id),
    })
  }

  return {
    changes,
    criticalChanges,
    getChange,
  }
}
