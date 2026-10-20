import axios from 'axios'
import {
  User,
  StackProfile,
  WatchedAPI,
  APICatalog,
  APIDetailResponse,
  ChangeEvent,
  PaginatedChangesResponse,
  Notification,
  ParsedAPIMatch,
} from '../types'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

export function getErrorMessage(error: any): string {
  if (error?.response?.data?.error) {
    return typeof error.response.data.error === 'string'
      ? error.response.data.error
      : JSON.stringify(error.response.data.error)
  }
  if (error?.response?.data?.detail) {
    return typeof error.response.data.detail === 'string'
      ? error.response.data.detail
      : JSON.stringify(error.response.data.detail)
  }
  if (error?.message) {
    return error.message
  }
  return 'An unexpected error occurred'
}

export const authAPI = {
  providers: (): Promise<{ google: boolean; github: boolean }> =>
    api.get('/api/auth/providers').then((res) => res.data),
  register: (data: { email: string; password: string }): Promise<User> =>
    api.post('/api/auth/register', data).then((res) => res.data),
  login: (data: { email: string; password: string }): Promise<{ token_type: string; user: User }> =>
    api.post('/api/auth/login', data).then((res) => res.data),
  logout: (): Promise<void> => api.post('/api/auth/logout').then((res) => res.data),
  me: (): Promise<User> => api.get('/api/auth/me').then((res) => res.data),
}

export const stacksAPI = {
  list: (): Promise<StackProfile[]> => api.get('/api/stacks').then((res) => res.data),
  create: (name: string): Promise<StackProfile> =>
    api.post('/api/stacks', { name }).then((res) => res.data),
  delete: (stackId: string): Promise<void> =>
    api.delete(`/api/stacks/${stackId}`).then((res) => res.data),
  watch: (stackId: string, apiId: string, sdkVersion?: string): Promise<WatchedAPI> =>
    api.post(`/api/stacks/${stackId}/watch`, { api_id: apiId, sdk_version: sdkVersion }).then((res) => res.data),
  unwatch: (stackId: string, apiId: string): Promise<void> =>
    api.delete(`/api/stacks/${stackId}/watch/${apiId}`).then((res) => res.data),
  parse: (stackId: string, packageJson: object): Promise<ParsedAPIMatch[]> =>
    api.post(`/api/stacks/${stackId}/parse`, { package_json: packageJson }).then((res) => res.data),
}

export const changesAPI = {
  list: (params?: {
    severity?: string
    api_slug?: string
    api_slugs?: string
    page?: number
    page_size?: number
  }): Promise<PaginatedChangesResponse> =>
    api.get('/api/changes', { params }).then((res) => res.data),
  getCritical: (params?: { api_slugs?: string }): Promise<ChangeEvent[]> =>
    api.get('/api/changes/critical', { params }).then((res) => res.data),
  getById: (id: string): Promise<ChangeEvent> =>
    api.get(`/api/changes/${id}`).then((res) => res.data),
  resolve: (id: string): Promise<{ status: string; message: string; change_id: string }> =>
    api.patch(`/api/changes/${id}/resolve`).then((res) => res.data),
}

export const apisAPI = {
  list: (): Promise<APICatalog[]> => api.get('/api/apis').then((res) => res.data),
  search: (q: string): Promise<APICatalog[]> =>
    api.get('/api/apis/search', { params: { q } }).then((res) => res.data),
  getBySlug: (slug: string): Promise<APIDetailResponse> =>
    api.get(`/api/apis/${slug}`).then((res) => res.data),
}

export const notificationsAPI = {
  list: (): Promise<{ data: Notification[]; unreadCount: number }> =>
    api.get('/api/notifications').then((res) => ({
      data: res.data,
      unreadCount: parseInt(res.headers['x-unread-count'] || '0', 10),
    })),
  markAllRead: (): Promise<void> => api.patch('/api/notifications/read-all').then((res) => res.data),
  getCount: (): Promise<{ unread: number }> =>
    api.get('/api/notifications/count').then((res) => res.data),
}

export interface ForecastEvidence {
  title: string
  severity: string
  published_at?: string | null
  url: string
}

export interface APIChangeForecast {
  id: string
  api_slug: string
  api_name: string
  logo_url?: string | null
  forecast_type: 'trend_risk' | 'announced_change'
  status: 'forecast' | 'insufficient_history' | 'low_risk' | 'scheduled'
  probability_percent?: number | null
  confidence: 'low' | 'medium' | 'high'
  horizon_days: number
  expected_by?: string | null
  title: string
  summary: string
  source_updates: number
  actionable_updates: number
  observed_days: number
  generated_at: string
  evidence: ForecastEvidence[]
}

export const forecastsAPI = {
  list: (params?: { api_slugs?: string; horizon_days?: number }): Promise<APIChangeForecast[]> =>
    api.get('/api/forecasts', { params }).then((res) => res.data),
}
