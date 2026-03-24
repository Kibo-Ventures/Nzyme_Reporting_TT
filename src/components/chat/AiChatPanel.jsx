import { useState, useRef, useEffect, useCallback } from 'react';
import { useAiChat } from '../../hooks/useAiChat';

const SUGGESTED = [
  'How many active deals are in DD phase?',
  'What is the current status of [deal name]?',
  'Which channel has the best quality lead rate?',
  'What is Alex working on?',
  "Which Tier 1 advisers haven't sent us a deal recently?",
];

export function AiChatPanel() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const { messages, isLoading, error, sendMessage, clearMessages } = useAiChat();
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto-scroll on new messages or loading state change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Focus textarea when panel opens
  useEffect(() => {
    if (open) textareaRef.current?.focus();
  }, [open]);

  const submit = useCallback(() => {
    const text = draft.trim();
    if (!text || isLoading) return;
    setDraft('');
    sendMessage(text);
  }, [draft, isLoading, sendMessage]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

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
            maxHeight: '70vh',
            background: 'var(--paper)',
            border: '1px solid var(--rule)',
            borderRadius: 12,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 999,
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div style={{
            padding: '14px 16px 12px',
            borderBottom: '1px solid var(--rule)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', fontFamily: 'var(--font-sans)' }}>
                Nzyme Assistant
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2, fontFamily: 'var(--font-sans)' }}>
                Ask questions about your pipeline data
              </div>
            </div>
            {messages.length > 0 && (
              <button
                onClick={clearMessages}
                style={{
                  fontSize: 12,
                  color: 'var(--muted)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '2px 4px',
                  fontFamily: 'var(--font-sans)',
                  flexShrink: 0,
                  marginTop: 2,
                }}
              >
                Clear
              </button>
            )}
          </div>

          {/* Message list */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}>
            {messages.length === 0 ? (
              /* Empty state — suggested questions */
              <div>
                <div style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginBottom: 8,
                  fontFamily: 'var(--font-sans)',
                }}>
                  Suggested questions
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {SUGGESTED.map(q => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      disabled={isLoading}
                      style={{
                        textAlign: 'left',
                        background: 'var(--surface)',
                        border: '1px solid var(--rule)',
                        borderRadius: 8,
                        padding: '8px 12px',
                        fontSize: 13,
                        color: 'var(--ink)',
                        fontFamily: 'var(--font-sans)',
                        cursor: 'pointer',
                        lineHeight: 1.4,
                        transition: 'background 0.12s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-light)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'var(--surface)'}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Conversation */
              <>
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <div style={{
                      maxWidth: '82%',
                      padding: '9px 13px',
                      borderRadius: msg.role === 'user'
                        ? '12px 12px 4px 12px'
                        : '12px 12px 12px 4px',
                      background: msg.role === 'user' ? 'var(--accent)' : 'var(--accent-light)',
                      color: msg.role === 'user' ? '#fff' : 'var(--ink)',
                      fontSize: 13,
                      fontFamily: 'var(--font-sans)',
                      lineHeight: 1.55,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}>
                      {msg.content}
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div style={{
                    fontSize: 12,
                    color: 'var(--muted)',
                    fontFamily: 'var(--font-sans)',
                    paddingLeft: 4,
                  }}>
                    Thinking…
                  </div>
                )}

                {error && (
                  <div style={{
                    fontSize: 12,
                    color: 'var(--danger)',
                    fontFamily: 'var(--font-sans)',
                    paddingLeft: 4,
                  }}>
                    {error}
                  </div>
                )}
              </>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          <div style={{
            borderTop: '1px solid var(--rule)',
            padding: '10px 12px',
            display: 'flex',
            gap: 8,
            alignItems: 'flex-end',
            flexShrink: 0,
            background: 'var(--surface)',
          }}>
            <textarea
              ref={textareaRef}
              rows={2}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything…"
              disabled={isLoading}
              style={{
                flex: 1,
                resize: 'none',
                border: '1px solid var(--rule)',
                borderRadius: 8,
                padding: '8px 10px',
                fontSize: 13,
                fontFamily: 'var(--font-sans)',
                color: 'var(--ink)',
                background: isLoading ? 'var(--paper)' : 'var(--surface)',
                lineHeight: 1.5,
                outline: 'none',
              }}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--rule)'}
            />
            <button
              onClick={submit}
              disabled={isLoading || !draft.trim()}
              aria-label="Send"
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: 'var(--accent)',
                color: '#fff',
                border: 'none',
                cursor: isLoading || !draft.trim() ? 'default' : 'pointer',
                fontSize: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: isLoading || !draft.trim() ? 0.45 : 1,
                transition: 'opacity 0.15s',
                flexShrink: 0,
                marginBottom: 2,
              }}
            >
              ↑
            </button>
          </div>
        </div>
      )}
    </>
  );
}
