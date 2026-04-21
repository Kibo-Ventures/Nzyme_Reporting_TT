# Fundraising Activity Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a `/fundraising` page showing all-time LP interaction activity, gated behind the same `team_access` check as the Staffing Report.

**Architecture:** Single `useLPDashboard` hook fetches all rows from `ReportingNZ_LP_dashboard` once. The page holds 6 filter values in local `useState`; three `useMemo` values derive KPI totals, chart buckets, and table rows from the filtered array. No server-side filtering — the LP dataset is small.

**Tech Stack:** React 19, Recharts v3, TanStack React Query v5, Supabase JS v2, Tailwind CSS v4 + CSS custom properties.

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Create | `src/hooks/useLPDashboard.js` | Fetch all rows from `ReportingNZ_LP_dashboard` |
| Create | `src/pages/FundraisingActivity.jsx` | Full page: filters, KPIs, chart, table |
| Modify | `src/App.jsx` | Add `/fundraising` route wrapped in `TeamAccessGate` |
| Modify | `src/components/layout/Sidebar.jsx` | Add nav item at bottom of REPORTING group |
| Modify | `src/components/layout/AppShell.jsx` | Hide FilterBar on `/fundraising` |

---

## Task 1: Data hook

**Files:**
- Create: `src/hooks/useLPDashboard.js`

- [ ] **Step 1: Create the hook**

Create `src/hooks/useLPDashboard.js` with this exact content:

```js
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useLPDashboard() {
  return useQuery({
    queryKey: ['lp-dashboard'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ReportingNZ_LP_dashboard')
        .select(
          'interaction_date, interaction_type, partner_names, lp_name, investor_type, engagement_effort, overall_status, portugal_status, germany_status'
        )
        .order('interaction_date', { ascending: true })
      if (error) throw error
      return data || []
    },
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useLPDashboard.js
git commit -m "feat: add useLPDashboard hook"
```

---

