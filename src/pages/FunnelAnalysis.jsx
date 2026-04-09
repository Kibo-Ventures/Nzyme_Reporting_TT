import { useEffect, useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList,
} from 'recharts'
import {
  useFunnelStages,
  useStageHistogram,
  useAdviserStageBreakdown,
  useFunnelDeals,
  useStageTimeInvestment,
  useLostDiscardedDeals,
  useLostDiscardedHistory,
  useCurrentPortfolioCount,
} from '../hooks/useFunnelAnalysis'
import { useFilters } from '../hooks/useFilters'
import KpiCard from '../components/ui/KpiCard'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import PageBanner from '../components/ui/PageBanner'
import InfoTooltip from '../components/ui/InfoTooltip'

// ── Stage display helpers ────────────────────────────────────────────────────

const STAGE_ORDER = [
  'To be processed',
  'Being explored (meetings only)',
  'Under analysis (team assigned, moderate effort)',
  'Working on a deal (significant effort)',
  'DD phase',
  'Portfolio',
]

const STAGE_SHORT = {
  'To be processed':                                      'To Be Processed',
  'Being explored (meetings only)':                       'Being Explored',
  'Under analysis (team assigned, moderate effort)':      'Under Analysis',
  'Working on a deal (significant effort)':               'Working on Deal',
  'DD phase':                                             'DD Phase',
  'Portfolio':                                            'Portfolio',
}

const STAGE_COLORS = [
  '#9ca3af', // To be processed — grey
  '#6b7280', // Being explored
  '#c07830', // Under analysis — amber
  '#2e6da4', // Working on deal — blue
  '#1a3a2a', // DD phase — dark green
  '#6b21a8', // Portfolio — purple
]

// Colour per stage value
const STAGE_COLOR_MAP = Object.fromEntries(STAGE_ORDER.map((s, i) => [s, STAGE_COLORS[i]]))

// ── Histogram bucketing ──────────────────────────────────────────────────────

const BUCKETS = [
  { label: '0–7d',   min: 0,   max: 7   },
  { label: '8–14d',  min: 8,   max: 14  },
  { label: '15–30d', min: 15,  max: 30  },
  { label: '31–60d', min: 31,  max: 60  },
  { label: '61–90d', min: 61,  max: 90  },
  { label: '91–180d',min: 91,  max: 180 },
  { label: '180d+',  min: 181, max: Infinity },
]

function bucketDays(values) {
  return BUCKETS.map((b) => ({
    label: b.label,
    count: values.filter((v) => v >= b.min && v <= b.max).length,
  }))
}

function median(values) {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : Math.round((sorted[mid - 1] + sorted[mid]) / 2)
}

// ── Tooltip ──────────────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="rounded border px-3 py-2 text-sm shadow-sm"
      style={{ background: 'white', borderColor: 'var(--rule)' }}
    >
      <div className="font-medium mb-1" style={{ color: 'var(--ink)' }}>{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ color: p.fill ?? 'var(--ink)' }}>
          {p.name}: <strong>{p.value}</strong>
        </div>
      ))}
    </div>
  )
}

// ── Conversion % colouring ───────────────────────────────────────────────────

function convColor(pct) {
  if (pct == null) return 'var(--muted)'
  if (pct >= 50) return '#2d6a4a'
  if (pct >= 25) return '#c07830'
  return '#c0392b'
}

// ── Filter toggle pills ───────────────────────────────────────────────────────

