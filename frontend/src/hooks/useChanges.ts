import { useQuery } from '@tanstack/react-query'
import { changesAPI } from '../lib/api'

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
  page?: number
  page_size?: number
}

export function useChanges(params?: ChangesFilterParams) {
  const changes = useQuery<PaginatedChangesResponse>({
    queryKey: ['changes', params],
    queryFn: () => changesAPI.list(params),
  })

  const criticalChanges = useQuery<ChangeEventResponse[]>({
    queryKey: ['changes', 'critical'],
    queryFn: changesAPI.getCritical,
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
