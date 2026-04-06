import { useState, useRef, useEffect } from 'react'

export default function InfoTooltip({ text }) {
  const [visible, setVisible] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const iconRef = useRef(null)

  useEffect(() => {
    if (visible && iconRef.current) {
      const rect = iconRef.current.getBoundingClientRect()
      setCoords({
        top: rect.top + window.scrollY - 8,
        left: rect.left + rect.width / 2 + window.scrollX,
      })
    }
  }, [visible])

  return (
    <span
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', marginLeft: 4 }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {/* ⓘ icon */}
      <span
        ref={iconRef}
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

      {/* Tooltip bubble — fixed positioned to escape overflow containers */}
      {visible && (
        <span
          style={{
            position: 'fixed',
            top: coords.top,
            left: coords.left,
            transform: 'translate(-50%, -100%)',
            marginBottom: 6,
            width: 220,
            background: 'var(--paper)',
            border: '1px solid var(--rule)',
            borderRadius: 6,
            padding: '7px 10px',
            fontSize: '0.75rem',
            color: 'var(--ink)',
            lineHeight: 1.5,
            zIndex: 9999,
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
