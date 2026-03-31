# Contextual Help System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a two-layer contextual help system (collapsible page banners + metric hover tooltips) to all 7 reporting pages without touching data logic, filters, or charts.

**Architecture:** Two new shared UI components (`PageBanner`, `InfoTooltip`) are created in `src/components/ui/`. `KpiCard` gets an optional `tooltip` prop that renders an `InfoTooltip` next to its title. Each of the 7 reporting pages receives a `PageBanner` after its `<h1>` and before its KPI row; selected column headers and KPI cards receive `InfoTooltip` icons where the user spec identifies non-obvious metrics.

**Tech Stack:** React 19, inline styles with CSS custom properties (`var(--ink)`, `var(--muted)`, `var(--rule)`, `var(--accent)`, `var(--accent-light)`), no new Tailwind classes, no external tooltip libraries.

**Note on testing:** The project has no test infrastructure. Verification is visual (run `npm run dev`, navigate to each page).

---

## File Map

| Action | File | Purpose |
|--------|------|---------|
| Create | `src/components/ui/PageBanner.jsx` | Collapsible info banner with summary/body/caveat |
| Create | `src/components/ui/InfoTooltip.jsx` | 14px ⓘ icon with JS-hover tooltip popup |
| Modify | `src/components/ui/KpiCard.jsx` | Add optional `tooltip` prop |
| Modify | `src/pages/BoardPipeline.jsx` | PageBanner after h1 |
| Modify | `src/pages/TeamAnalytics.jsx` | PageBanner after header; InfoTooltip on Lifetime Hours chart title |
| Modify | `src/pages/ProprietaryDealflow.jsx` | PageBanner after h1; InfoTooltip on goal KpiCard |
| Modify | `src/pages/ChannelPerformance.jsx` | PageBanner after h1; InfoTooltip on Quality Rate KpiCard + % Quality column |
| Modify | `src/pages/AdviserCoverage.jsx` | PageBanner after h1; InfoTooltip on Quality Rate KpiCard + Quality Leads/% Quality columns |
| Modify | `src/pages/FunnelAnalysis.jsx` | PageBanner after h1; InfoTooltip on Cumul. Conv. % + Median Days column headers |
| Modify | `src/pages/DynamicAnalysis.jsx` | PageBanner after h1; InfoTooltip on Stage (funnel_depth) + Milestone Depth table columns |

---

## Task 1: Create PageBanner component

**Files:**
- Create: `src/components/ui/PageBanner.jsx`

- [ ] **Step 1: Create the file**

```jsx
// src/components/ui/PageBanner.jsx
import { useState } from 'react'

export default function PageBanner({ summary, body, caveat }) {
  const [open, setOpen] = useState(false)

  return (
    <div
      style={{
        border: '1px solid var(--rule)',
        borderRadius: 8,
        background: '#f5f7fa',
        marginBottom: '1.5rem',
        overflow: 'hidden',
      }}
    >
      {/* Collapsed row — always visible */}
      <div
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 14px',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        {/* Circular ⓘ icon */}
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 18,
            height: 18,
            borderRadius: '50%',
            border: '1.5px solid var(--muted)',
            fontSize: '0.6875rem',
            fontWeight: 700,
            color: 'var(--muted)',
            flexShrink: 0,
            lineHeight: 1,
          }}
        >
          i
        </span>

        {/* Summary sentence */}
        <span style={{ fontSize: '0.8125rem', color: 'var(--muted)', flex: 1 }}>
          {summary}
        </span>

        {/* Rotating chevron */}
        <span
          style={{
            color: 'var(--muted)',
            fontSize: '0.625rem',
            transition: 'transform 0.15s',
            transform: open ? 'rotate(180deg)' : 'none',
            flexShrink: 0,
          }}
        >
          ▼
        </span>
      </div>

      {/* Expanded body */}
      {open && (
        <div
          style={{
            padding: '0 14px 14px 40px',
            borderTop: '1px solid var(--rule)',
          }}
        >
          <p
            style={{
              fontSize: '0.8125rem',
              color: 'var(--muted)',
              lineHeight: 1.6,
              margin: '10px 0 0',
            }}
          >
            {body}
          </p>
          {caveat && (
            <div
              style={{
                marginTop: 10,
                padding: '8px 12px',
                borderLeft: '3px solid var(--accent)',
                background: 'var(--accent-light)',
                borderRadius: '0 4px 4px 0',
                fontSize: '0.75rem',
                color: 'var(--ink)',
                lineHeight: 1.5,
              }}
            >
              {caveat}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify the file was created**

Run: `ls src/components/ui/`
Expected: `Badge.jsx  InfoTooltip.jsx  KpiCard.jsx  LoadingSpinner.jsx  MultiSelect.jsx  PageBanner.jsx` (InfoTooltip may not exist yet — that's fine)

---

## Task 2: Create InfoTooltip component

**Files:**
- Create: `src/components/ui/InfoTooltip.jsx`

- [ ] **Step 1: Create the file**

```jsx
// src/components/ui/InfoTooltip.jsx
import { useState } from 'react'

