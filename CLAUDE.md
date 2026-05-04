# Nzyme Reporting — Dashboard Reference

Internal BI dashboard for a PE fund. Two functional areas: a **Time Tracker** for weekly allocation logging, and **8 Reporting Dashboards** for deal pipeline, team analytics, channel performance, adviser coverage, funnel analysis, proprietary dealflow, dynamic analysis, and fundraising activity.

**Audience**: 5–8 PE fund team members. Desktop only (min 1024px). Hosted on Vercel, read-only from the frontend.

---

## Maintenance

**Update this file on every deploy**: Before or as part of every `git push` to `main`, review what changed and update the relevant sections of this file. New pages, hooks, components, schema changes, and behaviour changes must all be reflected here. This file is the single source of truth for how the codebase works.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite 8 |
| Styling | Tailwind CSS v4 (CDN via plugin) + CSS custom properties for design tokens |
| Charts | Recharts v3 |
| Data fetching | Supabase JS v2 + TanStack React Query v5 |
| Routing | React Router v7 |
| Auth | Supabase Auth — Google OAuth, domain-restricted, session in localStorage |
| Analytics | `@vercel/analytics` — `<Analytics />` mounted in `main.jsx`, tracks page views per route |
| Hosting | Vercel (auto-deploy from GitHub `main`) |
| Backend | Supabase (Postgres + Edge Functions, RLS-protected) |

---

## File Map

```
src/
├── App.jsx                          ← Routes: /login, /auth/callback, ProtectedRoute wrapper + FilterProvider
├── main.jsx                         ← QueryClient (5min stale, retry=1) + AuthProvider + <Analytics />
├── index.css                        ← CSS custom properties + global resets
├── contexts/
│   └── AuthContext.jsx              ← AuthProvider, useAuth(), Google sign-in, domain check, sign-out
├── pages/
│   ├── LoginPage.jsx                ← /login — Google sign-in button, domain error messages
│   ├── AuthCallback.jsx             ← /auth/callback — handles OAuth redirect, shows "Signing you in…"
│   ├── TimeTracker.jsx              ← /timetracker (default)
│   ├── TeamAnalytics.jsx            ← /team
│   ├── BoardPipeline.jsx            ← /pipeline
│   ├── ProprietaryDealflow.jsx      ← /proprietary (disabled in sidebar, route still exists)
│   ├── ChannelPerformance.jsx       ← /channels
│   ├── AdviserCoverage.jsx          ← /advisers
│   ├── FunnelAnalysis.jsx           ← /funnel
│   ├── DynamicAnalysis.jsx          ← /analysis
│   └── FundraisingActivity.jsx      ← /fundraising — LP/investor interaction tracking
├── components/
│   ├── layout/
│   │   ├── AppShell.jsx             ← Outlet + conditional FilterBar + AiChatPanel
│   │   ├── Sidebar.jsx              ← Sticky nav (9 routes) + user email + sign-out button
│   │   └── FilterBar.jsx            ← Date/captain/stage/channel + freshness
│   ├── chat/
│   │   └── AiChatPanel.jsx          ← Slide-in AI chat panel (all non-timetracker pages)
│   ├── timetracker/
│   │   ├── WeeklyForm.jsx           ← Main time-entry form (team member auto-resolved from auth email)
│   │   ├── IntensityModal.jsx       ← Week-intensity picker (Light/Normal/Intense → ~40/55/70 hrs) shown on submit
│   │   └── SuccessScreen.jsx        ← Post-submit confirmation
│   ├── ProtectedRoute.jsx           ← Layout route guard — redirects to /login if not authenticated
│   ├── TeamAccessGate.jsx           ← Wraps /team and /fundraising — checks team_access Supabase table
│   ├── TeamPasswordGate.jsx         ← Legacy password gate (VITE_TEAM_PASSWORD); no longer used in routing
│   └── ui/
│       ├── Badge.jsx                ← StageBadge + TierBadge
│       ├── InfoTooltip.jsx          ← Hover tooltip (ⓘ icon, fixed-position bubble to escape overflow)
│       ├── KpiCard.jsx              ← Metric card (title/value/subtitle)
│       ├── LoadingSpinner.jsx       ← 8px spinning circle
│       ├── MultiSelect.jsx          ← Checkbox dropdown (N selected label)
│       └── PageBanner.jsx           ← Collapsible info banner (summary + expandable body + optional caveat)
├── hooks/
│   ├── useFilters.jsx               ← FilterContext (dateRange, dealCaptain[], stage[], channel)
│   ├── useAiChat.js                 ← sendMessage(), messages[], isLoading — calls ai-chat edge fn
│   ├── useDeals.js                  ← useBoardPipelineDeals()
│   ├── useTimeEntries.js            ← useTrackerData(), useUserEntriesMerged(), useInternalCategories(), getMondayISO(offsetWeeks?), addDays()
│   ├── useFilterOptions.js          ← useDealCaptainOptions(), useStageOptions(), useChannelOptions(), useDataFreshness()
│   ├── useTeamAnalytics.js          ← useDealStageMap(), useTimeframeEntries(), useLifetimeHoursEntries()
│   ├── useAdviserDeals.js           ← useAdviserDeals()
│   ├── useChannelPerformance.js     ← useChannelDeals(), useChannelCosts(), useChannelCostActuals(), useChannelOrigEntries()
│   ├── useProprietaryDeals.js       ← useProprietaryDeals(), useTotalDealsCount()
│   ├── useAnalysisDeals.js          ← useAnalysisDeals() — queries ReportingNz_deal_analysis view
│   ├── useLPDashboard.js            ← useLPDashboard() — paginates ReportingNZ_LP_dashboard (all interaction rows)
│   └── useFunnelAnalysis.js         ← useFunnelStages(), useFunnelDeals(), useFunnelDealsHistory(),
│                                       useStageHistogram(), useAdviserStageBreakdown(), useStageTimeInvestment(),
│                                       usePipelineThroughput(), useLostDiscardedDeals(), useLostDiscardedHistory(),
│                                       useAllStageDaysHistory(), useCurrentPortfolioCount(),
│                                       usePortfolioDeals(), usePortfolioStageHistory()
└── lib/
    ├── config.js                    ← PROPRIETARY_DEAL_GOAL_ANNUAL = 36; proprietaryGoalForRange()
    ├── dateRange.js                 ← applyDateRange(query, filters) helper
    ├── supabase.js                  ← createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
    └── utils.js                     ← shortName(), formatCurrency()
```

