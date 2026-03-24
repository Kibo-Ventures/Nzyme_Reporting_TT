import { useMemo, useState } from 'react'
import { useBoardPipelineDeals } from '../hooks/useDeals'
import KpiCard from '../components/ui/KpiCard'
import { StageBadge } from '../components/ui/Badge'
import { shortName } from '../lib/utils'
import LoadingSpinner from '../components/ui/LoadingSpinner'

// ── Stage group definitions ───────────────────────────────────────────────────

const STAGE_GROUPS = [
  { key: 'portfolio', label: 'Portfolio',        stages: ['Portfolio'] },
  { key: 'dd',        label: 'DD Phase',          stages: ['DD phase'] },
  { key: 'working',   label: 'Working on a Deal', stages: ['Working on a deal (significant effort)'] },
  { key: 'analysis',  label: 'Under Analysis',    stages: ['Under analysis (team assigned, moderate effort)'] },
  { key: 'exploring', label: 'Being Explored',    stages: ['Being explored (meetings only)'] },
  { key: 'dormant',   label: 'Dormant',           stages: null },
]

const DEFINED_STAGES = new Set(STAGE_GROUPS.flatMap(g => g.stages ?? []))

const GROUP_HEADER_STYLE = {
  portfolio: { bg: '#f3e8ff', accent: '#6b21a8' },
  dd:        { bg: '#e8f0eb', accent: '#1a3a2a' },
  working:   { bg: '#eff6ff', accent: '#1d4ed8' },
  analysis:  { bg: '#fff7ed', accent: '#ea580c' },
  exploring: { bg: '#f9fafb', accent: '#6b7280' },
  dormant:   { bg: '#f9fafb', accent: '#9ca3af' },
}

// ── Column layout ─────────────────────────────────────────────────────────────

const COL = {
  name:        { flex: '1 1 160px', minWidth: 140 },
  captain:     { width: 96,  flexShrink: 0 },
  description: { flex: '1.6 1 120px', minWidth: 100 },
  icStage:     { width: 108, flexShrink: 0 },
  milestone:   { width: 120, flexShrink: 0 },
}

const MILESTONE_ORDER = ['NBO Sent', 'NDA Signed', 'IM Received']

function lastMilestone(milestones) {
  if (!milestones) return null
  return MILESTONE_ORDER.find(m => milestones.includes(m)) ?? null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function groupDeals(deals) {
  const buckets = Object.fromEntries(STAGE_GROUPS.map(g => [g.key, []]))
  deals.forEach(deal => {
    const g = STAGE_GROUPS.find(g => g.stages?.includes(deal.stage))
    const key = g ? g.key : 'dormant'
    buckets[key].push(deal)
  })
  return STAGE_GROUPS.map(g => ({ ...g, deals: buckets[g.key] }))
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function truncate(text, n = 80) {
  if (!text) return '—'
  return text.length > n ? text.slice(0, n - 1) + '…' : text
}

// ── Expanded deal detail ───────────────────────────────────────────────────────

function DealDetail({ deal }) {
  const fields = [
    { label: 'Description',   value: deal.activity_description },
    { label: 'Team',          value: deal.team_involved ? deal.team_involved.split(';').map(n => n.trim()).filter(Boolean).map(shortName).join(', ') : null },
    { label: 'Achieved Milestones', value: deal.milestones },
    { label: 'Deal Captain',  value: deal.deal_captain ? shortName(deal.deal_captain) : null },
    { label: 'IC Stage',      value: deal.ic_stage },
    { label: 'Date Added',    value: formatDate(deal.date_added) },
  ]

  return (
    <div
      style={{
        margin: '0 0 4px 0',
        padding: '16px 20px',
        background: '#fafaf8',
        borderTop: '1px solid var(--rule)',
        borderRadius: '0 0 12px 12px',
        boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.04)',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: '12px 24px',
      }}
    >
      {fields.map(({ label, value }) =>
        value ? (
          <div key={label}>
            <div
              style={{
                fontSize: '0.6875rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--muted)',
                marginBottom: 3,
              }}
            >
              {label}
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--ink)', lineHeight: 1.45 }}>
              {value}
            </div>
          </div>
        ) : null
      )}
    </div>
  )
}

// ── Deal row ─────────────────────────────────────────────────────────────────