function FilterPills({ filterType, onChange }) {
  const options = [
    { key: 'captains', label: 'Team Captains' },
    { key: 'channels', label: 'Origination Channels' },
    { key: 'advisers', label: 'Adviser Organisation' },
  ]
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {options.map(opt => (
        <button
          key={opt.key}
          onClick={() => onChange(filterType === opt.key ? null : opt.key)}
          className="toggle-btn"
          data-active={filterType === opt.key ? 'true' : undefined}
          style={{
            padding: '5px 14px',
            fontSize: '0.75rem',
            fontWeight: filterType === opt.key ? 600 : 400,
            border: '1px solid var(--rule)',
            borderRadius: 6,
            background: filterType === opt.key ? 'var(--accent)' : 'white',
            color: filterType === opt.key ? 'white' : 'var(--ink)',
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

// ── Time Invested Table ───────────────────────────────────────────────────────

function TimeInvestedTable({ stages, timeByStage }) {
  const [expandedStage, setExpandedStage] = useState(null)

  return (
    <div style={{ overflowX: 'auto', border: '1px solid var(--rule)', borderRadius: 8 }}>
      <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f5f7fa' }}>
            {['Stage', 'Total Hours', 'Avg Hrs to Progress', 'Deals with Hours'].map((h, i) => (
              <th
                key={h}
                className="px-3 py-2 text-xs font-semibold uppercase tracking-wide"
                style={{
                  color: 'var(--muted)',
                  borderBottom: '2px solid var(--rule)',
                  textAlign: i === 0 ? 'left' : 'right',
                  whiteSpace: 'nowrap',
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {stages.map((s, i) => {
            const ti = timeByStage[s.stage_value]
            const totalHrs = ti ? Math.round(ti.total) : 0
            const avgHrsProgressing = ti && ti.advancingCount > 0
              ? (ti.advancing / ti.advancingCount).toFixed(1)
              : null
            const isExpanded = expandedStage === s.stage_value
            const short = STAGE_SHORT[s.stage_value] ?? s.stage_value

            return (
              <>
                <tr
                  key={s.stage_value}
                  onClick={() => setExpandedStage(isExpanded ? null : s.stage_value)}
                  style={{
                    borderBottom: isExpanded ? 'none' : '1px solid var(--rule)',
                    background: isExpanded ? '#f8fafb' : i % 2 === 0 ? 'white' : '#f5f7fa',
                    cursor: ti ? 'pointer' : 'default',
                  }}
                >
                  <td className="px-3 py-2" style={{ color: 'var(--ink)', whiteSpace: 'nowrap' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        width: 8, height: 8,
                        borderRadius: '50%',
                        background: STAGE_COLORS[i] ?? '#9ca3af',
                        marginRight: 8,
                        flexShrink: 0,
                      }}
                    />
                    {ti && (
                      <span style={{ fontSize: '0.6rem', color: 'var(--muted)', marginRight: 6, transition: 'transform 0.15s', display: 'inline-block', transform: isExpanded ? 'rotate(90deg)' : 'none' }}>
                        ▶
                      </span>
                    )}
                    {short}
                  </td>
                  <td className="px-3 py-2 font-mono" style={{ textAlign: 'right', color: totalHrs > 0 ? 'var(--ink)' : 'var(--muted)' }}>
                    {totalHrs > 0 ? `${totalHrs}h` : '—'}
                  </td>
                  <td className="px-3 py-2 font-mono" style={{ textAlign: 'right', color: 'var(--muted)' }}>
                    {avgHrsProgressing != null ? `${avgHrsProgressing}h` : '—'}
                  </td>
                  <td className="px-3 py-2 font-mono" style={{ textAlign: 'right', color: 'var(--muted)' }}>
                    {ti ? ti.deals.length : '—'}
                  </td>
                </tr>
                {isExpanded && ti && (
                  <tr key={`${s.stage_value}-expand`} style={{ borderBottom: '1px solid var(--rule)' }}>
                    <td colSpan={4} style={{ padding: '0 0 8px 0', background: '#f8fafb' }}>
                      <div style={{ padding: '8px 16px 4px 40px', display: 'flex', flexWrap: 'wrap', gap: '6px 24px' }}>
                        {ti.deals.map(d => (
                          <div key={d.name} style={{ display: 'flex', gap: 8, alignItems: 'center', minWidth: 200 }}>
                            {d.advanced && (
                              <span style={{ fontSize: '0.7rem', color: '#2d6a4a', fontWeight: 700 }} title="Advanced to next stage">→</span>
                            )}
                            <span style={{ fontSize: '0.8rem', color: 'var(--ink)', fontWeight: 500 }}>{d.name}</span>
                            <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>{d.hrs}h</span>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function FunnelAnalysis() {
  // useFilters returns { filters, setFilter, resetFilters } — unwrap correctly
  const { filters, setFilter } = useFilters()
  const { dateRange } = filters
  const isDateFiltered = dateRange !== 'all'

  // Funnel defaults to all-time on mount so the pre-aggregated view is the baseline
  useEffect(() => {
    setFilter({ dateRange: 'all' })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const { data: stages = [], isLoading, error } = useFunnelStages()
  const { data: portfolioCount = 0 } = useCurrentPortfolioCount()
  const [selectedStage, setSelectedStage] = useState(null)
  const [filterType, setFilterType] = useState(null)
  const [filterValue, setFilterValue] = useState(null)
  const [ldFilter, setLdFilter] = useState('all') // 'all' | 'lost' | 'discarded'
  const { data: histogramRaw = [], isLoading: histLoading } = useStageHistogram(selectedStage)
  const { data: adviserRaw = [] } = useAdviserStageBreakdown()
  // Pass the actual filter values object (not the whole context wrapper)
  const { data: allDeals = [] } = useFunnelDeals(filters)
  const { data: timeInvestmentRaw = [] } = useStageTimeInvestment()
  const { data: ldDeals = [] } = useLostDiscardedDeals()
  const ldDealNames = useMemo(() => ldDeals.map(d => d.name).filter(Boolean), [ldDeals])
  const { data: ldHistory = [] } = useLostDiscardedHistory(ldDealNames)

  // Reset filterValue when filterType changes
  function handleFilterType(type) {
    setFilterType(type)
    setFilterValue(null)
  }

  // ── Filter dropdown options ────────────────────────────────────────────────
  const filterOptions = useMemo(() => {
    if (filterType === 'captains') {
      const vals = new Set()
      allDeals.forEach(d => {
        if (d.deal_captain) {
          d.deal_captain.split(/[,;]/).map(v => v.trim()).filter(Boolean).forEach(v => vals.add(v))
        }
      })
      return [...vals].sort()
    }
    if (filterType === 'channels') {
      return [...new Set(allDeals.map(d => d.origination_channel).filter(Boolean))].sort()
    }
    if (filterType === 'advisers') {
      return [...new Set(adviserRaw.map(d => d.attributed_adviser).filter(Boolean))].sort()
    }
    return []
  }, [filterType, allDeals, adviserRaw])

  // ── Filtered funnel computation ────────────────────────────────────────────
  // Triggers when date is filtered OR a captain/channel/adviser filter is active.
  // When date-filtered, allDeals is already scoped to the date range by the hook.
  const filteredStages = useMemo(() => {
    if (!filterType && !filterValue && !isDateFiltered) return null

    let deals = allDeals
    if (filterType === 'captains')
      deals = allDeals.filter(d => (d.deal_captain || '').includes(filterValue))
    if (filterType === 'channels')
      deals = allDeals.filter(d => d.origination_channel === filterValue)
    if (filterType === 'advisers')
      deals = adviserRaw.filter(d => d.attributed_adviser === filterValue)

    const total = deals.length
    return STAGE_ORDER.map((stageVal, idx) => {
      const reached = deals.filter(d => STAGE_ORDER.indexOf(d.stage) >= idx).length
      const prevReached = idx === 0 ? null : deals.filter(d => STAGE_ORDER.indexOf(d.stage) >= idx - 1).length
      return {
        stage_value: stageVal,
        stage_rank: idx + 1,
        reached_stage: reached,
        median_days_in_stage: null,
        cumulative_conversion_pct: total > 0 ? Math.round((reached / total) * 100) : null,
        stage_to_stage_pct: prevReached > 0 ? Math.round((reached / prevReached) * 100) : null,
      }
    }).filter(s => s.reached_stage > 0)
  }, [filterType, filterValue, isDateFiltered, allDeals, adviserRaw])

  // Active dataset: filtered when both filterType + filterValue set, else DB view
  const activeStages = filteredStages ?? stages

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    if (!activeStages.length) return {}
    const entry     = activeStages[0]?.reached_stage ?? 0
    const portfolio = activeStages.find((s) => s.stage_value === 'Portfolio')?.reached_stage ?? 0
    const convRate  = entry > 0 ? Math.round((portfolio / entry) * 100) : 0
    // avgDays only from DB view (not available when filtered)
    const avgDays = filteredStages
      ? null
      : stages.filter(s => s.stage_value !== 'Portfolio').reduce((sum, s) => sum + (s.median_days_in_stage ?? 0), 0)
    return { entry, portfolio, convRate, avgDays: avgDays != null ? Math.round(avgDays) : null }
  }, [activeStages, filteredStages, stages])

  // ── Horizontal bar chart data ─────────────────────────────────────────────
  const barData = useMemo(
    () =>
      activeStages.map((s, i) => ({
        name:  STAGE_SHORT[s.stage_value] ?? s.stage_value,
        full:  s.stage_value,
        value: s.reached_stage ?? 0,
        fill:  STAGE_COLOR_MAP[s.stage_value] ?? STAGE_COLORS[i] ?? '#9ca3af',
      })),
    [activeStages]
  )

  // ── Histogram ─────────────────────────────────────────────────────────────
  const histData = useMemo(() => bucketDays(histogramRaw), [histogramRaw])

  // ── Time investment: hours per stage + per-deal drilldown ─────────────────
  const timeByStage = useMemo(() => {
    const map = {}
    timeInvestmentRaw.forEach(r => {
      if (!map[r.stage_value]) map[r.stage_value] = { total: 0, advancing: 0, advancingCount: 0, deals: [] }
      map[r.stage_value].total += r.total_hours || 0
      if (r.did_advance) {
        map[r.stage_value].advancing += r.total_hours || 0
        map[r.stage_value].advancingCount++
      }
      if (r.total_hours > 0) {
        map[r.stage_value].deals.push({ name: r.deal_name, hrs: Math.round(r.total_hours), advanced: r.did_advance })
      }
    })
    Object.values(map).forEach(s => s.deals.sort((a, b) => b.hrs - a.hrs))
    return map
  }, [timeInvestmentRaw])

  // ── Lost & Discarded KPIs ─────────────────────────────────────────────────
  const ldKpis = useMemo(() => {
    const lostDeals      = ldDeals.filter(d => d.stage === 'Lost')
    const discardedDeals = ldDeals.filter(d => d.stage === 'Discarded')

    // Sum all days_in_stage per deal (total funnel time before exit)
    const histByDeal = {}
    ldHistory.forEach(h => {
      histByDeal[h.deal_name] = (histByDeal[h.deal_name] || 0) + h.days_in_stage
    })

    const medianDays = (names) => median(names.map(n => histByDeal[n]).filter(v => v > 0))

    return {
      totalLost:          lostDeals.length,
      totalDiscarded:     discardedDeals.length,
      medianDaysLost:     medianDays(lostDeals.map(d => d.name)),
      medianDaysDiscarded: medianDays(discardedDeals.map(d => d.name)),
    }
  }, [ldDeals, ldHistory])

  // ── Last active stage per deal — the stage just before it moved to Lost/Discarded.
  //    Uses stage history, ignoring the terminal 'Lost'/'Discarded' entries themselves.
  const dealFurthestStage = useMemo(() => {
    const TERMINAL = new Set(['Lost', 'Discarded'])
    const map = {}
    ldHistory
      .filter(h => !TERMINAL.has(h.stage_value))
      .forEach(h => {
        const newIdx     = STAGE_ORDER.indexOf(h.stage_value)
        const currentIdx = STAGE_ORDER.indexOf(map[h.deal_name] ?? '')
        if (newIdx > currentIdx) map[h.deal_name] = h.stage_value
      })
    return map // { dealName: lastActiveStageValue }
  }, [ldDeals, ldHistory])

  // ── Lost & Discarded bar chart data (by stage) ────────────────────────────
  const lostDiscardedBarData = useMemo(() => {
    const lostDeals      = ldDeals.filter(d => d.stage === 'Lost')
    const discardedDeals = ldDeals.filter(d => d.stage === 'Discarded')

    return STAGE_ORDER.map(stageVal => {
      const lostAtStage      = lostDeals.filter(d => dealFurthestStage[d.name] === stageVal).length
      const discardedAtStage = discardedDeals.filter(d => dealFurthestStage[d.name] === stageVal).length
      return {
        name:      STAGE_SHORT[stageVal] ?? stageVal,
        lost:      lostAtStage,
        discarded: discardedAtStage,
        total:     lostAtStage + discardedAtStage,
      }
    }).filter(d => d.total > 0)
  }, [ldDeals, dealFurthestStage])

  // ── Avg days in stage table (respects ldFilter) ───────────────────────────
  const avgDaysTableData = useMemo(() => {
    const lostDeals      = ldDeals.filter(d => d.stage === 'Lost')
    const discardedDeals = ldDeals.filter(d => d.stage === 'Discarded')

    const relevantNames = new Set(
      ldFilter === 'lost'      ? lostDeals.map(d => d.name)
      : ldFilter === 'discarded' ? discardedDeals.map(d => d.name)
      : ldDeals.map(d => d.name)
    )

    const stageMap = {}
    const TERMINAL = new Set(['Lost', 'Discarded'])
    ldHistory
      .filter(h => relevantNames.has(h.deal_name) && !TERMINAL.has(h.stage_value))
      .forEach(h => {
        if (!stageMap[h.stage_value]) stageMap[h.stage_value] = { values: [], deals: new Set() }
        stageMap[h.stage_value].values.push(h.days_in_stage)
        stageMap[h.stage_value].deals.add(h.deal_name)
      })

    return STAGE_ORDER
      .filter(s => stageMap[s])
      .map(s => ({
        stage:      s,
        shortName:  STAGE_SHORT[s] ?? s,
        medianDays: median(stageMap[s].values),
        dealCount:  stageMap[s].deals.size,
      }))
  }, [ldDeals, ldHistory, ldFilter])

  if (isLoading) {
    return (
      <div className="p-8 flex items-center gap-2" style={{ color: 'var(--muted)' }}>
        <LoadingSpinner /> Loading funnel data…
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8" style={{ color: 'var(--danger)' }}>
        Error loading funnel data: {error.message}
      </div>
    )
  }

  return (
    <div className="p-8 space-y-8">
      {/* ── Header ── */}
      <div>
        <h1
          className="text-2xl mb-1"
          style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          Funnel Analysis
        </h1>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          Deal lifecycle — stage progression and conversion rates
        </p>
      </div>

      <PageBanner
        summary="Shows how deals have moved through the pipeline stages over time."
        body="Each stage bar shows the cumulative count of deals that reached or passed that stage, not just deals currently sitting in it. The date filter scopes deals by their date_added — use 'All' for the full historical picture, or switch to LTM/YTD to see pipeline development over a specific period. Clicking a stage row expands a time-in-stage histogram. Note: median days per stage always reflects all-time data from the full stage history."
      />

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard
          title="Deals Entered Funnel"
          value={kpis.entry ?? '—'}
          subtitle={isDateFiltered ? `count of deals sourced in period` : 'count of all deals, any stage'}
        />
        <KpiCard
          title="Portfolio (Invested)"
          value={portfolioCount}
          subtitle="currently in Portfolio stage"
        />
        <KpiCard
          title="Entry → Portfolio"
          value={kpis.convRate != null ? `${kpis.convRate}%` : '—'}
          subtitle="overall conversion rate"
        />
        <KpiCard
          title="Median Days to Portfolio"
          value={kpis.avgDays ?? '—'}
          subtitle="sum of median time across pre-portfolio stages"
        />
      </div>

      {/* ── Bar chart ── */}
      <div className="rounded-lg border p-6" style={{ borderColor: 'var(--rule)', background: 'white' }}>
        <div className="mb-4 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-sm font-semibold" style={{ color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 5 }}>
              Deals Reaching Each Stage
              <InfoTooltip text="Based on deals sourced (date added in Affinity) in the selected period. Deals added earlier that advanced later are not included." />
            </div>
            <div className="text-xs" style={{ color: 'var(--muted)' }}>
              {filterType && filterValue
                ? `Filtered: ${filterValue}`
                : 'Count of deals that reached or passed each stage'}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
            <FilterPills filterType={filterType} onChange={handleFilterType} />
            {filterType && (
              <select
                value={filterValue ?? ''}
                onChange={e => setFilterValue(e.target.value || null)}
                style={{
                  padding: '5px 10px',
                  fontSize: '0.75rem',
                  border: '1px solid var(--rule)',
                  borderRadius: 8,
                  background: 'white',
                  color: filterValue ? 'var(--ink)' : 'var(--muted)',
                  cursor: 'pointer',
                  minWidth: 180,
                }}
              >
                <option value="">All {filterType === 'captains' ? 'Captains' : filterType === 'channels' ? 'Channels' : 'Advisers'}</option>
                {filterOptions.map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {barData.length === 0 ? (
          <div className="text-sm text-center py-8" style={{ color: 'var(--muted)' }}>
            No funnel data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              layout="vertical"
              data={barData}
              margin={{ top: 4, right: 48, bottom: 4, left: 130 }}
            >
              <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="var(--rule)" />
              <YAxis
                dataKey="name"
                type="category"
                width={120}
                tick={{ fontSize: 12, fill: 'var(--ink)' }}
                axisLine={false}
                tickLine={false}
              />
              <XAxis
                type="number"
                allowDecimals={false}
                tick={{ fontSize: 11, fill: 'var(--muted)' }}
              />
              <Tooltip
                formatter={(v) => [v, 'Deals']}
                contentStyle={{ fontSize: 12 }}
              />
              <Bar dataKey="value" name="Deals" radius={[0, 3, 3, 0]} isAnimationActive={false}>
                {barData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
                <LabelList dataKey="value" position="right" style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', fill: 'var(--muted)' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Stats table ── */}
      <div className="rounded-lg border p-6" style={{ borderColor: 'var(--rule)', background: 'white' }}>
        <div className="mb-4">
          <div className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
            Stage Statistics
          </div>
          <div className="text-xs" style={{ color: 'var(--muted)' }}>
            Click a row to see time-in-stage distribution below
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--accent-light)' }}>
                {[
                  { label: 'Stage' },
                  { label: 'Reached' },
                  { label: "Didn't Advance" },
                  { label: 'Cumul. Conv. %', tooltip: 'The % of all deals ever seen that made it to this stage or beyond. Not stage-to-stage — it\'s always relative to total deals entered.' },
                  { label: 'Stage-to-Stage %' },
                  { label: 'Median Days', tooltip: 'Average number of days deals spent in this stage before moving on or stalling.' },
                  { label: 'Total Hrs' },
                  { label: 'Avg Hrs to Progress' },
                ].map(({ label, tooltip }) => (
                  <th
                    key={label}
                    className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide"
                    style={{ color: 'var(--muted)', borderBottom: '1px solid var(--rule)' }}
                  >
                    {label}
                    {tooltip && <InfoTooltip text={tooltip} />}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeStages.map((s, i) => {
                const short    = STAGE_SHORT[s.stage_value] ?? s.stage_value
                const didntAdv = i > 0
                  ? (activeStages[i - 1].reached_stage ?? 0) - (s.reached_stage ?? 0)
                  : '—'
                const isSelected = selectedStage === s.stage_value
                return (
                  <tr
                    key={s.stage_value}
                    onClick={() => setSelectedStage(isSelected ? null : s.stage_value)}
                    style={{
                      borderBottom: '1px solid var(--rule)',
                      background:   isSelected ? 'var(--accent-light)' : i % 2 === 0 ? 'white' : '#f5f7fa',
                      cursor:       'pointer',
                    }}
                    className="hover:bg-[var(--accent-light)] transition-colors"
                  >
                    <td className="px-3 py-2">
                      <span
                        className="inline-block w-2 h-2 rounded-full mr-2"
                        style={{ background: STAGE_COLOR_MAP[s.stage_value] ?? '#9ca3af' }}
                      />
                      <span style={{ color: 'var(--ink)', fontWeight: isSelected ? 600 : 400 }}>
                        {short}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono" style={{ color: 'var(--ink)' }}>
                      {s.reached_stage ?? '—'}
                    </td>
                    <td className="px-3 py-2 font-mono" style={{ color: 'var(--ink)' }}>
                      {typeof didntAdv === 'number' ? didntAdv : '—'}
                    </td>
                    <td
                      className="px-3 py-2 font-mono font-semibold"
                      style={{ color: convColor(s.cumulative_conversion_pct) }}
                    >
                      {s.cumulative_conversion_pct != null ? `${s.cumulative_conversion_pct}%` : '—'}
                    </td>
                    <td
                      className="px-3 py-2 font-mono font-semibold"
                      style={{ color: convColor(s.stage_to_stage_pct) }}
                    >
                      {s.stage_to_stage_pct != null ? `${s.stage_to_stage_pct}%` : '—'}
                    </td>
                    <td className="px-3 py-2 font-mono" style={{ color: 'var(--muted)' }}>
                      {s.median_days_in_stage != null ? `${Math.round(s.median_days_in_stage)}d` : '—'}
                    </td>
                    {(() => {
                      const ti = timeByStage[s.stage_value]
                      const totalHrs = ti ? Math.round(ti.total) : null
                      const avgHrsProgressing = ti && ti.advancingCount > 0
                        ? Math.round(ti.advancing / ti.advancingCount)
                        : null
                      return (
                        <>
                          <td className="px-3 py-2 font-mono" style={{ color: 'var(--ink)' }}>
                            {totalHrs != null ? `${totalHrs}h` : '—'}
                          </td>
                          <td className="px-3 py-2 font-mono" style={{ color: 'var(--muted)' }}>
                            {avgHrsProgressing != null ? `${avgHrsProgressing}h` : '—'}
                          </td>
                        </>
                      )
                    })()}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Time-in-stage histogram ── */}
      {selectedStage && (
        <div className="rounded-lg border p-6" style={{ borderColor: 'var(--rule)', background: 'white' }}>
          <div className="mb-4">
            <div className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
              Time in Stage — {STAGE_SHORT[selectedStage] ?? selectedStage}
            </div>
            <div className="text-xs" style={{ color: 'var(--muted)' }}>
              Distribution of days spent in this stage across all deals
            </div>
          </div>

          {histLoading ? (
            <div className="flex items-center gap-2 py-4" style={{ color: 'var(--muted)' }}>
              <LoadingSpinner /> Loading…
            </div>
          ) : histogramRaw.length === 0 ? (
            <div className="text-sm text-center py-8" style={{ color: 'var(--muted)' }}>
              No time-in-stage data yet — will populate once webhook history is collected
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={histData} margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--rule)" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--muted)' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--muted)' }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Deals" fill="#2e6da4" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {/* ── Time invested per stage ── */}
      {timeInvestmentRaw.length > 0 && (
        <div className="rounded-lg border p-6" style={{ borderColor: 'var(--rule)', background: 'white' }}>
          <div className="mb-4">
            <div className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
              Time Invested per Stage
            </div>
            <div className="text-xs" style={{ color: 'var(--muted)' }}>
              Actual hours logged while each deal was in that stage. Click a stage row to expand deal breakdown. <span style={{ color: '#2d6a4a', fontWeight: 600 }}>→</span> indicates deal advanced to next stage.
            </div>
          </div>
          <TimeInvestedTable stages={activeStages} timeByStage={timeByStage} />
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          LOST & DISCARDED DEALS
      ══════════════════════════════════════════════════════════════════════ */}
      <div style={{ borderTop: '2px solid var(--rule)', paddingTop: 8 }}>
        <h2
          className="text-lg mb-1"
          style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, color: 'var(--ink)' }}
        >
          Lost &amp; Discarded Deals
        </h2>
        <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
          Deals that exited the pipeline — at which stage they dropped out and how long they spent in the funnel
        </p>
      </div>

      {/* ── LD KPI cards ── */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard
          title="Deals Lost"
          value={ldKpis.totalLost ?? '—'}
          subtitle='In stage "Lost"'
        />
        <KpiCard
          title="Median Days → Lost"
          value={ldKpis.medianDaysLost != null ? `${ldKpis.medianDaysLost}d` : '—'}
          subtitle="median total funnel time before loss"
        />
        <KpiCard
          title="Deals Discarded"
          value={ldKpis.totalDiscarded ?? '—'}
          subtitle='In stage "Discarded"'
        />
        <KpiCard
          title="Median Days → Discarded"
          value={ldKpis.medianDaysDiscarded != null ? `${ldKpis.medianDaysDiscarded}d` : '—'}
          subtitle="median total funnel time before discard"
        />
      </div>

      {/* ── Discarded/Lost at Stage bar chart ── */}
      <div className="rounded-lg border p-6" style={{ borderColor: 'var(--rule)', background: 'white' }}>
        <div className="mb-4 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
              Discarded / Lost at Stage
            </div>
            <div className="text-xs" style={{ color: 'var(--muted)' }}>
              Stage the deal was in when it exited the pipeline
            </div>
          </div>
          {/* Toggle pills */}
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { key: 'all',       label: 'All',       activeBg: 'var(--accent)' },
              { key: 'lost',      label: 'Lost',      activeBg: '#c07830'       },
              { key: 'discarded', label: 'Discarded', activeBg: '#dc2626'       },
            ].map(opt => (
              <button
                key={opt.key}
                onClick={() => setLdFilter(opt.key)}
                style={{
                  padding:     '5px 14px',
                  fontSize:    '0.75rem',
                  fontWeight:  ldFilter === opt.key ? 600 : 400,
                  border:      '1px solid var(--rule)',
                  borderRadius: 6,
                  background:  ldFilter === opt.key ? opt.activeBg : 'white',
                  color:       ldFilter === opt.key ? 'white' : 'var(--ink)',
                  cursor:      'pointer',
                  transition:  'all 0.15s',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {lostDiscardedBarData.length === 0 ? (
          <div className="text-sm text-center py-8" style={{ color: 'var(--muted)' }}>
            No lost or discarded deal data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(180, lostDiscardedBarData.length * 44)}>
            <BarChart
              layout="vertical"
              data={lostDiscardedBarData}
              margin={{ top: 4, right: 52, bottom: 4, left: 130 }}
            >
              <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="var(--rule)" />
              <YAxis
                dataKey="name"
                type="category"
                width={120}
                tick={{ fontSize: 12, fill: 'var(--ink)' }}
                axisLine={false}
                tickLine={false}
              />
              <XAxis
                type="number"
                allowDecimals={false}
                tick={{ fontSize: 11, fill: 'var(--muted)' }}
              />
              <Tooltip content={<CustomTooltip />} />

              {/* Lost bar — shown for 'all' and 'lost' */}
              {ldFilter !== 'discarded' && (
                <Bar
                  dataKey="lost"
                  name="Lost"
                  stackId="ld"
                  fill="#c07830"
                  radius={ldFilter === 'lost' ? [0, 3, 3, 0] : [0, 0, 0, 0]}
                  isAnimationActive={false}
                >
                  {ldFilter === 'lost' && (
                    <LabelList dataKey="lost" position="right" style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', fill: 'var(--muted)' }} />
                  )}
                </Bar>
              )}

              {/* Discarded bar — shown for 'all' and 'discarded' */}
              {ldFilter !== 'lost' && (
                <Bar
                  dataKey="discarded"
                  name="Discarded"
                  stackId="ld"
                  fill="#dc2626"
                  radius={[0, 3, 3, 0]}
                  isAnimationActive={false}
                >
                  <LabelList
                    dataKey={ldFilter === 'all' ? 'total' : 'discarded'}
                    position="right"
                    style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', fill: 'var(--muted)' }}
                  />
                </Bar>
              )}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Avg days in stage table ── */}
      {avgDaysTableData.length > 0 && (
        <div className="rounded-lg border p-6" style={{ borderColor: 'var(--rule)', background: 'white' }}>
          <div className="mb-4">
            <div className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
              Median Days in Stage
              {ldFilter !== 'all' && (
                <span
                  className="ml-2 px-2 py-0.5 rounded text-xs font-medium"
                  style={{
                    background: ldFilter === 'lost' ? '#fef3c7' : '#fee2e2',
                    color:      ldFilter === 'lost' ? '#c07830' : '#dc2626',
                  }}
                >
                  {ldFilter === 'lost' ? 'Lost only' : 'Discarded only'}
                </span>
              )}
            </div>
            <div className="text-xs" style={{ color: 'var(--muted)' }}>
              Median time deals that eventually exited the pipeline spent in each stage
            </div>
          </div>
          <div style={{ overflowX: 'auto', border: '1px solid var(--rule)', borderRadius: 8 }}>
            <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f5f7fa' }}>
                  {['Stage', 'Median Days in Stage', '# Deals'].map((h, i) => (
                    <th
                      key={h}
                      className="px-3 py-2 text-xs font-semibold uppercase tracking-wide"
                      style={{
                        color:       'var(--muted)',
                        borderBottom: '2px solid var(--rule)',
                        textAlign:   i === 0 ? 'left' : 'right',
                        whiteSpace:  'nowrap',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {avgDaysTableData.map((row, i) => (
                  <tr
                    key={row.stage}
                    style={{
                      borderBottom: '1px solid var(--rule)',
                      background:   i % 2 === 0 ? 'white' : '#f5f7fa',
                    }}
                  >
                    <td className="px-3 py-2" style={{ color: 'var(--ink)', whiteSpace: 'nowrap' }}>
                      <span
                        style={{
                          display:      'inline-block',
                          width:        8,
                          height:       8,
                          borderRadius: '50%',
                          background:   STAGE_COLOR_MAP[row.stage] ?? '#9ca3af',
                          marginRight:  8,
                          flexShrink:   0,
                        }}
                      />
                      {row.shortName}
                    </td>
                    <td className="px-3 py-2 font-mono" style={{ textAlign: 'right', color: 'var(--ink)' }}>
                      {row.medianDays != null ? `${row.medianDays}d` : '—'}
                    </td>
                    <td className="px-3 py-2 font-mono" style={{ textAlign: 'right', color: 'var(--muted)' }}>
                      {row.dealCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
