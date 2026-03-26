import { useState } from 'react'
import { supabase } from '../../lib/supabase'

const INTENSITY_OPTIONS = [
  { value: 'light',   label: 'Light',   hint: '~40 hrs' },
  { value: 'normal',  label: 'Normal',  hint: '~55 hrs' },
  { value: 'intense', label: 'Intense', hint: '~70 hrs' },
]

export default function IntensityModal({ formData, weekStart, selectedUser, onSuccess, onClose }) {
  const [intensity, setIntensity] = useState('normal')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  async function handleConfirm() {
    setSubmitting(true)
    setError(null)
    try {
      const rows = formData.map(row => ({ ...row, intensity }))
      const { error: sbErr } = await supabase
        .from('ReportingNz_time_entries')
        .upsert(rows, { onConflict: 'user_name,week_start,category_key' })
      if (sbErr) throw sbErr
      onSuccess()
    } catch (e) {
      setError(e.message || 'Failed to submit. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: 'var(--paper)',
          border: '1px solid var(--rule)',
          borderRadius: 12,
          padding: 32,
          maxWidth: 420,
          width: '100%',
          margin: '0 16px',
        }}
      >
        <h2
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '1.75rem',
            fontWeight: 400,
            marginBottom: 8,
            color: 'var(--ink)',
          }}
        >
          How intense was this week?
        </h2>
        <p
          style={{
            fontFamily: 'var(--font-sans)',
            color: 'var(--muted)',
            fontSize: '0.9375rem',
            marginBottom: 24,
          }}
        >
          This determines your estimated hours for the week.
        </p>

        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          {INTENSITY_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setIntensity(opt.value)}
              style={{
                flex: 1,
                padding: '14px 8px',
                border: `1px solid ${intensity === opt.value ? 'var(--accent)' : 'var(--rule)'}`,
                borderRadius: 8,
                background: intensity === opt.value ? 'var(--accent-light)' : 'white',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'border-color 0.15s, background 0.15s',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontWeight: 600,
                  fontSize: '0.9375rem',
                  color: 'var(--ink)',
                  marginBottom: 4,
                }}
              >
                {opt.label}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.8125rem',
                  color: 'var(--muted)',
                }}
              >
                {opt.hint}
              </div>
            </button>
          ))}
        </div>

        {error && (
          <p style={{ color: 'var(--danger)', fontSize: '0.8125rem', marginBottom: 12 }}>
            {error}
          </p>
        )}

        <button
          onClick={handleConfirm}
          disabled={submitting}
          style={{
            width: '100%',
            padding: '0.625rem',
            fontFamily: 'var(--font-sans)',
            fontWeight: 600,
            fontSize: '0.9375rem',
            background: submitting ? 'var(--rule)' : 'var(--accent)',
            color: submitting ? 'var(--muted)' : 'white',
            border: 'none',
            borderRadius: 8,
            cursor: submitting ? 'not-allowed' : 'pointer',
            transition: 'background 0.15s',
          }}
        >
          {submitting ? 'Submitting…' : 'Confirm'}
        </button>
      </div>
    </div>
  )
}
