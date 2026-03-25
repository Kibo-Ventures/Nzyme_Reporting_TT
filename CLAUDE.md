# Nzyme Reporting — Dashboard Reference

Internal BI dashboard for a PE fund. Two functional areas: a **Time Tracker** for weekly allocation logging, and **7 Reporting Dashboards** for deal pipeline, team analytics, channel performance, adviser coverage, funnel analysis, proprietary dealflow, and dynamic analysis.

**Audience**: 5–8 PE fund team members. Desktop only (min 1024px). Hosted on Vercel, read-only from the frontend.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite 8 |
| Styling | Tailwind CSS v4 (CDN via plugin) + CSS custom properties for design tokens |
| Charts | Recharts v3 |
| Data fetching | Supabase JS v2 + TanStack React Query v5 |
| Routing | React Router v7 |
| Auth | Vercel Edge Middleware (Basic Auth, separate creds per route) |
| Hosting | Vercel (auto-deploy from GitHub `main`) |
| Backend | Supabase (Postgres + Edge Functions, RLS-protected) |

---

## File Map

```
src/
├── App.jsx                          ← Routes + FilterProvider
├── main.jsx                         ← QueryClient (5min stale, retry=1)
├── index.css                        ← CSS custom properties + global resets
├── pages/
│   ├── TimeTracker.jsx              ← /timetracker (default)
│   ├── TeamAnalytics.jsx            ← /team
│   ├── BoardPipeline.jsx            ← /pipeline
│   ├── ProprietaryDealflow.jsx      ← /proprietary
│   ├── ChannelPerformance.jsx       ← /channels
│   ├── AdviserCoverage.jsx          ← /advisers
│   ├── FunnelAnalysis.jsx           ← /funnel
│   └── DynamicAnalysis.jsx          ← /analysis
├── components/
│   ├── layout/
│   │   ├── AppShell.jsx             ← Outlet + conditional FilterBar + AiChatPanel
│   │   ├── Sidebar.jsx              ← Sticky nav (8 routes)
│   │   └── FilterBar.jsx            ← Date/captain/stage/channel + freshness
│   ├── chat/
│   │   └── AiChatPanel.jsx          ← Slide-in AI chat panel (all non-timetracker pages)
│   ├── timetracker/
│   │   ├── WeeklyForm.jsx           ← Main time-entry form
│   │   └── SuccessScreen.jsx        ← Post-submit confirmation
│   └── ui/
│       ├── Badge.jsx                ← StageBadge + TierBadge
│       ├── KpiCard.jsx              ← Metric card (title/value/subtitle)
│       ├── LoadingSpinner.jsx       ← 8px spinning circle
│       └── MultiSelect.jsx          ← Checkbox dropdown (N selected label)
├── hooks/
│   ├── useFilters.jsx               ← FilterContext (dateRange, dealCaptain[], stage[], channel)
│   ├── useAiChat.js                 ← sendMessage(), messages[], isLoading — calls ai-chat edge fn
│   ├── useDeals.js                  ← useBoardPipelineDeals()
│   ├── useTimeEntries.js            ← useTrackerData(), useUserEntries(), getMondayISO()
│   ├── useFilterOptions.js          ← useDealCaptainOptions(), useStageOptions(), useChannelOptions(), useDataFreshness()
│   ├── useTeamAnalytics.js          ← useDealStageMap(), useTimeframeEntries(), useLifetimeHoursEntries()
│   ├── useAdviserDeals.js           ← useAdviserDeals()
│   ├── useChannelPerformance.js     ← useChannelDeals(), useChannelCosts(), useChannelCostActuals(), useChannelOrigEntries()
│   ├── useProprietaryDeals.js       ← useProprietaryDeals(), useTotalDealsCount()
│   ├── useAnalysisDeals.js          ← useAnalysisDeals() — queries ReportingNz_deal_analysis view
│   └── useFunnelAnalysis.js         ← useFunnelStages(), useStageHistogram(), useAdviserStageBreakdown(), useFunnelDeals(), useStageTimeInvestment()
└── lib/
    ├── config.js                    ← PROPRIETARY_DEAL_GOAL_ANNUAL = 36; proprietaryGoalForRange()
    ├── dateRange.js                 ← applyDateRange(query, filters) helper
    ├── supabase.js                  ← createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
    └── utils.js                     ← shortName(), formatCurrency()
```

