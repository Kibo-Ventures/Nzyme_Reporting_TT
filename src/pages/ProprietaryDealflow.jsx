import { useMemo, useState } from 'react'
import {
  PieChart, Pie, Cell, Label,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LabelList,
  ResponsiveContainer,
} from 'recharts'
import { useProprietaryDeals, useTotalDealsCount } from '../hooks/useProprietaryDeals'
import { PROPRIETARY_DEAL_GOAL } from '../lib/config'
import KpiCard from '../components/ui/KpiCard'
import { StageBadge } from '../components/ui/Badge'
import { shortName } from '../lib/utils'
import LoadingSpinner from '../components/ui/LoadingSpinner'

// ── Stage funnel order ────────────────────────────────────────────────────────

const FUNNEL_STAGE_ORDER = [
  'To be processed',
  'Being explored (meetings only)',
  'Under analysis (team assigned, moderate effort)',
  'Working on a deal (significant effort)',
  'DD phase',
  'Portfolio',
]

const FUNNEL_STAGE_LABELS = {
  'To be processed':                                  'To be Processed',
  'Being explored (meetings only)':                   'Being Explored',
  'Under analysis (team assigned, moderate effort)':  'Under Analysis',
  'Working on a deal (significant effort)':           'Working on Deal',
  'DD phase':                                         'DD Phase',
  'Portfolio':                                        'Portfolio',
}

