import { useMemo, useState } from 'react'
import {
  FunnelChart, Funnel, LabelList, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  useFunnelStages,
  useStageHistogram,
  useAdviserStageBreakdown,
  useFunnelDeals,
  useStageTimeInvestment,
} from '../hooks/useFunnelAnalysis'
import KpiCard from '../components/ui/KpiCard'
import LoadingSpinner from '../components/ui/LoadingSpinner'

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

// Colour per stage value (for pivot bar chart)
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

// ── Pivot toggle ─────────────────────────────────────────────────────────────

function PivotToggle({ value, onChange }) {
  const options = [
    { key: null,       label: 'Total' },
    { key: 'captains', label: 'Team Captains' },
    { key: 'channels', label: 'Origination Channels' },
    { key: 'advisers', label: 'Adviser Organisation' },
  ]
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {options.map(opt => (
        <button
          key={opt.key ?? 'total'}
          onClick={() => onChange(opt.key)}
          style={{
            padding: '5px 14px',
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

// ── Build pivot bar data (stages on x-axis, stacked by pivot dimension) ──────

function buildPivotData(deals, adviserDeals, pivotType) {
  if (pivotType === 'advisers') {
    // Group adviser deals by attributed_adviser × stage
    const keys = [...new Set(adviserDeals.map(d => d.attributed_adviser || 'Unknown'))].sort()
    return {
      keys,
      data: STAGE_ORDER
        .filter(s => adviserDeals.some(d => d.stage === s))
        .map(s => {
          const row = { stage: STAGE_SHORT[s] ?? s }
          keys.forEach(k => { row[k] = 0 })
          adviserDeals.filter(d => d.stage === s).forEach(d => {
            const k = d.attributed_adviser || 'Unknown'
            row[k] = (row[k] || 0) + 1
          })
          return row
        }),
    }
  }

  const keyFn = pivotType === 'captains'
    ? (d) => d.deal_captain || 'Unknown'
    : (d) => d.origination_channel || 'Unattributed'

  const keys = [...new Set(deals.map(keyFn))].sort()
  const data = STAGE_ORDER
    .filter(s => deals.some(d => d.stage === s))
    .map(s => {
      const row = { stage: STAGE_SHORT[s] ?? s }
      keys.forEach(k => { row[k] = 0 })
      deals.filter(d => d.stage === s).forEach(d => {
        const k = keyFn(d)
        row[k] = (row[k] || 0) + 1
      })
      return row
    })
  return { keys, data }
}

const PIVOT_COLORS = [
  '#1a3a2a', '#2e6da4', '#c07830', '#6b21a8', '#3a4080',
  '#8a5020', '#22c55e', '#6b7280', '#ef4444', '#3b82f6',
]

// ── Time Invested Table ───────────────────────────────────────────────────────

function TimeInvestedTable({ stages, timeByStage }) {
  const [expandedStage, setExpandedStage] = useState(null)

  return (
    <div style={{ overflowX: 'auto', border: '1px solid var(--rule)', borderRadius: 6 }}>
      <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#fafaf8' }}>
            {['Stage', 'Total Hours', 'Hrs / Deal Reached', 'Deals with Hours'].map((h, i) => (
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
            const hrsPerDeal = ti && s.reached_stage > 0
              ? (ti.total / s.reached_stage).toFixed(1)
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
                    background: isExpanded ? '#fffef9' : i % 2 === 0 ? 'white' : '#fafaf8',
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
                    {hrsPerDeal != null ? `${hrsPerDeal}h` : '—'}
                  </td>
                  <td className="px-3 py-2 font-mono" style={{ textAlign: 'right', color: 'var(--muted)' }}>
                    {ti ? ti.deals.length : '—'}
                  </td>
                </tr>
                {isExpanded && ti && (
                  <tr key={`${s.stage_value}-expand`} style={{ borderBottom: '1px solid var(--rule)' }}>
                    <td colSpan={4} style={{ padding: '0 0 8px 0', background: '#fffef9' }}>
                      <div style={{ padding: '8px 16px 4px 40px', display: 'flex', flexWrap: 'wrap', gap: '6px 24px' }}>
                        {ti.deals.map(d => (
                          <div key={d.name} style={{ display: 'flex', gap: 8, alignItems: 'center', minWidth: 200 }}>
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
  const { data: stages = [], isLoading, error } = useFunnelStages()
  const [selectedStage, setSelectedStage] = useState(null)
  const [pivot, setPivot] = useState(null)
  const { data: histogramRaw = [], isLoading: histLoading } = useStageHistogram(selectedStage)
  const { data: adviserRaw = [] } = useAdviserStageBreakdown()
  const { data: allDeals = [] } = useFunnelDeals()
  const { data: timeInvestmentRaw = [] } = useStageTimeInvestment()

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    if (!stages.length) return {}
    const entry     = stages[0]?.reached_stage ?? 0
    const portfolio = stages.find((s) => s.stage_value === 'Portfolio')?.reached_stage ?? 0
    const convRate  = entry > 0 ? Math.round((portfolio / entry) * 100) : 0
    const avgDays   = stages
      .reduce((sum, s) => sum + (s.avg_days_in_stage ?? 0), 0)
    return { entry, portfolio, convRate, avgDays: Math.round(avgDays) }
  }, [stages])

  // ── Funnel chart data ─────────────────────────────────────────────────────
  const funnelData = useMemo(
    () =>
      stages.map((s, i) => ({
        name:   STAGE_SHORT[s.stage_value] ?? s.stage_value,
        full:   s.stage_value,
        value:  s.reached_stage ?? 0,
        fill:   STAGE_COLORS[i] ?? '#9ca3af',
        rank:   s.stage_rank,
      })),
    [stages]
  )

  // ── Histogram ─────────────────────────────────────────────────────────────
  const histData = useMemo(() => bucketDays(histogramRaw), [histogramRaw])

  // ── Time investment: hours per stage (aggregated) + per-deal drilldown ────
  const timeByStage = useMemo(() => {
    const map = {}
    timeInvestmentRaw.forEach(r => {
      if (!map[r.stage_value]) map[r.stage_value] = { total: 0, deals: [] }
      map[r.stage_value].total += r.total_hours || 0
      if (r.total_hours > 0) {
        map[r.stage_value].deals.push({ name: r.deal_name, hrs: Math.round(r.total_hours) })
      }
    })
    // Sort deals within each stage by hours desc
    Object.values(map).forEach(s => s.deals.sort((a, b) => b.hrs - a.hrs))
    return map
  }, [timeInvestmentRaw])

  // ── Pivot data ─────────────────────────────────────────────────────────────
  const pivotResult = useMemo(() => {
    if (!pivot) return null
    return buildPivotData(allDeals, adviserRaw, pivot)
  }, [pivot, allDeals, adviserRaw])

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
          className="text-2xl font-serif mb-1"
          style={{ fontFamily: 'var(--font-serif)', color: 'var(--ink)' }}
        >
          Funnel Analysis
        </h1>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          All-time deal lifecycle — stage progression and conversion rates
        </p>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard
          title="Deals Entered Funnel"
          value={kpis.entry ?? '—'}
          subtitle="all-time, any stage"
        />
        <KpiCard
          title="Portfolio (Invested)"
          value={kpis.portfolio ?? '—'}
          subtitle="reached Portfolio stage"
        />
        <KpiCard
          title="Entry → Portfolio"
          value={kpis.convRate != null ? `${kpis.convRate}%` : '—'}
          subtitle="overall conversion rate"
        />
        <KpiCard
          title="Avg Days to Portfolio"
          value={kpis.avgDays ?? '—'}
          subtitle="sum of avg time per stage"
        />
      </div>

      {/* ── Funnel chart ── */}
      <div className="rounded-lg border p-6" style={{ borderColor: 'var(--rule)', background: 'white' }}>
        <div className="mb-4 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
              Deals Reaching Each Stage
            </div>
            <div className="text-xs" style={{ color: 'var(--muted)' }}>
              All-time count of deals that reached or passed each stage
            </div>
          </div>
          <PivotToggle value={pivot} onChange={setPivot} />
        </div>

        {funnelData.length === 0 ? (
          <div className="text-sm text-center py-8" style={{ color: 'var(--muted)' }}>
            No funnel data available
          </div>
        ) : pivot && pivotResult ? (
          // Pivot: grouped bar chart — stages on x-axis, stacked by pivot dimension
          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              data={pivotResult.data}
              margin={{ top: 8, right: 16, bottom: 60, left: 8 }}
            >
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--rule)" />
              <XAxis
                dataKey="stage"
                tick={{ fontSize: 11, fill: 'var(--ink)' }}
                angle={-30}
                textAnchor="end"
                interval={0}
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--muted)' }} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              {pivotResult.keys.slice(0, 10).map((k, i) => (
                <Bar key={k} dataKey={k} stackId="a" fill={PIVOT_COLORS[i % PIVOT_COLORS.length]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        ) : (
          // Default: FunnelChart
          <ResponsiveContainer width="100%" height={300}>
            <FunnelChart>
              <Tooltip formatter={(v) => [v, 'Deals']} contentStyle={{ fontSize: 12 }} />
              <Funnel dataKey="value" data={funnelData} isAnimationActive={false}>
                {funnelData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
                <LabelList
                  dataKey="name"
                  position="center"
                  style={{ fontSize: 11, fontFamily: 'DM Sans, sans-serif', fill: 'white', fontWeight: 600 }}
                />
                <LabelList
                  dataKey="value"
                  position="right"
                  style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', fill: 'var(--muted)' }}
                />
              </Funnel>
            </FunnelChart>
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
                {['Stage', 'Reached', "Didn't Advance", 'Cumul. Conv. %', 'Stage-to-Stage %', 'Avg Days', 'Total Hrs', 'Hrs / Deal'].map((h) => (
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
              {stages.map((s, i) => {
                const short      = STAGE_SHORT[s.stage_value] ?? s.stage_value
                const didntAdv = i > 0
                  ? (stages[i - 1].reached_stage ?? 0) - (s.reached_stage ?? 0)
                  : '—'
                const isSelected = selectedStage === s.stage_value
                return (
                  <tr
                    key={s.stage_value}
                    onClick={() => setSelectedStage(isSelected ? null : s.stage_value)}
                    style={{
                      borderBottom: '1px solid var(--rule)',
                      background:   isSelected ? 'var(--accent-light)' : i % 2 === 0 ? 'white' : '#fafaf8',
                      cursor:       'pointer',
                    }}
                    className="hover:bg-[var(--accent-light)] transition-colors"
                  >
                    <td className="px-3 py-2">
                      <span
                        className="inline-block w-2 h-2 rounded-full mr-2"
                        style={{ background: STAGE_COLORS[i] ?? '#9ca3af' }}
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
                      {s.avg_days_in_stage != null ? `${Math.round(s.avg_days_in_stage)}d` : '—'}
                    </td>
                    {(() => {
                      const ti = timeByStage[s.stage_value]
                      const totalHrs = ti ? Math.round(ti.total) : null
                      const hrsPerDeal = ti && s.reached_stage > 0
                        ? Math.round(ti.total / s.reached_stage)
                        : null
                      return (
                        <>
                          <td className="px-3 py-2 font-mono" style={{ color: 'var(--ink)' }}>
                            {totalHrs != null ? `${totalHrs}h` : '—'}
                          </td>
                          <td className="px-3 py-2 font-mono" style={{ color: 'var(--muted)' }}>
                            {hrsPerDeal != null ? `${hrsPerDeal}h` : '—'}
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

      {/* ── Time invested per stage ── */}
      {timeInvestmentRaw.length > 0 && (
        <div className="rounded-lg border p-6" style={{ borderColor: 'var(--rule)', background: 'white' }}>
          <div className="mb-4">
            <div className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
              Time Invested per Stage
            </div>
            <div className="text-xs" style={{ color: 'var(--muted)' }}>
              Actual hours logged while each deal was in that stage. Click a stage row to expand deal breakdown.
            </div>
          </div>
          <TimeInvestedTable stages={stages} timeByStage={timeByStage} />
        </div>
      )}

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
    </div>
  )
}
