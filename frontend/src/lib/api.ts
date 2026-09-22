import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('apiradar_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('apiradar_token')
      if (
        window.location.pathname !== '/login' &&
        window.location.pathname !== '/register' &&
        window.location.pathname !== '/'
      ) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export const authAPI = {
  register: (data: { email: string; password: string }) =>
    api.post('/api/auth/register', data).then((res) => res.data),
  login: (data: { email: string; password: string }) =>
    api.post('/api/auth/login', data).then((res) => res.data),
  me: () => api.get('/api/auth/me').then((res) => res.data),
}

export const stacksAPI = {
  list: () => api.get('/api/stacks').then((res) => res.data),
  create: (name: string) => api.post('/api/stacks', { name }).then((res) => res.data),
  delete: (stackId: string) => api.delete(`/api/stacks/${stackId}`).then((res) => res.data),
  watch: (stackId: string, apiId: string, sdkVersion?: string) =>
    api.post(`/api/stacks/${stackId}/watch`, { api_id: apiId, sdk_version: sdkVersion }).then((res) => res.data),
  unwatch: (stackId: string, apiId: string) =>
    api.delete(`/api/stacks/${stackId}/watch/${apiId}`).then((res) => res.data),
  parse: (stackId: string, packageJson: object) =>
    api.post(`/api/stacks/${stackId}/parse`, { package_json: packageJson }).then((res) => res.data),
}

export const changesAPI = {
  list: (params?: { severity?: string; api_slug?: string; page?: number; page_size?: number }) =>
    api.get('/api/changes', { params }).then((res) => res.data),
  getCritical: () => api.get('/api/changes/critical').then((res) => res.data),
  getById: (id: string) => api.get(`/api/changes/${id}`).then((res) => res.data),
}

export const apisAPI = {
  list: () => api.get('/api/apis').then((res) => res.data),
  search: (q: string) => api.get('/api/apis/search', { params: { q } }).then((res) => res.data),
  getBySlug: (slug: string) => api.get(`/api/apis/${slug}`).then((res) => res.data),
}

export const notificationsAPI = {
  list: () =>
    api.get('/api/notifications').then((res) => ({
      data: res.data,
      unreadCount: parseInt(res.headers['x-unread-count'] || '0', 10),
    })),
  markAllRead: () => api.patch('/api/notifications/read-all').then((res) => res.data),
  getCount: () => api.get('/api/notifications/count').then((res) => res.data),
}
