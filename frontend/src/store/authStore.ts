import { create } from 'zustand'
import { authAPI } from '../lib/api'
import { User } from '../types'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  setAuth: (user: User) => void
  clearAuth: () => void
  initAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,

  setAuth: (user) => {
    localStorage.removeItem('apiradar_token')
    set({ user, isAuthenticated: true })
  },

  clearAuth: () => {
    localStorage.removeItem('apiradar_token')
    set({ user: null, isAuthenticated: false })
  },

  initAuth: async () => {
    localStorage.removeItem('apiradar_token')
    try {
      const user = await authAPI.me()
      set({ user, isAuthenticated: true })
    } catch {
      set({ user: null, isAuthenticated: false })
    }
  },
}))
