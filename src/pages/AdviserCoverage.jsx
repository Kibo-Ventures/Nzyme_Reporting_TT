import { useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'
import { useAdviserDeals } from '../hooks/useAdviserDeals'
import KpiCard from '../components/ui/KpiCard'
import { TierBadge, StageBadge } from '../components/ui/Badge'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { shortName } from '../lib/utils'
import PageBanner from '../components/ui/PageBanner'
import InfoTooltip from '../components/ui/InfoTooltip'

// ── Colour helpers ──────────────────────────────────────────────────────────

function qualityColor(pct) {
  if (pct == null || isNaN(pct)) return 'var(--muted)'
  if (pct >= 20) return '#2d6a4a'
  if (pct >= 5)  return '#c07830'
  return '#c0392b'
}

const KAM_COLORS = ['#2d6a4a', '#2e6da4', '#c07830', '#6b3a80', '#3a4080', '#8a5020']

const DEAL_STAGE_RANK = {
  'Portfolio':                                            0,
  'DD phase':                                             1,
  'Working on a deal (significant effort)':               2,
  'Under analysis (team assigned, moderate effort)':      3,
  'Being explored (meetings only)':                       4,
  'To be processed':                                      5,
}
// Any unknown/discarded stage gets rank 999 → sinks to bottom

// ── Chart tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="rounded border px-3 py-2 text-sm shadow-sm"
      style={{ background: 'white', borderColor: 'var(--rule)' }}
    >
      <div className="font-medium mb-1" style={{ color: 'var(--ink)' }}>{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ color: p.fill }}>
          {p.name}: <strong>{p.value}</strong>
        </div>
      ))}
    </div>
  )
}

// ── Pivot toggle ─────────────────────────────────────────────────────────────

function PivotToggle({ options, value, onChange }) {
  return (
    <div className="flex gap-1">
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className="toggle-btn px-3 py-1 rounded-md text-xs font-medium border transition-colors"
          data-active={value === o ? 'true' : undefined}
          style={{
            background: value === o ? 'var(--accent)' : 'white',
            color:      value === o ? 'white'          : 'var(--ink)',
            borderColor: value === o ? 'var(--accent)' : 'var(--rule)',
          }}
        >
          {o}
        </button>
      ))}
    </div>
  )
}

// ── Memo table ───────────────────────────────────────────────────────────────

