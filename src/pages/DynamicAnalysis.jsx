import { useState, useMemo } from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { useAnalysisDeals } from '../hooks/useAnalysisDeals';
import { StageBadge } from '../components/ui/Badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import PageBanner from '../components/ui/PageBanner';
import InfoTooltip from '../components/ui/InfoTooltip';

const AXIS_OPTIONS = [
  { value: 'total_hrs',              label: 'Total Hours on Deal' },
  { value: 'funnel_depth',           label: 'Funnel Depth Reached',  domain: [0, 6], tickCount: 7,
    tickFormatter: v => ['', 'Other', 'Being Explored', 'Under Analysis', 'Working on Deal', 'DD Phase', 'Portfolio'][v] ?? v },
  { value: 'avg_days_per_stage',     label: 'Avg Days per Stage',     domain: [0, 350], filterMax: 350 },
  { value: 'deal_lifespan_days',     label: 'Deal Lifespan (days)' },
  { value: 'stage_transition_count', label: 'Number of Stage Transitions' },
  { value: 'equity_required',        label: 'Equity Required (€m)' },
  { value: 'revenue_m',              label: 'Revenue (€m)' },
  { value: 'ebitda_m',               label: 'EBITDA (€m)' },
  { value: 'attractiveness_score',   label: 'Attractiveness Score',  domain: [0, 5], tickCount: 6 },
  { value: 'ic_stage_rank',          label: 'IC Stage',              domain: [0, 3], tickCount: 4,
    tickFormatter: v => ['Pre-checklist', 'Checklist', 'First IC', '2+ ICs'][v] ?? v },
  { value: 'milestone_depth',        label: 'Milestone Depth',       domain: [0, 6], tickCount: 7,
    tickFormatter: v => ['None', 'NDA', 'IM', 'NBO', 'VDR/FAQ', 'MIP', 'TS'][v] ?? v },
  { value: 'milestone_count',        label: 'Milestone Count',        allowDecimals: false },
];

const COLOR_BY_OPTIONS = [
  { value: 'funnel_depth_label', label: 'Stage' },
  { value: 'channel_label',      label: 'Channel' },
];

// Fixed colors for known stage values
const STAGE_COLORS = {
  'DD Phase':        '#1a3a2a',
  'Working on Deal': '#2e6da4',
  'Under Analysis':  '#c07830',
  'Being Explored':  '#6b3a80',
  'Portfolio':       '#3a4080',
  'Other':           '#9a9589',
};

// Fallback palette for arbitrary categorical keys (e.g. channel names)
const FALLBACK_PALETTE = [
  '#2e6da4', '#c07830', '#2d9e6a', '#6b3a80', '#1a3a2a',
  '#a04040', '#3a4080', '#80602a', '#207060', '#804060',
];

function resolveColor(key, colorIndex) {
  return STAGE_COLORS[key] ?? FALLBACK_PALETTE[colorIndex % FALLBACK_PALETTE.length];
}

function fmtVal(v) {
  if (v == null) return '—';
  if (typeof v !== 'number') return v;
  return Number.isInteger(v) ? v : parseFloat(v.toFixed(2));
}

function ChartTooltip({ active, payload, xAxis, yAxis }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  const xLabel = AXIS_OPTIONS.find(o => o.value === xAxis)?.label;
  const yLabel = AXIS_OPTIONS.find(o => o.value === yAxis)?.label;
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--rule)',
      borderRadius: 8,
      padding: '10px 14px',
      fontFamily: 'var(--font-sans)',
      fontSize: 13,
      color: 'var(--ink)',
      maxWidth: 240,
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{d.deal_name}</div>
      <div style={{ color: 'var(--muted)', marginBottom: 6, fontSize: 12 }}>{d.captain}</div>
      <div>{xLabel}: <strong>{fmtVal(d[xAxis])}</strong></div>
      <div>{yLabel}: <strong>{fmtVal(d[yAxis])}</strong></div>
      <div style={{ marginTop: 8 }}>
        <StageBadge stage={d.current_stage} />
      </div>
    </div>
  );
}

const selectStyle = {
  border: '1px solid var(--rule)',
  borderRadius: 8,
  padding: '5px 10px',
  fontSize: 13,
  fontFamily: 'var(--font-sans)',
  color: 'var(--ink)',
  background: 'var(--surface)',
};

const numCell = { padding: '9px 10px', fontFamily: 'var(--font-mono)', color: 'var(--ink)', fontSize: 12 };