const FUNNEL_STAGE_COLORS = {
  'To be processed':                                  '#d1d5db',
  'Being explored (meetings only)':                   '#9ca3af',
  'Under analysis (team assigned, moderate effort)':  '#c07830',
  'Working on a deal (significant effort)':           '#2e6da4',
  'DD phase':                                         '#1a3a2a',
  'Portfolio':                                        '#6b21a8',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatAttr(attr) {
  if (!attr) return '—'
  const m = attr.match(/^\d+\s*-\s*(.+)/)
  return m ? m[1] : attr
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

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

// ── Chart card ────────────────────────────────────────────────────────────────

function ChartCard({ title, description, action, children }) {
  return (
    <div
      style={{
        background: 'white',
        border: '1px solid var(--rule)',
        borderRadius: 8,
        padding: '20px 24px',
        marginBottom: 24,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
        <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.0625rem' }}>{title}</h3>
        {action}
      </div>
      {description && (
        <p style={{ color: 'var(--muted)', fontSize: '0.75rem', marginBottom: 20 }}>{description}</p>
      )}
      {children}
    </div>
  )
}

// ── Donut chart ───────────────────────────────────────────────────────────────

function DonutChart({ achieved, goal }) {
  const remaining = Math.max(0, goal - achieved)
  const over = achieved >= goal
  const data = over
    ? [{ value: goal, fill: '#1a3a2a' }]
    : [
        { value: achieved,  fill: '#1a3a2a' },
        { value: remaining, fill: '#e8f0eb' },
      ]

  return (
    <ResponsiveContainer width="100%" height={196}>
      <PieChart>
        <Pie
          data={data}
          innerRadius={62}
          outerRadius={88}
          startAngle={90}
          endAngle={-270}
          dataKey="value"
          strokeWidth={0}
          paddingAngle={over ? 0 : 2}
        >
          {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
          <Label
            content={({ viewBox }) => {
              const { cx, cy } = viewBox
              return (
                <text textAnchor="middle">
                  <tspan
                    x={cx} y={cy + 6}
                    fontSize={28} fontWeight={700}
                    fontFamily="DM Mono, monospace"
                    fill="#0f0f0f"
                  >
                    {achieved}
                  </tspan>
                  <tspan
                    x={cx} y={cy + 22}
                    fontSize={11} fill="#9a9589"
                    fontFamily="DM Sans, sans-serif"
                  >
                    of {goal}
                  </tspan>
                </text>
              )
            }}
          />
        </Pie>
        <Tooltip
          formatter={(v, _n, props) => [v, props.dataIndex === 0 ? 'Achieved' : 'Remaining']}
          contentStyle={{ fontSize: 12 }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}

// ── Drilldown table ───────────────────────────────────────────────────────────

const TABLE_COLS = [
  { key: 'name',                label: 'Deal' },
  { key: 'origination_channel', label: 'Channel' },
  { key: 'deal_captain',        label: 'Captain',  width: 110 },
  { key: 'attractiveness',      label: 'Priority', width: 96 },
  { key: 'stage',               label: 'Stage',    width: 130 },
  { key: 'date_added',          label: 'Date',     width: 104 },
]

function SortIcon({ active, dir }) {
  return (
    <span style={{ marginLeft: 4, opacity: active ? 1 : 0.3, fontSize: '0.6rem' }}>
      {active ? (dir === 'asc' ? '▲' : '▼') : '↕'}
    </span>
  )
}

function DrilldownTable({ deals }) {
  const [sortKey, setSortKey] = useState('date_added')
  const [sortDir, setSortDir] = useState('desc')
  const [showAll, setShowAll] = useState(false)

  function toggleSort(key) {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const sorted = useMemo(() => {
    return [...deals].sort((a, b) => {
      let av = a[sortKey] ?? ''
      let bv = b[sortKey] ?? ''
      if (typeof av === 'string') av = av.toLowerCase()
      if (typeof bv === 'string') bv = bv.toLowerCase()
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [deals, sortKey, sortDir])

  const visible = showAll ? sorted : sorted.slice(0, 10)

  const thStyle = {
    padding: '7px 10px',
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
    textAlign: 'left',
  }

  return (
    <div>
      <div style={{ overflowX: 'auto', border: '1px solid var(--rule)', borderRadius: 6 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white' }}>
          <thead>
            <tr>
              {TABLE_COLS.map(col => (
                <th key={col.key} style={thStyle} onClick={() => toggleSort(col.key)}>
                  {col.label}
                  <SortIcon active={sortKey === col.key} dir={sortDir} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={TABLE_COLS.length} style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)', fontSize: '0.875rem' }}>
                  No data for the selected filters.
                </td>
              </tr>
            )}
            {visible.map((deal, i) => (
              <tr key={deal.name + i} style={{ background: i % 2 === 0 ? 'white' : '#fafaf9' }}>
                <td style={{ padding: '8px 10px', fontSize: '0.8rem', fontWeight: 600, borderBottom: '1px solid var(--rule)' }}>
                  {deal.name}
                </td>
                <td style={{ padding: '8px 10px', fontSize: '0.8rem', borderBottom: '1px solid var(--rule)' }}>
                  {deal.origination_channel || '—'}
                </td>
                <td style={{ padding: '8px 10px', fontSize: '0.8rem', borderBottom: '1px solid var(--rule)', whiteSpace: 'nowrap' }}>
                  {deal.deal_captain ? shortName(deal.deal_captain) : '—'}
                </td>
                <td style={{ padding: '8px 10px', fontSize: '0.75rem', borderBottom: '1px solid var(--rule)', whiteSpace: 'nowrap', color: 'var(--ink)' }}>
                  {formatAttr(deal.attractiveness)}
                </td>
                <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--rule)', whiteSpace: 'nowrap' }}>
                  <StageBadge stage={deal.stage} short />
                </td>
                <td style={{ padding: '8px 10px', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--muted)', borderBottom: '1px solid var(--rule)', whiteSpace: 'nowrap' }}>
                  {formatDate(deal.date_added)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sorted.length > 10 && (
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
            {showAll ? 'Show less' : `Show all ${sorted.length} deals`}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProprietaryDealflow() {
  const [kamPivot, setKamPivot] = useState('volume')

  const { data: deals = [], isLoading, error } = useProprietaryDeals()
  const { data: totalCount = 0 } = useTotalDealsCount()

  const kpis = useMemo(() => {
    const quality = deals.filter(d => d.is_quality_lead).length
    const pctOfTotal = totalCount > 0 ? Math.round((deals.length / totalCount) * 100) : 0
    const kamCounts = {}
    deals.forEach(d => {
      if (!d.deal_captain) return
      kamCounts[d.deal_captain] = (kamCounts[d.deal_captain] || 0) + 1
    })
    const topKam = Object.entries(kamCounts).sort((a, b) => b[1] - a[1])[0]
    return {
      total:       deals.length,
      quality,
      pctOfTotal,
      topKam:      topKam ? shortName(topKam[0]) : '—',
      topKamCount: topKam ? topKam[1] : 0,
    }
  }, [deals, totalCount])

  const kamData = useMemo(() => {
    const acc = {}
    deals.forEach(d => {
      const name = d.deal_captain ? shortName(d.deal_captain) : 'Unknown'
      if (!acc[name]) acc[name] = { name, total: 0, quality: 0 }
      acc[name].total++
      if (d.is_quality_lead) acc[name].quality++
    })
    return Object.values(acc).sort((a, b) => b.total - a.total)
  }, [deals])

  const funnelData = useMemo(() => {
    const counts = {}
    deals.forEach(d => { counts[d.stage] = (counts[d.stage] || 0) + 1 })
    return FUNNEL_STAGE_ORDER
      .filter(s => counts[s] > 0)
      .map(s => ({ name: FUNNEL_STAGE_LABELS[s] ?? s, value: counts[s], fill: FUNNEL_STAGE_COLORS[s] ?? '#9ca3af' }))
      .sort((a, b) => b.value - a.value)
  }, [deals])

  const kamBarKey   = kamPivot === 'volume' ? 'total' : 'quality'
  const kamHeight   = Math.max(120, 40 + kamData.length * 34)
  const funnelHeight = Math.max(120, 40 + funnelData.length * 34)

  if (isLoading) return <LoadingSpinner />

  if (error) {
    return <div style={{ padding: '3rem', color: 'var(--danger)' }}>Failed to load: {error.message}</div>
  }

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '2rem 1.5rem 4rem' }}>
      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', marginBottom: '1.5rem' }}>
        Proprietary Dealflow
      </h1>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <KpiCard title="Proprietary Deals"  value={kpis.total}           subtitle={`goal: ${PROPRIETARY_DEAL_GOAL}`} />
        <KpiCard title="% of Total Dealflow" value={`${kpis.pctOfTotal}%`} subtitle="excl. adviser-sourced" />
        <KpiCard title="Quality Leads"       value={kpis.quality}         subtitle="High or Med-High priority" />
        <KpiCard title="Top KAM"             value={kpis.topKam}          subtitle={kpis.topKam !== '—' ? `${kpis.topKamCount} deal${kpis.topKamCount !== 1 ? 's' : ''}` : 'no data'} />
      </div>

      {deals.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--muted)', fontSize: '0.9375rem' }}>
          No data for the selected filters.
        </div>
      ) : (
        <>
          {/* Donut + KAM bar */}
          <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20, marginBottom: 24 }}>
            {/* Donut card */}
            <div style={{ background: 'white', border: '1px solid var(--rule)', borderRadius: 8, padding: '20px 16px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '0.9375rem', marginBottom: 2, textAlign: 'center' }}>
                Goal Progress
              </h3>
              <p style={{ color: 'var(--muted)', fontSize: '0.6875rem', marginBottom: 4, textAlign: 'center' }}>
                Proprietary deals vs target
              </p>
              <DonutChart achieved={kpis.total} goal={PROPRIETARY_DEAL_GOAL} />
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 4 }}>
                {[['#1a3a2a', 'Achieved'], ['#e8f0eb', 'Remaining']].map(([bg, label]) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.6875rem', color: 'var(--muted)' }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: bg, border: bg === '#e8f0eb' ? '1px solid #ccc' : 'none', display: 'inline-block' }} />
                    {label}
                  </div>
                ))}
              </div>
            </div>

            {/* KAM bar chart */}
            <ChartCard
              title="Deals per Deal Captain"
              description="Proprietary deal volume by team member in the selected timeframe."
              action={
                <PivotToggle
                  value={kamPivot}
                  onChange={setKamPivot}
                  options={[{ key: 'volume', label: 'By Volume' }, { key: 'quality', label: 'By Quality' }]}
                />
              }
            >
              <ResponsiveContainer width="100%" height={kamHeight}>
                <BarChart data={kamData} layout="vertical" margin={{ top: 4, right: 48, bottom: 4, left: 8 }}>
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#e5e2db" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fontFamily: 'DM Mono, monospace' }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 11, fontFamily: 'DM Sans, sans-serif' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v) => [v, kamPivot === 'volume' ? 'Deals' : 'Quality Leads']} contentStyle={{ fontSize: 12 }} />
                  <Bar dataKey={kamBarKey} fill="#1a3a2a" radius={[0, 4, 4, 0]}>
                    <LabelList dataKey={kamBarKey} position="right" style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', fill: '#0f0f0f', fontWeight: 600 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Funnel */}
          <ChartCard title="Pipeline Stage Distribution" description="Proprietary deals by current pipeline stage.">
            <ResponsiveContainer width="100%" height={funnelHeight}>
              <BarChart data={funnelData} layout="vertical" margin={{ top: 4, right: 48, bottom: 4, left: 8 }}>
                <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#e5e2db" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fontFamily: 'DM Mono, monospace' }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" width={130} tick={{ fontSize: 11, fontFamily: 'DM Sans, sans-serif' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => [v, 'Deals']} contentStyle={{ fontSize: 12 }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {funnelData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  <LabelList dataKey="value" position="right" style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', fill: '#0f0f0f', fontWeight: 600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Drilldown table */}
          <ChartCard title="All Proprietary Deals" description="Click column headers to sort.">
            <DrilldownTable deals={deals} />
          </ChartCard>
        </>
      )}
    </div>
  )
}
