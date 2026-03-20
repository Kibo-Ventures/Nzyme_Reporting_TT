import { useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList,
} from 'recharts'
import {
  useFunnelStages,
  useStageHistogram,
  useAdviserStageBreakdown,
} from '../hooks/useFunnelAnalysis'
import KpiCard from '../components/ui/KpiCard'
import LoadingSpinner from '../components/ui/LoadingSpinner'

// ── Stage display helpers ────────────────────────────────────────────────────

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

// ── Main ─────────────────────────────────────────────────────────────────────

export default function FunnelAnalysis() {
  const { data: stages = [], isLoading, error } = useFunnelStages()
  const [selectedStage, setSelectedStage] = useState(null)
  const { data: histogramRaw = [], isLoading: histLoading } = useStageHistogram(selectedStage)
  const { data: adviserRaw = [] } = useAdviserStageBreakdown()

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
        color:  STAGE_COLORS[i] ?? '#9ca3af',
        rank:   s.stage_rank,
      })),
    [stages]
  )

  // ── Histogram ─────────────────────────────────────────────────────────────
  const histData = useMemo(() => bucketDays(histogramRaw), [histogramRaw])

  // ── Adviser breakdown ─────────────────────────────────────────────────────
  const adviserBreakdown = useMemo(() => {
    const map = {}
    for (const d of adviserRaw) {
      const a = d.attributed_adviser || 'Unknown'
      map[a] = (map[a] ?? 0) + 1
    }
    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15)
  }, [adviserRaw])

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

      {/* ── Funnel bar chart ── */}
      <div className="rounded-lg border p-6" style={{ borderColor: 'var(--rule)', background: 'white' }}>
        <div className="mb-4">
          <div className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
            Deals Reaching Each Stage
          </div>
          <div className="text-xs" style={{ color: 'var(--muted)' }}>
            All-time count of deals that reached or passed each stage
          </div>
        </div>

        {funnelData.length === 0 ? (
          <div className="text-sm text-center py-8" style={{ color: 'var(--muted)' }}>
            No funnel data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={funnelData}
              layout="vertical"
              margin={{ top: 0, right: 60, bottom: 0, left: 130 }}
            >
              <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="var(--rule)" />
              <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--muted)' }} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="name"
                width={125}
                tick={{ fontSize: 11, fill: 'var(--ink)' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="Deals reached" radius={[0, 3, 3, 0]}>
                <LabelList dataKey="value" position="right" style={{ fontSize: 11, fill: 'var(--muted)' }} />
                {funnelData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
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
                {['Stage', 'Reached', "Didn't Advance", 'Cumul. Conv. %', 'Stage-to-Stage %', 'Avg Days'].map((h) => (
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

      {/* ── Adviser breakdown ── */}
      <div className="rounded-lg border p-6" style={{ borderColor: 'var(--rule)', background: 'white' }}>
        <div className="mb-4">
          <div className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
            Deals by Adviser
          </div>
          <div className="text-xs" style={{ color: 'var(--muted)' }}>
            All-time deal count per attributed adviser (top 15)
          </div>
        </div>

        {adviserBreakdown.length === 0 ? (
          <div className="text-sm text-center py-8" style={{ color: 'var(--muted)' }}>
            No adviser data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(200, adviserBreakdown.length * 28)}>
            <BarChart
              data={adviserBreakdown}
              layout="vertical"
              margin={{ top: 0, right: 40, bottom: 0, left: 140 }}
            >
              <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="var(--rule)" />
              <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--muted)' }} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="name"
                width={135}
                tick={{ fontSize: 11, fill: 'var(--ink)' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Deals" fill="#2d6a4a" radius={[0, 3, 3, 0]}>
                <LabelList dataKey="count" position="right" style={{ fontSize: 11, fill: 'var(--muted)' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
