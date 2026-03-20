# Kibo Ventures — Internal BI Dashboard (React Rebuild)

## Project Brief for Claude Code Agent

---

## 1. What You Are Building

A single-page React application that serves as the internal Business Intelligence platform for Kibo Ventures, a small-cap private equity fund. This app replaces two existing plain HTML files (`index.html` and `reporting.html`) currently hosted on Vercel.

The app has two distinct functional areas:

1. **Time Tracker** — weekly time logging tool for team members (already exists in HTML, needs to be ported to React)
2. **Fund Reporting** — 5 analytical dashboards powered by Affinity CRM data, adviser coverage data, and stage history

The goal is a fast, polished, interactive internal tool. Not a SaaS product. Audience is 5–8 people at a PE fund who are technical enough to use it but not developers.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS (utility classes only, no custom CSS where avoidable) |
| Charts | Recharts |
| Data fetching | Supabase JS client v2 + React Query (TanStack Query v5) |
| Routing | React Router v6 |
| Auth | Vercel middleware basic auth (already in place, no changes needed) |
| Hosting | Vercel (auto-deploy from GitHub on push to `main`) |
| Backend | Supabase (Postgres + Edge Functions) — read-only from frontend |

**Do not add:** Redux, MobX, GraphQL, Next.js, TypeScript (keep it JS for now), any paid component libraries.

---

## 3. Repository Structure

```
/
├── public/
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.jsx          ← sidebar nav + global filter bar
│   │   │   ├── Sidebar.jsx
│   │   │   └── FilterBar.jsx         ← global filters (date, KAM, stage, channel)
│   │   ├── ui/
│   │   │   ├── KpiCard.jsx           ← reusable metric card
│   │   │   ├── PivotChart.jsx        ← chart with pivot toggle buttons
│   │   │   ├── DrilldownTable.jsx    ← expandable data table
│   │   │   ├── Badge.jsx             ← tier/stage colour badges
│   │   │   └── LoadingSpinner.jsx
│   │   └── timetracker/
│   │       ├── WeeklyForm.jsx        ← ported from index.html
│   │       └── SuccessScreen.jsx
│   ├── pages/
│   │   ├── TimeTracker.jsx           ← Dashboard 6 (port of existing index.html)
│   │   ├── BoardPipeline.jsx         ← Dashboard 5
│   │   ├── ProprietaryDealflow.jsx   ← Dashboard 4
│   │   ├── ChannelPerformance.jsx    ← Dashboard 1
│   │   ├── AdviserCoverage.jsx       ← Dashboard 2
│   │   └── FunnelAnalysis.jsx        ← Dashboard 3
│   ├── hooks/
│   │   ├── useFilters.js             ← global filter state (React context)
│   │   ├── useDeals.js               ← queries against ReportingNz_deals
│   │   ├── useAdviserDeals.js        ← queries against ReportingNz_adviser_deals view
│   │   ├── useStageHistory.js        ← queries against ReportingNz_deal_stage_history
│   │   └── useTimeEntries.js         ← queries against ReportingNz_time_entries
│   ├── lib/
│   │   └── supabase.js               ← Supabase client initialisation
│   ├── App.jsx
│   └── main.jsx
├── middleware.js                      ← existing Vercel basic auth (DO NOT MODIFY)
├── vercel.json
├── vite.config.js
├── tailwind.config.js
└── package.json
```

---

## 4. Supabase Data Structure

### Connection

