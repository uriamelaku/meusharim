import { useEffect, useState } from 'react'

type HealthState = 'loading' | 'ok' | 'error'

const statusText: Record<HealthState, string> = {
  loading: 'בודק חיבור לשרת…',
  ok: 'השרת ומסד הנתונים פעילים',
  error: 'אין חיבור לשרת או למסד הנתונים',
}

function App() {
  const [health, setHealth] = useState<HealthState>('loading')

  useEffect(() => {
    fetch('/api/health')
      .then((response) => setHealth(response.ok ? 'ok' : 'error'))
      .catch(() => setHealth('error'))
  }, [])

  return (
    <main style={{ padding: 24 }}>
      <h1>מאושרים</h1>
      <p role="status">{statusText[health]}</p>
    </main>
  )
}

export default App
