import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
  const { user, authError, signInWithGoogle } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const from = location.state?.from?.pathname || '/timetracker'

  useEffect(() => {
    if (user) navigate(from, { replace: true })
  }, [user, navigate, from])

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: 'var(--paper)',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '320px', alignItems: 'center' }}>
        <img src="/nzyme-logo.png" alt="Nzyme" style={{ height: 36, width: 'auto' }} />

        <div style={{ textAlign: 'center' }}>
          <p style={{ fontFamily: 'DM Serif Display, serif', fontSize: '22px', color: 'var(--ink)', margin: 0 }}>
            Kibo Ventures Reporting
          </p>
          <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '6px 0 0' }}>
            Sign in with your company Google account to continue.
          </p>
        </div>

        {authError === 'domain' && (
          <p style={{ fontSize: '13px', color: 'var(--danger)', margin: 0, textAlign: 'center' }}>
            Access is restricted to authorised company email addresses.
          </p>
        )}
        {authError === 'signin' && (
          <p style={{ fontSize: '13px', color: 'var(--danger)', margin: 0, textAlign: 'center' }}>
            Sign-in failed. Please try again.
          </p>
        )}

        <button
          onClick={signInWithGoogle}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            padding: '10px 20px',
            width: '100%',
            background: 'white',
            border: '1px solid var(--rule)',
            borderRadius: '6px',
            fontSize: '14px',
            cursor: 'pointer',
            fontFamily: 'DM Sans, sans-serif',
            color: 'var(--ink)',
          }}
        >
          <GoogleIcon />
          Sign in with Google
        </button>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
    </svg>
  )
}
