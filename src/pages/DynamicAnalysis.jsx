import { useState, useMemo } from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { useAnalysisDeals } from '../hooks/useAnalysisDeals';
import { StageBadge } from '../components/ui/Badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const AXIS_OPTIONS = [
  { value: 'total_hrs',              label: 'Total Hours on Deal' },
  { value: 'funnel_depth',           label: 'Funnel Depth Reached' },
  { value: 'avg_days_per_stage',     label: 'Avg Days per Stage' },
  { value: 'deal_age_days',          label: 'Deal Age (days)' },
  { value: 'stage_transition_count', label: 'Number of Stage Transitions' },
];

const STAGE_COLORS = {
  'DD Phase':        '#1a3a2a',
  'Working on Deal': '#2e6da4',
  'Under Analysis':  '#c07830',
  'Being Explored':  '#6b3a80',
  'Portfolio':       '#3a4080',
  'Other':           '#9a9589',
};

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
      <div>{xLabel}: <strong>{d[xAxis]}</strong></div>
      <div>{yLabel}: <strong>{d[yAxis]}</strong></div>
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

export default function DynamicAnalysis() {
  const [xAxis, setXAxis] = useState('total_hrs');
  const [yAxis, setYAxis] = useState('funnel_depth');
  const [sortCol, setSortCol] = useState('funnel_depth');
  const [sortDir, setSortDir] = useState('desc');
  const [showAll, setShowAll] = useState(false);

  const { data = [], isLoading } = useAnalysisDeals();

  const byStage = useMemo(() => {
    return data.reduce((acc, deal) => {
      const key = deal.funnel_depth_label ?? 'Other';
      if (!acc[key]) acc[key] = [];
      acc[key].push(deal);
      return acc;
    }, {});
  }, [data]);

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      const av = a[sortCol] ?? 0;
      const bv = b[sortCol] ?? 0;
      return sortDir === 'asc' ? av - bv : bv - av;
    });
  }, [data, sortCol, sortDir]);

  const handleSort = (col) => {
    if (col === sortCol) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('desc');
    }
  };

  const tableRows = showAll ? sortedData : sortedData.slice(0, 8);

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

      {/* Chart card */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 12, padding: '20px 24px', marginBottom: 24 }}>
        {/* Axis controls */}
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

          <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 'auto', fontFamily: 'var(--font-sans)' }}>
            {data.length} deals plotted
          </span>
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <LoadingSpinner />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={420}>
            <ScatterChart margin={{ top: 10, right: 20, bottom: 40, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--rule)" />
              <XAxis
                dataKey={xAxis}
                name={AXIS_OPTIONS.find(o => o.value === xAxis)?.label}
                type="number"
                label={{
                  value: AXIS_OPTIONS.find(o => o.value === xAxis)?.label,
                  position: 'insideBottom',
                  offset: -10,
                  style: { fontFamily: 'var(--font-sans)', fontSize: 12, fill: 'var(--muted)' },
                }}
                tick={{ fontFamily: 'var(--font-mono)', fontSize: 11, fill: 'var(--muted)' }}
              />
              <YAxis
                dataKey={yAxis}
                name={AXIS_OPTIONS.find(o => o.value === yAxis)?.label}
                type="number"
                label={{
                  value: AXIS_OPTIONS.find(o => o.value === yAxis)?.label,
                  angle: -90,
                  position: 'insideLeft',
                  style: { fontFamily: 'var(--font-sans)', fontSize: 12, fill: 'var(--muted)' },
                }}
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
              {Object.entries(byStage).map(([stage, deals]) => (
                <Scatter
                  key={stage}
                  name={stage}
                  data={deals}
                  fill={STAGE_COLORS[stage] ?? '#9a9589'}
                  fillOpacity={0.75}
                />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Deal detail table */}
      {!isLoading && data.length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 12, padding: '20px 24px' }}>
          <h3 style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: '1.0625rem', marginBottom: 16, color: 'var(--ink)' }}>
            Deal Breakdown
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontFamily: 'var(--font-sans)' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--rule)' }}>
                {[
                  { col: 'deal_name',          label: 'Deal' },
                  { col: 'captain',            label: 'Captain' },
                  { col: 'funnel_depth',       label: 'Stage' },
                  { col: 'total_hrs',          label: 'Hrs' },
                  { col: 'avg_days_per_stage', label: 'Avg Days/Stage' },
                  { col: 'deal_age_days',      label: 'Age (days)' },
                ].map(({ col, label }) => (
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
                  <td style={{ padding: '9px 10px', color: 'var(--ink)', fontWeight: 500 }}>
                    {d.deal_name}
                  </td>
                  <td style={{ padding: '9px 10px', color: 'var(--muted)' }}>{d.captain}</td>
                  <td style={{ padding: '9px 10px' }}>
                    <StageBadge stage={d.current_stage} />
                  </td>
                  <td style={{ padding: '9px 10px', fontFamily: 'var(--font-mono)', color: 'var(--ink)', fontSize: 12 }}>
                    {d.total_hrs}
                  </td>
                  <td style={{ padding: '9px 10px', fontFamily: 'var(--font-mono)', color: 'var(--ink)', fontSize: 12 }}>
                    {Number(d.avg_days_per_stage).toFixed(1)}
                  </td>
                  <td style={{ padding: '9px 10px', fontFamily: 'var(--font-mono)', color: 'var(--ink)', fontSize: 12 }}>
                    {d.deal_age_days}
                  </td>
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