Root files:

| File | Purpose |
|---|---|
| `middleware.js` | Vercel Edge Runtime Basic Auth (two credential pairs) |
| `vercel.json` | SPA rewrites |
| `vite.config.js` | tailwindcss() + react() plugins |

---

## Global Filter System

- **Context**: `useFilters()` from `hooks/useFilters.jsx`
- **State shape**: `{ dateRange, dateFrom, dateTo, dealCaptain[], stage[], channel }`
- **`dateRange` values**: `'ltm'` | `'ytd'` | `'all'` | `'custom'`; default is `'ltm'`
- Applied server-side via `applyDateRange()` in `lib/dateRange.js`
- `dealCaptain` uses multi-select + `ilike %name%` (handles compound names)
- FilterBar hidden entirely on `/timetracker` and `/team`
- Date range filter greyed out (disabled) on `/funnel` and `/pipeline` only
- **Data freshness**: `MAX(last_synced_at)` from `ReportingNz_deals`, shown in FilterBar top-right

### FilterBar props

| Prop | Default | Used on |
|---|---|---|
| `disableDateRange` | `false` | `/funnel`, `/pipeline` |
| `hideChannel` | `false` | `/advisers` |

---

## Supabase Schema

**Project URL**: `https://yphbrpbwpakjduhmoimw.supabase.co`

### Tables

| Table | Description |
|---|---|
| `ReportingNz_deals` | Primary deal table. Synced from Affinity CRM daily at 06:00 via `affinity-sync` edge fn |
| `ReportingNz_advisers` | Adviser coverage DB (tier, firm_type, KAM, contacts, NDA status) |
| `ReportingNz_deal_stage_history` | Stage transitions with `changed_at` / `exited_at` / `days_in_stage` (~1,700 rows) |
| `ReportingNz_time_entries` | Weekly logs (`user_name`, `week_start`, `category_key`, `category_type`, `pct_expected`, `hrs_actual`); upserted on composite key |
| `ReportingNz_team_members` | Active team (`name`, `seniority`, `hourly_rate`, `seniority_multiplier`) |
| `ReportingNz_orig_channels` | Origination channel reference (`name`, `sort_order`) |
| `ReportingNz_channel_costs` | Manual cost inputs (`one_off_cost`, `difficulty`, `potential`) |

### Views

| View | Description |
|---|---|
| `ReportingNz_adviser_deals` | Pre-joined deal + adviser rows, includes `programme_bucket`, `is_ltm`, `lead_quality` |
| `ReportingNz_funnel_analysis` | 6-row aggregated funnel stats (reached_stage, avg_days, conversion %) |
| `ReportingNz_channel_cost_actuals` | Time-based cost per channel (hrs × rate × multiplier) |
| `ReportingNz_stage_time_investment` | Hours invested per deal × stage with `did_advance` flag |
| `ReportingNz_deal_analysis` | Per-deal computed metrics for Dynamic Analysis page — see below |

### `ReportingNz_deal_analysis` view columns

Built from `ReportingNz_deals` + `ReportingNz_time_entries` + `ReportingNz_deal_stage_history`.

| Column | Type | Description |
|---|---|---|
| `deal_id` | uuid | `d.id` |
| `deal_name` | text | `d.name` |
| `current_stage` | text | Raw stage value |
| `captain` | text | `d.deal_captain` |
| `channel_label` | text | `d.origination_channel` |
| `date_added` | date | Used for date range filtering |
| `is_active` | bool | |
| `funnel_depth` | int | 1–6; see stage mapping below |
| `funnel_depth_label` | text | Display label for funnel_depth |
| `total_hrs` | numeric | Sum of `hrs_actual` from time entries (category_type='deal') |
| `deal_age_days` | int | Days since `date_added` |
| `avg_days_per_stage` | numeric | Avg of `days_in_stage` from stage history |
| `stage_transition_count` | int | Count of stage history rows |
| `ever_advanced` | bool | `stage_transition_count > 1` |