## Task 2: Shell wiring (route + sidebar + FilterBar)

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/layout/Sidebar.jsx`
- Modify: `src/components/layout/AppShell.jsx`

- [ ] **Step 1: Add route to App.jsx**

In `src/App.jsx`, add the import at the top alongside the other page imports:

```jsx
import FundraisingActivity from './pages/FundraisingActivity'
```

Inside the `<Route element={<FilterProvider><AppShell /></FilterProvider>}>` block, add this route **after** the `/analysis` route:

```jsx
<Route path="/fundraising" element={<TeamAccessGate><FundraisingActivity /></TeamAccessGate>} />
```

- [ ] **Step 2: Add sidebar nav item**

In `src/components/layout/Sidebar.jsx`, the `navItems` array currently ends with:
```js
{ to: '/proprietary', label: 'Proprietary', icon: '🎯', group: 'REPORTING', disabled: true },
```

Add a new entry directly **after** that line (still inside the array):
```js
{ to: '/fundraising', label: 'Fundraising Activity', icon: '💰', group: 'REPORTING' },
```

- [ ] **Step 3: Hide FilterBar on /fundraising**

In `src/components/layout/AppShell.jsx`, change line 8 from:
```js
const showFilters = pathname !== '/timetracker' && pathname !== '/team'
```
to:
```js
const showFilters = pathname !== '/timetracker' && pathname !== '/team' && pathname !== '/fundraising'
```

- [ ] **Step 4: Commit**

```bash
git add src/App.jsx src/components/layout/Sidebar.jsx src/components/layout/AppShell.jsx
git commit -m "feat: wire /fundraising route, sidebar item, and FilterBar exclusion"
```

---

## Task 3: Page skeleton + filters + KPI cards

**Files:**
- Create: `src/pages/FundraisingActivity.jsx`

- [ ] **Step 1: Create the page file**

Create `src/pages/FundraisingActivity.jsx` with this full content:

```jsx
import { useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import { useLPDashboard } from '../hooks/useLPDashboard'
import KpiCard from '../components/ui/KpiCard'
import MultiSelect from '../components/ui/MultiSelect'
import LoadingSpinner from '../components/ui/LoadingSpinner'

// ── Constants ─────────────────────────────────────────────────────────────────

const INTERACTION_COLORS = {
  email_sent:     '#2e6da4',
  email_response: '#1a6a5a',
  meeting:        '#1a3a2a',
  note:           '#9a9589',
  note_meeting:   '#c4b49a',
}

const INTERACTION_LABELS = {
  email_sent:     'Email Sent',
  email_response: 'Email Response',
  meeting:        'Meeting',
  note:           'Note',
  note_meeting:   'Note (Meeting)',
}

const PRIMARY_TYPES = ['email_sent', 'email_response', 'meeting']
const NOTE_TYPES    = ['note', 'note_meeting']

// ── Helpers ───────────────────────────────────────────────────────────────────

function splitInvestorType(raw) {
  if (!raw) return []
  return raw.split(';').map(s => s.trim()).filter(Boolean)
}

function getWeekStart(dateStr) {
  const d = new Date(dateStr)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function toWeekKey(dateStr) {
  return getWeekStart(dateStr).toISOString().slice(0, 10)
}

function toMonthKey(dateStr) {
  return String(dateStr).slice(0, 7)
}

function formatWeekLabel(isoDate) {
  const d = new Date(isoDate + 'T00:00:00')
  const month = d.toLocaleDateString('en-GB', { month: 'short' })
  const year = String(d.getFullYear()).slice(-2)
  const firstOfMonth = new Date(d.getFullYear(), d.getMonth(), 1)
  const weekNum = Math.ceil((d.getDate() + firstOfMonth.getDay()) / 7)
  return `W${weekNum} ${month} '${year}`
}

function formatMonthLabel(ym) {
  const [year, month] = ym.split('-')
  const d = new Date(parseInt(year), parseInt(month) - 1, 1)
  return d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FilterSelect({ label, options, value, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{
        fontSize: '0.6875rem', fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '0.05em',
        color: 'var(--muted)',
      }}>
        {label}
      </label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          padding: '0.375rem 1.75rem 0.375rem 0.75rem',
          fontSize: '0.8125rem',
          fontFamily: 'var(--font-sans)',
          color: value !== 'all' ? 'var(--accent)' : 'var(--ink)',
          background: value !== 'all'
            ? `var(--accent-light) url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%239a9589' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") no-repeat right 0.5rem center`
            : `white url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%239a9589' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") no-repeat right 0.5rem center`,
          border: '1px solid var(--rule)',
          borderRadius: '8px',
          cursor: 'pointer',
          outline: 'none',
          appearance: 'none',
        }}
      >
        <option value="all">All</option>
        {options.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  )
}

function TogglePair({ options, value, onChange }) {
  return (
    <div style={{ display: 'inline-flex', background: 'var(--rule)', padding: 3, borderRadius: 8 }}>
      {options.map(opt => (
        <button
          key={opt.key}
          onClick={() => onChange(opt.key)}
          style={{
            padding: '5px 14px',
            fontSize: '0.78rem',
            fontWeight: 500,
            cursor: 'pointer',
            borderRadius: 6,
            border: 'none',
            background: value === opt.key ? 'white' : 'transparent',
            color: value === opt.key ? 'var(--ink)' : 'var(--muted)',
            boxShadow: value === opt.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            transition: 'all 0.15s',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function SortTh({ label, sortKey, current, dir, onSort }) {
  const active = current === sortKey
  return (
    <th
      onClick={() => onSort(sortKey)}
      style={{
        padding: '10px 14px',
        textAlign: sortKey === 'count' ? 'right' : 'left',
        fontSize: '0.75rem',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: active ? 'var(--ink)' : 'var(--muted)',
        cursor: 'pointer',
        userSelect: 'none',
        whiteSpace: 'nowrap',
        borderBottom: '1px solid var(--rule)',
      }}
    >
      {label}{active ? (dir === 'asc' ? ' ↑' : ' ↓') : ''}
    </th>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function FundraisingActivity() {
  const { data: raw = [], isLoading, isError } = useLPDashboard()

  const [teamMembers, setTeamMembers]         = useState([])
  const [investorType, setInvestorType]       = useState('all')
  const [engagementEffort, setEngagementEffort] = useState('all')
  const [overallStatus, setOverallStatus]     = useState('all')
  const [portugalStatus, setPortugalStatus]   = useState('all')
  const [germanyStatus, setGermanyStatus]     = useState('all')

  const [granularity, setGranularity]         = useState('monthly')
  const [includeNotes, setIncludeNotes]       = useState(false)

  const [sortKey, setSortKey] = useState('count')
  const [sortDir, setSortDir] = useState('desc')

  // ── Filter options ───────────────────────────────────────────────────────────

  const filterOptions = useMemo(() => {
    const members    = new Set()
    const invTypes   = new Set()
    const efforts    = new Set()
    const statuses   = new Set()
    const ptStatuses = new Set()
    const deStatuses = new Set()

    raw.forEach(row => {
      if (Array.isArray(row.partner_names)) row.partner_names.forEach(m => m && members.add(m))
      splitInvestorType(row.investor_type).forEach(t => invTypes.add(t))
      if (row.engagement_effort) efforts.add(row.engagement_effort)
      if (row.overall_status)    statuses.add(row.overall_status)
      if (row.portugal_status)   ptStatuses.add(row.portugal_status)
      if (row.germany_status)    deStatuses.add(row.germany_status)
    })

    return {
      members:    [...members].sort(),
      invTypes:   [...invTypes].sort(),
      efforts:    [...efforts].sort(),
      statuses:   [...statuses].sort(),
      ptStatuses: [...ptStatuses].sort(),
      deStatuses: [...deStatuses].sort(),
    }
  }, [raw])

  // ── Filtered data ────────────────────────────────────────────────────────────

  const filteredData = useMemo(() => {
    let rows = raw

    if (teamMembers.length > 0) {
      rows = rows.filter(r =>
        Array.isArray(r.partner_names) &&
        teamMembers.some(m => r.partner_names.includes(m))
      )
    }
    if (investorType !== 'all') {
      rows = rows.filter(r => splitInvestorType(r.investor_type).includes(investorType))
    }
    if (engagementEffort !== 'all') rows = rows.filter(r => r.engagement_effort === engagementEffort)
    if (overallStatus   !== 'all') rows = rows.filter(r => r.overall_status    === overallStatus)
    if (portugalStatus  !== 'all') rows = rows.filter(r => r.portugal_status   === portugalStatus)
    if (germanyStatus   !== 'all') rows = rows.filter(r => r.germany_status    === germanyStatus)

    return rows
  }, [raw, teamMembers, investorType, engagementEffort, overallStatus, portugalStatus, germanyStatus])

  const hasActiveFilter =
    teamMembers.length > 0 || investorType !== 'all' || engagementEffort !== 'all' ||
    overallStatus !== 'all' || portugalStatus !== 'all' || germanyStatus !== 'all'

  function clearFilters() {
    setTeamMembers([])
    setInvestorType('all')
    setEngagementEffort('all')
    setOverallStatus('all')
    setPortugalStatus('all')
    setGermanyStatus('all')
  }

  // ── KPI totals ───────────────────────────────────────────────────────────────

  const kpiTotals = useMemo(() => {
    let total = 0, email_sent = 0, email_response = 0, meeting = 0
    filteredData.forEach(r => {
      total++
      if (r.interaction_type === 'email_sent')     email_sent++
      if (r.interaction_type === 'email_response') email_response++
      if (r.interaction_type === 'meeting')        meeting++
    })
    return { total, email_sent, email_response, meeting }
  }, [filteredData])

  // ── Chart data ───────────────────────────────────────────────────────────────

  const chartData = useMemo(() => {
    const activeTypes = includeNotes
      ? [...PRIMARY_TYPES, ...NOTE_TYPES]
      : PRIMARY_TYPES
    const buckets = {}

    filteredData.forEach(row => {
      if (!row.interaction_date) return
      if (!activeTypes.includes(row.interaction_type)) return

      const key = granularity === 'weekly'
        ? toWeekKey(row.interaction_date)
        : toMonthKey(row.interaction_date)

      if (!buckets[key]) {
        buckets[key] = { key, email_sent: 0, email_response: 0, meeting: 0, note: 0, note_meeting: 0 }
      }
      buckets[key][row.interaction_type]++
    })

    return Object.values(buckets)
      .sort((a, b) => a.key.localeCompare(b.key))
      .map(b => ({
        ...b,
        label: granularity === 'weekly'
          ? formatWeekLabel(b.key)
          : formatMonthLabel(b.key),
      }))
  }, [filteredData, granularity, includeNotes])

  // ── Table data ───────────────────────────────────────────────────────────────

  const tableData = useMemo(() => {
    const byLp = {}
    filteredData.forEach(row => {
      const name = row.lp_name || '—'
      if (!byLp[name]) {
        byLp[name] = {
          lpName:       name,
          investorType: row.investor_type || '—',
          effort:       row.engagement_effort || '—',
          status:       row.overall_status || '—',
          count:        0,
        }
      }
      byLp[name].count++
    })

    return Object.values(byLp).sort((a, b) => {
      const av = a[sortKey] ?? ''
      const bv = b[sortKey] ?? ''
      if (typeof av === 'number') return sortDir === 'asc' ? av - bv : bv - av
      return sortDir === 'asc'
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av))
    })
  }, [filteredData, sortKey, sortDir])

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
        <LoadingSpinner />
      </div>
    )
  }

  if (isError) {
    return (
      <div style={{ padding: 32, color: 'var(--danger)', fontSize: '0.875rem' }}>
        Failed to load fundraising data.
      </div>
    )
  }

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1200 }}>

      {/* Header */}
      <h1 style={{
        fontFamily: 'DM Serif Display, serif',
        fontSize: '1.75rem',
        fontWeight: 400,
        color: 'var(--ink)',
        margin: '0 0 24px',
      }}>
        Fundraising Activity
      </h1>

      {/* Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 16, marginBottom: 28 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{
            fontSize: '0.6875rem', fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '0.05em',
            color: 'var(--muted)',
          }}>
            Team Member
          </label>
          <MultiSelect
            options={filterOptions.members}
            value={teamMembers}
            onChange={setTeamMembers}
            placeholder="Team Member"
          />
        </div>

        <FilterSelect
          label="Investor Type"
          options={filterOptions.invTypes}
          value={investorType}
          onChange={setInvestorType}
        />
        <FilterSelect
          label="Engagement Effort"
          options={filterOptions.efforts}
          value={engagementEffort}
          onChange={setEngagementEffort}
        />
        <FilterSelect
          label="Overall Status"
          options={filterOptions.statuses}
          value={overallStatus}
          onChange={setOverallStatus}
        />
        <FilterSelect
          label="Portugal Status"
          options={filterOptions.ptStatuses}
          value={portugalStatus}
          onChange={setPortugalStatus}
        />
        <FilterSelect
          label="Germany Status"
          options={filterOptions.deStatuses}
          value={germanyStatus}
          onChange={setGermanyStatus}
        />

        {hasActiveFilter && (
          <button
            onClick={clearFilters}
            style={{
              padding: '0.375rem 0.75rem',
              fontSize: '0.8125rem',
              color: 'var(--muted)',
              background: 'transparent',
              border: '1px solid var(--rule)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              alignSelf: 'flex-end',
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* KPI cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 16,
        marginBottom: 32,
      }}>
        <KpiCard title="Total Interactions" value={kpiTotals.total} />
        <KpiCard title="Emails Sent"        value={kpiTotals.email_sent} />
        <KpiCard title="Email Responses"    value={kpiTotals.email_response} />
        <KpiCard title="Meetings"           value={kpiTotals.meeting} />
      </div>

      {/* Activity chart */}
      <div style={{
        border: '1px solid var(--rule)',
        borderRadius: 12,
        padding: '20px 24px',
        marginBottom: 32,
        background: 'white',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
        }}>
          <h2 style={{
            fontFamily: 'DM Serif Display, serif',
            fontSize: '1.125rem',
            fontWeight: 400,
            color: 'var(--ink)',
            margin: 0,
          }}>
            Interactions Over Time
          </h2>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: '0.8125rem',
              color: 'var(--muted)',
              cursor: 'pointer',
            }}>
              <input
                type="checkbox"
                checked={includeNotes}
                onChange={e => setIncludeNotes(e.target.checked)}
                style={{ accentColor: 'var(--accent)' }}
              />
              Include notes
            </label>
            <TogglePair
              options={[
                { key: 'weekly',  label: 'Weekly' },
                { key: 'monthly', label: 'Monthly' },
              ]}
              value={granularity}
              onChange={setGranularity}
            />
          </div>
        </div>

        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--rule)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: 'var(--muted)', fontFamily: 'DM Sans, sans-serif' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'var(--muted)', fontFamily: 'DM Sans, sans-serif' }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: 12,
                borderRadius: 8,
                border: '1px solid var(--rule)',
              }}
              cursor={{ fill: 'rgba(0,0,0,0.04)' }}
            />
            <Legend
              wrapperStyle={{
                fontSize: 12,
                fontFamily: 'DM Sans, sans-serif',
                paddingTop: 12,
              }}
            />
            <Bar
              dataKey="email_sent"
              stackId="a"
              fill={INTERACTION_COLORS.email_sent}
              name={INTERACTION_LABELS.email_sent}
            />
            <Bar
              dataKey="email_response"
              stackId="a"
              fill={INTERACTION_COLORS.email_response}
              name={INTERACTION_LABELS.email_response}
            />
            <Bar
              dataKey="meeting"
              stackId="a"
              fill={INTERACTION_COLORS.meeting}
              name={INTERACTION_LABELS.meeting}
              radius={includeNotes ? [0, 0, 0, 0] : [3, 3, 0, 0]}
            />
            {includeNotes && (
              <>
                <Bar
                  dataKey="note"
                  stackId="a"
                  fill={INTERACTION_COLORS.note}
                  name={INTERACTION_LABELS.note}
                />
                <Bar
                  dataKey="note_meeting"
                  stackId="a"
                  fill={INTERACTION_COLORS.note_meeting}
                  name={INTERACTION_LABELS.note_meeting}
                  radius={[3, 3, 0, 0]}
                />
              </>
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* LP breakdown table */}
      <div style={{
        border: '1px solid var(--rule)',
        borderRadius: 12,
        overflow: 'hidden',
        background: 'white',
      }}>
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--rule)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <h2 style={{
            fontFamily: 'DM Serif Display, serif',
            fontSize: '1.125rem',
            fontWeight: 400,
            color: 'var(--ink)',
            margin: 0,
          }}>
            LP Breakdown
          </h2>
          <span style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>
            {tableData.length} LP{tableData.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--paper)' }}>
                <SortTh label="LP Name"           sortKey="lpName"       current={sortKey} dir={sortDir} onSort={handleSort} />
                <SortTh label="Investor Type"     sortKey="investorType" current={sortKey} dir={sortDir} onSort={handleSort} />
                <SortTh label="Engagement Effort" sortKey="effort"       current={sortKey} dir={sortDir} onSort={handleSort} />
                <SortTh label="Overall Status"    sortKey="status"       current={sortKey} dir={sortDir} onSort={handleSort} />
                <SortTh label="Interactions"      sortKey="count"        current={sortKey} dir={sortDir} onSort={handleSort} />
              </tr>
            </thead>
            <tbody>
              {tableData.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      padding: '32px',
                      textAlign: 'center',
                      color: 'var(--muted)',
                      fontSize: '0.875rem',
                    }}
                  >
                    No interactions match the current filters.
                  </td>
                </tr>
              ) : tableData.map((row, i) => (
                <tr
                  key={row.lpName}
                  style={{
                    borderBottom: i < tableData.length - 1 ? '1px solid var(--rule)' : 'none',
                  }}
                >
                  <td style={{ padding: '10px 14px', fontSize: '0.875rem', color: 'var(--ink)', fontWeight: 500 }}>
                    {row.lpName}
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: '0.875rem', color: 'var(--muted)' }}>
                    {row.investorType}
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: '0.875rem', color: 'var(--muted)' }}>
                    {row.effort}
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: '0.875rem', color: 'var(--muted)' }}>
                    {row.status}
                  </td>
                  <td style={{
                    padding: '10px 14px',
                    fontSize: '0.875rem',
                    fontFamily: 'DM Mono, monospace',
                    color: 'var(--ink)',
                    textAlign: 'right',
                  }}>
                    {row.count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/FundraisingActivity.jsx
git commit -m "feat: add FundraisingActivity page"
```

---

## Task 4: Manual verification

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Verify access gate**

Navigate to `http://localhost:5173/fundraising` while logged in as a user **not** in `team_access`. Expected: "Your account does not have access to this page."

Navigate while logged in as a user **in** `team_access`. Expected: page loads with header "Fundraising Activity".

- [ ] **Step 3: Verify sidebar**

Confirm "💰 Fundraising Activity" appears at the bottom of the REPORTING section. Confirm FilterBar is **not** shown on this page (no date/captain/stage/channel bar at the top).

- [ ] **Step 4: Verify filters**

With data loaded, open each dropdown and confirm options are populated from real data (no hardcoded values). Select a team member and confirm the KPI cards and table update. Click "Clear filters" and confirm all filters reset.

- [ ] **Step 5: Verify chart**

Toggle Weekly ↔ Monthly. Confirm X-axis labels change granularity. Enable "Include notes" and confirm grey note bars appear. Disable and confirm they disappear.

- [ ] **Step 6: Verify table**

Confirm table shows one row per LP. Click "Interactions" header — should sort descending first, then ascending on second click. Click "LP Name" header — should sort alphabetically.

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "feat: fundraising activity dashboard complete"
```
