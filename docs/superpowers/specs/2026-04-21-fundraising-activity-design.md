# Fundraising Activity Dashboard — Design Spec
_Date: 2026-04-21_

## Overview

A new internal dashboard page showing all-time LP interaction activity for the fundraising team. Gated behind the same `team_access` table check as the Staffing Report. Filters are page-local (no global FilterBar).

---

## Route & Navigation

- **Path**: `/fundraising`
- **Sidebar**: bottom of REPORTING group, label "Fundraising Activity", icon 💰
- **Access**: wrapped in `TeamAccessGate` — checks `team_access` table for the logged-in user's email (identical to `/team`)
- **FilterBar**: hidden on this page — add `/fundraising` to the `showFilters` exclusion in `AppShell.jsx`
- **AI Chat Panel**: visible (standard for all non-timetracker pages)

---

## Page Layout (top to bottom)

1. **Page header** — "Fundraising Activity" in DM Serif Display, consistent with other pages
2. **Filter row** — 6 inline controls in a horizontal row
3. **KPI cards** — 4 cards in a grid
4. **Activity chart** — stacked bar with toggles
5. **LP breakdown table** — sortable, paginated

---

## Filters

All 6 filters are page-local `useState` values. Options are derived dynamically from the full fetched dataset (no hardcoded lists). A "Clear filters" link appears when any filter is active.

| Filter | Control | Field | Special handling |
|---|---|---|---|
| Team Member | MultiSelect (existing component) | `partner_names` (text[]) | Multi-select; match if selected name is in the array |
| Investor Type | Single-select dropdown | `investor_type` | Split on `;`, trim whitespace before building options and matching |
| Engagement Effort | Single-select dropdown | `engagement_effort` | Exact match |
| Overall Status | Single-select dropdown | `overall_status` | Exact match |
| Portugal Status | Single-select dropdown | `portugal_status` | Exact match |
| Germany Status | Single-select dropdown | `germany_status` | Exact match |

Filter application order: team member → investor type → engagement effort → overall status → portugal status → germany status.

---

## KPI Cards

Four `KpiCard` components in a row, all computed from `filteredData` (all-time, no date window):

| Card | Value | How computed |
|---|---|---|
| Total Interactions | Count | All rows where `interaction_type` in `[email_sent, email_response, meeting, note, note_meeting]` |
| Emails Sent | Count | `interaction_type === 'email_sent'` |
| Email Responses | Count | `interaction_type === 'email_response'` |
| Meetings | Count | `interaction_type === 'meeting'` |

Notes (`note`, `note_meeting`) are excluded from Emails Sent / Email Responses / Meetings counts but included in Total Interactions.

---

## Activity Chart

- **Type**: Recharts `BarChart` with stacked `Bar` components, wrapped in `ResponsiveContainer`
- **X axis**: time bucket label (e.g. "Jan 25", "W3 Feb")
- **Y axis**: interaction count
- **Stacks** (one `Bar` per type, colour-coded):
  - `email_sent` — `#2e6da4` (blue)
  - `email_response` — `#1a6a5a` (teal)
  - `meeting` — `#1a3a2a` (dark green)
  - `note` / `note_meeting` — `#9a9589` (muted grey)
- **Toggles** (inline above chart):
  - Weekly / Monthly — changes bucket granularity
  - Include Notes — when off (default), notes are excluded from chart data; when on, they appear as a grey stack segment
- **Bucketing logic**: native `Date` arithmetic — no extra library needed
  - Weekly: bucket key = ISO week start (Monday), formatted as "Wn Mon YY"
  - Monthly: bucket key = `YYYY-MM`, formatted as "Mon YY"
- Data source: `filteredData` (responds to all 6 filters)

---

## LP Breakdown Table

One row per unique `lp_name` derived from `filteredData`.

| Column | Source | Sortable |
|---|---|---|
| LP Name | `lp_name` | Yes |
| Investor Type | `investor_type` (first segment if semicolon-separated) | Yes |
| Engagement Effort | `engagement_effort` | Yes |
| Overall Status | `overall_status` | Yes |
| Total Interactions | count of rows for this LP | Yes |

- Default sort: Total Interactions descending
- Default display: all rows (no pagination needed — LP universe is small)
- Click column header to sort; click again to reverse

---

## Data Layer

### Hook: `src/hooks/useLPDashboard.js`

```js
// Fetches all rows from ReportingNZ_LP_dashboard once.
// Returns { data, isLoading, isError }
// No filtering — all filtering happens in the page component via useMemo.
```

- Uses `useQuery` from TanStack React Query
- `queryKey: ['lp-dashboard']`
- Selects all columns needed: `interaction_date, interaction_type, partner_names, lp_name, investor_type, engagement_effort, overall_status, portugal_status, germany_status`
- Stale time / retry inherit from the global `QueryClient` (5min / 1)

### Page component: `src/pages/FundraisingActivity.jsx`

Three `useMemo` values derived from `filteredData`:

| Memo | Purpose |
|---|---|
| `kpiTotals` | `{ total, emailSent, emailResponse, meetings }` |
| `chartData` | Array of `{ bucket, email_sent, email_response, meeting, note }` sorted by date |
| `tableData` | Array of `{ lpName, investorType, effort, status, count }` |

---

## Files to Create / Modify

| Action | File |
|---|---|
| Create | `src/hooks/useLPDashboard.js` |
| Create | `src/pages/FundraisingActivity.jsx` |
| Modify | `src/App.jsx` — add route + import + `TeamAccessGate` wrap |
| Modify | `src/components/layout/Sidebar.jsx` — add nav item |
| Modify | `src/components/layout/AppShell.jsx` — hide FilterBar on `/fundraising` |
