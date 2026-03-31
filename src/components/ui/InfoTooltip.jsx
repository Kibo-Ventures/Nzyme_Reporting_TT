import { useState } from 'react'

export default function InfoTooltip({ text }) {
  const [visible, setVisible] = useState(false)

  return (
    <span
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', marginLeft: 4 }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {/* ⓘ icon */}
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 14,
          height: 14,
          borderRadius: '50%',
          border: '1px solid var(--rule)',
          fontSize: '0.5625rem',
          fontWeight: 700,
          color: 'var(--muted)',
          cursor: 'default',
          lineHeight: 1,
          verticalAlign: 'middle',
          flexShrink: 0,
        }}
      >
        i
      </span>

      {/* Tooltip bubble */}
      {visible && (
        <span
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: 6,
            width: 220,
            background: 'var(--paper)',
            border: '1px solid var(--rule)',
            borderRadius: 6,
            padding: '7px 10px',
            fontSize: '0.75rem',
            color: 'var(--ink)',
            lineHeight: 1.5,
            zIndex: 50,
            pointerEvents: 'none',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            fontWeight: 400,
            textTransform: 'none',
            letterSpacing: 'normal',
            whiteSpace: 'normal',
          }}
        >
          {text}
        </span>
      )}
    </span>
  )
}
