import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from './store/authStore'

import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import OAuthCallback from './pages/OAuthCallback'
import Forecast from './pages/Forecast'
import Dashboard from './pages/Dashboard'
import Feed from './pages/Feed'
import MyStack from './pages/MyStack'
import BrowseAPIs from './pages/BrowseAPIs'
import APIDetail from './pages/APIDetail'
import Settings from './pages/Settings'
import Toast from './components/ui/Toast'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

export default function App() {
  const initAuth = useAuthStore((state) => state.initAuth)

  useEffect(() => {
    initAuth()
  }, [initAuth])

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Toast />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/auth/callback" element={<OAuthCallback />} />

          {/* Dashboard Routes (Open to all, optional sign-in) */}
          <Route path="/dashboard" element={<Dashboard />}>
            <Route index element={<Navigate to="/dashboard/feed" replace />} />
            <Route path="feed" element={<Feed />} />
            <Route path="forecast" element={<Forecast />} />
            <Route path="stack" element={<MyStack />} />
            <Route path="apis" element={<BrowseAPIs />} />
            <Route path="apis/:slug" element={<APIDetail />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
