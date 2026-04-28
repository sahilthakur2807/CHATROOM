import React, { useEffect, useState } from 'react'

export default function App() {
  const [ping, setPing] = useState(null)

  useEffect(() => {
    const api = import.meta.env.VITE_API_URL || 'http://localhost:4000'
    fetch(`${api}/api/ping`)
      .then((r) => r.json())
      .then(setPing)
      .catch((e) => setPing({ ok: false, error: e.message }))
  }, [])

  return (
    <div style={{ padding: 20 }}>
      <h1>Blog Frontend</h1>
      <p>Minimal Vite + React scaffold for Module 1.</p>
      <pre>{JSON.stringify(ping, null, 2)}</pre>
    </div>
  )
}
