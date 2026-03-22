import { useMemo, useState } from 'react'
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, LabelList,
  PieChart, Pie, Legend,
} from 'recharts'
import { shortName } from '../lib/utils'
import { useDealStageMap, useTimeframeEntries, useLifetimeHoursEntries } from '../hooks/useTeamAnalytics'
import { useStageTimeInvestment } from '../hooks/useFunnelAnalysis'
import LoadingSpinner from '../components/ui/LoadingSpinner'

// ── Constants ────────────────────────────────────────────────────────────────

const ALL_STAGES = ['DD Phase', 'Working on Deal', 'Under Analysis']

const STAGE_COLORS = {
  'DD Phase':        '#1a3a2a',
  'Working on Deal': '#2e6da4',
  'Under Analysis':  '#c07830',
}

const PIE_STAGE_COLORS = {
  'DD Phase':        '#1a3a2a',
  'Working on Deal': '#2e6da4',
  'Under Analysis':  '#c07830',
  'Being Explored':  '#6b3a80',
  'Portfolio':       '#3a4080',
  'Other':           '#9a9589',
}

const CAT_COLORS = {
  dealflow: '#2d6a4a',
  internal: '#74b49b',
  portco:   '#3a4080',
  orig:     '#c07830',
}

const CAT_LABELS = {
  dealflow: 'Dealflow',
  internal: 'Internal',
  portco:   'Portfolio',
  orig:     'Origination',
}

// ── Data processing helpers ───────────────────────────────────────────────────

function getUserDivisors(entries, timeframe) {
  const userWeeks = {}
  entries.forEach(r => {
    if (!userWeeks[r.user_name]) userWeeks[r.user_name] = new Set()
    userWeeks[r.user_name].add(r.week_start)
  })
  const div = {}
  Object.keys(userWeeks).forEach(u => {
    div[u] = timeframe === 'week' ? 1 : userWeeks[u].size
  })
  return div
}

function buildCapacityData(entries, timeframe) {
  const userDivisors = getUserDivisors(entries, timeframe)
  const acc = {}
  entries.forEach(row => {
    if (!acc[row.user_name]) acc[row.user_name] = { dealflow: 0, internal: 0, portco: 0, orig: 0 }
    const cat =
      ['deal', 'longtail'].includes(row.category_type) ? 'dealflow' :
      row.category_type === 'portco' ? 'portco' :
      row.category_type === 'orig'   ? 'orig' :
      'internal'
    const div = userDivisors[row.user_name] || 1
    acc[row.user_name][cat] += (row.pct_expected || 0) / div
  })
  return Object.entries(acc).map(([name, cats]) => {
    const total = cats.dealflow + cats.internal + cats.portco + cats.orig
    return {
      name: shortName(name),
      fullName: name,
      dealflow: Math.round(cats.dealflow),
      internal: Math.round(cats.internal),
      portco:   Math.round(cats.portco),
      orig:     Math.round(cats.orig),
      total:    Math.round(total),
      _zero:    0,
    }
  })
}

function buildFteData(entries, timeframe, stageMap, stageFilters) {
  const globalDivisor = timeframe === 'week'
    ? 1
    : (new Set(entries.map(e => e.week_start)).size || 1)

  const acc = {}
  entries
    .filter(r => ['deal', 'longtail'].includes(r.category_type))
    .forEach(row => {
      acc[row.category_key] = (acc[row.category_key] || 0) + (row.pct_expected || 0)
    })

  return Object.entries(acc)
    .map(([name, pct]) => ({
      name: name.length > 26 ? name.slice(0, 24) + '…' : name,
      fullName: name,
      fte: parseFloat(((pct / globalDivisor) / 100).toFixed(2)),
      stage: stageMap[name] || 'Working on Deal',
    }))
    .filter(d => d.fte > 0 && stageFilters.has(d.stage))
    .sort((a, b) => b.fte - a.fte)
}

function buildLifetimeData(entries, stageMap, stageFilters) {
  const acc = {}
  entries.forEach(row => {
    acc[row.category_key] = (acc[row.category_key] || 0) + (row.hrs_actual || 0)
  })
  return Object.entries(acc)
    .map(([name, hrs]) => ({
      name: name.length > 26 ? name.slice(0, 24) + '…' : name,
      fullName: name,
      hrs: Math.round(hrs),
      stage: stageMap[name] || 'Working on Deal',
    }))
    .filter(d => d.hrs > 0 && stageFilters.has(d.stage))
    .sort((a, b) => b.hrs - a.hrs)
}

