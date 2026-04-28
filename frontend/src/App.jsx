import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import DashboardPage from './pages/DashboardPage'

function PrivateRoute({ element }) {
  const token = localStorage.getItem('blog_token')
  return token ? element : <Navigate to="/login" replace />
}

function PublicRoute({ element }) {
  const token = localStorage.getItem('blog_token')
  return token ? <Navigate to="/dashboard" replace /> : element
}

function App() {
  const token = localStorage.getItem('blog_token')

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<PublicRoute element={<LoginPage />} />} />
        <Route path="/signup" element={<PublicRoute element={<SignupPage />} />} />
        <Route path="/dashboard" element={<PrivateRoute element={<DashboardPage />} />} />
        <Route path="/" element={<Navigate to={token ? '/dashboard' : '/login'} replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

