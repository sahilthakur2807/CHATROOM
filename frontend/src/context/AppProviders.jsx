import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:4000'
const tokenKey = 'blog_token'
const userKey = 'blog_user'
const themeKey = 'blog_theme'

const AuthContext = createContext(null)
const ThemeContext = createContext(null)

function readStoredUser() {
  const storedUser = localStorage.getItem(userKey)

  if (!storedUser) {
    return null
  }

  try {
    return JSON.parse(storedUser)
  } catch {
    return null
  }
}

function persistSession(token, user) {
  localStorage.setItem(tokenKey, token)
  localStorage.setItem(userKey, JSON.stringify(user))
}

function clearSessionStorage() {
  localStorage.removeItem(tokenKey)
  localStorage.removeItem(userKey)
}

function normalizeTheme(value) {
  return value === 'dark' ? 'dark' : 'light'
}

function getInitialTheme() {
  const storedTheme = localStorage.getItem(themeKey)
  if (storedTheme === 'light' || storedTheme === 'dark') {
    return storedTheme
  }

  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }

  return 'light'
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null)
  const [user, setUser] = useState(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function bootstrapSession() {
      const storedToken = localStorage.getItem(tokenKey)
      const storedUser = readStoredUser()

      if (!storedToken) {
        if (!cancelled) {
          setIsReady(true)
        }
        return
      }

      if (!cancelled) {
        setToken(storedToken)
        setUser(storedUser)
      }

      try {
        const response = await fetch(`${apiBase}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${storedToken}`,
          },
        })

        const data = await response.json().catch(() => ({}))

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            clearSessionStorage()
            if (!cancelled) {
              setToken(null)
              setUser(null)
            }
          }

          if (!cancelled) {
            setIsReady(true)
          }
          return
        }

        if (!cancelled) {
          setToken(storedToken)
          setUser(data.user || storedUser)
          persistSession(storedToken, data.user || storedUser)
          setIsReady(true)
        }
      } catch {
        if (!cancelled) {
          setIsReady(true)
        }
      }
    }

    bootstrapSession()

    return () => {
      cancelled = true
    }
  }, [])

  function signIn(session) {
    if (!session || !session.token || !session.user) {
      return
    }

    persistSession(session.token, session.user)
    setToken(session.token)
    setUser(session.user)
    setIsReady(true)
  }

  function signOut() {
    clearSessionStorage()
    setToken(null)
    setUser(null)
    setIsReady(true)
  }

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token && user),
      isReady,
      signIn,
      signOut,
    }),
    [isReady, token, user]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme)

  useEffect(() => {
    applyTheme(theme)
    localStorage.setItem(themeKey, theme)
  }, [theme])

  const value = useMemo(
    () => ({
      theme,
      isDark: theme === 'dark',
      toggleTheme: () => setTheme((current) => (current === 'dark' ? 'light' : 'dark')),
      setTheme: (nextTheme) => setTheme(normalizeTheme(nextTheme)),
    }),
    [theme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function AppProviders({ children }) {
  return (
    <ThemeProvider>
      <AuthProvider>{children}</AuthProvider>
    </ThemeProvider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}

export function useTheme() {
  const context = useContext(ThemeContext)

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }

  return context
}

export function ThemeToggleButton({ className = '' }) {
  const { isDark, toggleTheme } = useTheme()

  return (
    <button type="button" onClick={toggleTheme} className={`app-button-secondary inline-flex items-center gap-2 ${className}`}>
      <span aria-hidden="true">{isDark ? '☀' : '◐'}</span>
      <span>{isDark ? 'Light mode' : 'Dark mode'}</span>
    </button>
  )
}