function buildCapacityMatrix(entries, timeframe) {
  const userDivisors = getUserDivisors(entries, timeframe)
  const valid = entries.filter(e => (e.pct_expected || 0) > 0)
  const users = [...new Set(valid.map(e => e.user_name))].sort()
  const typeMap = { deal: 'Dealflow', longtail: 'Dealflow', orig: 'Origination', portco: 'Portfolio', internal: 'Internal' }
  const groups = { Dealflow: {}, Origination: {}, Portfolio: {}, Internal: {} }
  const userTotals = {}
  users.forEach(u => (userTotals[u] = 0))
  let grandTotal = 0

  valid.forEach(row => {
    const grp = typeMap[row.category_type] || 'Internal'
    if (!groups[grp][row.category_key]) groups[grp][row.category_key] = { _rowTotal: 0 }
    const div = userDivisors[row.user_name] || 1
    const avg = (row.pct_expected || 0) / div
    groups[grp][row.category_key][row.user_name] = (groups[grp][row.category_key][row.user_name] || 0) + avg
    groups[grp][row.category_key]._rowTotal += avg
    userTotals[row.user_name] = (userTotals[row.user_name] || 0) + avg
    grandTotal += avg
  })

  return { users, groups, userTotals, grandTotal }
}

function buildLifetimeMatrix(entries, stageMap, stageFilters) {
  const users = [...new Set(entries.map(e => e.user_name))].sort()
  const dealsMap = {}
  const userTotals = {}
  users.forEach(u => (userTotals[u] = 0))
  let grandTotal = 0

  entries.forEach(row => {
    const stage = stageMap[row.category_key] || 'Working on Deal'
    if (!stageFilters.has(stage)) return
    if (!dealsMap[row.category_key]) dealsMap[row.category_key] = { _rowTotal: 0 }
    dealsMap[row.category_key][row.user_name] = (dealsMap[row.category_key][row.user_name] || 0) + row.hrs_actual
    dealsMap[row.category_key]._rowTotal += row.hrs_actual
    userTotals[row.user_name] = (userTotals[row.user_name] || 0) + row.hrs_actual
    grandTotal += row.hrs_actual
  })

  const sortedDeals = Object.keys(dealsMap).sort(
    (a, b) => dealsMap[b]._rowTotal - dealsMap[a]._rowTotal
  )
  return { users, dealsMap, sortedDeals, userTotals, grandTotal }
}

