import { useEffect, useState } from 'react'
import { useTrackerData, useUserEntriesMerged, useInternalCategories, getMondayISO, addDays } from '../../hooks/useTimeEntries'
import LoadingSpinner from '../ui/LoadingSpinner'
import IntensityModal from './IntensityModal'


const TAG = {
  deal:     { background: '#f0ebe0', color: '#5a4a30' },
  longtail: { background: 'var(--longtail-bg)', color: 'var(--longtail-fg)' },
  orig:     { background: 'var(--orig-bg)',      color: 'var(--orig-fg)'      },
  portco:   { background: 'var(--portco-bg)',    color: 'var(--portco-fg)'    },
  internal: { background: 'var(--accent-light)', color: 'var(--accent)'       },
}

const inputStyle = {
  width: 76,
  padding: '4px 8px',
  textAlign: 'right',
  fontFamily: 'var(--font-mono)',
  fontSize: '0.875rem',
  border: '1px solid var(--rule)',
  borderRadius: 8,
  background: 'white',
  color: 'var(--ink)',
  outline: 'none',
}

function Tag({ label, type }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 9999,
        fontSize: '0.8rem',
        fontWeight: 500,
        ...TAG[type],
      }}
    >
      {label}
    </span>
  )
}

function EntryRow({ label, type, categoryKey, entries, onChange }) {
  const val = entries[categoryKey] || {}
  const pct = val.pct ?? ''
  const pctActual = val.pct_actual ?? ''

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '5px 0',
        borderBottom: '1px solid var(--rule)',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <Tag label={label} type={type} />
      </div>
      <input
        type="number"
        value={pct}
        onChange={e => onChange(categoryKey, 'pct', e.target.value)}
        placeholder="0"
        min="0"
        max="100"
        step="5"
        style={inputStyle}
      />
      <input
        type="number"
        value={pctActual}
        onChange={e => onChange(categoryKey, 'pct_actual', e.target.value)}
        placeholder="0"
        min="0"
        max="100"
        step="5"
        style={inputStyle}
      />
    </div>
  )
}

function InfoTooltip({ text }) {
  const [visible, setVisible] = useState(false)
  return (
    <span
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', marginLeft: 6 }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 13,
          height: 13,
          borderRadius: '50%',
          border: '1.5px solid var(--muted)',
          color: 'var(--muted)',
          fontSize: '0.6rem',
          fontWeight: 700,
          lineHeight: 1,
          cursor: 'default',
          userSelect: 'none',
          verticalAlign: 'middle',
          fontStyle: 'italic',
          fontFamily: 'serif',
        }}
      >
        i
      </span>
      {visible && (
        <span
          style={{
            position: 'absolute',
            left: 18,
            top: '50%',
            transform: 'translateY(-50%)',
            background: '#2a2a2a',
            color: '#f5f5f5',
            fontSize: '0.75rem',
            fontWeight: 400,
            lineHeight: 1.45,
            padding: '7px 10px',
            borderRadius: 6,
            whiteSpace: 'normal',
            width: 240,
            zIndex: 100,
            boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
            textTransform: 'none',
            letterSpacing: 0,
            pointerEvents: 'none',
          }}
        >
          {text}
        </span>
      )}
    </span>
  )
}

function SectionHeader({ label, count, collapsible, open, onToggle, tooltip }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '10px 0 4px',
        borderTop: '2px solid var(--rule)',
        marginTop: 8,
      }}
    >
      <span
        style={{
          flex: 1,
          fontSize: '0.75rem',
          fontWeight: 700,
          color: 'var(--muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}
      >
        {label}
        {count != null && (
          <span style={{ fontWeight: 400, marginLeft: 6 }}>({count})</span>
        )}
        {tooltip && <InfoTooltip text={tooltip} />}
      </span>
      {collapsible && (
        <button
          onClick={onToggle}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--muted)',
            fontSize: '0.75rem',
            padding: '0 4px',
          }}
        >
          {open ? '▲ collapse' : '▼ expand'}
        </button>
      )}
    </div>
  )
}

const WEEK_OFFSET_MIN = -8  // how far back users can go (8 weeks)
const WEEK_OFFSET_MAX = 1   // how far forward (1 week, for planning ahead)