Root files:

| File | Purpose |
|---|---|
| `vercel.json` | SPA rewrites — all routes → `index.html` |
| `vite.config.js` | tailwindcss() + react() plugins |

> `middleware.js` was deleted when Basic Auth was replaced by Supabase Auth.

---

## Auth

### Overview

Authentication is handled entirely in the React SPA via **Supabase Auth with Google OAuth**. There is no server-side middleware.

**Flow:**
1. Unauthenticated user hits any route → `ProtectedRoute` redirects to `/login`
2. User clicks "Sign in with Google" → `supabase.auth.signInWithOAuth({ provider: 'google' })`
3. Google redirects to `/auth/callback` → Supabase exchanges the code for a session
4. `AuthContext` checks the email domain — must end with `@kiboventures.com` or `@nzalpha.com`
5. Invalid domain → session immediately signed out, error shown on `/login`
6. Valid domain → user redirected to their intended destination (default `/timetracker`)
7. Session persists in `localStorage` across page refreshes until sign-out

### Key Files

| File | Responsibility |
|---|---|
| `src/contexts/AuthContext.jsx` | Auth state (`user`, `authError`), `signInWithGoogle()`, `signOut()`, domain validation |
| `src/pages/LoginPage.jsx` | Login UI — Google button, domain error, signin error |
| `src/pages/AuthCallback.jsx` | OAuth landing page — shows "Signing you in…", redirects once session resolves |
| `src/components/ProtectedRoute.jsx` | React Router layout route — renders `<Outlet />` if authenticated, else redirects to `/login` |
| `src/components/TeamAccessGate.jsx` | Wraps `/team` and `/fundraising` — checks `team_access` table for the user's email, shows access-denied if not found |

### Allowed Domains

Defined as a constant in `AuthContext.jsx`:

```js
const ALLOWED_DOMAINS = ['kiboventures.com', 'nzalpha.com']
```

To add `@nzyme.com` in future, append `'nzyme.com'` to this array.

### Restricted Pages (`/team`, `/fundraising`)

Access is restricted to a specific allowlist stored in the `team_access` Supabase table. Being able to log in (valid domain) does **not** automatically grant access to these pages.

**To grant access**: insert a row into `team_access` via the Supabase dashboard:
```sql
insert into team_access (email) values ('name@kiboventures.com');
```