#### Funnel depth mapping

| Raw stage | `funnel_depth` | `funnel_depth_label` |
|---|---|---|
| `'Portfolio'` | 6 | Portfolio |
| `'DD phase'` | 5 | DD Phase |
| `'Working on a deal (significant effort)'` | 4 | Working on Deal |
| `'Under analysis (team assigned, moderate effort)'` | 3 | Under Analysis |
| `'Being explored (meetings only)'` | 2 | Being Explored |
| `'Add-ons (relevant now)'` | 2 | Other |
| Everything else (e.g. `'To be processed'`) | 1 | Other |

**Important**: DD phase uses exact match (`= 'DD phase'`), not ILIKE, to avoid false matches on stage names containing "dd" (e.g. "Add-ons").

### Deal Stage Taxonomy

All raw `stage` values from Affinity CRM:

| Raw `stage` value | Display | Notes |
|---|---|---|
| `'DD phase'` | DD Phase | |
| `'Working on a deal (significant effort)'` | Working on Deal | |
| `'Under analysis (team assigned, moderate effort)'` | Under Analysis | |
| `'Being explored (meetings only)'` | Being Explored / Longtail | |
| `'Portfolio'` | Portfolio | |
| `'To be processed'` | — | Catch-all early stage |
| `'Add-ons (relevant now)'` | — | Portfolio add-on opportunities |

`normalizeStage()` uses substring matching (`dd`, `analysis`/`analys`). Located in `hooks/useTeamAnalytics.js`.

### Category Types

| Type | Source |
|---|---|
| `deal` | Active deals (Working/Analysis/DD stages) |
| `longtail` | Deals at `'Being explored'` stage + `'Other'` catch-all |
| `orig` | Rows from `ReportingNz_orig_channels` |
| `portco` | Deals at `'Portfolio'` stage |
| `internal` | Hardcoded: Recruiting, Investor Relations / LP, Fund Operations, Expansion & Business Development, Training & development, Out of office |

---

## Page Specifications

### Time Tracker (`/timetracker`)

- User + week selector (always current Monday, local timezone via `getMondayISO()`)
- **6 category groups**: Dealflow (scrollable if >8 deals), Longtail, Origination, Portfolio, Internal, Time Off
- Two input columns per row: `pct_expected` (next week %) + `hrs_actual` (last week hrs)
- Live % total with over-100% warning; running hrs total with "X hrs/day" hint
- Submits via upsert on `(user_name, week_start, category_key)`
- FilterBar hidden on this page

---

### Team Analytics (`/team`)

- **Timeframe toggle**: This Week / This Month (independent of global LTM filter)
- **Chart 1** — Stacked bar: % allocation by category per team member (dealflow / internal / portco / orig)
- **Chart 2** — Horizontal bar: FTE per active deal (`pct_expected/100` summed across team), stage-colored, filterable by stage
- **Chart 3** — Horizontal bar: lifetime `hrs_actual` per deal (all-time, not timeframe-filtered), stage-colored
- Expandable matrix tables below Charts 1 and 3
- FilterBar hidden on this page

---

### Board Pipeline (`/pipeline`)

- Current-state snapshot; NOT date-filtered; always `is_active = true`
- **Stage groups in order**: Portfolio → DD Phase → Working on a Deal → Under Analysis → Being Explored → Dormant
- **Deal row columns**: Name, Captain, Description (`activity_description`), IC Stage, Last Milestone
  - Last Milestone logic: checks milestones field for "NBO Sent" → "NDA Signed" → "IM Received" (first match wins)
- **Expanded detail panel**: `activity_description`, `team_involved`, full milestones, captain, IC stage, `date_added`
- Date range filter disabled

---

### Proprietary Dealflow (`/proprietary`)

- **Definition**: `origination_channel IS NULL` OR (not ilike `%Network%` AND not ilike `%Adviser%`)
- **Goal**: Dynamic — `proprietaryGoalForRange(filters)` from `lib/config.js`
  - Annual target: 36 (3/month)
  - LTM / All → 36
  - YTD → `3 × months elapsed` (e.g. March = 9)
  - Custom → pro-rated by calendar days
