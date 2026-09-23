export interface User {
  id: string
  email: string
  created_at?: string
}

export interface APIBase {
  id: string
  name: string
  slug: string
  category?: string
  logo_url?: string
}

export interface APICatalog {
  id: string
  name: string
  slug: string
  category?: string
  changelog_url?: string
  logo_url?: string
  last_scraped_at?: string
}

export interface WatchedAPI {
  id: string
  profile_id?: string
  api_id: string
  sdk_version?: string
  api: APIBase
}

export interface StackProfile {
  id: string
  user_id?: string
  name: string
  created_at: string
  watched_apis: WatchedAPI[]
}

export interface ChangeEvent {
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
  items: ChangeEvent[]
  total: number
  page: number
  page_size: number
}

export interface APIDetailResponse extends APICatalog {
  recent_changes: ChangeEvent[]
}

export interface Notification {
  id: string
  user_id?: string
  event_id?: string
  title: string
  message: string
  is_read: boolean
  created_at: string
}

export interface ParsedAPIMatch {
  api: APIBase
  sdk_version?: string
  already_watching: boolean
}
