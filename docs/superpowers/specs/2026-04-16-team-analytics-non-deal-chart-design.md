# Team Analytics — Non-Deal Chart & Expanded Stage Coverage

**Date:** 2026-04-16
**Page:** `/team` — `TeamAnalytics.jsx`

---

## Summary

Four related changes to the Team Analytics (Staffing Report) page:

1. Add "Being Explored" and "Add-ons" deal stages to the existing Lifetime Hours by Deal and Deal Workload (FTE) charts.
2. Add a new "Lifetime Hours per Non-Deal Task" horizontal bar chart below the existing deal chart.
3. Restructure the Breakdown Lifetime Hours table into a standalone full-width card (like Breakdown Team Capacity) covering all entry types.
4. `addon` category type is currently invisible across all analytics — this change makes it visible.

---

## Section 1: Data Layer

### `normalizeStage` (`hooks/useTeamAnalytics.js`)

Add two new cases before the catch-all `return 'Working on Deal'`:

```js
if (l.includes('explo')) return 'Being Explored'
if (l.includes('add-on') || l.includes('addon')) return 'Add-ons'
```

### `useLifetimeHoursEntries` (`hooks/useTeamAnalytics.js`)

Expand `category_type` filter from `['deal', 'longtail']` to `['deal', 'longtail', 'addon']`.

### `useLifetimeNonDealEntries` (new hook, same file)

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

### `buildFteData` (`TeamAnalytics.jsx`)

Expand the category_type filter from `['deal', 'longtail']` to `['deal', 'longtail', 'addon']`.

---

## Section 2: Constants & Colors

### `ALL_STAGES`

```js
const ALL_STAGES = ['DD Phase', 'Working on Deal', 'Under Analysis', 'Being Explored', 'Add-ons']
```

Used by both stage filter pill strips (FTE chart and Lifetime Hours by Deal chart). Default state for both filters keeps all 5 stages active.

### `STAGE_COLORS`

Add two new entries:

```js
'Being Explored': '#6b3a80',  // purple — matches donut chart and badge
'Add-ons':        '#1a6a5a',  // teal — matches TAG.addon in WeeklyForm
```

---

## Section 3: Changes to Existing Charts

### Deal Workload (FTE) — This Week

- Stage filter pills now render all 5 stages from `ALL_STAGES`.
- Default `fteFilters` state initialised to `new Set(ALL_STAGES)`.
- No other changes — once data layer and stage map are fixed, `buildFteData` correctly colors bars by the expanded stage set.

### Lifetime Hours by Deal

- Stage filter pills now render all 5 stages from `ALL_STAGES`.
- Default `lifetimeFilters` state initialised to `new Set(ALL_STAGES)`.
- `buildLifetimeData` is unchanged — it already uses `stageFilters.has(d.stage)` so new stages work automatically.
- The existing accordion ("Breakdown Lifetime Hours Matrix View") is **removed** from this card (moved to its own card in Section 5).

---

## Section 4: New "Lifetime Hours per Non-Deal Task" Chart

### Placement

Full-width `ChartCard`, placed immediately below "Lifetime Hours by Deal".

### Title & Description

- Title: `Lifetime Hours per Non-Deal Task`
- Description: `Cumulative actual hours invested in portfolio, origination, and internal activities across all time.`

### Data builder: `buildNonDealData(entries)`

```
Group entries by category_key, summing hrs_calculated.
Carry category_type on each entry.
Filter to hrs > 0.
Sort by category type order (portco → orig → internal), then by hours descending within each group.
Truncate category_key to 26 chars with ellipsis (same as deal chart).
```

### Chart

Horizontal bar chart using Recharts `BarChart` with `layout="vertical"`. Same margin, axis, and label-list config as the existing Lifetime Hours by Deal chart.

Bar color per `category_type`:
- `portco`   → `#3a4080`
- `orig`     → `#c07830`
- `internal` → `#74b49b`

Each bar rendered with a `<Cell>` keyed to `entry.category_type`.

Chart height: `Math.max(140, 44 + nonDealData.length * 28)` — same scaling formula as the deal chart.

### Legend

Inline color legend below the chart (same pill style as capacity chart legend):
- Portfolio / `#3a4080`
- Origination / `#c07830`
- Internal / `#74b49b`

---

## Section 5: Restructured Breakdown Lifetime Hours

### Placement

Full-width standalone card, placed after the non-deal chart and before the "Lifetime Hours by Stage" donut. Same visual structure as the "Breakdown Team Capacity" card (white box with border, accordion wrapper, no card title — just the accordion summary label).

### Accordion label

`"Breakdown Lifetime Hours (All Categories — Matrix View)"`

### Data builder: `buildFullLifetimeMatrix(dealEntries, nonDealEntries)`

Takes both entry arrays. Groups entries into 5 sections:

| Section label | `category_type` values included |
|---|---|
| Dealflow | `deal`, `longtail` |
| Add-ons | `addon` |
| Portfolio | `portco` |
| Origination | `orig` |
| Internal | `internal` |

Within each section, rows sorted by total hours descending. Columns: category key (sticky first column), one column per team member (short name), Total Hrs footer column. Footer row shows per-member totals and grand total across all categories.

### Rendering

Uses the existing `DenseTable` component with `groupRows` to render section headers. Same sticky first-column behaviour as the capacity matrix.

---

## Page Layout (final order)

| Row | Content |
|---|---|
| Header | Title + timeframe toggle |
| Banner | PageBanner |
| Row 1 | Team Capacity (left) + Deal Workload FTE (right) — 2-col grid |
| Row 2 | Breakdown Team Capacity — standalone accordion card |
| Row 3 | Lifetime Hours by Deal — full width (accordion removed) |
| Row 4 | Lifetime Hours per Non-Deal Task — full width (new) |
| Row 5 | Breakdown Lifetime Hours — standalone accordion card (new) |
| Row 6 | Lifetime Hours by Stage — donut (unchanged) |

---

## Files Changed

| File | Change |
|---|---|
| `src/hooks/useTeamAnalytics.js` | Extend `normalizeStage`; expand `useLifetimeHoursEntries` filter; add `useLifetimeNonDealEntries` |
| `src/pages/TeamAnalytics.jsx` | All constants, builders, hooks, and JSX changes |

No new files. No schema changes.