- **Donut**: achieved vs pro-rated goal
- **KAM bar**: deals per captain, toggle Volume / Quality
- **Stage bar chart** (horizontal): cumulative "deals that reached or passed each stage" (not snapshot count); toggle Total / By Captain
- **Drilldown table**: sortable, 10 rows default, active deals first

---

### Channel Performance (`/channels`)

- **13-column breakdown table** per channel: Leads LTM, Quality Leads, Quality Rate, Avg Priority, NBOs (milestones contains "NBO Sent"), One-off Cost, Total Hours, Avg Cost/Month, Cost/NBO, Cost/Quality Lead, Difficulty, Potential
- Costs from two sources: `ReportingNz_channel_costs` (one_off) + `ReportingNz_channel_cost_actuals` (time-based)
- "Unattributed" row for null channels
- **Horizontal bar chart**: toggle Volume / Quality / Cost Efficiency
- Quality leads memo list (top 10 + show all)

---

### Adviser Coverage (`/advisers`)

- **Source**: `ReportingNz_adviser_deals` view only; never raw deals table
- Default: `programme_bucket = 'Adviser Programme'`; toggle to include Untiered Connection
- Grouped KAM → Adviser table; quality % color-coded (green ≥20%, amber 5–20%, red <5%)
- "No Adviser Data" row always visible, excluded from KPIs
- **Horizontal bar**: dealflow per adviser (top 20), toggle Volume / Quality / By KAM
- LTM deal log sorted by stage
- Channel filter hidden in FilterBar (`hideChannel={true}`)

---

### Funnel Analysis (`/funnel`)

- All-time data only; date filter greyed out in FilterBar
- **Source**: `ReportingNz_funnel_analysis` view (6 rows, pre-aggregated)
- **Horizontal bar**: cumulative "reached stage" per stage, filterable by Captain / Channel / Adviser
- **Stats table**: Reached, Didn't Advance, Cumul. Conv. %, Stage-to-Stage %, Avg Days, Total Hrs, Avg Hrs to Progress
- Click stage row → expands time-in-stage histogram (buckets: 0–7d, 8–14d, 15–30d, 31–60d, 61–90d, 91–180d, 180d+)
- **Time invested section**: hours per deal × stage from `ReportingNz_stage_time_investment`

---

### Dynamic Analysis (`/analysis`)

- **Source**: `ReportingNz_deal_analysis` view via `useAnalysisDeals()`
- Scatter chart — user picks X and Y axes independently from 10 dimensions; colour-by Stage or Channel
- **AXIS_OPTIONS** (10 variables):

| Value | Label | Notes |
|---|---|---|
| `total_hrs` | Total Hours on Deal | |
| `funnel_depth` | Funnel Depth Reached | domain 0–6; tick labels show stage names |
| `avg_days_per_stage` | Avg Days per Stage | capped at 350 (filterMax) |
| `deal_lifespan_days` | Deal Lifespan (days) | |
| `stage_transition_count` | Number of Stage Transitions | |
| `equity_required` | Equity Required (€m) | |
| `attractiveness_score` | Attractiveness Score | domain 0–5 |
| `ic_stage_rank` | IC Stage | 0–3 → Pre-checklist / Checklist / First IC / 2+ ICs |
| `milestone_depth` | Milestone Depth | 0–6 → None / NDA / IM / NBO / VDR-FAQ / MIP / TS |
| `milestone_count` | Milestone Count | |

- `filterMax` on an axis option silently drops deals that exceed the cap (outlier protection)
- **Deal Breakdown table**: 11 columns, sortable, 8 rows default, "Show all" toggle
- **Filters applied**: date range (on `date_added`), dealCaptain (on `captain`), channel (ilike on `channel_label`); stage filter not applied
- `useAnalysisDeals` queryKey includes `[dateRange, dateFrom, dateTo, dealCaptain, channel]`

---

## AI Chat Panel

- **Component**: `components/chat/AiChatPanel.jsx`
- **Hook**: `hooks/useAiChat.js`
- Slide-in panel visible on all pages except `/timetracker`
- Calls `ai-chat` Supabase Edge Function with full message history
- Suggested prompts shown on first open; messages persist for session duration
- `clearMessages()` resets to empty state