Current access: all 6 MDs (Fernando, Ignacio, Jose Manuel, Juan, Pablo, Vicente) + jacob@kiboventures.com.

### Supabase Configuration Required

| Setting | Value |
|---|---|
| Auth Provider | Google OAuth enabled (Supabase Dashboard → Auth → Providers) |
| Google Redirect URI (in Google Cloud Console) | `https://yphbrpbwpakjduhmoimw.supabase.co/auth/v1/callback` |
| Supabase Site URL | `https://nzyme-reporting.vercel.app` |
| Supabase Redirect URLs | `https://nzyme-reporting.vercel.app/auth/callback`, `http://localhost:5173/auth/callback` |

---

## Global Filter System

- **Context**: `useFilters()` from `hooks/useFilters.jsx`
- **State shape**: `{ dateRange, dateFrom, dateTo, dealCaptain[], stage[], channel }`
- **`dateRange` values**: `'ltm'` | `'ytd'` | `'all'` | `'custom'`; default is `'ltm'`
- Applied server-side via `applyDateRange()` in `lib/dateRange.js`
- `dealCaptain` uses multi-select + `ilike %name%` (handles compound names)
- FilterBar hidden entirely on `/timetracker` and `/team`
- Date range filter greyed out (disabled) on `/pipeline` only
- **Data freshness**: `MAX(last_synced_at)` from `ReportingNz_deals`, shown in FilterBar top-right

### FilterBar props

| Prop | Default | Used on |
|---|---|---|
| `disableDateRange` | `false` | `/pipeline` |
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
| `ReportingNz_time_entries` | Weekly logs (`user_name`, `week_start`, `category_key`, `category_type`, `pct_expected`, `hrs_actual`, `intensity`); upserted on composite key |
| `ReportingNz_team_members` | Active team (`name`, `seniority`, `hourly_rate`, `seniority_multiplier`, `email`); `email` links each member to their Supabase Auth account |
| `ReportingNz_orig_channels` | Origination channel reference (`name`, `sort_order`) |
| `ReportingNz_channel_costs` | Manual cost inputs (`one_off_cost`, `difficulty`, `potential`) |
| `ReportingNZ_LP_dashboard` | LP/investor interaction log (`interaction_date`, `interaction_type`, `partner_names`, `lp_name`, `investor_type`, `engagement_effort`, `overall_status`, `portugal_status`, `germany_status`) |
| `team_access` | Staffing Report + Fundraising allowlist — one row per email address permitted to view `/team` and `/fundraising` |

#### `team_access` table

```sql
create table team_access (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  created_at timestamptz not null default now()
);
-- RLS: authenticated users can only read their own row
```

### Views

| View | Description |
|---|---|
| `ReportingNz_adviser_deals` | Pre-joined deal + adviser rows, includes `programme_bucket`, `is_ltm`, `lead_quality` |
| `ReportingNz_funnel_analysis` | 6-row aggregated funnel stats — uses `max(stage_rank)` from stage history to count deals that ever reached each stage (all-time, no date filter) |
| `ReportingNz_channel_cost_actuals` | Time-based cost per channel (hrs × rate × multiplier) |
| `ReportingNz_stage_time_investment` | Hours per deal × stage; `did_advance = true` only when the deal's next stage (via `LEAD()` on `changed_at`) has a strictly higher rank — exiting to Lost/Discarded does NOT set `did_advance` |
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
| `equity_required` | numeric | `d.total_equity_required` |
| `attractiveness_score` | int | Generated 1–5 score |
| `ic_stage_rank` | int | 0–3 mapped from `d.ic_stage` |
| `milestone_depth` | int | 0–6 based on milestone text |
| `milestone_count` | int | Count of milestones |
| `revenue_m` | numeric | `d.revenue_m` (€m) |
| `ebitda_m` | numeric | `d.ebitda_m` (€m) |

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
| `internal` | Hardcoded list returned by `useInternalCategories()` in `useTimeEntries.js` |

---

## Page Specifications

### Time Tracker (`/timetracker`)

