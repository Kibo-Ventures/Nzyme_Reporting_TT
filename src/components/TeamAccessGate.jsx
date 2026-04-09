import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function TeamAccessGate({ children }) {
  const { user } = useAuth()
  const [allowed, setAllowed] = useState(undefined) // undefined = loading

  useEffect(() => {
    if (!user) return
    supabase
      .from('team_access')
      .select('id')
      .eq('email', user.email)
      .maybeSingle()
      .then(({ data }) => setAllowed(!!data))
  }, [user])

  if (allowed === undefined) return null

  if (!allowed) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        background: 'var(--paper)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', color: 'var(--ink)', margin: 0 }}>
            Staffing Report
          </p>
          <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '8px 0 0' }}>
            Your account does not have access to this page.
          </p>
        </div>
      </div>
    )
  }

  return children
}
