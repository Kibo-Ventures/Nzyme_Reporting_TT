import { useState, useEffect, useRef, useCallback } from 'react'
import { useAiChat } from '../../hooks/useAiChat'

// Suggested prompts shown on the empty state — PE-relevant, concise.
const SUGGESTED = [
  'How many quality leads did we source in the last 12 months?',
  'Which deal captain has the most active deals right now?',
  'What is our conversion rate from Being Explored to DD Phase?',
  'Show the top 5 deals by total hours invested',
  'How many proprietary deals sourced YTD vs our 36-deal annual target?',
  'Which adviser channel has the highest quality lead rate?',
]

export function AiChatPanel() {
  const [open, setOpen]     = useState(false)
  const [input, setInput]   = useState('')
  const { messages, isLoading, error, sendMessage, clearMessages } = useAiChat()

  const bottomRef   = useRef(null)
  const inputRef    = useRef(null)
  const textareaRef = useRef(null)

  // Auto-scroll whenever messages change or loading indicator appears
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // Focus the input whenever the panel is opened
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 80)
      return () => clearTimeout(t)
    }
  }, [open])

  // Auto-resize textarea (max 3 lines ≈ 80px)
  const resizeTextarea = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 80) + 'px'
  }

  const handleSend = useCallback(() => {
    const text = input.trim()
    if (!text || isLoading) return
    sendMessage(text)
    setInput('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [input, isLoading, sendMessage])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleSuggest = (text) => {
    if (isLoading) return
    sendMessage(text)
  }

  const canSend = input.trim().length > 0 && !isLoading

  return (
    <>
      {/* ── Toggle button ───────────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen(v => !v)}
        aria-label={open ? 'Close Nzyme Brain' : 'Open Nzyme Brain — AI assistant'}
        title={open ? 'Close' : 'Nzyme Brain'}
        style={{
          position:        'fixed',
          bottom:          24,
          right:           24,
          width:           46,
          height:          46,
          borderRadius:    '50%',
          background:      open ? 'var(--ink)' : 'var(--accent)',
          color:           '#fff',
          border:          'none',
          cursor:          'pointer',
          fontSize:        open ? 22 : 17,
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'center',
          boxShadow:       '0 4px 14px rgba(0,0,0,0.20)',
          zIndex:          1000,
          transition:      'background 0.15s, transform 0.15s',
          fontFamily:      'var(--font-sans)',
          flexShrink:      0,
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.06)' }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
      >
        {open ? '×' : '✦'}
      </button>

      {/* ── Panel ───────────────────────────────────────────────────────────── */}
      {open && (
        <div
          style={{
            position:        'fixed',
            bottom:          80,
            right:           24,
            width:           420,
            maxHeight:       'calc(100vh - 116px)',
            display:         'flex',
            flexDirection:   'column',
            background:      'var(--paper)',
            border:          '1px solid var(--rule)',
            borderRadius:    14,
            boxShadow:       '0 10px 48px rgba(0,0,0,0.13)',
            zIndex:          999,
            overflow:        'hidden',
            fontFamily:      'var(--font-sans)',
          }}
        >

          {/* ── Header ────────────────────────────────────────────────────── */}
          <div style={{
            padding:         '12px 16px 11px',
            borderBottom:    '1px solid var(--rule)',
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'space-between',
            flexShrink:      0,
            background:      'var(--surface)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.01em' }}>
                Nzyme Brain
              </span>
              <span style={{
                fontSize:       10,
                fontWeight:     600,
                background:     'var(--accent-light)',
                color:          'var(--accent)',
                padding:        '2px 7px',
                borderRadius:   10,
                letterSpacing:  '0.04em',
                textTransform:  'uppercase',
              }}>
                AI
              </span>
            </div>

            {messages.length > 0 && (
              <button
                onClick={clearMessages}
                style={{
                  fontSize:    12,
                  color:       'var(--muted)',
                  background:  'none',
                  border:      'none',
                  cursor:      'pointer',
                  padding:     '3px 6px',
                  borderRadius: 6,
                  fontFamily:  'var(--font-sans)',
                  transition:  'color 0.1s',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--ink)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)' }}
              >
                Clear
              </button>
            )}
          </div>

          {/* ── Messages ──────────────────────────────────────────────────── */}
          <div style={{
            flex:         1,
            overflowY:    'auto',
            padding:      '14px 14px 10px',
            display:      'flex',
            flexDirection:'column',
            gap:          10,
            minHeight:    160,
          }}>

            {/* Empty state — suggested prompts */}
            {messages.length === 0 && !isLoading && (
              <div>
                <p style={{
                  fontSize:    13,
                  color:       'var(--muted)',
                  margin:      '2px 0 13px',
                  lineHeight:  1.5,
                }}>
                  Ask anything about deals, pipeline, team, or advisers. I'll query the live database.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {SUGGESTED.map(s => (
                    <button
                      key={s}
                      onClick={() => handleSuggest(s)}
                      disabled={isLoading}
                      style={{
                        textAlign:     'left',
                        padding:       '8px 12px',
                        fontSize:      12.5,
                        color:         'var(--ink)',
                        background:    'var(--surface)',
                        border:        '1px solid var(--rule)',
                        borderRadius:  8,
                        cursor:        'pointer',
                        fontFamily:    'var(--font-sans)',
                        lineHeight:    1.4,
                        transition:    'border-color 0.1s, background 0.1s',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = 'var(--accent)'
                        e.currentTarget.style.background  = 'var(--accent-light)'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = 'var(--rule)'
                        e.currentTarget.style.background  = 'var(--surface)'
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Message history */}
            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  display:        'flex',
                  justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <div style={{
                  maxWidth:     '84%',
                  padding:      '9px 13px',
                  borderRadius: m.role === 'user'
                    ? '13px 13px 3px 13px'
                    : '13px 13px 13px 3px',
                  background:   m.role === 'user' ? 'var(--accent)' : 'var(--surface)',
                  color:        m.role === 'user' ? '#fff' : 'var(--ink)',
                  border:       m.role === 'user' ? 'none' : '1px solid var(--rule)',
                  fontSize:     13,
                  lineHeight:   1.6,
                  whiteSpace:   'pre-wrap',   // preserves paragraph breaks in AI answers
                  wordBreak:    'break-word',
                }}>
                  {m.content}
                </div>
              </div>
            ))}

            {/* Loading — animated dots */}
            {isLoading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{
                  padding:      '11px 15px',
                  borderRadius: '13px 13px 13px 3px',
                  background:   'var(--surface)',
                  border:       '1px solid var(--rule)',
                  display:      'flex',
                  gap:          5,
                  alignItems:   'center',
                }}>
                  {[0, 1, 2].map(i => (
                    <span
                      key={i}
                      className="ai-dot"
                      style={{ animationDelay: `${i * 0.2}s` }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Error banner */}
            {error && (
              <div style={{
                fontSize:     12,
                color:        'var(--danger)',
                background:   '#fef2f2',
                border:       '1px solid #fecaca',
                borderRadius: 8,
                padding:      '7px 11px',
                lineHeight:   1.4,
              }}>
                {error}
              </div>
            )}

            {/* Anchor for auto-scroll */}
            <div ref={bottomRef} />
          </div>

          {/* ── Input ─────────────────────────────────────────────────────── */}
          <div style={{
            padding:       '10px 12px',
            borderTop:     '1px solid var(--rule)',
            display:       'flex',
            gap:           8,
            alignItems:    'flex-end',
            flexShrink:    0,
            background:    'var(--surface)',
          }}>
            <textarea
              ref={(el) => { textareaRef.current = el; inputRef.current = el }}
              value={input}
              onChange={e => { setInput(e.target.value); resizeTextarea() }}
              onKeyDown={handleKeyDown}
              placeholder="Ask about deals, pipeline, advisers…"
              rows={1}
              style={{
                flex:        1,
                resize:      'none',
                border:      '1px solid var(--rule)',
                borderRadius: 8,
                padding:     '8px 10px',
                fontSize:    13,
                fontFamily:  'var(--font-sans)',
                color:       'var(--ink)',
                background:  'var(--paper)',
                lineHeight:  1.45,
                maxHeight:   80,
                overflowY:   'auto',
              }}
            />

            <button
              onClick={handleSend}
              disabled={!canSend}
              aria-label="Send"
              style={{
                width:        34,
                height:       34,
                borderRadius: 8,
                background:   canSend ? 'var(--accent)' : 'var(--rule)',
                color:        canSend ? '#fff' : 'var(--muted)',
                border:       'none',
                cursor:       canSend ? 'pointer' : 'default',
                fontSize:     17,
                display:      'flex',
                alignItems:   'center',
                justifyContent: 'center',
                transition:   'background 0.15s, color 0.15s',
                flexShrink:   0,
                fontFamily:   'var(--font-sans)',
              }}
            >
              ↑
            </button>
          </div>

        </div>
      )}
    </>
  )
}