- Team member is **auto-resolved** from the logged-in user's email — matched against the `email` column in `ReportingNz_team_members`. No manual selection dropdown.
- If the logged-in email has no matching row in `ReportingNz_team_members`, an error message is shown prompting an admin to add their email to the table.
- Week selector (always current Monday, local timezone via `getMondayISO()`)
- **6 category groups**: Dealflow (scrollable if >8 deals), Longtail, Origination, Portfolio, Internal, Time Off
- Two input columns per row: `pct_actual` (last week %) + `pct` (next week %)
- Live % total with over-100% warning; running hrs total with "X hrs/day" hint
- On submit: **IntensityModal** appears — user picks Light / Normal / Intense (~40 / 55 / 70 hrs). The `intensity` value is stored on every upserted row. After confirming, existing rows for both weeks are deleted then re-inserted.
- Submits via upsert on `(user_name, week_start, category_key)`
- FilterBar hidden on this page

---

### Team Analytics (`/team`)

- **Access restricted** — only users listed in the `team_access` table can view this page (`TeamAccessGate` component)
- **Timeframe toggle**: This Week / This Month (independent of global LTM filter)
- **Chart 1** — Stacked bar: % allocation by category per team member (dealflow / internal / portco / orig)
- **Chart 2** — Horizontal bar: FTE per active deal (`pct_expected/100` summed across team), stage-colored, filterable by stage
- **Chart 3** — Horizontal bar: lifetime `hrs_actual` per deal (all-time, not timeframe-filtered), stage-colored
- Expandable matrix tables below Charts 1 and 3
- FilterBar hidden on this page

---

### Dealflow & Portfolio Board (`/pipeline`)

- Current-state snapshot; NOT date-filtered; always `is_active = true`
- **Stage groups in order**: Portfolio → DD Phase → Working on a Deal → Under Analysis → Being Explored → Dormant
- **Deal row columns**: Name, Captain, Description (`activity_description`), Revenue (`revenue_m`), EBITDA (`ebitda_m`), IC Stage, Last Milestone
  - Last Milestone logic: checks milestones field for "NBO Sent" → "NDA Signed" → "IM Received" (first match wins)
  - Revenue and EBITDA render as `€{value}m` or `—` when null; right-aligned monospace
- **Expanded detail panel**: `activity_description`, `team_involved`, full milestones, captain, IC stage, `date_added`
- Date range filter disabled

---

### Proprietary Dealflow (`/proprietary`)

> Route exists but is disabled in the sidebar (commented out). Still accessible directly.

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
- KPI card "Most Quality Leads" shows the best channel by quality lead count
- Quality leads memo list (top 10 + show all)

---

### Adviser Coverage (`/advisers`)

- **Source**: `ReportingNz_adviser_deals` view only; never raw deals table
- All `programme_bucket` values included (Adviser Programme + Untiered Connection); no toggle
- "No Adviser Data" rows always shown in the grouped table but excluded from KPI totals
- All KPIs (total deals, quality leads, quality rate, top adviser) follow the global date filter — no hardcoded LTM
- Grouped KAM → Adviser table; quality % color-coded (green ≥20%, amber 5–20%, red <5%)
- **Horizontal bar**: dealflow per adviser (top 20), toggle Volume / Quality / By KAM
- **Deal log columns**: Deal Name, Stage (StageBadge), Attractiveness (raw label e.g. "1 - High"), Introducer, Adviser, Deal Captain, Description — sorted by stage rank
- Channel filter hidden in FilterBar (`hideChannel={true}`)

---

### Funnel Analysis (`/funnel`)

- Date filter is **active** (not greyed out). Defaults to `'all'` on mount via `useEffect` so the pre-aggregated view is the baseline, but LTM/YTD are fully supported.
- **"All" mode**: reads from `ReportingNz_funnel_analysis` SQL view (pre-aggregated, uses stage history `max(stage_rank)` — counts deals that ever reached each stage)
- **Date-filtered / captain / channel mode**: computes funnel client-side from `useFunnelDeals` + `useFunnelDealsHistory`. Uses stage history to find furthest stage each deal ever reached, mirroring the SQL view semantics. Entry count includes Lost/Discarded/Add-ons deals.
- **Adviser filter mode**: client-side from `useAdviserStageBreakdown`; falls back to current-stage computation (no deal names available for history lookup)
- **Horizontal bar**: cumulative "reached stage" per stage, filterable by Captain / Channel / Adviser
- **Stats table**: Reached, Didn't Advance, Cumul. Conv. %, Stage-to-Stage %, Median Days, Total Hrs, Avg Hrs to Progress
- Click stage row → expands time-in-stage histogram (buckets: 0–7d, 8–14d, 15–30d, 31–60d, 61–90d, 91–180d, 180d+)
- **Stage Activity in Period** (toggleable): distinct deals that entered each stage during the period, based on `changed_at` in stage history (not `date_added`) — via `usePipelineThroughput`
- **Time invested section**: hours per deal × stage from `ReportingNz_stage_time_investment`; arrow (→) shown only for deals that genuinely advanced to a higher stage
- **KPI cards**: Deals Entered Funnel, Portfolio (Invested), Entry → Portfolio %, Median Days to Portfolio
- **Lost & Discarded section**: KPI cards + bar chart by stage + median days table comparing dropped vs advanced deals

