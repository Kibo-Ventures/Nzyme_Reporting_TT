import { useState } from 'react';

export function AiChatPanel() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setOpen(v => !v)}
        aria-label={open ? 'Close assistant' : 'Open assistant'}
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: 'var(--accent)',
          color: '#fff',
          border: 'none',
          cursor: 'pointer',
          fontSize: open ? 20 : 18,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
          zIndex: 1000,
          transition: 'background 0.15s',
          fontFamily: 'var(--font-sans)',
        }}
      >
        {open ? '×' : '✦'}
      </button>

      {/* Panel */}
      {open && (
        <div
          style={{
            position: 'fixed',
            bottom: 84,
            right: 24,
            width: 400,
            background: 'var(--paper)',
            border: '1px solid var(--rule)',
            borderRadius: 12,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            zIndex: 999,
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div style={{
            padding: '14px 16px 12px',
            borderBottom: '1px solid var(--rule)',
          }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', fontFamily: 'var(--font-sans)' }}>
              Nzyme Assistant
            </div>
          </div>

          {/* WIP message */}
          <div style={{
            padding: '24px 16px',
            fontFamily: 'var(--font-sans)',
            fontSize: 14,
            color: 'var(--muted)',
            textAlign: 'center',
          }}>
            The reporting AI is WIP
          </div>
        </div>
      )}
    </>
  );
}