export default function WeeklyForm({ userEmail, onSubmitted }) {
  const [weekOffset, setWeekOffset] = useState(() => new Date().getDay() === 1 ? -1 : 0)
  const weekStart     = getMondayISO(weekOffset)
  const weekStartNext = addDays(weekStart, 7)

  const { isLoading, error: dataError, dealflow, longtail, portfolio, origChannels, teamMembers } = useTrackerData()
  const { data: internalCategories = [], isLoading: internalLoading } = useInternalCategories()

  // Resolve the logged-in user's team member name from their email
  const selectedUser = teamMembers.find(
    m => m.email?.toLowerCase() === userEmail?.toLowerCase()
  )?.name ?? ''

  const userEntriesQ = useUserEntriesMerged(selectedUser, weekStart)

  const [entries, setEntries] = useState({})
  const [showLongtail, setShowLongtail] = useState(false)
  const [showOrig, setShowOrig] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [pendingRows, setPendingRows] = useState(null)
  const [showIntensityModal, setShowIntensityModal] = useState(false)

  // Reset entries when week changes
  const prevWeek = useRef(weekStart)
  useEffect(() => {
    if (prevWeek.current !== weekStart) {
      setEntries({})
      prevWeek.current = weekStart
    }
  }, [weekStart])

  // Populate entries from existing DB data (merged from two week_starts)
  useEffect(() => {
    if (!userEntriesQ.isSuccess || !userEntriesQ.data) return
    const filled = {}
    for (const [key, val] of Object.entries(userEntriesQ.data)) {
      const p = Number(val.pct_expected) || 0
      const a = Number(val.pct_actual)   || 0
      if (p > 0 || a > 0) {
        filled[key] = {
          pct: p > 0 ? String(p) : '',
          pct_actual: a > 0 ? String(a) : '',
        }
      }
    }
    setEntries(filled)
  }, [userEntriesQ.data, userEntriesQ.isSuccess])

  function handleChange(categoryKey, field, value) {
    setEntries(prev => ({
      ...prev,
      [categoryKey]: { ...prev[categoryKey], [field]: value },
    }))
  }

  // Computed totals
  const allVals = Object.values(entries)
  const totalPctExpected = allVals.reduce((s, e) => s + (parseFloat(e.pct) || 0), 0)
  const totalPctActual = allVals.reduce((s, e) => s + (parseFloat(e.pct_actual) || 0), 0)
  const overPct = totalPctActual > 100

  function handleSubmitClick() {
    if (!selectedUser) return
    setSubmitError(null)

    const actualRows   = []  // pct_actual → week_start = weekStart
    const expectedRows = []  // pct_expected → week_start = weekStartNext

    function addRows(items, type) {
      for (const item of items) {
        const key     = typeof item === 'string' ? item : item.name
        const e       = entries[key] || {}
        const pct_exp = parseFloat(e.pct)        || 0
        const pct_act = parseFloat(e.pct_actual) || 0
        if (pct_act > 0) {
          actualRows.push({
            user_name: selectedUser,
            week_start: weekStart,
            category_key: key,
            category_type: type,
            pct_expected: 0,
            pct_actual: pct_act,
          })
        }
        if (pct_exp > 0) {
          expectedRows.push({
            user_name: selectedUser,
            week_start: weekStartNext,
            category_key: key,
            category_type: type,
            pct_expected: pct_exp,
            pct_actual: 0,
          })
        }
      }
    }

    addRows(dealflow, 'deal')
    addRows([...longtail, { name: 'Other (Longtail)' }], 'longtail')
    addRows(origChannels, 'orig')
    addRows(portfolio, 'portco')
    addRows(internalCategories.map(c => c.name), 'internal')

    if (actualRows.length === 0 && expectedRows.length === 0) {
      setSubmitError('Please enter at least one time entry before submitting.')
      return
    }

    setPendingRows({ actualRows, expectedRows })
    setShowIntensityModal(true)
  }

  // Week labels
  const thisWeekShort = new Date(weekStart     + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  const nextWeekShort = new Date(weekStartNext + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  const weekLabel = new Date(weekStart + 'T12:00:00').toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  if (isLoading) return <LoadingSpinner />

  if (dataError) {
    return (
      <div style={{ padding: '3rem', color: 'var(--danger)' }}>
        Failed to load data: {dataError.message}
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '2rem 1.5rem 6rem' }}>
      {showIntensityModal && pendingRows && (
        <IntensityModal
          formData={pendingRows}
          weekStart={weekStart}
          weekStartNext={weekStartNext}
          selectedUser={selectedUser}
          onSuccess={onSubmitted}
          onClose={() => setShowIntensityModal(false)}
        />
      )}

      {/* Page header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: '1.75rem', marginBottom: '0.5rem' }}>
          Weekly Time Log
        </h1>
        {/* Week navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setWeekOffset(o => o - 1)}
            disabled={weekOffset <= WEEK_OFFSET_MIN}
            title="Previous week"
            style={{
              background: 'none',
              border: '1px solid var(--rule)',
              borderRadius: 6,
              padding: '2px 8px',
              cursor: weekOffset <= WEEK_OFFSET_MIN ? 'not-allowed' : 'pointer',
              color: weekOffset <= WEEK_OFFSET_MIN ? 'var(--rule)' : 'var(--muted)',
              fontSize: '0.875rem',
              lineHeight: 1.5,
            }}
          >
            ←
          </button>
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem', margin: 0 }}>
            Week of {weekLabel}
            {weekOffset === 0 && (
              <span style={{ marginLeft: 8, fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 600 }}>
                current
              </span>
            )}
            {weekOffset === -1 && (
              <span style={{ marginLeft: 8, fontSize: '0.75rem', color: 'var(--muted)' }}>
                last week
              </span>
            )}
            {weekOffset === 1 && (
              <span style={{ marginLeft: 8, fontSize: '0.75rem', color: 'var(--muted)' }}>
                next week
              </span>
            )}
            {weekOffset < -1 && (
              <span style={{ marginLeft: 8, fontSize: '0.75rem', color: 'var(--muted)' }}>
                {Math.abs(weekOffset)} weeks ago
              </span>
            )}
          </p>
          <button
            onClick={() => setWeekOffset(o => o + 1)}
            disabled={weekOffset >= WEEK_OFFSET_MAX}
            title="Next week"
            style={{
              background: 'none',
              border: '1px solid var(--rule)',
              borderRadius: 6,
              padding: '2px 8px',
              cursor: weekOffset >= WEEK_OFFSET_MAX ? 'not-allowed' : 'pointer',
              color: weekOffset >= WEEK_OFFSET_MAX ? 'var(--rule)' : 'var(--muted)',
              fontSize: '0.875rem',
              lineHeight: 1.5,
            }}
          >
            →
          </button>
          {weekOffset !== 0 && (
            <button
              onClick={() => setWeekOffset(0)}
              title="Jump to current week"
              style={{
                background: 'none',
                border: 'none',
                padding: '2px 6px',
                cursor: 'pointer',
                color: 'var(--muted)',
                fontSize: '0.75rem',
                textDecoration: 'underline',
              }}
            >
              back to current
            </button>
          )}
        </div>
      </div>

      {/* Team member — auto-resolved from logged-in account */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label
          style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}
        >
          Team member
        </label>
        {selectedUser ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '0.9375rem', fontFamily: 'var(--font-sans)', color: 'var(--ink)', fontWeight: 500 }}>
              {selectedUser}
            </span>
            {userEntriesQ.isFetching && (
              <span style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>Loading entries…</span>
            )}
          </div>
        ) : (
          <p style={{ fontSize: '0.875rem', color: 'var(--danger)', margin: 0 }}>
            Your account ({userEmail}) is not linked to a team member yet. Ask an admin to add your email to the team members table.
          </p>
        )}
      </div>

      {/* Column headers */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          paddingBottom: 6,
          borderBottom: '2px solid var(--ink)',
        }}
      >
        <div style={{ flex: 1, fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)' }}>
          Category
        </div>
        <div
          style={{
            width: 76,
            fontSize: '0.7rem',
            fontWeight: 700,
            textAlign: 'right',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            color: '#4a7a5a',
            lineHeight: 1.3,
          }}
        >
          Exp&nbsp;%<br />
          <span style={{ fontWeight: 400, textTransform: 'none' }}>w/c {nextWeekShort}</span>
        </div>
        <div
          style={{
            width: 76,
            fontSize: '0.7rem',
            fontWeight: 700,
            textAlign: 'right',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            color: '#8a5020',
            lineHeight: 1.3,
          }}
        >
          Actual&nbsp;%<br />
          <span style={{ fontWeight: 400, textTransform: 'none' }}>w/c {thisWeekShort}</span>
        </div>
      </div>

      {/* ── DEALFLOW ── */}
      <SectionHeader label="Dealflow - Main Opportunities" count={dealflow.length} tooltip="Active deals currently being worked on — includes Under Analysis, Working on a Deal, and DD Phase stages." />
      <div
        style={{
          maxHeight: dealflow.length > 8 ? 260 : undefined,
          overflowY: dealflow.length > 8 ? 'auto' : undefined,
        }}
      >
        {dealflow.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem', padding: '8px 0' }}>
            No active deals
          </p>
        ) : (
          dealflow.map(d => (
            <EntryRow
              key={d.name}
              label={d.name}
              type="deal"
              categoryKey={d.name}
              entries={entries}
              onChange={handleChange}
            />
          ))
        )}
      </div>

      {/* ── LONGTAIL ── */}
      <SectionHeader
        label="Dealflow - Longtail"
        count={longtail.length + 1}
        tooltip="Deals in Affinity at 'Being Explored' stage, or not in Affinity yet. Includes the 'Other (Longtail)' catch-all for anything not yet tracked."
        collapsible
        open={showLongtail}
        onToggle={() => setShowLongtail(v => !v)}
      />
      {showLongtail && (
        <>
          {longtail.map(d => (
            <EntryRow
              key={d.name}
              label={d.name}
              type="longtail"
              categoryKey={d.name}
              entries={entries}
              onChange={handleChange}
            />
          ))}
          <EntryRow
            label="Other (Longtail)"
            type="longtail"
            categoryKey="Other (Longtail)"
            entries={entries}
            onChange={handleChange}
          />
        </>
      )}

      {/* ── ORIGINATION ── */}
      <SectionHeader
        label="Origination Activities (Non-deal related)"
        count={origChannels.length}
        tooltip="Time spent on sourcing and channel-building activities not tied to a specific deal — e.g. adviser meetings, events, outreach campaigns."
        collapsible
        open={showOrig}
        onToggle={() => setShowOrig(v => !v)}
      />
      {showOrig &&
        origChannels.map(ch => (
          <EntryRow
            key={ch.name}
            label={ch.name}
            type="orig"
            categoryKey={ch.name}
            entries={entries}
            onChange={handleChange}
          />
        ))}

      {/* ── PORTFOLIO ── */}
      {portfolio.length > 0 && (
        <>
          <SectionHeader label="Portfolio" count={portfolio.length} tooltip="Time spent on existing portfolio companies — operational support, board prep, add-on work, etc." />
          {portfolio.map(d => (
            <EntryRow
              key={d.name}
              label={d.name}
              type="portco"
              categoryKey={d.name}
              entries={entries}
              onChange={handleChange}
            />
          ))}
        </>
      )}

      {/* ── INTERNAL ── */}
      {(() => {
        const ADMIN_BUCKETS = ['Training & development', 'Out of office']
        const coreInternal = internalCategories.filter(c => !ADMIN_BUCKETS.includes(c.name))
        const adminCategories = internalCategories.filter(c => ADMIN_BUCKETS.includes(c.name))
        return (
          <>
            <SectionHeader label="Internal" count={internalLoading ? null : coreInternal.length} tooltip="Internal firm activities — operations, recruiting, fundraising, strategy, and business development." />
            {internalLoading ? (
              <LoadingSpinner />
            ) : (
              coreInternal.map(c => (
                <EntryRow
                  key={c.name}
                  label={c.name}
                  type="internal"
                  categoryKey={c.name}
                  entries={entries}
                  onChange={handleChange}
                />
              ))
            )}

            {/* ── ADMIN ── */}
            <SectionHeader label="Admin" count={internalLoading ? null : adminCategories.length} tooltip="Personal time away from deal or firm work — training, courses, conferences, and planned time out of office." />
            {internalLoading ? (
              <LoadingSpinner />
            ) : (
              adminCategories.map(c => (
                <EntryRow
                  key={c.name}
                  label={c.name}
                  type="internal"
                  categoryKey={c.name}
                  entries={entries}
                  onChange={handleChange}
                />
              ))
            )}
          </>
        )
      })()}

      {/* ── FOOTER: totals + submit ── */}
      <div
        style={{
          position: 'sticky',
          bottom: 0,
          background: 'var(--paper)',
          borderTop: '2px solid var(--rule)',
          marginTop: 16,
          padding: '12px 0',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        {/* Expected % total */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, minWidth: 100 }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Total Exp %
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '1.25rem',
              fontWeight: 600,
              color: totalPctExpected === 100 ? 'var(--accent)' : 'var(--ink)',
            }}
          >
            {totalPctExpected.toFixed(totalPctExpected % 1 === 0 ? 0 : 1)}%
          </span>
        </div>

        {/* Actual % total */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, minWidth: 100 }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Total Actual %
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '1.25rem',
              fontWeight: 600,
              color: overPct ? 'var(--danger)' : totalPctActual === 100 ? 'var(--accent)' : 'var(--ink)',
            }}
          >
            {totalPctActual.toFixed(totalPctActual % 1 === 0 ? 0 : 1)}%
          </span>
          {overPct && (
            <span style={{ fontSize: '0.75rem', color: 'var(--danger)' }}>
              {(totalPctActual - 100).toFixed(1)}% over
            </span>
          )}
        </div>

        <div style={{ flex: 1 }} />

        {/* Error message */}
        {submitError && (
          <span style={{ fontSize: '0.8125rem', color: 'var(--danger)', maxWidth: 240 }}>
            {submitError}
          </span>
        )}

        {/* Submit button */}
        <button
          onClick={handleSubmitClick}
          disabled={!selectedUser || overPct}
          style={{
            padding: '0.625rem 1.5rem',
            fontSize: '0.9375rem',
            fontFamily: 'var(--font-sans)',
            fontWeight: 600,
            background: !selectedUser || overPct ? 'var(--rule)' : 'var(--accent)',
            color: !selectedUser || overPct ? 'var(--muted)' : 'white',
            border: 'none',
            borderRadius: 8,
            cursor: !selectedUser || overPct ? 'not-allowed' : 'pointer',
            transition: 'background 0.15s',
          }}
        >
          Submit
        </button>
      </div>
    </div>
  )
}
