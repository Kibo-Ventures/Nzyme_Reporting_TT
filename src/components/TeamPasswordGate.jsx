import { useState } from 'react'

const SESSION_KEY = 'team_unlocked'
const CORRECT    = import.meta.env.VITE_TEAM_PASSWORD

export default function TeamPasswordGate({ children }) {
  const [unlocked, setUnlocked] = useState(
    () => sessionStorage.getItem(SESSION_KEY) === '1'
  )
  const [input, setInput] = useState('')
  const [error, setError] = useState(false)

  if (unlocked) return children

  function handleSubmit(e) {
    e.preventDefault()
    if (CORRECT && input === CORRECT) {
      sessionStorage.setItem(SESSION_KEY, '1')
      setUnlocked(true)
    } else {
      setError(true)
      setInput('')
    }
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      background: 'var(--paper)',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '300px' }}>
        <div>
          <p style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', color: 'var(--ink)', margin: 0 }}>
            Staffing Report
          </p>
          <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '4px 0 0' }}>
            This page is restricted. Enter the access password to continue.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input
            type="password"
            value={input}
            onChange={e => { setInput(e.target.value); setError(false) }}
            placeholder="Password"
            autoFocus
            style={{
              padding: '8px 12px',
              border: `1px solid ${error ? 'var(--danger)' : 'var(--rule)'}`,
              borderRadius: '4px',
              fontSize: '14px',
              background: 'white',
              color: 'var(--ink)',
              outline: 'none',
              fontFamily: 'DM Sans, sans-serif',
            }}
          />
          {error && (
            <p style={{ fontSize: '12px', color: 'var(--danger)', margin: 0 }}>
              Incorrect password.
            </p>
          )}
          <button
            type="submit"
            style={{
              padding: '8px 12px',
              background: 'var(--accent)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '14px',
              cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            Unlock
          </button>
        </form>
      </div>
    </div>
  )
}