```js
// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

Environment variables go in `.env.local` (gitignored) and in Vercel project settings:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Tables and Views

All tables use the prefix `ReportingNz_`. RLS is enabled on all tables with anon read policies.

---

#### `ReportingNz_deals`
Primary deal/opportunity table synced from Affinity CRM daily.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| name | text | Deal/opportunity name |
| stage | text | Workload field from Affinity. Values: `"To be processed"`, `"Being explored (meetings only)"`, `"Under analysis (team assigned, moderate effort)"`, `"Working on a deal (significant effort)"`, `"DD phase"`, `"Portfolio"`, `"Add-ons (relevant now)"` |
| affinity_id | text | Affinity entity ID, unique |
| affinity_row_id | text | Affinity list entry ID |
| date_added | timestamptz | When deal was added to Affinity |
| last_synced_at | timestamptz | Last sync timestamp |
| is_active | boolean | True if stage is an active pipeline stage |
| attractiveness | text | Values: `"1 - High"`, `"2 - Medium-high"`, `"3 - Medium"`, `"4 - Medium-low"`, `"5 - Low"` |
| attractiveness_score | integer | Computed: 1–5 (generated column) |
| is_quality_lead | boolean | Computed: true if attractiveness IN ('1 - High', '2 - Medium-high') |
| origination_channel | text | e.g. `"Adviser / Broker"`, `"Network - Other"`, `"Inbound Cold Contact (Marketing)"`, `"Network - Institutional Partners"`, `"Network - Ambassador Program"`, `"Network - PortCo"`, `"Direct Reach Out - Quali Signal Identification"`, `"Direct Reach Out - Quanti Signal Identification"` |
| deal_captain | text | Person's full name |
| team_involved | text | Semicolon-separated names |
| introducer | text | Person's full name (sometimes multiple, semicolon-separated) |
| sell_side_adviser_name | text | Adviser organisation name |
| ic_stage | text | IC process stage |
| location_country | text | |
| location_city | text | |
| theme | text | Deal theme/sector |
| platform_type | text | `"Platform"` or `"Add-On"` |
| platform_name | text | Name of platform if add-on |
| revenues | numeric | EUR millions |
| ebitda | numeric | EUR millions |
| growth | numeric | % |
| total_equity_required | numeric | EUR millions |
| day1_equity_deployment | numeric | EUR millions |
| milestones | text | Free text next steps |
| activity_description | text | One-line deal description |
| description | text | Organisation description |
| discarded_reason | text | |
| lost_reason | text | |

---

#### `ReportingNz_advisers`
Adviser coverage database. Manually imported + sync from Affinity adviser list.

| Column | Type | Notes |
|---|---|---|
| Affinity Row ID | bigint | |
| Organization Id | bigint | Affinity org ID |
| name | text | Adviser organisation name |
| Website | text | |
| tier | integer | 1=Gold, 2=Silver, 3=Bronze |
| tier_raw | text | e.g. `"1 - Gold"` |
| tier_label | text | `"Gold"`, `"Silver"`, `"Bronze"` (generated) |
| firm_type | text | e.g. `"Corporate Finance"`, `"Financial & Tax"` |
| kam | text | Key Account Manager full name (Kibo team member) |
| last_email | timestamptz | |
| last_meeting | timestamptz | |
| people | text | Semicolon-separated `"Full Name <email>"` strings — all contacts associated with this adviser org |
| signed_nda | boolean | |

---

#### `ReportingNz_adviser_deals` (VIEW)
Pre-computed view joining deals to advisers via introducer → people matching. Use this for all adviser coverage dashboards — do not try to replicate the join logic in the frontend.

| Column | Type | Notes |
|---|---|---|
| deal_id | uuid | |
| deal_name | text | |
| date_added | timestamptz | |
| attractiveness | text | |
| is_quality_lead | boolean | |
| attractiveness_score | integer | |
| introducer | text | |
| origination_channel | text | |
| stage | text | |
| activity_description | text | |
| adviser_org_id | bigint | |
| adviser_name | text | |
| tier | integer | |
| tier_label | text | |
| firm_type | text | |
| kam | text | KAM full name, already cleaned (no email) |
| attributed_adviser | text | Final attributed adviser name or `"No Adviser Data"` |
| attributed_kam | text | Final attributed KAM or `"No Adviser Data"` |
| programme_bucket | text | `"Adviser Programme"`, `"Untiered Connection"`, or `"No Adviser Data"` |
| is_ltm | boolean | True if date_added >= NOW() - INTERVAL '12 months' |
| lead_quality | text | `"Quality"` or `"Standard"` |

---

#### `ReportingNz_deal_stage_history`
Stage transition history from Affinity webhooks + initial Python import. ~1,700 rows.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| opportunity_id | bigint | Joins to `ReportingNz_deals.affinity_id` (cast to bigint) |
| deal_name | text | |
| list_entry_id | bigint | |
| changed_at | timestamptz | When the stage transition occurred |
| stage_value | text | Stage name at that point |
| exited_at | timestamptz | When the deal left this stage (null if current) |
| days_in_stage | numeric | Days spent in this stage |
| created_at | timestamptz | |

**Stage ordering for funnel** (1=earliest, 6=latest):
1. `To be processed`
2. `Being explored (meetings only)`
3. `Under analysis (team assigned, moderate effort)`
4. `Working on a deal (significant effort)`
5. `DD phase`
6. `Portfolio`

Non-funnel stages (dormant/parked, exclude from funnel): `"Ideas"`, `"Check in Q1/Q2/Q3/Q4"`, `"Catch up in Q1/Q2/Q3/Q4"`, `"Add-ons (relevant now)"`, `"Discarded"`, `"Lost"`

---

#### `ReportingNz_time_entries`
Weekly time logs submitted by team members.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| user_name | text | Team member full name |
| week_start | date | Monday of the logged week (ISO format YYYY-MM-DD) |
| category_key | text | Deal name or internal category name |
| category_type | text | `"deal"`, `"longtail"`, `"orig"`, `"internal"`, `"portco"` |
| pct_expected | numeric | Expected % of capacity next week (0–100) |
| hrs_actual | numeric | Actual hours last week |
| created_at | timestamptz | |

Unique constraint on `(user_name, week_start, category_key)`.

---

#### `ReportingNz_team_members`
Active team members.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| name | text | Full name, unique |
| is_active | boolean | |
| sort_order | integer | Display order |
| position | text | Job title |
| seniority | text | `"MD"`, `"Director"`, `"VP"`, `"Associate"`, `"Analyst"`, `"Intern"` |
| hourly_rate | numeric | EUR/hour |
| seniority_multiplier | numeric | Computed: MD=3.75, Director=3.75, VP=2.5, Associate=1.25, Analyst=1.0, Intern=0.1 |

---

#### `ReportingNz_orig_channels`
Origination channel reference list.

| Column | Type |
|---|---|
| id | uuid |
| name | text |
| sort_order | integer |

Current values: `"Outbound (NEO/ proprietary research)"`, `"Institutional Network"`, `"Ambassador Program"`, `"Adviser Coverage"`

---

#### `ReportingNz_channel_costs`
Manual cost inputs per origination channel. Used for Dashboard 1 cost calculations.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| channel_name | text | Matches origination_channel values in deals table |
| one_off_cost | numeric | EUR setup cost |
| monthly_recurring_cost | numeric | EUR/month |
| difficulty | text | `"Low"`, `"Medium"`, `"High"` |
| potential | text | `"Low"`, `"Medium"`, `"High"` |
| updated_at | timestamptz | |

---

## 5. Global Filter State

The app has a persistent global filter bar that affects all dashboard queries. Implement this as a React context (`FilterContext`) so any component can read or update filters without prop drilling.

```js
// Default filter state
{
  dateRange: 'ltm',        // 'ltm' | 'ytd' | 'all' | 'custom'
  dateFrom: null,          // ISO string, used when dateRange = 'custom'
  dateTo: null,            // ISO string, used when dateRange = 'custom'
  kam: 'all',              // 'all' | specific KAM name
  stage: 'all',            // 'all' | specific stage value
  channel: 'all',          // 'all' | specific origination channel
}
```

When `dateRange = 'ltm'`, filter deals where `date_added >= NOW() - INTERVAL '12 months'`.

The filter bar renders at the top of every dashboard page. Time Tracker page does not show the filter bar.

---

## 6. Dashboard Specifications

### Dashboard 5 — Board Pipeline (build first, simplest)

**Route:** `/pipeline`

**Purpose:** IC-ready pipeline snapshot grouped by stage.

**KPI Cards (top row):**
- Total active deals
- In DD phase (count)
- Working on deal (count)
- Portfolio companies (count)

**Main content:** Grouped table of deals by stage. Stage groups in order: Portfolio → DD Phase → Working on a Deal → Under Analysis → Being Explored → Dormant (everything else).

**Per deal row:** Deal name, Deal Captain, Description (activity_description), Revenue (€M), EBITDA (€M), IC Stage, Next Steps (milestones).

**Interactions:**
- Click stage header to collapse/expand group
- Click deal row to expand full detail card
- Filter bar filters by stage and KAM (deal captain)

**Supabase query:**
```js
supabase
  .from('ReportingNz_deals')
  .select('name, stage, deal_captain, activity_description, revenues, ebitda, ic_stage, milestones, attractiveness, date_added, origination_channel')
  .eq('is_active', true)
  .order('date_added', { ascending: false })