export default function DynamicAnalysis() {
  const [xAxis, setXAxis] = useState('total_hrs');
  const [yAxis, setYAxis] = useState('funnel_depth');
  const [colorBy, setColorBy] = useState('funnel_depth_label');
  const [sortCol, setSortCol] = useState('funnel_depth');
  const [sortDir, setSortDir] = useState('desc');
  const [showAll, setShowAll] = useState(false);

  const { data = [], isLoading } = useAnalysisDeals();

  const xConfig = AXIS_OPTIONS.find(o => o.value === xAxis);
  const yConfig = AXIS_OPTIONS.find(o => o.value === yAxis);

  // Filter out deals that exceed a filterMax on either selected axis
  const filteredData = useMemo(() => {
    return data.filter(deal => {
      if (xConfig?.filterMax != null && (deal[xAxis] ?? 0) > xConfig.filterMax) return false;
      if (yConfig?.filterMax != null && (deal[yAxis] ?? 0) > yConfig.filterMax) return false;
      return true;
    });
  }, [data, xAxis, yAxis, xConfig, yConfig]);

  // Group deals by the selected color-by field; track insertion order for palette assignment
  const { groups, groupColors } = useMemo(() => {
    const groups = {};
    const order = [];
    for (const deal of filteredData) {
      const key = deal[colorBy] ?? 'Other';
      if (!groups[key]) { groups[key] = []; order.push(key); }
      groups[key].push(deal);
    }
    const groupColors = Object.fromEntries(order.map((k, i) => [k, resolveColor(k, i)]));
    return { groups, groupColors };
  }, [filteredData, colorBy]);

  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      const av = a[sortCol] ?? 0;
      const bv = b[sortCol] ?? 0;
      return sortDir === 'asc' ? av - bv : bv - av;
    });
  }, [filteredData, sortCol, sortDir]);

  const handleSort = (col) => {
    if (col === sortCol) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('desc');
    }
  };

  const tableRows = showAll ? sortedData : sortedData.slice(0, 8);

  const TABLE_COLS = [
    { col: 'deal_name',            label: 'Deal' },
    { col: 'captain',              label: 'Captain' },
    { col: 'funnel_depth',         label: 'Stage',          tooltip: 'A numeric score from 1–6 representing the deepest stage a deal has ever reached, regardless of its current stage.' },
    { col: 'channel_label',        label: 'Channel' },
    { col: 'total_hrs',            label: 'Hrs' },
    { col: 'avg_days_per_stage',   label: 'Avg Days/Stage' },
    { col: 'deal_lifespan_days',   label: 'Lifespan (days)' },
    { col: 'equity_required',      label: 'Equity (€m)' },
    { col: 'revenue_m',            label: 'Revenue (€m)' },
    { col: 'ebitda_m',             label: 'EBITDA (€m)' },
    { col: 'attractiveness_score', label: 'Attract. Score' },
    { col: 'ic_stage_rank',        label: 'IC Stage' },
    { col: 'milestone_depth',      label: 'Milestone Depth', tooltip: 'Scores 0–6 based on the most advanced milestone reached: None / NDA / IM / NBO / VDR-FAQ / MIP / Term Sheet.' },
  ];

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1.5rem 4rem' }}>
      {/* Page header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: '1.75rem', marginBottom: 4, color: 'var(--ink)' }}>
          Dynamic Analysis
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 14, margin: 0 }}>
          Plot any two dimensions across all deals to surface patterns.
        </p>
      </div>

      <PageBanner
        summary="A free-form scatter chart — pick any two metrics and explore how deals relate to each other."
        body="Each dot is a deal. Use the X and Y axis dropdowns to choose what to plot. Colour encodes either stage or origination channel depending on your selection. Some axes have outlier caps applied silently (e.g. avg days per stage is capped at 350) to keep the chart readable. The table below the chart shows the underlying data for all visible deals."
        caveat="The stage filter is not applied on this page — all deals matching the date, captain, and channel filters are shown regardless of stage."
        style={{ marginBottom: 24 }}
      />

      {/* Chart card */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 12, padding: '20px 24px', marginBottom: 24 }}>
        {/* Axis + color-by controls */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', marginBottom: 20 }}>
          <label style={{ fontSize: 13, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-sans)' }}>
            X Axis
            <select value={xAxis} onChange={e => setXAxis(e.target.value)} style={selectStyle}>
              {AXIS_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>

          <label style={{ fontSize: 13, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-sans)' }}>
            Y Axis
            <select value={yAxis} onChange={e => setYAxis(e.target.value)} style={selectStyle}>
              {AXIS_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>

          <label style={{ fontSize: 13, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-sans)' }}>
            Colour by
            <select value={colorBy} onChange={e => setColorBy(e.target.value)} style={selectStyle}>
              {COLOR_BY_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>

          <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 'auto', fontFamily: 'var(--font-sans)' }}>
            {filteredData.length} deals plotted
          </span>
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <LoadingSpinner />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={420}>
            <ScatterChart margin={{ top: 10, right: 20, bottom: xConfig?.tickFormatter ? 70 : 40, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--rule)" />
              <XAxis
                dataKey={xAxis}
                name={xConfig?.label}
                type="number"
                domain={xConfig?.domain ?? ['auto', 'auto']}
                tickCount={xConfig?.tickCount}
                allowDecimals={xConfig?.allowDecimals ?? true}
                allowDataOverflow={false}
                label={{
                  value: xConfig?.label,
                  position: 'insideBottom',
                  offset: xConfig?.tickFormatter ? -28 : -10,
                  style: { fontFamily: 'var(--font-sans)', fontSize: 12, fill: 'var(--muted)' },
                }}
                tickFormatter={xConfig?.tickFormatter}
                tick={{ fontFamily: 'var(--font-mono)', fontSize: 11, fill: 'var(--muted)' }}
              />
              <YAxis
                dataKey={yAxis}
                name={yConfig?.label}
                type="number"
                domain={yConfig?.domain ?? ['auto', 'auto']}
                tickCount={yConfig?.tickCount}
                allowDecimals={yConfig?.allowDecimals ?? true}
                allowDataOverflow={false}
                width={yConfig?.tickFormatter ? 100 : 60}
                label={{
                  value: yConfig?.label,
                  angle: -90,
                  position: 'insideLeft',
                  dx: yConfig?.tickFormatter ? 14 : 0,
                  style: { fontFamily: 'var(--font-sans)', fontSize: 12, fill: 'var(--muted)' },
                }}
                tickFormatter={yConfig?.tickFormatter}
                tick={{ fontFamily: 'var(--font-mono)', fontSize: 11, fill: 'var(--muted)' }}
              />
              <Tooltip
                cursor={{ strokeDasharray: '3 3', stroke: 'var(--muted)' }}
                content={<ChartTooltip xAxis={xAxis} yAxis={yAxis} />}
              />
              <Legend
                verticalAlign="top"
                wrapperStyle={{ fontFamily: 'var(--font-sans)', fontSize: 12, paddingBottom: 12 }}
              />
              {Object.entries(groups).map(([key, deals]) => (
                <Scatter
                  key={key}
                  name={key}
                  data={deals}
                  fill={groupColors[key]}
                  fillOpacity={0.75}
                />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Deal detail table */}
      {!isLoading && filteredData.length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 12, padding: '20px 24px' }}>
          <h3 style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: '1.0625rem', marginBottom: 16, color: 'var(--ink)' }}>
            Deal Breakdown
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontFamily: 'var(--font-sans)' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--rule)' }}>
                {TABLE_COLS.map(({ col, label, tooltip }) => (
                  <th
                    key={col}
                    onClick={() => handleSort(col)}
                    style={{
                      textAlign: 'left',
                      padding: '8px 10px',
                      color: 'var(--muted)',
                      fontWeight: 500,
                      cursor: 'pointer',
                      userSelect: 'none',
                      whiteSpace: 'nowrap',
                      fontSize: 12,
                    }}
                  >
                    {label}
                    {tooltip && <InfoTooltip text={tooltip} />}
                    {sortCol === col ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.map((d, i) => (
                <tr
                  key={d.deal_id ?? i}
                  style={{
                    borderBottom: '1px solid var(--rule)',
                    background: i % 2 === 0 ? 'transparent' : 'var(--paper)',
                  }}
                >
                  <td style={{ padding: '9px 10px', color: 'var(--ink)', fontWeight: 500 }}>{d.deal_name}</td>
                  <td style={{ padding: '9px 10px', color: 'var(--muted)' }}>{d.captain}</td>
                  <td style={{ padding: '9px 10px' }}><StageBadge stage={d.current_stage} /></td>
                  <td style={{ padding: '9px 10px', color: 'var(--muted)', fontSize: 12 }}>{d.channel_label ?? '—'}</td>
                  <td style={numCell}>{d.total_hrs ?? '—'}</td>
                  <td style={numCell}>{d.avg_days_per_stage != null ? Number(d.avg_days_per_stage).toFixed(1) : '—'}</td>
                  <td style={numCell}>{d.deal_lifespan_days ?? '—'}</td>
                  <td style={numCell}>{d.equity_required != null ? `€${(d.equity_required / 1e6).toFixed(1)}m` : '—'}</td>
                  <td style={numCell}>{d.attractiveness_score != null ? Number(d.attractiveness_score).toFixed(1) : '—'}</td>
                  <td style={numCell}>{d.ic_stage_rank ?? '—'}</td>
                  <td style={numCell}>{d.milestone_depth ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {sortedData.length > 8 && (
            <button
              onClick={() => setShowAll(v => !v)}
              style={{
                marginTop: 10,
                fontSize: 12,
                color: 'var(--muted)',
                fontFamily: 'var(--font-sans)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 0',
              }}
            >
              {showAll ? 'Show less' : `Show all ${sortedData.length} deals`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