---

### Dynamic Analysis (`/analysis`)

- **Source**: `ReportingNz_deal_analysis` view via `useAnalysisDeals()`
- Scatter chart — user picks X and Y axes independently from 12 dimensions; colour-by Stage or Channel
- **Default axes**: X = `funnel_depth`, Y = `avg_days_per_stage`
- **AXIS_OPTIONS** (12 variables):

| Value | Label | Notes |
|---|---|---|
| `total_hrs` | Total Hours on Deal | |
| `funnel_depth` | Funnel Depth Reached | domain 0–6; tick labels show stage names |
| `avg_days_per_stage` | Avg Days per Stage | capped at 350 (filterMax) |
| `deal_lifespan_days` | Deal Lifespan (days) | |
| `stage_transition_count` | Number of Stage Transitions | |
| `equity_required` | Equity Required (€m) | |
| `revenue_m` | Revenue (€m) | from `d.revenue_m` |
| `ebitda_m` | EBITDA (€m) | from `d.ebitda_m` |
| `attractiveness_score` | Attractiveness Score | domain 0–5 |
| `ic_stage_rank` | IC Stage | 0–3 → Pre-checklist / Checklist / First IC / 2+ ICs |
| `milestone_depth` | Milestone Depth | 0–6 → None / NDA / IM / NBO / VDR-FAQ / MIP / TS |
| `milestone_count` | Milestone Count | |

- `filterMax` on an axis option silently drops deals that exceed the cap (outlier protection)
- **Deal Breakdown table**: 13 columns (includes Revenue (€m) and EBITDA (€m)), sortable, 8 rows default, "Show all" toggle
- **Filters applied**: date range (on `date_added`), dealCaptain (on `captain`), channel (ilike on `channel_label`); stage filter not applied
- `useAnalysisDeals` queryKey includes `[dateRange, dateFrom, dateTo, dealCaptain, channel]`

---

### Fundraising Activity (`/fundraising`)

- **Access restricted** — `TeamAccessGate` (same `team_access` allowlist as `/team`)
- **Source**: `ReportingNZ_LP_dashboard` table via `useLPDashboard()` — paginated in 1000-row pages, returns all rows
- Tracks LP/investor interactions: emails sent/received, meetings, notes
- Local filters: interaction type, partner, investor type (dropdowns); granularity toggle (Weekly / Monthly)
- **Stacked bar chart**: interactions over time by type (email_sent, email_response, meeting, note, note_meeting)
- **LP table**: sortable by name or interaction count, filterable by investor type and partner

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
| `getMondayISO` | `hooks/useTimeEntries.js` | `(offsetWeeks = 0) → string` | Monday of the current (or offset) week as YYYY-MM-DD (local time) |
| `addDays` | `hooks/useTimeEntries.js` | `(isoDate, n) → string` | Adds n days to an ISO date string, returns YYYY-MM-DD |
| `normalizeStage` | `hooks/useTeamAnalytics.js` | `(stage) → string` | Normalizes raw stage to display label via substring match |
| `proprietaryGoalForRange` | `lib/config.js` | `(filters) → number` | Pro-rates annual goal (36) by active date range |

---

## Environment Variables

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key (public-safe) |

> The old Basic Auth variables (`BASIC_AUTH_USER`, `BASIC_AUTH_PASSWORD`, `REPORT_AUTH_USER`, `REPORT_AUTH_PASSWORD`, `VITE_TEAM_PASSWORD`) are no longer used and can be removed from Vercel environment settings.

---

## Backend Edge Functions

| Function | Description |
|---|---|
| `affinity-sync` | Daily Affinity CRM pull (scheduled at 06:00 via pg_cron) |
| `adviser-sync` | Adviser data sync |
| `notion-sync` | Notion integration |
| `ai-chat` | AI chat endpoint — receives `{ messages[] }`, returns `{ reply }`. Queried by `AiChatPanel` via `useAiChat` hook |