```

---

### Dashboard 4 — Proprietary Dealflow

**Route:** `/proprietary`

**Definition:** Deals NOT sourced via `"Adviser / Broker"` channel — i.e. all deals where `origination_channel != 'Adviser / Broker'` and `origination_channel IS NOT NULL`.

**KPI Cards:**
- Total proprietary deals LTM (achieved vs goal of 30)
- % of total dealflow that is proprietary
- Quality proprietary leads LTM
- Top deal captain by proprietary deals

**Charts:**
1. Donut chart: Achieved (22) vs Remaining (8) vs Goal (30) — goal is hardcoded as 30 for now
2. Bar chart: Proprietary deals per Deal Captain LTM
3. Funnel chart: proprietary-only funnel stages with counts

**Pivot options on bar chart:** `By Volume` | `By Quality`

**Drilldown table:** All LTM proprietary deals with name, channel, deal captain, attractiveness, stage, date.

---

### Dashboard 1 — Channel Performance

**Route:** `/channels`

**Purpose:** Side-by-side comparison of all origination channels.

**KPI Cards:**
- Total LTM leads
- Total LTM quality leads
- Overall quality rate %
- Best performing channel (by quality leads)

**Main table** (one row per channel):

| Column | Source |
|---|---|
| # Channel | origination_channel |
| # Leads LTM | COUNT where is_ltm |
| # Quality Leads LTM | COUNT where is_ltm AND is_quality_lead |
| % Quality | quality/total |
| Avg Priority | AVG(attractiveness_score) |
| One-off Cost | ReportingNz_channel_costs.one_off_cost |
| Recurring Cost/month | ReportingNz_channel_costs.monthly_recurring_cost |
| Recurring Cost/Quality Lead | (recurring * 12) / quality_leads |
| Difficulty | ReportingNz_channel_costs.difficulty |
| Potential | ReportingNz_channel_costs.potential |

**Below table:** Memo list of all LTM quality leads with deal name, channel, date, description.

**Chart:** Horizontal bar chart of leads by channel. Pivot: `By Volume` | `By Quality` | `By Cost Efficiency`

---

### Dashboard 2 — Adviser Coverage

**Route:** `/advisers`

**Purpose:** Performance tracking of the formal adviser coverage programme.

**Always query from `ReportingNz_adviser_deals` view. Filter to `programme_bucket = 'Adviser Programme'` by default, with a toggle to include Untiered Connections.**

**KPI Cards:**
- Total adviser-sourced leads LTM
- Quality adviser leads LTM
- % quality rate
- Most active adviser (by LTM leads)

**Main grouped table:** Grouped by KAM → then by adviser. Per adviser row: Tier badge, # leads, # quality leads, % quality. Colour-coded quality % (green >20%, amber 5–20%, red <5%).

**Chart:** Horizontal bar chart — Total Dealflow Per Adviser. Pivot: `By Volume` | `By Quality` | `By KAM`

**Memo table below:** All LTM adviser deals with: Deal Name, Attractiveness, Introducer, Adviser, Date, KAM, Description.

**Toggle:** Show/hide Untiered Connections bucket.

---

### Dashboard 3 — Funnel Analysis

**Route:** `/funnel`

**Purpose:** Full lifecycle conversion funnel with time-in-stage analytics.

**This is the most complex dashboard. Build it last.**

The funnel data requires aggregating `ReportingNz_deal_stage_history` to compute "furthest stage reached" per deal. This should be done via a Supabase SQL view (ask the user to create it if it doesn't exist) rather than in the frontend.

**Required SQL view** (create in Supabase if not present):

```sql
CREATE OR REPLACE VIEW public."ReportingNz_funnel_analysis" AS