function DealRow({ deal, expanded, onToggle }) {
  return (
    <div
      style={{
        borderBottom: expanded ? 'none' : '1px solid var(--rule)',
        background: expanded ? '#fffef9' : 'white',
      }}
    >
      {/* Main row */}
      <div
        onClick={onToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 16px',
          cursor: 'pointer',
          borderBottom: expanded ? '1px solid var(--rule)' : 'none',
          transition: 'background 0.1s',
        }}
        onMouseEnter={e => { if (!expanded) e.currentTarget.style.background = '#fafaf8' }}
        onMouseLeave={e => { if (!expanded) e.currentTarget.style.background = 'white' }}
      >
        {/* Expand chevron */}
        <span
          style={{
            color: 'var(--muted)',
            fontSize: '0.625rem',
            flexShrink: 0,
            transition: 'transform 0.15s',
            transform: expanded ? 'rotate(90deg)' : 'none',
          }}
        >
          ▶
        </span>

        {/* Name */}
        <div style={{ ...COL.name, fontWeight: 600, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {deal.name}
        </div>

        {/* Captain */}
        <div style={{ ...COL.captain, fontSize: '0.8rem', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {deal.deal_captain ? shortName(deal.deal_captain) : '—'}
        </div>

        {/* Description */}
        <div style={{ ...COL.description, fontSize: '0.8rem', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {deal.activity_description || '—'}
        </div>

        {/* IC Stage */}
        <div style={{ ...COL.icStage, fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {deal.ic_stage || '—'}
        </div>

        {/* Last Milestone */}
        <div style={{ ...COL.milestone, fontSize: '0.8rem', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {lastMilestone(deal.milestones) || '—'}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && <DealDetail deal={deal} />}
    </div>
  )
}

// ── Stage group section ───────────────────────────────────────────────────────

function StageGroup({ group, expandedDeal, onToggleDeal }) {
  const [collapsed, setCollapsed] = useState(false)
  const { label, key, deals } = group
  const style = GROUP_HEADER_STYLE[key]

  if (!deals.length) return null

  return (
    <div
      style={{
        border: '1px solid var(--rule)',
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 16,
      }}
    >
      {/* Group header */}
      <div
        onClick={() => setCollapsed(v => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 16px',
          background: style.bg,
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <span
          style={{
            fontSize: '0.625rem',
            color: style.accent,
            transition: 'transform 0.15s',
            transform: collapsed ? 'rotate(-90deg)' : 'none',
          }}
        >
          ▼
        </span>
        <span style={{ fontWeight: 700, fontSize: '0.875rem', color: style.accent, flex: 1 }}>
          {label}
        </span>
        <span
          style={{
            fontSize: '0.75rem',
            fontFamily: 'var(--font-mono)',
            color: style.accent,
            opacity: 0.7,
          }}
        >
          {deals.length} deal{deals.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Deals */}
      {!collapsed && (
        <div>
          {deals.map(deal => (
            <DealRow
              key={deal.name}
              deal={deal}
              expanded={expandedDeal === deal.name}
              onToggle={() => onToggleDeal(deal.name)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Column header bar ─────────────────────────────────────────────────────────

function ColumnHeaders() {
  const headers = [
    { label: 'Deal', style: COL.name },
    { label: 'Captain', style: COL.captain },
    { label: 'Description', style: COL.description },
    { label: 'IC Stage', style: COL.icStage },
    { label: 'Last Milestone', style: COL.milestone },
  ]
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '6px 16px 6px 40px',
        marginBottom: 8,
      }}
    >
      {headers.map(({ label, style }) => (
        <div
          key={label}
          style={{
            ...style,
            fontSize: '0.6875rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--muted)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </div>
      ))}
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '4rem 2rem',
        color: 'var(--muted)',
        fontSize: '0.9375rem',
      }}
    >
      No data for the selected filters.
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BoardPipeline() {
  const { data: deals = [], isLoading, error } = useBoardPipelineDeals()
  const [expandedDeal, setExpandedDeal] = useState(null)

  function toggleDeal(name) {
    setExpandedDeal(prev => (prev === name ? null : name))
  }

  const kpis = useMemo(() => ({
    total:     deals.length,
    dd:        deals.filter(d => d.stage === 'DD phase').length,
    working:   deals.filter(d => d.stage === 'Working on a deal (significant effort)').length,
    portfolio: deals.filter(d => d.stage === 'Portfolio').length,
  }), [deals])

  const groups = useMemo(() => groupDeals(deals), [deals])
  const hasDeals = deals.length > 0

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1.5rem 4rem' }}>
      {/* Header */}
      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', marginBottom: '1.5rem' }}>
        Board Pipeline
      </h1>

      {/* KPI row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
          marginBottom: '2rem',
        }}
      >
        <KpiCard title="Active Deals"     value={kpis.total}     subtitle="across all stages" />
        <KpiCard title="In DD Phase"      value={kpis.dd}        subtitle="deep due diligence" />
        <KpiCard title="Working on Deal"  value={kpis.working}   subtitle="significant effort" />
        <KpiCard title="Portfolio"        value={kpis.portfolio} subtitle="invested" />
      </div>

      {/* Table */}
      {isLoading && <LoadingSpinner />}

      {error && (
        <p style={{ color: 'var(--danger)', padding: '2rem 0' }}>
          Failed to load pipeline: {error.message}
        </p>
      )}

      {!isLoading && !error && !hasDeals && <EmptyState />}

      {!isLoading && !error && hasDeals && (
        <>
          <ColumnHeaders />
          {groups.map(group => (
            <StageGroup
              key={group.key}
              group={group}
              expandedDeal={expandedDeal}
              onToggleDeal={toggleDeal}
            />
          ))}
        </>
      )}
    </div>
  )
}
