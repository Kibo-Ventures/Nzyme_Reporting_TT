import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useTrackerData, useUserEntries, getMondayISO } from '../../hooks/useTimeEntries'
import LoadingSpinner from '../ui/LoadingSpinner'

const INTERNAL = [
  'Recruiting',
  'Investor Relations / LP',
  'Fund Operations',
  'Expansion & Business Development',
]
const ADMIN_LEAVE = [
  'Training & development',
  'Out of office (Bank Holiday, Annual Leave, Sick)',
]

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
  const hrs = val.hrs ?? ''

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
        value={hrs}
        onChange={e => onChange(categoryKey, 'hrs', e.target.value)}
        placeholder="0"
        min="0"
        step="0.5"
        style={inputStyle}
      />
    </div>
  )
}

function SectionHeader({ label, count, collapsible, open, onToggle }) {
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

export default function WeeklyForm({ selectedUser, onUserChange, onSubmitted }) {
  const weekStart = getMondayISO()
  const { isLoading, error: dataError, dealflow, longtail, portfolio, origChannels, teamMembers } = useTrackerData()
  const userEntriesQ = useUserEntries(selectedUser, weekStart)

  const [entries, setEntries] = useState({})
  const [showLongtail, setShowLongtail] = useState(false)
  const [showOrig, setShowOrig] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  // Reset entries when user selection changes
  const prevUser = useRef(selectedUser)
  useEffect(() => {
    if (prevUser.current !== selectedUser) {
      setEntries({})
      prevUser.current = selectedUser
    }
  }, [selectedUser])

  // Populate entries from existing DB data (ignores unknown category_keys)
  useEffect(() => {
    if (!userEntriesQ.isSuccess || !userEntriesQ.data) return
    const filled = {}
    for (const row of userEntriesQ.data) {
      const p = Number(row.pct_expected)
      const h = Number(row.hrs_actual)
      if (p > 0 || h > 0) {
        filled[row.category_key] = {
          pct: p > 0 ? String(p) : '',
          hrs: h > 0 ? String(h) : '',
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
  const totalPct = allVals.reduce((s, e) => s + (parseFloat(e.pct) || 0), 0)
  const totalHrs = allVals.reduce((s, e) => s + (parseFloat(e.hrs) || 0), 0)
  const overPct = totalPct > 100

  async function handleSubmit() {
    if (!selectedUser) return
    setSubmitting(true)
    setSubmitError(null)

    try {
      const rows = []

      function addRows(items, type) {
        for (const item of items) {
          const key = typeof item === 'string' ? item : item.name
          const e = entries[key] || {}
          const pct = parseFloat(e.pct) || 0
          const hrs = parseFloat(e.hrs) || 0
          if (pct > 0 || hrs > 0) {
            rows.push({
              user_name: selectedUser,
              week_start: weekStart,
              category_key: key,
              category_type: type,
              pct_expected: pct,
              hrs_actual: hrs,
            })
          }
        }
      }

      addRows(dealflow, 'deal')
      addRows([...longtail, { name: 'Other (Longtail)' }], 'longtail')
      addRows(origChannels, 'orig')
      addRows(portfolio, 'portco')
      addRows(INTERNAL, 'internal')
      addRows(ADMIN_LEAVE, 'internal')

      if (rows.length === 0) {
        setSubmitError('Please enter at least one time entry before submitting.')
        return
      }

      const { error: sbErr } = await supabase
        .from('ReportingNz_time_entries')
        .upsert(rows, { onConflict: 'user_name,week_start,category_key' })

      if (sbErr) throw sbErr
      onSubmitted()
    } catch (e) {
      setSubmitError(e.message || 'Failed to submit. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // Week label
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
      {/* Page header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: '1.75rem', marginBottom: '0.25rem' }}>
          Weekly Time Log
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
          Week of {weekLabel}
        </p>
      </div>

      {/* User selector */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label
          style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}
        >
          Team member
        </label>
        <select
          value={selectedUser}
          onChange={e => onUserChange(e.target.value)}
          style={{
            padding: '0.5rem 0.75rem',
            fontSize: '0.9375rem',
            fontFamily: 'var(--font-sans)',
            border: '1px solid var(--rule)',
            borderRadius: 8,
            background: 'white',
            color: selectedUser ? 'var(--ink)' : 'var(--muted)',
            minWidth: 240,
            cursor: 'pointer',
          }}
        >
          <option value="">Select your name…</option>
          {teamMembers.map(m => (
            <option key={m.name} value={m.name}>{m.name}</option>
          ))}
        </select>
        {userEntriesQ.isFetching && (
          <span style={{ marginLeft: 12, fontSize: '0.8125rem', color: 'var(--muted)' }}>
            Loading entries…
          </span>
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
          }}
        >
          Exp&nbsp;%
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
          }}
        >
          Actual&nbsp;hrs
        </div>
      </div>

      {/* ── DEALFLOW ── */}
      <SectionHeader label="Dealflow" count={dealflow.length} />
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
        label="Longtail"
        count={longtail.length + 1}
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
        label="Origination"
        count={origChannels.length}
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
          <SectionHeader label="Portfolio" count={portfolio.length} />
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
      <SectionHeader label="Internal" />
      {INTERNAL.map(name => (
        <EntryRow
          key={name}
          label={name}
          type="internal"
          categoryKey={name}
          entries={entries}
          onChange={handleChange}
        />
      ))}

      {/* ── TIME OFF & TRAINING ── */}
      <SectionHeader label="Time Off & Training" />
      {ADMIN_LEAVE.map(name => (
        <EntryRow
          key={name}
          label={name}
          type="internal"
          categoryKey={name}
          entries={entries}
          onChange={handleChange}
        />
      ))}

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
        {/* Pct total */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, minWidth: 100 }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Total %
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '1.25rem',
              fontWeight: 600,
              color: overPct ? 'var(--danger)' : totalPct === 100 ? 'var(--accent)' : 'var(--ink)',
            }}
          >
            {totalPct.toFixed(totalPct % 1 === 0 ? 0 : 1)}%
          </span>
          {overPct && (
            <span style={{ fontSize: '0.75rem', color: 'var(--danger)' }}>
              {(totalPct - 100).toFixed(1)}% over
            </span>
          )}
        </div>

        {/* Hrs total */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, minWidth: 100 }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Total hrs
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.25rem', fontWeight: 600 }}>
            {totalHrs.toFixed(totalHrs % 1 === 0 ? 0 : 1)}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
            {totalHrs > 0 ? `${(totalHrs / 5).toFixed(1)} / day` : '0 / day'}
          </span>
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
          onClick={handleSubmit}
          disabled={!selectedUser || submitting || overPct}
          style={{
            padding: '0.625rem 1.5rem',
            fontSize: '0.9375rem',
            fontFamily: 'var(--font-sans)',
            fontWeight: 600,
            background: !selectedUser || submitting || overPct ? 'var(--rule)' : 'var(--accent)',
            color: !selectedUser || submitting || overPct ? 'var(--muted)' : 'white',
            border: 'none',
            borderRadius: 8,
            cursor: !selectedUser || submitting || overPct ? 'not-allowed' : 'pointer',
            transition: 'background 0.15s',
          }}
        >
          {submitting ? 'Submitting…' : 'Submit'}
        </button>
      </div>
    </div>
  )
}
