import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function AuthCallback() {
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user === undefined) return // still loading
    if (user) navigate('/timetracker', { replace: true })
    else navigate('/login', { replace: true })
  }, [user, navigate])

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: 'var(--paper)',
    }}>
      <p style={{ fontFamily: 'DM Sans, sans-serif', color: 'var(--muted)', fontSize: '14px' }}>
        Signing you in…
      </p>
    </div>
  )
}