function MemoTable({ deals }) {
  const [showAll, setShowAll] = useState(false)
  const rows = showAll ? deals : deals.slice(0, 10)

  if (!deals.length) return null

  return (
    <div>
      <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--rule)' }}>
        <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--accent-light)' }}>
              {['Deal Name', 'Stage', 'Attractiveness', 'Introducer', 'Adviser', 'Deal Captain', 'Description'].map((h) => (
                <th
                  key={h}
                  className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide"
                  style={{ color: 'var(--muted)', borderBottom: '1px solid var(--rule)' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((d, i) => (
              <tr
                key={d.deal_id ?? i}
                style={{
                  borderBottom: '1px solid var(--rule)',
                  background: i % 2 === 0 ? 'white' : '#f5f7fa',
                }}
              >
                <td className="px-3 py-2 font-medium" style={{ color: 'var(--ink)' }}>
                  {d.deal_name}
                </td>
                <td className="px-3 py-2">
                  <StageBadge stage={d.stage} short />
                </td>
                <td className="px-3 py-2" style={{ color: 'var(--muted)', fontSize: '0.8125rem' }}>
                  {d.attractiveness || '—'}
                </td>
                <td className="px-3 py-2" style={{ color: 'var(--muted)' }}>
                  {d.introducer || '—'}
                </td>
                <td className="px-3 py-2">
                  {d.tier ? <TierBadge tier={d.tier} /> : null}
                  <span className="ml-1" style={{ color: 'var(--ink)' }}>{d.attributed_adviser || '—'}</span>
                </td>
                <td className="px-3 py-2" style={{ color: 'var(--ink)' }}>
                  {d.kam ? shortName(d.kam) : '—'}
                </td>
                <td
                  className="px-3 py-2 max-w-xs truncate"
                  style={{ color: 'var(--muted)' }}
                  title={d.activity_description}
                >
                  {d.activity_description || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {deals.length > 10 && (
        <button
          onClick={() => setShowAll((v) => !v)}
          className="mt-2 text-xs"
          style={{ color: 'var(--accent)' }}
        >
          {showAll ? 'Show less' : `Show all ${deals.length} deals`}
        </button>
      )}
    </div>
  )
}

// ── Grouped adviser table ────────────────────────────────────────────────────

function AdviserGroupTable({ grouped }) {
  // grouped: Map<kam, Map<adviser, { tier, leads, quality }>>
  // Separate normal rows from "No Adviser Data" rows; No Adviser Data renders at absolute bottom.
  const normalRows = []
  const noDataRows = []

  for (const [kam, advisers] of grouped.entries()) {
    let firstInKam = true
    for (const [adviser, stats] of advisers.entries()) {
      if (adviser === 'No Adviser Data') {
        noDataRows.push({ kam, stats })
      } else {
        normalRows.push({ kam, adviser, stats, firstInKam })
        firstInKam = false
      }
    }
  }

  const allRows = [
    ...normalRows,
    ...noDataRows.map((r) => ({ ...r, adviser: 'No Adviser Data', firstInKam: true })),
  ]

  return (
    <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--rule)' }}>
      <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: 'var(--accent-light)' }}>
            {['Deal Captain', 'Adviser', 'Tier', 'Total Leads', 'Quality Leads', '% Quality'].map((h) => (
              <th
                key={h}
                className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide"
                style={{ color: 'var(--muted)', borderBottom: '1px solid var(--rule)' }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {allRows.map(({ kam, adviser, stats, firstInKam }, i) => {
            const pct = stats.leads > 0 ? Math.round((stats.quality / stats.leads) * 100) : null
            const isNoData = adviser === 'No Adviser Data'
            return (
              <tr
                key={`${kam}|${adviser}|${i}`}
                style={{
                  borderBottom: '1px solid var(--rule)',
                  background: i % 2 === 0 ? 'white' : '#f5f7fa',
                }}
              >
                <td className="px-3 py-2 font-medium" style={{ color: 'var(--ink)' }}>
                  {firstInKam ? shortName(kam) : ''}
                </td>
                <td className="px-3 py-2" style={{ color: 'var(--ink)' }}>
                  {isNoData ? (
                    <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>No Adviser Data</span>
                  ) : adviser}
                </td>
                <td className="px-3 py-2">
                  {stats.tier ? <TierBadge tier={stats.tier} /> : <span style={{ color: 'var(--muted)' }}>—</span>}
                </td>
                <td className="px-3 py-2 font-mono">{stats.leads}</td>
                <td className="px-3 py-2 font-mono">{stats.quality}</td>
                <td className="px-3 py-2 font-mono font-semibold" style={{ color: qualityColor(pct) }}>
                  {pct != null ? `${pct}%` : '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export default function AdviserCoverage() {
  const { data: allDeals = [], isLoading, error } = useAdviserDeals()
  const [chartPivot, setChartPivot]       = useState('By Volume')
  const [sortKey, setSortKey]             = useState('leads')
  const [sortDir, setSortDir]             = useState('desc')

  // ── Filter to visible buckets ──────────────────────────────────────────────
  // Always include all adviser-attributed deals regardless of tier.
  // No Adviser Data is always shown in the table but excluded from KPIs.
  const visibleDeals = useMemo(() => allDeals, [allDeals])

  // Deals excluding No Adviser Data rows (used for quality KPIs)
  const kpiDeals = useMemo(
    () => visibleDeals.filter((d) => d.programme_bucket !== 'No Adviser Data'),
    [visibleDeals]
  )

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const total   = allDeals.length  // matches total rows shown in the grouped table
    const quality = kpiDeals.filter((d) => d.is_quality_lead).length
    const rate    = total > 0 ? Math.round((quality / total) * 100) : 0

    // Most active adviser by leads (excluding No Adviser Data)
    const adviserCounts = {}
    for (const d of kpiDeals) {
      const a = d.attributed_adviser
      if (a && a !== 'No Adviser Data') {
        adviserCounts[a] = (adviserCounts[a] ?? 0) + 1
      }
    }
    const topAdviser = Object.entries(adviserCounts).sort((a, b) => b[1] - a[1])[0]

    return { total, quality, rate, topAdviser }
  }, [allDeals, kpiDeals])

  // ── Chart data ─────────────────────────────────────────────────────────────
  const chartData = useMemo(() => {
    // By Volume / By Quality → per-adviser bar
    // By KAM → per-KAM bar
    if (chartPivot === 'By KAM') {
      const map = {}
      for (const d of kpiDeals) {
        const k = d.attributed_kam || 'Unknown'
        if (!map[k]) map[k] = { name: shortName(k), leads: 0, quality: 0 }
        map[k].leads++
        if (d.is_quality_lead) map[k].quality++
      }
      return Object.values(map).sort((a, b) => b.leads - a.leads)
    }

    // Per adviser
    const map = {}
    for (const d of kpiDeals) {
      const a = d.attributed_adviser || 'Unknown'
      if (!map[a]) map[a] = { name: a, leads: 0, quality: 0 }
      map[a].leads++
      if (d.is_quality_lead) map[a].quality++
    }
    return Object.values(map).sort((a, b) => b.leads - a.leads).slice(0, 20)
  }, [kpiDeals, chartPivot])

  // ── Grouped table (KAM → adviser) ─────────────────────────────────────────
  const grouped = useMemo(() => {
    // Build Map<kam, Map<adviser, {tier, leads, quality}>>
    // All adviser-attributed deals included regardless of tier; No Adviser Data shown at bottom per KAM
    const kamMap = new Map()

    for (const d of allDeals) {

      const kam = d.attributed_kam || 'No KAM Assigned'
      const adviser = d.attributed_adviser || 'No Adviser Data'

      if (!kamMap.has(kam)) kamMap.set(kam, new Map())
      const advMap = kamMap.get(kam)

      if (!advMap.has(adviser)) {
        advMap.set(adviser, { tier: d.tier ?? null, leads: 0, quality: 0 })
      }
      const row = advMap.get(adviser)
      row.leads++
      if (d.is_quality_lead) row.quality++
    }

    // Sort KAMs alphabetically; within each KAM sort advisers by leads desc,
    // but always put 'No Adviser Data' last
    const sorted = new Map(
      [...kamMap.entries()]
        .sort(([a], [b]) => {
          if (a === 'No KAM Assigned') return 1
          if (b === 'No KAM Assigned') return -1
          return a.localeCompare(b)
        })
        .map(([kam, advMap]) => {
          const sortedAdvisers = new Map(
            [...advMap.entries()].sort(([aName, aVal], [bName, bVal]) => {
              if (aName === 'No Adviser Data') return 1
              if (bName === 'No Adviser Data') return -1
              return bVal.leads - aVal.leads
            })
          )
          return [kam, sortedAdvisers]
        })
    )
    return sorted
  }, [allDeals])

  // ── Memo table deals ──────────────────────────────────────────────────────
  const memoDeals = useMemo(() => {
    return kpiDeals.sort((a, b) => {
      const ra = DEAL_STAGE_RANK[a.stage] ?? 999
      const rb = DEAL_STAGE_RANK[b.stage] ?? 999
      return ra - rb
    })
  }, [kpiDeals])

  // ── Sortable channel summary rows (for the per-adviser sort) ──────────────
  const handleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('desc') }
  }

  if (isLoading) {
    return (
      <div className="p-8 flex items-center gap-2" style={{ color: 'var(--muted)' }}>
        <LoadingSpinner /> Loading adviser data…
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8" style={{ color: 'var(--danger)' }}>
        Error loading adviser data: {error.message}
      </div>
    )
  }

  const chartDataKey = chartPivot === 'By Quality' ? 'quality' : 'leads'
  const chartLabel   = chartPivot === 'By Quality' ? 'Quality Leads' : 'Total Leads'

  return (
    <div className="p-8 space-y-8">
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl mb-1" style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, color: 'var(--ink)' }}>
            Adviser Coverage
          </h1>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Performance of the formal adviser programme
          </p>
        </div>
      </div>

      <PageBanner
        summary="Tracks dealflow from your adviser programme, by firm and KAM."
        body="Only deals where origination channel is 'Adviser Programme' are shown by default. Toggle 'Include Untiered' to also show deals from Untiered Connections. Firms are grouped under the KAM responsible for the relationship. Quality rate is colour-coded: green ≥ 20%, amber 5–20%, red below 5%."
        caveat="'No Adviser Data' rows are always shown but excluded from the KPI totals at the top."
      />

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard
          title="Total Adviser Deals"
          value={kpis.total}
          subtitle="within selected period"
        />
        <KpiCard
          title="Quality Leads"
          value={kpis.quality}
          subtitle="attractiveness 1–2"
        />
        <KpiCard
          title={<>Quality Rate <InfoTooltip text="Deals rated High or Medium-High attractiveness. Deals with no attractiveness set are not counted." /></>}
          value={`${kpis.rate}%`}
          subtitle="quality / total"
        />
        <KpiCard
          title="Most Active Adviser"
          value={kpis.topAdviser ? kpis.topAdviser[0] : '—'}
          subtitle={kpis.topAdviser ? `${kpis.topAdviser[1]} leads` : 'no data'}
        />
      </div>

      {/* ── Chart ── */}
      <div className="rounded-xl border p-6" style={{ borderColor: 'var(--rule)', background: 'white' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
              Dealflow per Adviser
            </div>
            <div className="text-xs" style={{ color: 'var(--muted)' }}>
              {chartLabel} by {chartPivot === 'By KAM' ? 'KAM' : 'adviser'}
            </div>
          </div>
          <PivotToggle
            options={['By Volume', 'By Quality', 'By KAM']}
            value={chartPivot}
            onChange={setChartPivot}
          />
        </div>

        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-sm" style={{ color: 'var(--muted)' }}>
            No data for the selected filters
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 28)}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 0, right: 24, bottom: 0, left: 120 }}
            >
              <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="var(--rule)" />
              <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--muted)' }} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="name"
                width={115}
                tick={{ fontSize: 11, fill: 'var(--ink)' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey={chartDataKey} name={chartLabel} radius={[0, 3, 3, 0]}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill={KAM_COLORS[i % KAM_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Grouped KAM → Adviser table ── */}
      <div className="rounded-xl border p-6" style={{ borderColor: 'var(--rule)', background: 'white' }}>
        <div className="mb-4">
          <div className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
            Adviser Breakdown by KAM
          </div>
          <div className="text-xs" style={{ color: 'var(--muted)' }}>
            Quality % colour-coded: <span style={{ color: '#2d6a4a' }}>≥20% green</span>
            {' · '}
            <span style={{ color: '#c07830' }}>5–20% amber</span>
            {' · '}
            <span style={{ color: '#c0392b' }}>{'<5% red'}</span>
          </div>
        </div>
        {grouped.size === 0 ? (
          <div className="text-sm text-center py-8" style={{ color: 'var(--muted)' }}>
            No data for the selected filters
          </div>
        ) : (
          <AdviserGroupTable grouped={grouped} />
        )}
      </div>

      {/* ── Memo table ── */}
      <div className="rounded-xl border p-6" style={{ borderColor: 'var(--rule)', background: 'white' }}>
        <div className="mb-4">
          <div className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
            LTM Adviser Deal Log
          </div>
          <div className="text-xs" style={{ color: 'var(--muted)' }}>
            All adviser-sourced deals in the last 12 months
          </div>
        </div>
        {memoDeals.length === 0 ? (
          <div className="text-sm text-center py-8" style={{ color: 'var(--muted)' }}>
            No data for the selected filters
          </div>
        ) : (
          <MemoTable deals={memoDeals} />
        )}
      </div>
    </div>
  )
}