WITH stage_order AS (
  SELECT stage_value, stage_rank FROM (VALUES
    ('To be processed', 1),
    ('Being explored (meetings only)', 2),
    ('Under analysis (team assigned, moderate effort)', 3),
    ('Working on a deal (significant effort)', 4),
    ('DD phase', 5),
    ('Portfolio', 6)
  ) AS t(stage_value, stage_rank)
),
furthest_stage AS (
  SELECT
    h.opportunity_id,
    h.deal_name,
    MAX(so.stage_rank) AS max_rank
  FROM public."ReportingNz_deal_stage_history" h
  JOIN stage_order so ON so.stage_value = h.stage_value
  GROUP BY h.opportunity_id, h.deal_name
),
stage_stats AS (
  SELECT
    so.stage_value,
    so.stage_rank,
    COUNT(DISTINCT fs.opportunity_id) AS reached_stage,
    AVG(h.days_in_stage) AS avg_days_in_stage
  FROM stage_order so
  LEFT JOIN furthest_stage fs ON fs.max_rank >= so.stage_rank
  LEFT JOIN public."ReportingNz_deal_stage_history" h
    ON h.opportunity_id = fs.opportunity_id
    AND h.stage_value = so.stage_value
  GROUP BY so.stage_value, so.stage_rank
)
SELECT
  stage_value,
  stage_rank,
  reached_stage,
  avg_days_in_stage,
  LAG(reached_stage) OVER (ORDER BY stage_rank) AS prev_stage_count,
  ROUND(100.0 * reached_stage / NULLIF(MAX(reached_stage) OVER (), 0), 1) AS cumulative_conversion_pct,
  ROUND(100.0 * reached_stage / NULLIF(LAG(reached_stage) OVER (ORDER BY stage_rank), 0), 1) AS stage_to_stage_pct
