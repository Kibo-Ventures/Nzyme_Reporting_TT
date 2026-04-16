# Team Analytics — Non-Deal Chart & Expanded Stage Coverage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add "Being Explored" and "Add-ons" stages to existing deal charts, add a new "Lifetime Hours per Non-Deal Task" bar chart, and restructure the Breakdown Lifetime Hours table into its own standalone full-width card covering all category types.

**Architecture:** All changes live in two files only — `useTeamAnalytics.js` (data layer) and `TeamAnalytics.jsx` (constants, builders, hooks, JSX). No new files, no schema changes. The new `useLifetimeNonDealEntries` hook mirrors the existing `useLifetimeHoursEntries` pattern. New builder functions follow the same shape as existing ones.

**Tech Stack:** React 19, Recharts v3, TanStack React Query v5, Supabase JS v2

---

## File Map

| File | What changes |
|---|---|
| `src/hooks/useTeamAnalytics.js` | Extend `normalizeStage`; expand `useLifetimeHoursEntries` filter; add `useLifetimeNonDealEntries` |
| `src/pages/TeamAnalytics.jsx` | Expand `ALL_STAGES` + `STAGE_COLORS`; add `NON_DEAL_COLORS`/`NON_DEAL_LABELS`; expand `buildFteData` filter; add `buildNonDealData`; add `buildFullLifetimeMatrix`; add `FullLifetimeMatrix` component; wire new hook + memo; update JSX (remove old accordion, add two new sections) |

---

## Task 1: Extend the data layer in `useTeamAnalytics.js`

**Files:**
- Modify: `src/hooks/useTeamAnalytics.js`

- [ ] **Step 1: Extend `normalizeStage` to handle Being Explored and Add-ons**

Replace the current function (lines 5–11) with:

```js
export function normalizeStage(s) {
  if (!s) return 'Working on Deal'
  const l = s.toLowerCase()
  if (l.includes('dd')) return 'DD Phase'
  if (l.includes('analysis') || l.includes('analys')) return 'Under Analysis'
  if (l.includes('explo')) return 'Being Explored'
  if (l.includes('add-on') || l.includes('addon')) return 'Add-ons'
  return 'Working on Deal'
}
```

- [ ] **Step 2: Expand `useLifetimeHoursEntries` to include `addon` entries**

In `useLifetimeHoursEntries` (line 65), change the `.in()` filter from:

```js
.in('category_type', ['deal', 'longtail'])
```

to:

```js
.in('category_type', ['deal', 'longtail', 'addon'])
```

- [ ] **Step 3: Add `useLifetimeNonDealEntries` hook**

Append to the bottom of `src/hooks/useTeamAnalytics.js`:

```js
export function useLifetimeNonDealEntries() {
  return useQuery({
    queryKey: ['lifetime-non-deal-entries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ReportingNz_time_entries')
        .select('user_name, category_key, category_type, hrs_calculated')
        .in('category_type', ['internal', 'portco', 'orig'])
        .gt('hrs_calculated', 0)
      if (error) throw error
      return data || []
    },
    staleTime: 5 * 60 * 1000,
  })
}
```

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useTeamAnalytics.js
git commit -m "feat: extend normalizeStage, expand lifetime hook, add non-deal hook"
```

---

## Task 2: Update constants and add color maps in `TeamAnalytics.jsx`

**Files:**
- Modify: `src/pages/TeamAnalytics.jsx`

- [ ] **Step 1: Expand `ALL_STAGES`**

Replace (line 16):

```js
const ALL_STAGES = ['DD Phase', 'Working on Deal', 'Under Analysis']
```

with:

```js
const ALL_STAGES = ['DD Phase', 'Working on Deal', 'Under Analysis', 'Being Explored', 'Add-ons']
```

- [ ] **Step 2: Add new entries to `STAGE_COLORS`**

Replace (lines 18–22):

```js
const STAGE_COLORS = {
  'DD Phase':        '#1a3a2a',
  'Working on Deal': '#2e6da4',
  'Under Analysis':  '#c07830',
}
```

with:

```js
const STAGE_COLORS = {
  'DD Phase':        '#1a3a2a',
  'Working on Deal': '#2e6da4',
  'Under Analysis':  '#c07830',
  'Being Explored':  '#6b3a80',
  'Add-ons':         '#1a6a5a',
}
```

- [ ] **Step 3: Add `NON_DEAL_COLORS` and `NON_DEAL_LABELS` constants**

After the `CAT_LABELS` block (after line 45), add:

```js
const NON_DEAL_COLORS = {
  portco:   '#3a4080',
  orig:     '#c07830',
  internal: '#74b49b',
}

