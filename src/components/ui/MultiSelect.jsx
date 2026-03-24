import { useEffect, useRef, useState } from 'react'

export default function MultiSelect({ options = [], value = [], onChange, placeholder = 'All' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function toggle(opt) {
    if (value.includes(opt)) {
      onChange(value.filter(v => v !== opt))
    } else {
      onChange([...value, opt])
    }
  }

  const label = value.length === 0 ? `All ${placeholder}s` : `${placeholder} (${value.length})`

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.375rem',
          padding: '0.375rem 0.75rem',
          fontSize: '0.8125rem',
          fontFamily: 'var(--font-sans)',
          color: value.length > 0 ? 'var(--accent)' : 'var(--ink)',
          background: value.length > 0 ? 'var(--accent-light)' : 'white',
          border: '1px solid var(--rule)',
          borderRadius: '8px',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ flexShrink: 0, opacity: 0.5 }}>
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            zIndex: 50,
            background: 'white',
            border: '1px solid var(--rule)',
            borderRadius: '12px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
            minWidth: '180px',
            maxHeight: '240px',
            overflowY: 'auto',
            padding: '0.25rem',
          }}
        >
          {options.length === 0 && (
            <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.8125rem', color: 'var(--muted)' }}>
              No options
            </div>
          )}
          {options.map(opt => (
            <label
              key={opt}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.375rem 0.75rem',
                fontSize: '0.8125rem',
                cursor: 'pointer',
                borderRadius: '6px',
                background: value.includes(opt) ? 'var(--accent-light)' : 'transparent',
                color: value.includes(opt) ? 'var(--accent)' : 'var(--ink)',
              }}
            >
              <input
                type="checkbox"
                checked={value.includes(opt)}
                onChange={() => toggle(opt)}
                style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
              />
              {opt}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