FROM stage_stats
ORDER BY stage_rank;
```

**KPI Cards:**
- Total deals ever entered funnel
- Portfolio (invested)
- Overall conversion rate (entry → portfolio)
- Average days to portfolio (sum of avg days per stage)

**Funnel chart:** Horizontal bar chart showing `reached_stage` per stage, widest at top narrowing down.

**Stats table:**

| Stage | Reached | Didn't Advance | Cumul. Conv. % | Stage-to-Stage % | Avg Days |
|---|---|---|---|---|---|

**Sub-charts:**
- Bar chart: Breakdown by Adviser (deals per adviser per stage)
- Time distribution: Histogram of days_in_stage for selected stage (user clicks a stage to see its distribution)

---

### Dashboard 6 — Time Tracker (Port from HTML)

**Route:** `/timetracker` (default landing page)

**This is a direct port of the existing `index.html`.** Keep all logic identical, just convert to React components. The key functions to port:

- `loadDeals()` — fetch active deals from Supabase to populate rows
- `loadUserEntries()` — load existing entries for selected user + week
- `submitForm()` — upsert time entries to Supabase
- `buildRows()` — render the category rows with pct/hrs inputs
- `updatePctTotal()` / `updateHrsTotal()` — running totals with over/under indicators

The Supabase table names use the `ReportingNz_` prefix:
- `ReportingNz_deals` (not `deals`)
- `ReportingNz_time_entries` (not `time_entries`)
- `ReportingNz_team_members` (not `team_members`)
- `ReportingNz_orig_channels` (not `orig_channels`)

Deal stage filtering for the time tracker:
- **Dealflow** (active): `stage IN ('Working on a deal (significant effort)', 'Under analysis (team assigned, moderate effort)', 'DD phase')`
- **Longtail**: `stage = 'Being explored (meetings only)'`
- **Portfolio**: `stage = 'Portfolio'`

Internal categories (hardcoded, not from DB):
```js
const INTERNAL = ["Recruiting", "Investor Relations / LP", "Fund Operations", "Expansion & Business Development"]
const ADMIN_LEAVE = ["Training & development", "Out of office (Bank Holiday, Annual Leave, Sick)"]
```

---

## 7. UI Design System

**Colour palette** (match existing HTML files):
```css
--ink:          #0f0f0f
--paper:        #f7f5f0
--muted:        #9a9589
--rule:         #e5e2db
--accent:       #1a3a2a      /* dark green — primary */
--accent-light: #e8f0eb
--danger:       #c0392b
--portco-bg:    #eef0f8
--portco-fg:    #3a4080
--longtail-bg:  #f5eef8
--longtail-fg:  #6b3a80
--orig-bg:      #fff4e8
--orig-fg:      #8a5020
```

**Typography:**
- Headings: `DM Serif Display` (Google Fonts)
- Body: `DM Sans`
- Monospace/numbers: `DM Mono`

**Tier badge colours:**
- Gold: `bg-yellow-100 text-yellow-800`
- Silver: `bg-gray-100 text-gray-600`
- Bronze: `bg-orange-100 text-orange-700`

**Stage badge colours:**
- DD Phase: `bg-[#1a3a2a] text-white`
- Working on Deal: `bg-blue-700 text-white`
- Under Analysis: `bg-orange-600 text-white`
- Being Explored: `bg-gray-400 text-white`
- Portfolio: `bg-purple-700 text-white`
- To be processed: `bg-gray-200 text-gray-700`

**Chart colours (Recharts):**
```js
const CHART_COLORS = {
  dealflow: '#2d6a4a',
  internal: '#74b49b',
  portco:   '#3a4080',
  orig:     '#c07830',
  dd:       '#1a3a2a',
  working:  '#2e6da4',
  analysis: '#c07830',
}
```

---

## 8. Navigation Structure

```
Sidebar (left, collapsible on mobile):
  ┌─────────────────────┐
  │  [PE] Kibo Ventures │
  ├─────────────────────┤
  │  ⏱  Time Tracker   │  ← /timetracker (default)
  ├─────────────────────┤
  │  REPORTING          │
  │  📋 Board Pipeline  │  ← /pipeline
  │  🎯 Proprietary     │  ← /proprietary
  │  📊 Channels        │  ← /channels
  │  🤝 Adviser Coverage│  ← /advisers
  │  🔽 Funnel Analysis │  ← /funnel
  └─────────────────────┘
```

The global filter bar appears below the page title on all reporting pages. It does NOT appear on the Time Tracker page.

---

## 9. Key Patterns to Follow

### PivotChart component pattern

```jsx
<PivotChart
  title="Dealflow by Channel"
  description="LTM leads by origination channel"
  data={channelData}
  pivots={[
    { label: 'By Volume',  dataKey: 'total_leads' },
    { label: 'By Quality', dataKey: 'quality_leads' },
  ]}
  xKey="channel_name"
  onBarClick={(entry) => setFilter({ channel: entry.channel_name })}
/>
```

### Filter-aware query pattern

```js
// hooks/useDeals.js
export function useDeals() {
  const { dateRange, kam, stage, channel } = useFilters()

  return useQuery({
    queryKey: ['deals', dateRange, kam, stage, channel],
    queryFn: async () => {
      let query = supabase
        .from('ReportingNz_deals')
        .select('*')

      if (dateRange === 'ltm') {
        const ltmDate = new Date()
        ltmDate.setFullYear(ltmDate.getFullYear() - 1)
        query = query.gte('date_added', ltmDate.toISOString())
      }
      if (kam !== 'all') query = query.eq('deal_captain', kam)
      if (stage !== 'all') query = query.eq('stage', stage)
      if (channel !== 'all') query = query.eq('origination_channel', channel)

      const { data, error } = await query
      if (error) throw error
      return data
    }
  })
}
```

### DrilldownTable pattern

Tables should show 10 rows by default with a "Show all X rows" button. Columns should be sortable by clicking headers. Export to CSV button on every table.

---

## 10. Build Order

Build in this sequence — each step is independently deployable:

1. **Project scaffold** — Vite + React + Tailwind + React Router + Supabase client + React Query setup. Vercel deploys correctly. Sidebar nav renders with placeholder pages.

2. **Filter context** — `useFilters` hook + `FilterBar` component with date range, KAM, stage, channel selectors. Filters populated from Supabase data.

3. **Time Tracker** (`/timetracker`) — port existing `index.html` logic to React. This is the most used page, get it right.

4. **Board Pipeline** (`/pipeline`) — simplest reporting page. Grouped table, KPI cards, filter integration.

5. **Proprietary Dealflow** (`/proprietary`) — donut + bar charts, funnel table.

6. **Channel Performance** (`/channels`) — table + bar chart + cost data join.

7. **Adviser Coverage** (`/advisers`) — query from view, grouped table, memo list.

8. **Funnel Analysis** (`/funnel`) — most complex, build last. Requires the `ReportingNz_funnel_analysis` view to exist in Supabase.

---

## 11. Environment Setup

```bash
npm create vite@latest kibo-dashboard -- --template react
cd kibo-dashboard
npm install @supabase/supabase-js @tanstack/react-query recharts react-router-dom
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

`.env.local`:
```
VITE_SUPABASE_URL=your_company_supabase_url
VITE_SUPABASE_ANON_KEY=your_company_anon_key
```

`vercel.json` (SPA routing):
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

The existing `middleware.js` basic auth file stays at the repo root unchanged. It protects the entire app — no changes needed.

---

## 12. What Already Exists (Do Not Break)

- `middleware.js` — Vercel basic auth. **Do not modify.** It reads `BASIC_AUTH_USER`, `BASIC_AUTH_PASSWORD`, `REPORT_AUTH_USER`, `REPORT_AUTH_PASSWORD` from Vercel env vars.
- Supabase tables and views — all read-only from frontend. **Do not modify schemas.**
- Supabase Edge Functions (`affinity-sync`, `adviser-sync`, `ai-chat`, `notion-sync`) — backend jobs, not relevant to frontend.

---

## 13. Definition of Done

The project is complete when:

- [ ] All 6 pages render with real data from Supabase
- [ ] Global filter bar affects all reporting pages simultaneously
- [ ] Each chart has at least 2 pivot modes
- [ ] Clicking a chart bar filters the drilldown table below it
- [ ] Time Tracker submits entries correctly (upsert with conflict on user+week+category)
- [ ] App deploys cleanly to Vercel on push to `main`
- [ ] No hardcoded data — everything comes from Supabase
- [ ] Mobile sidebar collapses correctly (hamburger menu)
- [ ] Loading states on all data fetches
- [ ] Error states on all data fetches


---

## 14. UX & Product Decisions (Addendum)

### Filtering
- **Default time window:** LTM (rolling — always last 12 months from today's date, not a fixed anchor)
- **Multi-select filters:** KAM and Stage filters allow selecting multiple values simultaneously
- **Default state:** All filters set to "All" on first load. No filter persistence between sessions.

### Display Conventions
- **Name formatting:** All person names shortened to first name + last initial throughout the app. 
  Helper function to add to `src/lib/utils.js`:
```js
  export function shortName(fullName) {
    if (!fullName) return '—'
    const parts = fullName.trim().split(' ')
    if (parts.length === 1) return parts[0]
    return `${parts[0]} ${parts[parts.length - 1][0]}.`
  }
```
- **Currency:** Display as `€2,500k` format (multiply €M values × 1000, append "k"). 
  If value is null/zero display `—`.
  Helper function:
```js
  export function formatCurrency(value) {
    if (!value || value === 0) return '—'
    return `€${Math.round(value * 1000).toLocaleString('en-GB')}k`
  }
```
- **Empty states:** When a filter returns no data, show a simple centred message:
  `"No data for the selected filters"` — no charts, no empty axes, just the message.
- **Platform:** Desktop only. Sidebar does not need to collapse on mobile. Minimum supported width: 1024px.

### Data Freshness Indicator
- Show in the top-right of the FilterBar on all reporting pages
- Query: `SELECT MAX(last_synced_at) FROM "ReportingNz_deals"`
- Display format: `"Data as of: 19 Mar 2026, 06:02"` 
- No manual sync button — sync is handled automatically by scheduled edge function (see below)

### Scheduled Sync (replaces manual sync button)
The `affinity-sync` edge function should run automatically on a daily schedule.
Set this up in Supabase → SQL Editor after enabling `pg_cron` and `pg_net` extensions:
```sql
select cron.schedule(
  'affinity-daily-sync',
  '0 6 * * *',
  $$
  select net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/affinity-sync',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.supabase_anon_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  )
  $$
);
```

The frontend only reads `MAX(last_synced_at)` — it never triggers the sync directly.

### Proprietary Dealflow Goal
- Hardcoded as a constant in `src/lib/config.js`:
```js
  export const PROPRIETARY_DEAL_GOAL = 30
```
- Easy to update by editing this one file. No UI input needed for now.

### Cost Calculation (Dashboard 1 — Channel Performance)

**Do not use the hardcoded `ReportingNz_channel_costs` recurring cost values for the main cost metric.**

The recurring cost per channel should be calculated dynamically from time entries:
```
cost = SUM(time_entries.hrs_actual × team_members.hourly_rate × team_members.seniority_multiplier)
```

Joined via:
- `time_entries.user_name = team_members.name`
- `time_entries.category_key = deals.name`
- `deals.origination_channel = channel`

Create this view in Supabase before building Dashboard 1:
```sql
CREATE OR REPLACE VIEW public."ReportingNz_channel_cost_actuals" AS

SELECT
  d.origination_channel                                    AS channel,
  SUM(
    te.hrs_actual
    * COALESCE(tm.hourly_rate, 0)
    * COALESCE(tm.seniority_multiplier, 1)
  )                                                        AS total_cost_eur,
  SUM(te.hrs_actual)                                       AS total_hours,
  COUNT(DISTINCT te.user_name)                             AS team_members_involved,
  COUNT(DISTINCT te.category_key)                          AS deals_worked

FROM public."ReportingNz_time_entries" te

LEFT JOIN public."ReportingNz_deals" d
  ON te.category_key = d.name

LEFT JOIN public."ReportingNz_team_members" tm
  ON te.user_name = tm.name

WHERE
  te.category_type IN ('deal', 'longtail', 'orig')
  AND d.origination_channel IS NOT NULL
  AND te.hrs_actual > 0

GROUP BY d.origination_channel;
```

**The `one_off_cost` field** from `ReportingNz_channel_costs` IS still used — this represents 
manual setup/infrastructure costs (e.g. software subscriptions, one-time investments per channel) 
that cannot be derived from time entries. Display it as a separate column alongside the 
calculated recurring cost.

**Dashboard 1 cost columns should be:**
| Column | Source |
|---|---|
| One-off Cost | `ReportingNz_channel_costs.one_off_cost` (manual input) |
| Recurring Cost (actual) | `ReportingNz_channel_cost_actuals.total_cost_eur` (calculated) |
| Total Hours | `ReportingNz_channel_cost_actuals.total_hours` |
| Recurring Cost / Quality Lead | `total_cost_eur / quality_leads` (annualised) |

**Note:** This view will show €0 or null for channels until team members have 
`hourly_rate` and `seniority_multiplier` populated in `ReportingNz_team_members`. 
Populate those before building Dashboard 1.

### Board Pipeline — Deal Detail Expansion
When a deal row is clicked/expanded, show:
- `activity_description` — one-line deal description
- `team_involved` — team members on the deal  
- `milestones` — achieved milestones / next steps
- `deal_captain` — lead person
- `ic_stage` — IC process stage
- `date_added` — formatted as "DD Mon YYYY"

Do NOT show financials (revenues, EBITDA) in the expanded row — 
these are shown inline in the table already.

### Adviser Coverage
- Same view for all users — no KAM-based auto-filtering on login
- Default filter: `programme_bucket = 'Adviser Programme'` 
- Toggle available to include `'Untiered Connection'` bucket
- `'No Adviser Data'` bucket always visible as a separate row at the bottom of the table