const NON_DEAL_LABELS = {
  portco:   'Portfolio',
  orig:     'Origination',
  internal: 'Internal',
}
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/TeamAnalytics.jsx
git commit -m "feat: expand stage constants and add non-deal color maps"
```

---

## Task 3: Update `buildFteData` and add new data builder functions

**Files:**
- Modify: `src/pages/TeamAnalytics.jsx`

- [ ] **Step 1: Expand `buildFteData` filter to include `addon`**

In `buildFteData` (around line 97), change:

```js
.filter(r => ['deal', 'longtail'].includes(r.category_type))
```

to:

```js
.filter(r => ['deal', 'longtail', 'addon'].includes(r.category_type))
```

- [ ] **Step 2: Add `buildNonDealData` function**

After the `buildLifetimeData` function, add:

```js
function buildNonDealData(entries) {
  const acc = {}
  entries.forEach(row => {
    if (!acc[row.category_key]) acc[row.category_key] = { hrs: 0, category_type: row.category_type }
    acc[row.category_key].hrs += (row.hrs_calculated || 0)
  })
  const TYPE_ORDER = { portco: 0, orig: 1, internal: 2 }
  return Object.entries(acc)
    .map(([name, { hrs, category_type }]) => ({
      name: name.length > 26 ? name.slice(0, 24) + '…' : name,
      fullName: name,
      hrs: Math.round(hrs),
      category_type,
    }))
    .filter(d => d.hrs > 0)
    .sort((a, b) =>
      (TYPE_ORDER[a.category_type] ?? 9) - (TYPE_ORDER[b.category_type] ?? 9) ||
      b.hrs - a.hrs
    )
}
```

- [ ] **Step 3: Add `buildFullLifetimeMatrix` function**

After `buildNonDealData`, add:

```js
function buildFullLifetimeMatrix(dealEntries, nonDealEntries) {
  const allEntries = [...dealEntries, ...nonDealEntries]
  const users = [...new Set(allEntries.map(e => e.user_name))].sort()

  const SECTION_MAP = {
    deal:     'Dealflow',
    longtail: 'Dealflow',
    addon:    'Add-ons',
    portco:   'Portfolio',
    orig:     'Origination',
    internal: 'Internal',
  }
  const SECTION_ORDER = ['Dealflow', 'Add-ons', 'Portfolio', 'Origination', 'Internal']

  const groups = {}
  SECTION_ORDER.forEach(s => (groups[s] = {}))

  const userTotals = {}
  users.forEach(u => (userTotals[u] = 0))
  let grandTotal = 0

  allEntries.forEach(row => {
    const section = SECTION_MAP[row.category_type] || 'Internal'
    if (!groups[section][row.category_key]) groups[section][row.category_key] = { _rowTotal: 0 }
    groups[section][row.category_key][row.user_name] =
      (groups[section][row.category_key][row.user_name] || 0) + (row.hrs_calculated || 0)
    groups[section][row.category_key]._rowTotal += (row.hrs_calculated || 0)
    userTotals[row.user_name] = (userTotals[row.user_name] || 0) + (row.hrs_calculated || 0)
    grandTotal += (row.hrs_calculated || 0)
  })

  return { users, groups, SECTION_ORDER, userTotals, grandTotal }
}
```

- [ ] **Step 4: Add `FullLifetimeMatrix` sub-component**

After the existing `LifetimeMatrix` component, add:

```jsx
function FullLifetimeMatrix({ dealEntries, nonDealEntries }) {
  const { users, groups, SECTION_ORDER, userTotals, grandTotal } = useMemo(
    () => buildFullLifetimeMatrix(dealEntries, nonDealEntries),
    [dealEntries, nonDealEntries]
  )

  if (!users.length) return <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>No data.</p>

  const shortUsers = users.map(u => shortName(u))
  const headers = ['Category', ...shortUsers, 'Total Hrs']
  const rows = []
  const groupRowIndices = new Set()

  SECTION_ORDER.forEach(section => {
    const cats = Object.keys(groups[section] || {}).sort(
      (a, b) => groups[section][b]._rowTotal - groups[section][a]._rowTotal
    )
    if (!cats.length) return
    groupRowIndices.add(rows.length)
    rows.push([section, ...users.map(() => ''), ''])
    cats.forEach(cat => {
      rows.push([
        cat,
        ...users.map(u => {
          const v = groups[section][cat][u]
          return v ? Math.round(v) : '–'
        }),
        Math.round(groups[section][cat]._rowTotal),
      ])
    })
  })

  const footer = [
    'Team Totals',
    ...users.map(u => Math.round(userTotals[u] || 0)),
    Math.round(grandTotal),
  ]

  return <DenseTable headers={headers} rows={rows} footerRow={footer} groupRows={groupRowIndices} />
}
```

- [ ] **Step 5: Commit**

```bash
git add src/pages/TeamAnalytics.jsx
git commit -m "feat: add non-deal and full lifetime matrix builders + FullLifetimeMatrix component"
```

---

## Task 4: Wire up the new hook and memos in the page component

**Files:**
- Modify: `src/pages/TeamAnalytics.jsx`

- [ ] **Step 1: Import `useLifetimeNonDealEntries`**

At the top of the file, update the import from `useTeamAnalytics` (line 8):

```js
import { useDealStageMap, useTimeframeEntries, useLifetimeHoursEntries, useLifetimeNonDealEntries } from '../hooks/useTeamAnalytics'
```

- [ ] **Step 2: Call the new hook inside `TeamAnalytics()`**

After the existing `const stageInvestQ = useStageTimeInvestment()` line, add:

```js
const nonDealQ = useLifetimeNonDealEntries()
```

- [ ] **Step 3: Extract the data**

After `const stageInvestEntries = stageInvestQ.data ?? []`, add:

```js
const nonDealEntries = nonDealQ.data ?? []
```

- [ ] **Step 4: Add the `nonDealData` memo**

After the existing `lifetimeData` memo, add:

```js
const nonDealData = useMemo(() => buildNonDealData(nonDealEntries), [nonDealEntries])
```

- [ ] **Step 5: Add the `nonDealHeight` derived value**

After the `lifeHeight` line, add:

```js
const nonDealHeight = Math.max(140, 44 + nonDealData.length * 28)
```

- [ ] **Step 6: Commit**

```bash
git add src/pages/TeamAnalytics.jsx
git commit -m "feat: wire useLifetimeNonDealEntries hook and nonDealData memo"
```

---

## Task 5: Update the "Lifetime Hours by Deal" card JSX

**Files:**
- Modify: `src/pages/TeamAnalytics.jsx`

- [ ] **Step 1: Remove the accordion from the "Lifetime Hours by Deal" `ChartCard`**

Inside the `ChartCard` for "Lifetime Hours by Deal" (around line 747), find and **delete** the entire `<Accordion>` block:

```jsx
<Accordion summary="Breakdown Lifetime Hours (Matrix View)">
  <LifetimeMatrix
    entries={lifetimeEntries}
    stageMap={stageMap}
    stageFilters={lifetimeFilters}
  />