export default function InfoTooltip({ text }) {
  const [visible, setVisible] = useState(false)

  return (
    <span
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {/* 14px circular ⓘ icon */}
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 14,
          height: 14,
          borderRadius: '50%',
          border: '1px solid var(--muted)',
          fontSize: '0.5625rem',
          fontWeight: 700,
          color: 'var(--muted)',
          cursor: 'default',
          lineHeight: 1,
          flexShrink: 0,
          marginLeft: 3,
        }}
      >
        i
      </span>

      {/* Tooltip popup — appears above the icon */}
      {visible && (
        <span
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 6px)',
            left: '50%',
            transform: 'translateX(-50%)',
            maxWidth: 220,
            width: 'max-content',
            padding: '7px 10px',
            background: '#f5f7fa',
            border: '1px solid var(--rule)',
            borderRadius: 6,
            fontSize: '0.75rem',
            color: 'var(--muted)',
            lineHeight: 1.45,
            pointerEvents: 'none',
            zIndex: 100,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            whiteSpace: 'normal',
          }}
        >
          {text}
        </span>
      )}
    </span>
  )
}
```

---

## Task 3: Update KpiCard to support tooltip prop

**Files:**
- Modify: `src/components/ui/KpiCard.jsx`

Current content of KpiCard.jsx:
```jsx
export default function KpiCard({ title, value, subtitle }) {
  return (
    <div
      className="rounded-xl border p-4"
      style={{ ... }}
      onMouseEnter={...}
      onMouseLeave={...}
    >
      <div className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
        {title}
      </div>
      <div className="mt-1 text-2xl font-semibold" style={{ fontFamily: 'var(--font-mono)' }}>
        {value}
      </div>
      {subtitle && (
        <div className="mt-0.5 text-xs" style={{ color: 'var(--muted)' }}>
          {subtitle}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 1: Rewrite KpiCard.jsx with optional tooltip prop**

Replace the entire file with:

```jsx
import InfoTooltip from './InfoTooltip'

export default function KpiCard({ title, value, subtitle, tooltip }) {
  return (
    <div
      className="rounded-xl border p-4"
      style={{
        borderColor: 'var(--rule)',
        background: 'var(--surface)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        transition: 'box-shadow 0.2s ease',
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)' }}
    >
      <div
        className="text-xs font-medium uppercase tracking-wide"
        style={{ color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 2 }}
      >
        {title}
        {tooltip && <InfoTooltip text={tooltip} />}
      </div>
      <div className="mt-1 text-2xl font-semibold" style={{ fontFamily: 'var(--font-mono)' }}>
        {value}
      </div>
      {subtitle && (
        <div className="mt-0.5 text-xs" style={{ color: 'var(--muted)' }}>
          {subtitle}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Start dev server and verify KpiCard still renders on BoardPipeline**

Run: `npm run dev` (from project root `nzyme_reporting/Nzyme_Reporting_TT/`)
Navigate to `/pipeline`. All 4 KPI cards should render as before with no visual change.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/PageBanner.jsx src/components/ui/InfoTooltip.jsx src/components/ui/KpiCard.jsx
git commit -m "feat: add PageBanner and InfoTooltip shared components; add tooltip prop to KpiCard"
```

---

## Task 4: Board Pipeline — add PageBanner

**Files:**
- Modify: `src/pages/BoardPipeline.jsx`

The banner goes between the `<h1>Board Pipeline</h1>` (line ~347) and the KPI grid div.

- [ ] **Step 1: Add import at top of file**

After the existing imports (after line ~7), add:
```jsx
import PageBanner from '../components/ui/PageBanner'
```

- [ ] **Step 2: Insert PageBanner after the h1**

Find this block (around line 347–351):
```jsx
      <h1 style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: '1.75rem', marginBottom: '1.5rem' }}>
        Board Pipeline
      </h1>

      {/* KPI row */}
```

Replace with:
```jsx
      <h1 style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: '1.75rem', marginBottom: '1.5rem' }}>
        Board Pipeline
      </h1>

      <PageBanner
        summary="A snapshot of every active deal, grouped by current stage."
        body="This page shows all deals currently sitting in your active pipeline. Stages run from 'Being Explored' through to 'Portfolio'. The date filter is disabled here — you're always looking at the current state, not a historical slice. Use the Stage and Deal Captain filters to focus on a subset."
        caveat="Date range filter is disabled on this page — it always reflects the current pipeline state."
      />

      {/* KPI row */}
```

- [ ] **Step 3: Verify visually**

Navigate to `/pipeline`. Just below the "Board Pipeline" heading, you should see:
- A light-grey rounded banner with a circular ⓘ, the summary text, and a ▼ chevron
- Clicking it expands to show the body text + a green-left-bordered caveat block
- Clicking again collapses it
- Re-navigating resets it to collapsed

- [ ] **Step 4: Commit**

```bash
git add src/pages/BoardPipeline.jsx
git commit -m "feat: add contextual banner to Board Pipeline"
```

---

## Task 5: Team Analytics — add PageBanner + hours tooltip

**Files:**
- Modify: `src/pages/TeamAnalytics.jsx`

The banner goes after the header+toggle flex row (which ends around line 563) and before `{isLoading && <LoadingSpinner />}`.

The InfoTooltip goes on the "Lifetime Hours by Deal" ChartCard title (around line 691). Since `ChartCard` renders `{title}` inside an `<h3>`, passing JSX as the `title` prop works fine.

- [ ] **Step 1: Add imports**

After the existing imports near the top, add:
```jsx
import PageBanner from '../components/ui/PageBanner'
import InfoTooltip from '../components/ui/InfoTooltip'
```

- [ ] **Step 2: Insert PageBanner**

Find this block (around lines 545–568):
```jsx
    <div style={{ maxWidth: 1200, width: '100%', margin: '0 auto', padding: '2rem 1.5rem 4rem', boxSizing: 'border-box' }}>
      <div style={{ ... }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: '1.75rem', marginBottom: 2 }}>
            Team Analytics
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>{timeLabel}</p>
        </div>
        <TimeframeToggle value={timeframe} onChange={setTimeframe} />
      </div>

      {isLoading && <LoadingSpinner />}
```

Replace `{isLoading && <LoadingSpinner />}` with:
```jsx
      <PageBanner
        summary="Shows how the team is allocating time across deals and internal work, week by week."
        body="Data comes from the weekly time tracker entries. Hours are calculated from the percentage logged multiplied by a weekly hour assumption that varies by intensity (light = 40h, normal = 55h, intense = 70h). Lifetime hours include all entries ever logged, regardless of date filter. The date filter and channel filter are hidden on this page."
      />

      {isLoading && <LoadingSpinner />}
```

- [ ] **Step 3: Add InfoTooltip to Lifetime Hours chart title**

Find this ChartCard (around line 691):
```jsx
          <ChartCard
            title="Lifetime Hours by Deal"
            description="Cumulative actual hours invested per deal across all time. Click a stage to filter."
```

Replace the `title` prop value with JSX:
```jsx
          <ChartCard
            title={<>Lifetime Hours by Deal <InfoTooltip text="Derived from % logged × weekly hour assumption. Varies by intensity setting (light / normal / intense)." /></>}
            description="Cumulative actual hours invested per deal across all time. Click a stage to filter."
```

- [ ] **Step 4: Verify visually**

Navigate to `/team`. Banner should appear below the "Team Analytics" heading + timeframe toggle, above the charts. The "Lifetime Hours by Deal" chart title should show a small ⓘ icon; hovering it shows the tooltip.

- [ ] **Step 5: Commit**

```bash
git add src/pages/TeamAnalytics.jsx
git commit -m "feat: add contextual banner and hours tooltip to Team Analytics"
```

---

## Task 6: Proprietary Dealflow — add PageBanner + goal tooltip

**Files:**
- Modify: `src/pages/ProprietaryDealflow.jsx`

The banner goes after the `<h1>` (line ~374) and before the KPI grid. The goal tooltip goes on the "Proprietary Deals" KpiCard.

- [ ] **Step 1: Add import**

```jsx
import PageBanner from '../components/ui/PageBanner'
```

- [ ] **Step 2: Insert PageBanner after h1**

Find (around lines 374–379):
```jsx
      <h1 style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: '1.75rem', marginBottom: '1.5rem' }}>
        Proprietary Dealflow
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
```

Replace with:
```jsx
      <h1 style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: '1.75rem', marginBottom: '1.5rem' }}>
        Proprietary Dealflow
      </h1>

      <PageBanner
        summary="Tracks deals originated directly by the team, measured against an annual target."
        body="Only deals where the origination channel is marked as proprietary are counted here. The annual target is 36 deals (3 per month), pro-rated automatically when you select YTD or a custom date range. The donut shows progress against that pro-rated goal."
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
```

- [ ] **Step 3: Add tooltip to Proprietary Deals KpiCard**

Find (around line 380):
```jsx
        <KpiCard title="Proprietary Deals"  value={kpis.total}           subtitle={`goal: ${goal}`} />
```

Replace with:
```jsx
        <KpiCard
          title="Proprietary Deals"
          value={kpis.total}
          subtitle={`goal: ${goal}`}
          tooltip="Annual target of 36 deals, pro-rated to the selected date range. YTD uses months elapsed; custom ranges use calendar days."
        />
```

- [ ] **Step 4: Verify visually**

Navigate to `/proprietary`. Banner appears under heading; "Proprietary Deals" card title shows ⓘ with tooltip on hover.

- [ ] **Step 5: Commit**

```bash
git add src/pages/ProprietaryDealflow.jsx
git commit -m "feat: add contextual banner and goal tooltip to Proprietary Dealflow"
```

---

## Task 7: Channel Performance — add PageBanner + quality tooltips

**Files:**
- Modify: `src/pages/ChannelPerformance.jsx`

The banner goes after the `<h1>` (line ~384). Tooltips go on the "Quality Rate" KpiCard and the "% Quality" column header in the table.

Note: `Cost/NBO` and `Cost/quality lead` are computed but not rendered as visible static column labels in the current table — no tooltips added for those.

- [ ] **Step 1: Add import**

```jsx
import PageBanner from '../components/ui/PageBanner'
import InfoTooltip from '../components/ui/InfoTooltip'
```

- [ ] **Step 2: Insert PageBanner after h1**

Find (around lines 384–389):
```jsx
      <h1 style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: '1.75rem', marginBottom: '1.5rem' }}>
        Channel Performance
      </h1>

      {/* KPI row */}
```

Replace with:
```jsx
      <h1 style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: '1.75rem', marginBottom: '1.5rem' }}>
        Channel Performance
      </h1>

      <PageBanner
        summary="Compares origination channels by volume, quality, and cost efficiency."
        body="Each row is an origination channel. Costs combine two sources: one-off costs entered manually, and time-based costs calculated from hours logged against that channel multiplied by team rates and seniority multipliers. 'Unattributed' covers deals with no channel set. NBO count is based on the Milestones field containing 'NBO Sent'."
      />

      {/* KPI row */}
```

- [ ] **Step 3: Add tooltip to Quality Rate KpiCard**

Find (around line 392):
```jsx
        <KpiCard title="Quality Rate"      value={`${kpis.qualityRate}%`} subtitle="quality / total" />
```

Replace with:
```jsx
        <KpiCard
          title="Quality Rate"
          value={`${kpis.qualityRate}%`}
          subtitle="quality / total"
          tooltip="% of leads rated High or Medium-High attractiveness out of total leads for that channel."
        />
```

- [ ] **Step 4: Add tooltip field to COLS array for % Quality**

Find the COLS constant (around line 78):
```jsx
const COLS = [
  { key: 'channel',           label: 'Channel',                  align: 'left' },
  { key: 'leads',             label: 'Leads',                    align: 'right' },
  { key: 'quality',           label: 'Quality Leads',            align: 'right' },
  { key: 'qualityRate',       label: '% Quality',                align: 'right' },
  { key: 'avgPriority',       label: 'Avg Priority',             align: 'right' },
  { key: 'nboCount',          label: 'NBOs',                     align: 'right' },
  { key: 'totalHours',        label: 'Total Hours',              align: 'right' },
  { key: 'dealHours',         label: 'Time Invested in Deals',   align: 'right' },
  { key: 'difficulty',        label: 'Difficulty',               align: 'center' },
  { key: 'potential',         label: 'Potential',                align: 'center' },
]
```

Replace with:
```jsx
const COLS = [
  { key: 'channel',           label: 'Channel',                  align: 'left' },
  { key: 'leads',             label: 'Leads',                    align: 'right' },
  { key: 'quality',           label: 'Quality Leads',            align: 'right' },
  { key: 'qualityRate',       label: '% Quality',                align: 'right', tooltip: '% of leads rated High or Medium-High attractiveness out of total leads for that channel.' },
  { key: 'avgPriority',       label: 'Avg Priority',             align: 'right' },
  { key: 'nboCount',          label: 'NBOs',                     align: 'right' },
  { key: 'totalHours',        label: 'Total Hours',              align: 'right' },
  { key: 'dealHours',         label: 'Time Invested in Deals',   align: 'right' },
  { key: 'difficulty',        label: 'Difficulty',               align: 'center' },
  { key: 'potential',         label: 'Potential',                align: 'center' },
]
```

- [ ] **Step 5: Update the column header render to show InfoTooltip**

Find (around lines 131–138):
```jsx
            {COLS.map(col => (
              <th
                key={col.key}
                style={{ ...thStyle, textAlign: col.align }}
                onClick={() => toggleSort(col.key)}
              >
                {col.label}
                <SortIcon active={sortKey === col.key} dir={sortDir} />
              </th>
            ))}
```

Replace with:
```jsx
            {COLS.map(col => (
              <th
                key={col.key}
                style={{ ...thStyle, textAlign: col.align }}
                onClick={() => toggleSort(col.key)}
              >
                {col.label}
                {col.tooltip && <InfoTooltip text={col.tooltip} />}
                <SortIcon active={sortKey === col.key} dir={sortDir} />
              </th>
            ))}
```

- [ ] **Step 6: Verify visually**

Navigate to `/channels`. Banner appears under heading. "Quality Rate" KPI card shows ⓘ. In the channel table, "% Quality" column header shows ⓘ; hovering shows the tooltip.

- [ ] **Step 7: Commit**

```bash
git add src/pages/ChannelPerformance.jsx
git commit -m "feat: add contextual banner and quality tooltips to Channel Performance"
```

---

## Task 8: Adviser Coverage — add PageBanner + quality tooltips

**Files:**
- Modify: `src/pages/AdviserCoverage.jsx`

The banner goes after the header div (which contains the h1 and untiered toggle) and before the KPI grid. This page uses Tailwind `className="p-8 space-y-8"` layout.

Tooltips on: "Quality Rate" KpiCard + "Quality Leads" and "% Quality" column headers in the adviser table.

- [ ] **Step 1: Add imports**

```jsx
import PageBanner from '../components/ui/PageBanner'
import InfoTooltip from '../components/ui/InfoTooltip'
```

- [ ] **Step 2: Insert PageBanner between header div and KPI grid**

Find this block (around lines 409–412):
```jsx
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-4 gap-4">
```

Replace with:
```jsx
      </div>

      <PageBanner
        summary="Tracks dealflow from your adviser programme, by firm and KAM."
        body="Only deals where origination channel is 'Adviser Programme' are shown by default. Toggle 'Include Untiered' to also show deals from Untiered Connections. Firms are grouped under the KAM responsible for the relationship. Quality rate is colour-coded: green ≥ 20%, amber 5–20%, red below 5%."
        caveat="'No Adviser Data' rows are always shown but excluded from the KPI totals at the top."
      />

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-4 gap-4">
```

- [ ] **Step 3: Add tooltip to Quality Rate KpiCard**

Find (around line 423–427):
```jsx
        <KpiCard
          title="Quality Rate"
          value={`${kpis.rate}%`}
          subtitle="quality / total LTM"
        />
```

Replace with:
```jsx
        <KpiCard
          title="Quality Rate"
          value={`${kpis.rate}%`}
          subtitle="quality / total LTM"
          tooltip="Deals rated High or Medium-High attractiveness. Deals with no attractiveness set are not counted."
        />
```

- [ ] **Step 4: Update adviser table column headers to support InfoTooltip**

Find the string-array header map (around line 167):
```jsx
            {['Deal Captain', 'Adviser', 'Tier', 'Total Leads', 'Quality Leads', '% Quality'].map((h) => (
              <th
```

Replace with a named constant (placed just above the component that uses it, or at module level near the top of that component):

First, add a constant just before the `return` of the component function that contains this table (or at module level near the table component). Since this is inside the adviser table sub-component, add a module-level constant after the imports:

```jsx
const ADVISER_TABLE_HEADERS = [
  { label: 'Deal Captain' },
  { label: 'Adviser' },
  { label: 'Tier' },
  { label: 'Total Leads' },
  { label: 'Quality Leads', tooltip: 'Deals rated High or Medium-High attractiveness. Deals with no attractiveness set are not counted.' },
  { label: '% Quality',     tooltip: 'Deals rated High or Medium-High attractiveness. Deals with no attractiveness set are not counted.' },
]
```

Then replace the map:
```jsx
            {ADVISER_TABLE_HEADERS.map((h) => (
              <th
                key={h.label}
                className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide"
                style={{ color: 'var(--muted)', borderBottom: '1px solid var(--rule)', whiteSpace: 'nowrap' }}
              >
                {h.label}
                {h.tooltip && <InfoTooltip text={h.tooltip} />}
              </th>
            ))}
```

**Important:** Find the exact location of the string array in AdviserCoverage.jsx before making this change. The array is at line ~167 inside a sub-component. Place `ADVISER_TABLE_HEADERS` at module level, after imports.

- [ ] **Step 5: Verify visually**

Navigate to `/advisers`. Banner appears after the header+toggle row, before KPI cards. "Quality Rate" KPI card shows ⓘ. In the adviser table, "Quality Leads" and "% Quality" column headers each show ⓘ.

- [ ] **Step 6: Commit**

```bash
git add src/pages/AdviserCoverage.jsx
git commit -m "feat: add contextual banner and quality tooltips to Adviser Coverage"
```

---

## Task 9: Funnel Analysis — add PageBanner + conversion/days tooltips

**Files:**
- Modify: `src/pages/FunnelAnalysis.jsx`

The banner goes after the header `<div>` (which contains `<h1>` and subtitle) and before the KPI grid. This page uses Tailwind `className="p-8 space-y-8"` layout.

Tooltips on: "Cumul. Conv. %" and "Median Days" column headers in the funnel stats table.

- [ ] **Step 1: Add imports**

```jsx
import PageBanner from '../components/ui/PageBanner'
import InfoTooltip from '../components/ui/InfoTooltip'
```

- [ ] **Step 2: Insert PageBanner between header and KPI grid**

Find (around lines 473–476):
```jsx
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-4 gap-4">
```

Replace with:
```jsx
      </div>

      <PageBanner
        summary="Shows how deals have moved through the pipeline stages over all time."
        body="This page always shows all-time data — the date filter is intentionally disabled because funnel conversion rates are only meaningful across the full dataset. Each stage bar shows the cumulative count of deals that reached or passed that stage, not just deals currently sitting in it. Clicking a stage row expands a time-in-stage histogram."
        caveat="Date range filter is disabled — this page always reflects all-time data."
      />

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-4 gap-4">
```

- [ ] **Step 3: Convert funnel stats table header array to support InfoTooltip**

Find the string-array header map in the funnel stats table (around line 592):
```jsx
                {['Stage', 'Reached', "Didn't Advance", 'Cumul. Conv. %', 'Stage-to-Stage %', 'Median Days', 'Total Hrs', 'Avg Hrs to Progress'].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide"
                    style={{ color: 'var(--muted)', borderBottom: '1px solid var(--rule)' }}
                  >
                    {h}
                  </th>
                ))}
```

Replace with (add the constant at module level, after imports):

Module-level constant:
```jsx
const FUNNEL_TABLE_HEADERS = [
  { label: 'Stage' },
  { label: 'Reached' },
  { label: "Didn't Advance" },
  { label: 'Cumul. Conv. %', tooltip: "The % of all deals ever seen that made it to this stage or beyond. Not stage-to-stage — it's always relative to total deals entered." },
  { label: 'Stage-to-Stage %' },
  { label: 'Median Days',    tooltip: 'Average number of days deals spent in this stage before moving on or stalling.' },
  { label: 'Total Hrs' },
  { label: 'Avg Hrs to Progress' },
]
```

Updated render:
```jsx
                {FUNNEL_TABLE_HEADERS.map((h) => (
                  <th
                    key={h.label}
                    className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide"
                    style={{ color: 'var(--muted)', borderBottom: '1px solid var(--rule)' }}
                  >
                    {h.label}
                    {h.tooltip && <InfoTooltip text={h.tooltip} />}
                  </th>
                ))}
```

- [ ] **Step 4: Verify visually**

Navigate to `/funnel`. Banner appears after heading, before KPI cards. In the funnel stats table, "Cumul. Conv. %" and "Median Days" headers each show ⓘ with correct tooltip text on hover.

- [ ] **Step 5: Commit**

```bash
git add src/pages/FunnelAnalysis.jsx
git commit -m "feat: add contextual banner and conversion/days tooltips to Funnel Analysis"
```

---

## Task 10: Dynamic Analysis — add PageBanner + depth tooltips

**Files:**
- Modify: `src/pages/DynamicAnalysis.jsx`

The banner goes after the page header `<div>` (which contains `<h1>` and subtitle paragraph) and before the chart card. Tooltips go on "Stage" (funnel_depth) and "Milestone Depth" column headers in the Deal Breakdown table.

- [ ] **Step 1: Add imports**

```jsx
import PageBanner from '../components/ui/PageBanner'
import InfoTooltip from '../components/ui/InfoTooltip'
```

- [ ] **Step 2: Insert PageBanner after page header div**

Find (around lines 167–179):
```jsx
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
```

Replace with:
```jsx
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
      />

      {/* Chart card */}
```

- [ ] **Step 3: Add tooltip fields to TABLE_COLS**

Find the TABLE_COLS constant (around line 152):
```jsx
  const TABLE_COLS = [
    { col: 'deal_name',            label: 'Deal' },
    { col: 'captain',              label: 'Captain' },
    { col: 'funnel_depth',         label: 'Stage' },
    { col: 'channel_label',        label: 'Channel' },
    { col: 'total_hrs',            label: 'Hrs' },
    { col: 'avg_days_per_stage',   label: 'Avg Days/Stage' },
    { col: 'deal_lifespan_days',   label: 'Lifespan (days)' },
    { col: 'equity_required',      label: 'Equity (€)' },
    { col: 'attractiveness_score', label: 'Attract. Score' },
    { col: 'ic_stage_rank',        label: 'IC Stage' },
    { col: 'milestone_depth',      label: 'Milestone Depth' },
  ];
```

Replace with:
```jsx
  const TABLE_COLS = [
    { col: 'deal_name',            label: 'Deal' },
    { col: 'captain',              label: 'Captain' },
    { col: 'funnel_depth',         label: 'Stage',          tooltip: 'A numeric score from 1–6 representing the deepest stage a deal has ever reached, regardless of its current stage.' },
    { col: 'channel_label',        label: 'Channel' },
    { col: 'total_hrs',            label: 'Hrs' },
    { col: 'avg_days_per_stage',   label: 'Avg Days/Stage' },
    { col: 'deal_lifespan_days',   label: 'Lifespan (days)' },
    { col: 'equity_required',      label: 'Equity (€)' },
    { col: 'attractiveness_score', label: 'Attract. Score' },
    { col: 'ic_stage_rank',        label: 'IC Stage' },
    { col: 'milestone_depth',      label: 'Milestone Depth', tooltip: 'Scores 0–6 based on the most advanced milestone reached: None / NDA / IM / NBO / VDR-FAQ / MIP / Term Sheet.' },
  ];
```

- [ ] **Step 4: Update the table header render to show InfoTooltip**

Find (around lines 289–307):
```jsx
                {TABLE_COLS.map(({ col, label }) => (
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
```

Replace with:
```jsx
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
```

- [ ] **Step 5: Verify visually**

Navigate to `/analysis`. Banner appears after the heading+subtitle, before the scatter chart card. In the Deal Breakdown table, "Stage" and "Milestone Depth" column headers show ⓘ with correct tooltip text on hover.

- [ ] **Step 6: Final commit**

```bash
git add src/pages/DynamicAnalysis.jsx
git commit -m "feat: add contextual banner and depth tooltips to Dynamic Analysis"
```

---

## Self-Review

**Spec coverage check:**

| Requirement | Covered by |
|------------|-----------|
| PageBanner on all 7 pages | Tasks 4–10 |
| Collapsed by default | Task 1 — `useState(false)` |
| ⓘ icon left, ▼ chevron right, rotates | Task 1 |
| Inline expand (no modal/drawer) | Task 1 — `{open && ...}` |
| --rule border, off-white bg, --muted text | Task 1 — `#f5f7fa` bg, `var(--rule)` border |
| Caveat block with --accent left border | Task 1 — `borderLeft: '3px solid var(--accent)'` |
| No persistence | Task 1 — local state only |
| InfoTooltip 14px ⓘ, muted, circular border | Task 2 |
| Tooltip appears above, max 220px | Task 2 — `bottom: calc(100% + 6px)`, `maxWidth: 220` |
| Disappears on mouse leave | Task 2 — `onMouseLeave` |
| No tooltip library | Task 2 — pure JS hover |
| BoardPipeline: banner + caveat | Task 4 |
| TeamAnalytics: banner (no caveat) + Hrs tooltip | Task 5 |
| ProprietaryDealflow: banner + goal tooltip | Task 6 |
| ChannelPerformance: banner + quality rate tooltip | Task 7 |
| AdviserCoverage: banner + caveat + quality tooltips | Task 8 |
| FunnelAnalysis: banner + caveat + conv%/days tooltips | Task 9 |
| DynamicAnalysis: banner + caveat + depth tooltips | Task 10 |
| No data-fetching changes | Confirmed — all changes are UI-only |
| No Tailwind beyond existing | Confirmed — only inline styles in new components |
| No hardcoded hex (except #f5f7fa surface) | #f5f7fa used consistently as off-white surface; all other tokens are CSS variables |

**Placeholder scan:** None found — all steps have complete code.

**Type consistency:** `tooltip` prop name used consistently across KpiCard, COLS, TABLE_COLS, and ADVISER_TABLE_HEADERS. `InfoTooltip` import path is `'../components/ui/InfoTooltip'` in pages and `'./InfoTooltip'` in KpiCard — both correct.

**One note on #f5f7fa:** This is used as the banner/tooltip surface. It sits just between `--paper` (#fafafa) and `--surface` (#ffffff) perceptually. If the design token `--paper` is preferred, swap `background: '#f5f7fa'` for `background: 'var(--paper)'` in both PageBanner and InfoTooltip — the spec says "slightly off-white surface."
