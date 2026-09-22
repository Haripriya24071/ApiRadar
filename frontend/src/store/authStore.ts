import { create } from 'zustand'
import { authAPI } from '../lib/api'

export interface User {
  id: string
  email: string
  created_at: string
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  setAuth: (user: User, token: string) => void
  clearAuth: () => void
  initAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('apiradar_token'),
  isAuthenticated: !!localStorage.getItem('apiradar_token'),

  setAuth: (user, token) => {
    localStorage.setItem('apiradar_token', token)
    set({ user, token, isAuthenticated: true })
  },

  clearAuth: () => {
    localStorage.removeItem('apiradar_token')
    set({ user: null, token: null, isAuthenticated: false })
  },

  initAuth: async () => {
    const token = localStorage.getItem('apiradar_token')
    if (!token) {
      set({ user: null, token: null, isAuthenticated: false })
      return
    }
    try {
      const user = await authAPI.me()
      set({ user, token, isAuthenticated: true })
    } catch {
      localStorage.removeItem('apiradar_token')
      set({ user: null, token: null, isAuthenticated: false })
    }
  },
}))