function buildStageInvestmentData(entries) {
  const acc = {}
  entries.forEach(({ stage_value, total_hours }) => {
    const s = stage_value?.toLowerCase() ?? ''
    const label =
      s.includes('dd') ? 'DD Phase' :
      s.includes('analysis') || s.includes('analys') ? 'Under Analysis' :
      s.includes('working') ? 'Working on Deal' :
      s.includes('explo') ? 'Being Explored' :
      s.includes('portfolio') ? 'Portfolio' :
      'Other'
    acc[label] = (acc[label] || 0) + (total_hours || 0)
  })
  const total = Object.values(acc).reduce((s, v) => s + v, 0) || 1
  return Object.entries(acc)
    .map(([name, hrs]) => ({ name, hrs: Math.round(hrs), pct: parseFloat(((hrs / total) * 100).toFixed(1)) }))
    .filter(d => d.hrs > 0)
    .sort((a, b) => b.hrs - a.hrs)
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ChartCard({ title, description, children, style = {} }) {
  return (
    <div
      style={{
        background: 'white',
        border: '1px solid var(--rule)',
        borderRadius: 8,
        padding: '24px 24px 20px',
        marginBottom: 28,
        ...style,
      }}
    >
      <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.0625rem', marginBottom: 2 }}>
        {title}
      </h3>
      <p style={{ color: 'var(--muted)', fontSize: '0.75rem', marginBottom: 20 }}>
        {description}
      </p>
      {children}
    </div>
  )
}

function TimeframeToggle({ value, onChange }) {
  const btn = (mode, label) => (
    <button
      key={mode}
      onClick={() => onChange(mode)}
      style={{
        padding: '5px 14px',
        fontSize: '0.78rem',
        fontWeight: 500,
        cursor: 'pointer',
        borderRadius: 4,
        border: 'none',
        background: value === mode ? 'white' : 'transparent',
        color: value === mode ? 'var(--ink)' : 'var(--muted)',
        boxShadow: value === mode ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
        transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  )
  return (
    <div style={{ display: 'inline-flex', background: 'var(--rule)', padding: 3, borderRadius: 6 }}>
      {btn('week', 'This Week')}
      {btn('month', 'This Month')}
    </div>
  )
}

function StageFilterPills({ filters, onChange }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
      {ALL_STAGES.map(stage => {
        const active = filters.has(stage)
        return (
          <button
            key={stage}
            onClick={() => {
              const next = new Set(filters)
              active ? next.delete(stage) : next.add(stage)
              onChange(next)
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 12px',
              borderRadius: 20,
              border: '1px solid ' + (active ? '#ccc' : 'transparent'),
              background: active ? 'white' : 'transparent',
              opacity: active ? 1 : 0.38,
              cursor: 'pointer',
              fontSize: '0.6875rem',
              fontWeight: 500,
              color: 'var(--ink)',
              boxShadow: active ? '0 1px 2px rgba(0,0,0,0.04)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: STAGE_COLORS[stage],
                display: 'inline-block',
                flexShrink: 0,
              }}
            />
            {stage}
          </button>
        )
      })}
    </div>
  )
}

function Accordion({ summary, children, noSeparator = false }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={noSeparator ? {} : { marginTop: 24, borderTop: '1px solid var(--rule)', paddingTop: 16 }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: '0.8125rem',
          fontWeight: 600,
          color: 'var(--ink)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: 0,
        }}
      >
        <span style={{ fontSize: '0.5625rem', color: 'var(--muted)', transition: 'transform 0.2s', transform: open ? 'rotate(90deg)' : 'none' }}>
          ►
        </span>
        {summary}
      </button>
      {open && <div style={{ marginTop: 16 }}>{children}</div>}
    </div>
  )
}

const TABLE_STYLES = {
  wrapper: { overflowX: 'auto', border: '1px solid var(--rule)', borderRadius: 4 },
  table: { width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-mono)', fontSize: 11, background: 'white' },
}