---

## Design System

### CSS Custom Properties (`index.css`)

```css
--ink:            #0f0f0f    /* primary text, borders */
--paper:          #f7f5f0    /* background — warm off-white */
--muted:          #9a9589    /* secondary text, labels */
--rule:           #e5e2db    /* dividers */
--accent:         #1a3a2a    /* success / 100% complete — dark green */
--accent-light:   #e8f0eb    /* accent tint */
--danger:         #c0392b    /* over 100% / errors — red */
--col-pct-bg:     #f0f5f2    /* Expected % column header bg */
--col-hrs-bg:     #f5f0e8    /* Actual hrs column header bg */
--portco-bg:      #eef0f8    /* portfolio tag bg — indigo tint */
--portco-fg:      #3a4080    /* portfolio tag text */
--longtail-bg:    #f5eef8    /* longtail tag bg — purple tint */
--longtail-fg:    #6b3a80    /* longtail tag text */
--orig-bg:        #fff4e8    /* origination tag bg — amber tint */
--orig-fg:        #8a5020    /* origination tag text */
```

### Typography

| Role | Font |
|---|---|
| Headers / display | DM Serif Display |
| Body / UI | DM Sans |
| Data / monospace | DM Mono |

### Row Tag Classes

`.deal` (tan), `.internal` (dark green), `.portco` (indigo), `.longtail` (purple), `.orig` (amber)

### Stage Badge Colors (`Badge.jsx — StageBadge`)

| Stage | Background | Text |
|---|---|---|
| DD Phase | `#1a3a2a` | white |
| Working on Deal | `#2e6da4` | white |
| Under Analysis | `#c07830` | white |
| Being Explored / Longtail | `#6b3a80` | white |
| Portfolio | `#3a4080` | white |
| To be processed | `#e5e7eb` | `#374151` |
| Add-ons (relevant now) | `#d1d5db` | `#374151` |

### Tier Badge Colors (`Badge.jsx — TierBadge`)

Tier 1 → green, Tier 2 → blue, Tier 3 → amber, No Tier → muted grey

---

## Key Utilities

| Utility | File | Signature | Description |
|---|---|---|---|
| `shortName` | `lib/utils.js` | `(fullName) → string` | "John D." — first name + last initial |
| `formatCurrency` | `lib/utils.js` | `(value) → string` | "€30k" — divides by 1000, no decimals |
| `applyDateRange` | `lib/dateRange.js` | `(query, filters) → query` | Chainable Supabase query modifier for date filtering on `date_added` |
| `getMondayISO` | `hooks/useTimeEntries.js` | `() → string` | Current week Monday as YYYY-MM-DD (local time) |
| `normalizeStage` | `hooks/useTeamAnalytics.js` | `(stage) → string` | Normalizes raw stage to display label via substring match |
| `proprietaryGoalForRange` | `lib/config.js` | `(filters) → number` | Pro-rates annual goal (36) by active date range |

---

## Auth (`middleware.js`)

Vercel Edge Runtime. Two credential pairs enforced separately:

| Env Var pair | Protects |
|---|---|
| `BASIC_AUTH_USER` / `BASIC_AUTH_PASSWORD` | Time Tracker (`/timetracker`) |
| `REPORT_AUTH_USER` / `REPORT_AUTH_PASSWORD` | All reporting pages |

Since this is a SPA, the middleware protects the whole app via Vercel rewrites. The `pathname` check selects which credential pair to validate against.

---

## Environment Variables

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key (public-safe) |
| `BASIC_AUTH_USER` | Time tracker username |
| `BASIC_AUTH_PASSWORD` | Time tracker password |
| `REPORT_AUTH_USER` | Reporting username |
| `REPORT_AUTH_PASSWORD` | Reporting password |

---

## Backend Edge Functions

| Function | Description |
|---|---|
| `affinity-sync` | Daily Affinity CRM pull (scheduled at 06:00 via pg_cron) |
| `adviser-sync` | Adviser data sync |
| `notion-sync` | Notion integration |
| `ai-chat` | AI chat endpoint — receives `{ messages[] }`, returns `{ reply }`. Queried by `AiChatPanel` via `useAiChat` hook |
