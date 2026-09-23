import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { authAPI } from '../lib/api'

export function useAuth() {
  const navigate = useNavigate()
  const { user, isAuthenticated, setAuth, clearAuth } = useAuthStore()

  const login = async (email: string, password: string) => {
    const res = await authAPI.login({ email, password })
    setAuth(res.user, res.token)
    return res.user
  }

  const register = async (email: string, password: string) => {
    await authAPI.register({ email, password })
    return await login(email, password)
  }

  const logout = () => {
    clearAuth()
    navigate('/login')
  }

  return {
    user,
    isAuthenticated,
    login,
    logout,
    register,
  }
}
