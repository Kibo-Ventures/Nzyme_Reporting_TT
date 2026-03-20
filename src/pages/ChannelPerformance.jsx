import { useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  LabelList, ResponsiveContainer, Cell,
} from 'recharts'
import { useChannelDeals, useChannelCosts, useChannelCostActuals } from '../hooks/useChannelPerformance'
import KpiCard from '../components/ui/KpiCard'
import LoadingSpinner from '../components/ui/LoadingSpinner'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatEur(val) {
  if (val == null || val === 0 || val === '') return '—'
  return `€${Math.round(val).toLocaleString('en-GB')}`
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const DIFFICULTY_COLOR = { Low: '#22c55e', Medium: '#f59e0b', High: '#ef4444' }
const POTENTIAL_COLOR  = { Low: '#9ca3af', Medium: '#3b82f6', High: '#1a3a2a' }

// ── Pivot toggle ──────────────────────────────────────────────────────────────

function PivotToggle({ options, value, onChange }) {
  return (
    <div style={{ display: 'inline-flex', gap: 4 }}>
      {options.map(opt => (
        <button
          key={opt.key}
          onClick={() => onChange(opt.key)}
          style={{
            padding: '4px 12px',
            fontSize: '0.75rem',
            fontWeight: value === opt.key ? 600 : 400,
            border: '1px solid var(--rule)',
            borderRadius: 6,
            background: value === opt.key ? 'var(--accent)' : 'white',
            color: value === opt.key ? 'white' : 'var(--ink)',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// ── Sort icon ─────────────────────────────────────────────────────────────────

function SortIcon({ active, dir }) {
  return (
    <span style={{ marginLeft: 4, opacity: active ? 1 : 0.3, fontSize: '0.6rem' }}>
      {active ? (dir === 'asc' ? '▲' : '▼') : '↕'}
    </span>
  )
}

// ── Difficulty / Potential badge ──────────────────────────────────────────────

function DiffPotBadge({ value, colorMap }) {
  if (!value) return <span style={{ color: 'var(--muted)' }}>—</span>
  return (
    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: colorMap[value] ?? 'var(--ink)' }}>
      {value}
    </span>
  )
}

// ── Main channel table ────────────────────────────────────────────────────────

const COLS = [
  { key: 'channel',           label: 'Channel',                  align: 'left' },
  { key: 'leads',             label: 'Leads',                    align: 'right' },
  { key: 'quality',           label: 'Quality Leads',            align: 'right' },
  { key: 'qualityRate',       label: '% Quality',                align: 'right' },
  { key: 'avgPriority',       label: 'Avg Priority',             align: 'right' },
  { key: 'nboCount',          label: 'NBO / LOI',                align: 'right' },
  { key: 'costPerNbo',        label: 'Cost / NBO/LOI',           align: 'right' },
  { key: 'oneOffCost',        label: 'One-off Cost',             align: 'right' },
  { key: 'recurringCost',     label: 'Recurring Cost (actual)',  align: 'right' },
  { key: 'totalHours',        label: 'Total Hours',              align: 'right' },
  { key: 'costPerQualityLead',label: 'Cost / Quality Lead',      align: 'right' },
  { key: 'difficulty',        label: 'Difficulty',               align: 'center' },
  { key: 'potential',         label: 'Potential',                align: 'center' },
]

function ChannelTable({ rows }) {
  const [sortKey, setSortKey] = useState('quality')
  const [sortDir, setSortDir] = useState('desc')

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      let av = a[sortKey] ?? -Infinity
      let bv = b[sortKey] ?? -Infinity
      if (typeof av === 'string') av = av.toLowerCase()
      if (typeof bv === 'string') bv = bv.toLowerCase()
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [rows, sortKey, sortDir])

  const thStyle = {
    padding: '8px 10px',
    fontSize: '0.6875rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: 'var(--muted)',
    borderBottom: '2px solid var(--rule)',
    background: '#fafaf8',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    userSelect: 'none',
  }

  return (
    <div style={{ overflowX: 'auto', border: '1px solid var(--rule)', borderRadius: 6 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white' }}>
        <thead>
          <tr>
            {COLS.map(col => (
              <th
                key={col.key}
                style={{ ...thStyle, textAlign: col.align }}
                onClick={() => toggleSort(col.key)}
              >
                {col.label}
                <SortIcon active={sortKey === col.key} dir={sortDir} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr key={row.channel} style={{ background: i % 2 === 0 ? 'white' : '#fafaf9' }}>
              <td style={{ padding: '9px 10px', fontWeight: 600, fontSize: '0.8125rem', borderBottom: '1px solid var(--rule)', whiteSpace: 'nowrap' }}>
                {row.channel}
              </td>
              <td style={{ padding: '9px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', borderBottom: '1px solid var(--rule)' }}>
                {row.leads}
              </td>
              <td style={{ padding: '9px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent)', borderBottom: '1px solid var(--rule)' }}>
                {row.quality}
              </td>
              <td style={{ padding: '9px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', borderBottom: '1px solid var(--rule)' }}>
                {row.leads > 0 ? `${row.qualityRate}%` : '—'}
              </td>
              <td style={{ padding: '9px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', borderBottom: '1px solid var(--rule)' }}>
                {row.avgPriority != null ? row.avgPriority.toFixed(1) : '—'}
              </td>
              <td style={{ padding: '9px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', borderBottom: '1px solid var(--rule)' }}>
                {row.nboCount > 0 ? row.nboCount : '—'}
              </td>
              <td style={{ padding: '9px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', borderBottom: '1px solid var(--rule)' }}>
                {formatEur(row.costPerNbo)}
              </td>
              <td style={{ padding: '9px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', borderBottom: '1px solid var(--rule)' }}>
                {formatEur(row.oneOffCost)}
              </td>
              <td style={{ padding: '9px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', borderBottom: '1px solid var(--rule)' }}>
                {formatEur(row.recurringCost)}
              </td>
              <td style={{ padding: '9px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', borderBottom: '1px solid var(--rule)' }}>
                {row.totalHours != null && row.totalHours > 0 ? `${Math.round(row.totalHours)}h` : '—'}
              </td>
              <td style={{ padding: '9px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', borderBottom: '1px solid var(--rule)' }}>
                {formatEur(row.costPerQualityLead)}
              </td>
              <td style={{ padding: '9px 10px', textAlign: 'center', borderBottom: '1px solid var(--rule)' }}>
                <DiffPotBadge value={row.difficulty} colorMap={DIFFICULTY_COLOR} />
              </td>
              <td style={{ padding: '9px 10px', textAlign: 'center', borderBottom: '1px solid var(--rule)' }}>
                <DiffPotBadge value={row.potential} colorMap={POTENTIAL_COLOR} />
              </td>
            </tr>
          ))}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={COLS.length} style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)', fontSize: '0.875rem' }}>
                No data for the selected filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

// ── Quality leads memo list ───────────────────────────────────────────────────

function MemoList({ deals }) {
  const [showAll, setShowAll] = useState(false)
  const quality = useMemo(
    () => deals
      .filter(d => d.is_quality_lead)
      .sort((a, b) => {
        const activeSort = (b.is_active ? 1 : 0) - (a.is_active ? 1 : 0)
        if (activeSort !== 0) return activeSort
        return new Date(b.date_added) - new Date(a.date_added)
      }),
    [deals]
  )
  const visible = showAll ? quality : quality.slice(0, 10)

  if (!quality.length) return (
    <p style={{ color: 'var(--muted)', fontSize: '0.875rem', padding: '8px 0' }}>
      No quality leads in the selected period.
    </p>
  )

  return (
    <div>
      {visible.map((deal, i) => (
        <div
          key={deal.name + i}
          style={{
            display: 'flex',
            gap: 16,
            padding: '10px 0',
            borderBottom: '1px solid var(--rule)',
            alignItems: 'flex-start',
          }}
        >
          <div style={{ width: 90, flexShrink: 0, fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--muted)', paddingTop: 1 }}>
            {formatDate(deal.date_added)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 2 }}>{deal.name}</div>
            {deal.activity_description && (
              <div style={{ fontSize: '0.8rem', color: 'var(--muted)', lineHeight: 1.4 }}>{deal.activity_description}</div>
            )}
          </div>
          <div style={{ width: 180, flexShrink: 0, fontSize: '0.75rem', color: 'var(--muted)', textAlign: 'right', paddingTop: 1 }}>
            {deal.origination_channel}
          </div>
        </div>
      ))}

      {quality.length > 10 && (
        <div style={{ marginTop: 10, textAlign: 'center' }}>
          <button
            onClick={() => setShowAll(v => !v)}
            style={{
              background: 'none',
              border: '1px solid var(--rule)',
              borderRadius: 6,
              padding: '5px 16px',
              fontSize: '0.8125rem',
              cursor: 'pointer',
              color: 'var(--muted)',
            }}
          >
            {showAll ? 'Show less' : `Show all ${quality.length} quality leads`}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ChannelPerformance() {
  const [chartPivot, setChartPivot] = useState('volume')

  const dealsQ   = useChannelDeals()
  const costsQ   = useChannelCosts()
  const actualsQ = useChannelCostActuals()

  const isLoading = dealsQ.isLoading
  const error     = dealsQ.error

  const deals   = dealsQ.data   ?? []
  const costs   = costsQ.data   ?? []
  const actuals = actualsQ.data ?? []

  // ── Build per-channel rows ─────────────────────────────────────────────────
  const tableRows = useMemo(() => {
    // Index costs and actuals by channel name
    const costsMap   = Object.fromEntries(costs.map(c => [c.channel_name, c]))
    const actualsMap = Object.fromEntries(actuals.map(a => [a.channel, a]))

    // Aggregate deals per channel (null channel → 'Unattributed')
    const acc = {}
    deals.forEach(d => {
      const ch = d.origination_channel || 'Unattributed'
      if (!acc[ch]) acc[ch] = { channel: ch, leads: 0, quality: 0, scoreSum: 0, scoreCount: 0, nboCount: 0 }
      acc[ch].leads++
      if (d.is_quality_lead) acc[ch].quality++
      if (d.attractiveness_score != null) {
        acc[ch].scoreSum += d.attractiveness_score
        acc[ch].scoreCount++
      }
      if (d.milestones && d.milestones.includes('NBO Sent')) acc[ch].nboCount++
    })

    return Object.values(acc).map(row => {
      const cost    = costsMap[row.channel]   ?? {}
      const actual  = actualsMap[row.channel] ?? {}
      const recurring = actual.total_cost_eur ?? null
      const qualityRate = row.leads > 0 ? Math.round((row.quality / row.leads) * 100) : 0
      const avgPriority = row.scoreCount > 0 ? row.scoreSum / row.scoreCount : null
      const costPerQL   = recurring && row.quality > 0 ? recurring / row.quality : null
      const costPerNbo  = recurring && row.nboCount > 0 ? recurring / row.nboCount : null

      return {
        channel:            row.channel,
        leads:              row.leads,
        quality:            row.quality,
        qualityRate,
        avgPriority,
        nboCount:           row.nboCount,
        costPerNbo,
        oneOffCost:         cost.one_off_cost ?? null,
        recurringCost:      recurring,
        totalHours:         actual.total_hours ?? null,
        costPerQualityLead: costPerQL,
        difficulty:         cost.difficulty ?? null,
        potential:          cost.potential  ?? null,
      }
    })
  }, [deals, costs, actuals])

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const totalLeads   = deals.length
    const totalQuality = deals.filter(d => d.is_quality_lead).length
    const qualityRate  = totalLeads > 0 ? Math.round((totalQuality / totalLeads) * 100) : 0
    const best = tableRows.slice().sort((a, b) => b.quality - a.quality)[0]
    return { totalLeads, totalQuality, qualityRate, bestChannel: best?.channel ?? '—', bestQuality: best?.quality ?? 0 }
  }, [deals, tableRows])

  // ── Chart data ─────────────────────────────────────────────────────────────
  const chartData = useMemo(() => {
    const sorted = tableRows.slice().sort((a, b) => {
      if (chartPivot === 'volume')   return b.leads - a.leads
      if (chartPivot === 'quality')  return b.quality - a.quality
      return (b.costPerQualityLead ?? Infinity) - (a.costPerQualityLead ?? Infinity)
    })
    return sorted.map(r => ({
      name:  r.channel.length > 30 ? r.channel.slice(0, 28) + '…' : r.channel,
      value: chartPivot === 'volume'  ? r.leads
           : chartPivot === 'quality' ? r.quality
           : r.costPerQualityLead ?? 0,
      rawChannel: r.channel,
    }))
  }, [tableRows, chartPivot])

  const chartHeight = Math.max(120, 40 + chartData.length * 36)

  const chartDesc = {
    volume:   'Total deals sourced per channel.',
    quality:  'High and Medium-High priority leads per channel.',
    cost:     'Actual recurring cost per quality lead (lower = more efficient).',
  }[chartPivot] ?? ''

  if (isLoading) return <LoadingSpinner />

  if (error) {
    return <div style={{ padding: '3rem', color: 'var(--danger)' }}>Failed to load: {error.message}</div>
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1.5rem 4rem' }}>
      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', marginBottom: '1.5rem' }}>
        Channel Performance
      </h1>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <KpiCard title="Total Leads"       value={kpis.totalLeads}   subtitle="in selected period" />
        <KpiCard title="Quality Leads"     value={kpis.totalQuality} subtitle="High or Med-High priority" />
        <KpiCard title="Quality Rate"      value={`${kpis.qualityRate}%`} subtitle="quality / total" />
        <KpiCard title="Best Channel"      value={kpis.bestChannel.length > 18 ? kpis.bestChannel.slice(0, 16) + '…' : kpis.bestChannel}
                                           subtitle={`${kpis.bestQuality} quality lead${kpis.bestQuality !== 1 ? 's' : ''}`} />
      </div>

      {deals.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--muted)', fontSize: '0.9375rem' }}>
          No data for the selected filters.
        </div>
      ) : (
        <>
          {/* Bar chart */}
          <div style={{ background: 'white', border: '1px solid var(--rule)', borderRadius: 8, padding: '20px 24px', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.0625rem' }}>Dealflow by Channel</h3>
              <PivotToggle
                value={chartPivot}
                onChange={setChartPivot}
                options={[
                  { key: 'volume',  label: 'By Volume' },
                  { key: 'quality', label: 'By Quality' },
                  { key: 'cost',    label: 'By Cost Efficiency' },
                ]}
              />
            </div>
            <p style={{ color: 'var(--muted)', fontSize: '0.75rem', marginBottom: 20 }}>{chartDesc}</p>
            <ResponsiveContainer width="100%" height={chartHeight}>
              <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 56, bottom: 4, left: 8 }}>
                <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#e5e2db" />
                <XAxis
                  type="number"
                  allowDecimals={chartPivot === 'cost'}
                  tickFormatter={chartPivot === 'cost' ? v => formatEur(v) : undefined}
                  tick={{ fontSize: 10, fontFamily: 'DM Mono, monospace' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={220}
                  tick={{ fontSize: 11, fontFamily: 'DM Sans, sans-serif' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={v => [chartPivot === 'cost' ? formatEur(v) : v,
                    chartPivot === 'volume' ? 'Leads' : chartPivot === 'quality' ? 'Quality Leads' : 'Cost / Quality Lead']}
                  contentStyle={{ fontSize: 12 }}
                />
                <Bar dataKey="value" fill="#1a3a2a" radius={[0, 4, 4, 0]}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? '#1a3a2a' : '#2d6a4a'} />
                  ))}
                  <LabelList
                    dataKey="value"
                    position="right"
                    formatter={v => chartPivot === 'cost' ? formatEur(v) : v}
                    style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', fill: '#0f0f0f', fontWeight: 600 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Main channel table */}
          <div style={{ background: 'white', border: '1px solid var(--rule)', borderRadius: 8, padding: '20px 24px', marginBottom: 24 }}>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.0625rem', marginBottom: 4 }}>Channel Breakdown</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.75rem', marginBottom: 16 }}>
              Click column headers to sort. Recurring cost sourced from actual time entries × hourly rates.
            </p>
            <ChannelTable rows={tableRows} />
          </div>

          {/* Quality leads memo */}
          <div style={{ background: 'white', border: '1px solid var(--rule)', borderRadius: 8, padding: '20px 24px' }}>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.0625rem', marginBottom: 4 }}>Quality Leads</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.75rem', marginBottom: 16 }}>
              All High and Medium-High priority leads in the selected period.
            </p>
            <MemoList deals={deals} />
          </div>
        </>
      )}
    </div>
  )
}