</Accordion>
```

The closing `</ChartCard>` tag should now come directly after the `</ResponsiveContainer>` (or the loading/empty state).

- [ ] **Step 2: Verify the stage pills now show 5 stages**

Since `ALL_STAGES` was already expanded in Task 2 and both filter strips render from it, no JSX change is needed for the pills — they update automatically.

- [ ] **Step 3: Commit**

```bash
git add src/pages/TeamAnalytics.jsx
git commit -m "feat: remove old accordion from Lifetime Hours by Deal card"
```

---

## Task 6: Add the new "Lifetime Hours per Non-Deal Task" chart

**Files:**
- Modify: `src/pages/TeamAnalytics.jsx`

- [ ] **Step 1: Add the new ChartCard immediately after the closing tag of "Lifetime Hours by Deal"**

```jsx
{/* ── Row 4: Lifetime Hours per Non-Deal Task — full width ── */}
<ChartCard
  title="Lifetime Hours per Non-Deal Task"
  description="Cumulative actual hours invested in portfolio, origination, and internal activities across all time."
>
  {nonDealQ.isLoading ? (
    <LoadingSpinner />
  ) : nonDealData.length === 0 ? (
    <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '2rem 0' }}>
      No non-deal hours logged.
    </p>
  ) : (
    <ResponsiveContainer width="100%" height={nonDealHeight}>
      <BarChart data={nonDealData} layout="vertical" margin={{ top: 4, right: 64, bottom: 8, left: 8 }}>
        <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#d4dce8" />
        <XAxis
          type="number"
          tick={{ fontSize: 10, fontFamily: 'DM Mono, monospace' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          dataKey="name"
          type="category"
          width={180}
          tick={{ fontSize: 11, fontFamily: 'DM Sans, sans-serif' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          formatter={(value) => [`${value} hrs`, 'Actual hours']}
          labelStyle={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600 }}
          contentStyle={{ fontSize: 12 }}
        />
        <Bar dataKey="hrs" radius={[0, 4, 4, 0]}>
          {nonDealData.map((entry, i) => (
            <Cell key={i} fill={NON_DEAL_COLORS[entry.category_type] ?? '#9a9589'} />
          ))}
          <LabelList
            dataKey="hrs"
            position="right"
            formatter={v => `${v}h`}
            style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', fill: '#0f0f0f', fontWeight: 600 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )}
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 12 }}>
    {Object.entries(NON_DEAL_LABELS).map(([key, label]) => (
      <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.6875rem', color: 'var(--muted)' }}>
        <span style={{ width: 9, height: 9, borderRadius: 2, background: NON_DEAL_COLORS[key], flexShrink: 0, display: 'inline-block' }} />
        {label}
      </div>
    ))}
  </div>
</ChartCard>
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/TeamAnalytics.jsx
git commit -m "feat: add Lifetime Hours per Non-Deal Task chart"
```

---

## Task 7: Add the new "Breakdown Lifetime Hours" standalone card

**Files:**
- Modify: `src/pages/TeamAnalytics.jsx`

- [ ] **Step 1: Add the standalone accordion card after the non-deal chart and before the donut**

```jsx
{/* ── Row 5: Breakdown Lifetime Hours — standalone accordion card ── */}
<div style={{ background: 'white', border: '1px solid var(--rule)', borderRadius: 12, padding: '16px 24px 20px', marginBottom: 28, overflow: 'hidden', minWidth: 0 }}>
  <Accordion summary="Breakdown Lifetime Hours (All Categories — Matrix View)" noSeparator>
    <FullLifetimeMatrix
      dealEntries={lifetimeEntries}
      nonDealEntries={nonDealEntries}
    />
  </Accordion>
</div>
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/TeamAnalytics.jsx
git commit -m "feat: add standalone Breakdown Lifetime Hours card covering all categories"
```

---

## Task 8: Manual verification

- [ ] **Step 1: Start the dev server**

```bash
cd Nzyme_Reporting_TT && npm run dev
```

- [ ] **Step 2: Verify Deal Workload (FTE) chart**

Navigate to `/team`. Confirm:
- Stage filter pills show 5 stages: DD Phase, Working on Deal, Under Analysis, Being Explored, Add-ons
- Being Explored bars appear in purple (`#6b3a80`)
- Add-ons bars appear in teal (`#1a6a5a`)
- Toggling each pill hides/shows the correct bars

- [ ] **Step 3: Verify Lifetime Hours by Deal chart**

Confirm:
- Same 5 stage pills appear
- Being Explored and Add-ons deals appear with correct colors
- No accordion below the chart

- [ ] **Step 4: Verify the non-deal chart**

Confirm:
- "Lifetime Hours per Non-Deal Task" card appears below the deal chart
- Bars are colored: portco bars indigo, orig bars amber, internal bars sage
- Only tasks with `hrs > 0` appear
- Color legend shows Portfolio / Origination / Internal

- [ ] **Step 5: Verify the breakdown matrix**

Expand "Breakdown Lifetime Hours (All Categories — Matrix View)":
- Rows grouped under: Dealflow, Add-ons, Portfolio, Origination, Internal
- Dealflow section contains both deal and longtail entries
- All team members appear as columns
- Footer row shows correct totals
