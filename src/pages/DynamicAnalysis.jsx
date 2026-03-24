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
      background: 'var(--paper)',
      border: '1px solid var(--rule)',
      borderRadius: 6,
      padding: '10px 14px',
      fontFamily: 'DM Sans',
      fontSize: 13,
      color: 'var(--ink)',
      maxWidth: 240,
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
    <div className="p-6" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Page header */}
      <div>
        <h1 style={{ fontFamily: 'DM Serif Display', fontSize: 28, color: 'var(--ink)', margin: 0 }}>
          Dynamic Analysis
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 4 }}>
          Plot any two dimensions across all deals to surface patterns.
        </p>
      </div>

      {/* Axis controls */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{ fontSize: 13, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8 }}>
          X Axis
          <select
            value={xAxis}
            onChange={e => setXAxis(e.target.value)}
            style={{
              border: '1px solid var(--rule)',
              borderRadius: 6,
              padding: '5px 10px',
              fontSize: 13,
              fontFamily: 'DM Sans',
              color: 'var(--ink)',
              background: 'var(--paper)',
            }}
          >
            {AXIS_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>

        <label style={{ fontSize: 13, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8 }}>
          Y Axis
          <select
            value={yAxis}
            onChange={e => setYAxis(e.target.value)}
            style={{
              border: '1px solid var(--rule)',
              borderRadius: 6,
              padding: '5px 10px',
              fontSize: 13,
              fontFamily: 'DM Sans',
              color: 'var(--ink)',
              background: 'var(--paper)',
            }}
          >
            {AXIS_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>

        <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 'auto' }}>
          {data.length} deals plotted
        </span>
      </div>

      {/* Chart */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <LoadingSpinner />
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={420}>
          <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--rule)" />
            <XAxis
              dataKey={xAxis}
              name={AXIS_OPTIONS.find(o => o.value === xAxis)?.label}
              type="number"
              label={{
                value: AXIS_OPTIONS.find(o => o.value === xAxis)?.label,
                position: 'insideBottom',
                offset: -10,
                style: { fontFamily: 'DM Sans', fontSize: 12, fill: 'var(--muted)' },
              }}
              tick={{ fontFamily: 'DM Mono', fontSize: 11, fill: 'var(--muted)' }}
            />
            <YAxis
              dataKey={yAxis}
              name={AXIS_OPTIONS.find(o => o.value === yAxis)?.label}
              type="number"
              label={{
                value: AXIS_OPTIONS.find(o => o.value === yAxis)?.label,
                angle: -90,
                position: 'insideLeft',
                style: { fontFamily: 'DM Sans', fontSize: 12, fill: 'var(--muted)' },
              }}
              tick={{ fontFamily: 'DM Mono', fontSize: 11, fill: 'var(--muted)' }}
            />
            <Tooltip
              cursor={{ strokeDasharray: '3 3', stroke: 'var(--muted)' }}
              content={<ChartTooltip xAxis={xAxis} yAxis={yAxis} />}
            />
            <Legend
              wrapperStyle={{ fontFamily: 'DM Sans', fontSize: 12 }}
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

      {/* Deal detail table */}
      {!isLoading && data.length > 0 && (
        <div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontFamily: 'DM Sans' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--rule)' }}>
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
                    background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.01)',
                  }}
                >
                  <td style={{ padding: '8px 10px', color: 'var(--ink)', fontWeight: 500 }}>
                    {d.deal_name}
                  </td>
                  <td style={{ padding: '8px 10px', color: 'var(--muted)' }}>{d.captain}</td>
                  <td style={{ padding: '8px 10px' }}>
                    <StageBadge stage={d.current_stage} />
                  </td>
                  <td style={{ padding: '8px 10px', fontFamily: 'DM Mono', color: 'var(--ink)' }}>
                    {d.total_hrs}
                  </td>
                  <td style={{ padding: '8px 10px', fontFamily: 'DM Mono', color: 'var(--ink)' }}>
                    {Number(d.avg_days_per_stage).toFixed(1)}
                  </td>
                  <td style={{ padding: '8px 10px', fontFamily: 'DM Mono', color: 'var(--ink)' }}>
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
