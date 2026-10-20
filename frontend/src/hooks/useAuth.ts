import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { authAPI, stacksAPI } from '../lib/api'
import { clearGuestStackAfterSync, getGuestStackForSync } from './useStack'

export function useAuth() {
  const navigate = useNavigate()
  const { user, isAuthenticated, setAuth, clearAuth } = useAuthStore()

  const login = async (email: string, password: string) => {
    const res = await authAPI.login({ email, password })
    setAuth(res.user)
    await syncGuestStack()
    return res.user
  }

  const syncGuestStack = async () => {
    const guestStack = getGuestStackForSync()
    if (!guestStack?.watched_apis.length) return

    try {
      const stacks = await stacksAPI.list()
      const stack = stacks[0] || await stacksAPI.create('My Stack')
      const existingApiIds = new Set(stack.watched_apis.map((item) => item.api_id))
      for (const watched of guestStack.watched_apis) {
        if (!existingApiIds.has(watched.api_id)) {
          await stacksAPI.watch(stack.id, watched.api_id, watched.sdk_version)
        }
      }
      clearGuestStackAfterSync()
    } catch {
      // Keep the browser watchlist if syncing fails; signing in should still work.
    }
  }

  const register = async (email: string, password: string) => {
    await authAPI.register({ email, password })
    return await login(email, password)
  }

  const completeOAuth = async () => {
    const authenticatedUser = await authAPI.me()
    setAuth(authenticatedUser)
    await syncGuestStack()
    return authenticatedUser
  }

  const logout = () => {
    void authAPI.logout().catch(() => undefined)
    clearAuth()
    navigate('/dashboard/feed')
  }

  return {
    user,
    isAuthenticated,
    login,
    logout,
    register,
    completeOAuth,
  }
}
