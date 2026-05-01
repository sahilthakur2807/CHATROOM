import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import DashboardPage from './pages/DashboardPage'
import { AppProviders, useAuth } from './context/AppProviders'

function AppLoading() {
  return <div className="app-shell flex items-center justify-center min-h-screen text-sm text-[var(--app-text-muted)]">Loading...</div>
}

function AppRoutes() {
  const { isAuthenticated, isReady } = useAuth()

  if (!isReady) {
    return <AppLoading />
  }

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/signup" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <SignupPage />} />
      <Route path="/dashboard" element={isAuthenticated ? <DashboardPage /> : <Navigate to="/login" replace />} />
      <Route path="/" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />} />
      <Route path="*" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />} />
    </Routes>
  )
}

function App() {
  return (
    <AppProviders>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppProviders>
  )
}

export default App