function DenseTable({ headers, rows, footerRow, groupRows }) {
  return (
    <div style={TABLE_STYLES.wrapper}>
      <table style={TABLE_STYLES.table}>
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th
                key={i}
                style={{
                  padding: '6px 10px',
                  borderBottom: '2px solid var(--rule)',
                  borderRight: i < headers.length - 1 ? '1px dashed #f0eee9' : 'none',
                  textAlign: i === 0 ? 'left' : 'right',
                  whiteSpace: 'nowrap',
                  fontFamily: 'var(--font-sans)',
                  fontWeight: 600,
                  color: 'var(--muted)',
                  background: '#fafaf8',
                  position: i === 0 ? 'sticky' : undefined,
                  left: i === 0 ? 0 : undefined,
                  zIndex: i === 0 ? 1 : undefined,
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => {
            const isGroup = groupRows && groupRows.has(ri)
            return (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    style={{
                      padding: isGroup ? '10px 10px 6px' : '6px 10px',
                      borderBottom: '1px solid var(--rule)',
                      borderRight: ci < row.length - 1 ? '1px dashed #f0eee9' : 'none',
                      whiteSpace: 'nowrap',
                      color: cell === '–' ? '#e0ddd6' : isGroup ? 'var(--ink)' : undefined,
                      textAlign: ci === 0 ? 'left' : cell === '–' ? 'center' : 'right',
                      fontFamily: ci === 0 ? 'var(--font-sans)' : 'var(--font-mono)',
                      fontWeight: isGroup && ci === 0 ? 700 : undefined,
                      textTransform: isGroup && ci === 0 ? 'uppercase' : undefined,
                      letterSpacing: isGroup && ci === 0 ? '0.05em' : undefined,
                      fontSize: isGroup && ci === 0 ? 10 : undefined,
                      background: isGroup ? '#f4f3ef' : ci === row.length - 1 ? '#fafaf8' : undefined,
                      position: ci === 0 ? 'sticky' : undefined,
                      left: ci === 0 ? 0 : undefined,
                      zIndex: ci === 0 ? 1 : undefined,
                      borderLeft: ci === row.length - 1 ? '1px solid var(--rule)' : undefined,
                    }}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            )
          })}
          {footerRow && (
            <tr>
              {footerRow.map((cell, ci) => (
                <td
                  key={ci}
                  style={{
                    padding: '6px 10px',
                    fontFamily: ci === 0 ? 'var(--font-sans)' : 'var(--font-mono)',
                    fontWeight: 500,
                    color: 'var(--muted)',
                    background: '#fafaf8',
                    borderTop: '2px solid var(--rule)',
                    textAlign: ci === 0 ? 'left' : 'right',
                    whiteSpace: 'nowrap',
                    position: ci === 0 ? 'sticky' : undefined,
                    left: ci === 0 ? 0 : undefined,
                    zIndex: ci === 0 ? 1 : undefined,
                    borderLeft: ci === footerRow.length - 1 ? '1px solid var(--rule)' : undefined,
                  }}
                >
                  {cell}
                </td>
              ))}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

// Capacity table builder
function CapacityMatrix({ entries, timeframe }) {
  const { users, groups, userTotals, grandTotal } = useMemo(
    () => buildCapacityMatrix(entries, timeframe),
    [entries, timeframe]
  )

  if (!users.length) return <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>No capacity data.</p>

  const shortUsers = users.map(u => shortName(u))
  const headers = ['Category', ...shortUsers, 'Avg %']
  const rows = []
  const groupRowIndices = new Set()
  const ORDER = ['Dealflow', 'Origination', 'Portfolio', 'Internal']

  ORDER.forEach(grp => {
    const cats = Object.keys(groups[grp] || {}).sort()
    if (!cats.length) return
    groupRowIndices.add(rows.length)
    rows.push([grp, ...users.map(() => ''), ''])
    cats.forEach(cat => {
      rows.push([
        cat,
        ...users.map(u => {
          const v = groups[grp][cat][u]
          return v ? `${Math.round(v)}%` : '–'
        }),
        `${Math.round(groups[grp][cat]._rowTotal)}%`,
      ])
    })
  })

  const footer = [
    'Team Totals',
    ...users.map(u => `${Math.round(userTotals[u] || 0)}%`),
    `${Math.round(grandTotal)}%`,
  ]

  return <DenseTable headers={headers} rows={rows} footerRow={footer} groupRows={groupRowIndices} />
}

// Lifetime hours table builder
function LifetimeMatrix({ entries, stageMap, stageFilters }) {
  const { users, dealsMap, sortedDeals, userTotals, grandTotal } = useMemo(
    () => buildLifetimeMatrix(entries, stageMap, stageFilters),
    [entries, stageMap, stageFilters]
  )

  if (!sortedDeals.length) return <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>No data matches filters.</p>

  const shortUsers = users.map(u => shortName(u))
  const headers = ['Deal', ...shortUsers, 'Total Hrs']
  const rows = sortedDeals.map(deal => [
    deal,
    ...users.map(u => dealsMap[deal][u] ? Math.round(dealsMap[deal][u]) : '–'),
    Math.round(dealsMap[deal]._rowTotal),
  ])
  const footer = [
    'Team Totals',
    ...users.map(u => Math.round(userTotals[u] || 0)),
    Math.round(grandTotal),
  ]

  return <DenseTable headers={headers} rows={rows} footerRow={footer} />
}

// Custom label for stacked bar totals
function CapacityTopLabel({ x, y, width, value }) {
  if (!value) return null
  return (
    <text
      x={x + width / 2}
      y={y - 5}
      textAnchor="middle"
      fontSize={10}
      fontFamily="DM Mono, monospace"
      fill={value > 100 ? '#c0392b' : '#1a3a2a'}
      fontWeight="600"
    >
      {Math.round(value)}%
    </text>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TeamAnalytics() {
  const [timeframe, setTimeframe] = useState('week')
  const [fteFilters, setFteFilters] = useState(new Set(ALL_STAGES))
  const [lifetimeFilters, setLifetimeFilters] = useState(new Set(ALL_STAGES))

  const stageMapQ = useDealStageMap()
  const tfEntriesQ = useTimeframeEntries(timeframe)
  const lifetimeQ = useLifetimeHoursEntries()
  const stageInvestQ = useStageTimeInvestment()

  const stageMap = stageMapQ.data ?? {}
  const tfEntries = tfEntriesQ.data ?? []
  const lifetimeEntries = lifetimeQ.data ?? []
  const stageInvestEntries = stageInvestQ.data ?? []

  const capacityData   = useMemo(() => buildCapacityData(tfEntries, timeframe), [tfEntries, timeframe])
  const fteData        = useMemo(() => buildFteData(tfEntries, timeframe, stageMap, fteFilters), [tfEntries, timeframe, stageMap, fteFilters])
  const lifetimeData   = useMemo(() => buildLifetimeData(lifetimeEntries, stageMap, lifetimeFilters), [lifetimeEntries, stageMap, lifetimeFilters])
  const stageInvestData = useMemo(() => buildStageInvestmentData(stageInvestEntries), [stageInvestEntries])

  const timeLabel = timeframe === 'week'
    ? `Week starting ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
    : `Month of ${new Date().toLocaleString('en-GB', { month: 'long', year: 'numeric' })}`

  const isLoading = stageMapQ.isLoading || tfEntriesQ.isLoading

  // Capacity: fixed compact height — vertical bars don't need to be tall at full width
  const capHeight = 220
  // FTE / Lifetime: scale with data, 24 px per row
  const fteRowH = 24
  const fteHeight = Math.max(120, 44 + fteData.length * fteRowH)
  const lifeHeight = Math.max(120, 44 + lifetimeData.length * fteRowH)

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem 1.5rem 4rem' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 28,
        }}
      >
        <div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', marginBottom: 2 }}>
            Team Analytics
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>{timeLabel}</p>
        </div>
        <TimeframeToggle value={timeframe} onChange={setTimeframe} />
      </div>

      {isLoading && <LoadingSpinner />}

      {!isLoading && (
        <>
          {/* ── 1. Team Capacity — full width, fixed compact height ── */}
          <ChartCard
            title={timeframe === 'week' ? 'Team Capacity — This Week' : 'Average Team Capacity — This Month'}
            description="Expected % committed by category per team member."
          >
            {capacityData.length === 0 ? (
              <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '2rem 0' }}>
                No entries logged for this timeframe.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={capHeight}>
                <BarChart data={capacityData} margin={{ top: 20, right: 20, bottom: 50, left: 10 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e5e2db" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fontFamily: 'DM Sans, sans-serif' }}
                    axisLine={false}
                    tickLine={false}
                    angle={-25}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis
                    domain={[0, 130]}
                    ticks={[0, 25, 50, 75, 100, 125]}
                    tickFormatter={v => `${v}%`}
                    tick={{ fontSize: 10, fontFamily: 'DM Mono, monospace' }}
                    axisLine={false}
                    tickLine={false}
                    width={36}
                  />
                  <ReferenceLine y={100} stroke="#c0392b" strokeDasharray="5 4" strokeWidth={1.5} />
                  <Tooltip
                    formatter={(value, name) => [`${Math.round(value)}%`, CAT_LABELS[name] ?? name]}
                    labelStyle={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600, marginBottom: 4 }}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Bar dataKey="dealflow" stackId="a" fill={CAT_COLORS.dealflow} />
                  <Bar dataKey="internal" stackId="a" fill={CAT_COLORS.internal} />
                  <Bar dataKey="portco"   stackId="a" fill={CAT_COLORS.portco} />
                  <Bar dataKey="orig"     stackId="a" fill={CAT_COLORS.orig} />
                  <Bar dataKey="_zero" stackId="a" fill="transparent" stroke="none" isAnimationActive={false}>
                    <LabelList dataKey="total" position="top" content={CapacityTopLabel} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 10 }}>
              {Object.entries(CAT_LABELS).map(([key, label]) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.71875rem', color: 'var(--muted)' }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: CAT_COLORS[key], display: 'inline-block' }} />
                  {label}
                </div>
              ))}
            </div>
          </ChartCard>

          {/* ── 2. Deal Workload FTE — full width ── */}
          <ChartCard
            title={timeframe === 'week' ? 'Deal Workload (FTE) — This Week' : 'Avg Deal Workload (FTE) — This Month'}
            description="Total FTE dedicated to active deals. Click a stage to filter."
          >
            <StageFilterPills filters={fteFilters} onChange={setFteFilters} />
            {fteData.length === 0 ? (
              <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '2rem 0' }}>
                No matching deal flow found.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={fteHeight}>
                <BarChart data={fteData} layout="vertical" margin={{ top: 4, right: 64, bottom: 8, left: 8 }}>
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#e5e2db" />
                  <XAxis
                    type="number"
                    tickFormatter={v => `${v} FTE`}
                    tick={{ fontSize: 10, fontFamily: 'DM Mono, monospace' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={180}
                    tick={{ fontSize: 11, fontFamily: 'DM Sans, sans-serif' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value) => [`${value} FTE`, 'Workload']}
                    labelStyle={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600 }}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Bar dataKey="fte" radius={[0, 4, 4, 0]}>
                    {fteData.map((entry, i) => (
                      <Cell key={i} fill={STAGE_COLORS[entry.stage] ?? '#2d6a4a'} />
                    ))}
                    <LabelList
                      dataKey="fte"
                      position="right"
                      formatter={v => v.toFixed(2)}
                      style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', fill: '#0f0f0f', fontWeight: 600 }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* ── 3. Breakdown Team Capacity — standalone accordion card ── */}
          <div style={{ background: 'white', border: '1px solid var(--rule)', borderRadius: 8, padding: '16px 24px 20px', marginBottom: 28 }}>
            <Accordion summary="Breakdown Team Capacity (Matrix View)" noSeparator>
              <CapacityMatrix entries={tfEntries} timeframe={timeframe} />
            </Accordion>
          </div>

          {/* ── 4. Lifetime Hours by Deal — full width ── */}
          <ChartCard
            title="Lifetime Hours by Deal"
            description="Cumulative actual hours invested across all tracked deals. Click a stage to filter."
          >
            <StageFilterPills filters={lifetimeFilters} onChange={setLifetimeFilters} />
            {lifetimeQ.isLoading ? (
              <LoadingSpinner />
            ) : lifetimeData.length === 0 ? (
              <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '2rem 0' }}>
                No matching hours logged.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={lifeHeight}>
                <BarChart data={lifetimeData} layout="vertical" margin={{ top: 4, right: 64, bottom: 8, left: 8 }}>
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#e5e2db" />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10, fontFamily: 'DM Mono, monospace' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={180}
                    tick={{ fontSize: 11, fontFamily: 'DM Sans, sans-serif' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value) => [`${value} hrs`, 'Actual hours']}
                    labelStyle={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600 }}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Bar dataKey="hrs" radius={[0, 4, 4, 0]}>
                    {lifetimeData.map((entry, i) => (
                      <Cell key={i} fill={STAGE_COLORS[entry.stage] ?? '#2d6a4a'} />
                    ))}
                    <LabelList
                      dataKey="hrs"
                      position="right"
                      formatter={v => `${v}h`}
                      style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', fill: '#0f0f0f', fontWeight: 600 }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
            <Accordion summary="Breakdown Lifetime Hours (Matrix View)">
              <LifetimeMatrix
                entries={lifetimeEntries}
                stageMap={stageMap}
                stageFilters={lifetimeFilters}
              />
            </Accordion>
          </ChartCard>

          {/* ── 5. Lifetime Hours by Stage — pie ── */}
          <ChartCard
            title="Lifetime Hours by Stage"
            description="Share of all tracked deal hours invested at each stage."
          >
            {stageInvestQ.isLoading ? (
              <LoadingSpinner />
            ) : stageInvestData.length === 0 ? (
              <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '2rem 0' }}>No stage investment data found.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={stageInvestData}
                    dataKey="hrs"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={52}
                    paddingAngle={2}
                    label={({ name, pct }) => `${name} ${pct}%`}
                    labelLine
                  >
                    {stageInvestData.map((entry, i) => (
                      <Cell key={i} fill={PIE_STAGE_COLORS[entry.name] ?? '#9a9589'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} hrs`, 'Hours']} contentStyle={{ fontSize: 12 }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '0.75rem', fontFamily: 'DM Sans, sans-serif' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </>
      )}
    </div>
  )
}
