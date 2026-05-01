import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ThemeToggleButton, useAuth } from '../context/AppProviders'

const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:4000'

export default function LoginPage() {
  const navigate = useNavigate()
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch(`${apiBase}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Login failed')
      }

      signIn({ token: data.token, user: data.user })
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-shell min-h-screen flex items-center justify-center px-4 py-8">
      <div className="absolute top-4 right-4">
        <ThemeToggleButton />
      </div>
      <div className="app-panel w-full max-w-md rounded-[28px] p-8">
        <div className="text-center mb-8">
          <p className="app-muted text-xs font-semibold uppercase tracking-[0.32em] mb-3">ChatRoom</p>
          <h1 className="text-3xl font-bold app-heading mb-2">Welcome back</h1>
          <p className="app-muted text-sm">Sign in to continue to your dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mb-6">
          <div>
            <label htmlFor="email" className="block text-sm font-semibold app-heading mb-2">Email</label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="app-input"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-semibold app-heading mb-2">Password</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="app-input"
              required
            />
          </div>

          {error && <div className="app-error text-sm rounded-xl px-4 py-3">{error}</div>}

          <button type="submit" className="app-button-primary w-full py-3 mt-2 font-semibold rounded-xl disabled:opacity-60" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="text-center text-sm app-muted border-t border-[var(--app-border)] pt-6">
          <p>
            Don't have an account?{' '}
            <button
              type="button"
              className="font-semibold text-[var(--app-primary)] hover:opacity-80"
              onClick={() => navigate('/signup')}
            >
              Sign up
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
