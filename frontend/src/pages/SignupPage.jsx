import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ThemeToggleButton, useAuth } from '../context/AppProviders'

const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:4000'

export default function SignupPage() {
  const navigate = useNavigate()
  const { signIn } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`${apiBase}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Signup failed')
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
          <h1 className="text-3xl font-bold app-heading mb-2">Get started</h1>
          <p className="app-muted text-sm">Create your account and join the conversation</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mb-6">
          <div>
            <label htmlFor="name" className="block text-sm font-semibold app-heading mb-2">Full name</label>
            <input
              id="name"
              type="text"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="app-input"
              required
            />
          </div>

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

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-semibold app-heading mb-2">Confirm password</label>
            <input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="app-input"
              required
            />
          </div>

          {error && <div className="app-error text-sm rounded-xl px-4 py-3">{error}</div>}

          <button type="submit" className="app-button-primary w-full py-3 mt-2 font-semibold rounded-xl disabled:opacity-60" disabled={loading}>
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <div className="text-center text-sm app-muted border-t border-[var(--app-border)] pt-6">
          <p>
            Already have an account?{' '}
            <button
              type="button"
              className="font-semibold text-[var(--app-primary)] hover:opacity-80"
              onClick={() => navigate('/login')}
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
