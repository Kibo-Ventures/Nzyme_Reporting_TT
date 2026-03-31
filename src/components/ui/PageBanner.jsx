import { useState } from 'react'

export default function PageBanner({ summary, body, caveat, style }) {
  const [open, setOpen] = useState(false)

  return (
    <div
      style={{
        border: '1px solid var(--rule)',
        borderRadius: 10,
        background: 'var(--paper)',
        overflow: 'hidden',
        ...style,
      }}
    >
      {/* Collapsed header row */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '9px 14px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        {/* ⓘ circle icon */}
        <span
          style={{
            flexShrink: 0,
            width: 17,
            height: 17,
            borderRadius: '50%',
            border: '1.5px solid var(--muted)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.625rem',
            fontWeight: 700,
            color: 'var(--muted)',
            lineHeight: 1,
            userSelect: 'none',
          }}
        >
          i
        </span>

        {/* Summary text */}
        <span
          style={{
            flex: 1,
            fontSize: '0.8125rem',
            color: 'var(--muted)',
            lineHeight: 1.4,
          }}
        >
          {summary}
        </span>

        {/* Chevron */}
        <span
          style={{
            flexShrink: 0,
            fontSize: '0.5625rem',
            color: 'var(--muted)',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.18s ease',
            userSelect: 'none',
          }}
        >
          ▼
        </span>
      </button>

      {/* Expanded body */}
      {open && (
        <div
          style={{
            padding: '0 14px 14px 39px',
            borderTop: '1px solid var(--rule)',
          }}
        >
          <p
            style={{
              fontSize: '0.8125rem',
              color: 'var(--muted)',
              lineHeight: 1.65,
              marginTop: 10,
              marginBottom: caveat ? 12 : 0,
            }}
          >
            {body}
          </p>

          {caveat && (
            <div
              style={{
                borderLeft: '3px solid var(--accent)',
                background: 'var(--accent-light)',
                borderRadius: '0 6px 6px 0',
                padding: '7px 12px',
                fontSize: '0.75rem',
                color: 'var(--muted)',
                lineHeight: 1.5,
              }}
            >
              {caveat}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
