# CLAUDE.md — Nzyme Reporting TT

PE fund staffing & time tracking system. Two static HTML pages deployed on Vercel with Supabase as the backend.

---

## Tech Stack

- **Frontend**: Vanilla JS, no build tools, no framework
- **Styling**: Tailwind CDN + hand-written CSS custom properties
- **Data**: Supabase JS SDK v2 (UMD bundle from CDN)
- **Charts**: Native Canvas API (no chart library)
- **Fonts**: DM Serif Display, DM Mono, DM Sans (Google Fonts)
- **Auth**: HTTP Basic Auth enforced via Vercel Edge Middleware
- **Deployment**: Vercel

---

1## File Map

| File | Purpose |
|---|---|
| `index.html` | Time tracker — team members log weekly % allocation + actual hours |
| `reporting.html` | Analytics dashboard — charts for team capacity, deal FTE, lifetime hours |
| `middleware.js` | Vercel Edge Runtime: enforces Basic Auth, separate credentials per page |

---

## Supabase Schema

**Project URL**: `https://yphbrpbwpakjduhmoimw.supabase.co`

### Tables

**`ReportingNz_deals`**
- `name` — deal/company name (used as `category_key`)
- `stage` — one of the 4 stage strings below

**`ReportingNz_orig_channels`**
- `name` — origination channel name
- `sort_order` — controls display order

**`ReportingNz_team_members`**
- `name` — full name
- `is_active` — boolean, only active members shown
- `sort_order` — controls dropdown order

**`ReportingNz_time_entries`**
- `user_name`, `week_start` (YYYY-MM-DD Monday), `category_key` — composite unique key
- `category_type` — enum: `deal`, `longtail`, `orig`, `internal`, `portco`
- `pct_expected` — float, upcoming week allocation %
- `hrs_actual` — float, last week actual hours
- Upserted with `onConflict: 'user_name,week_start,category_key'`

### Edge Function

**`ai-chat`** — called from reporting.html's AI chat widget. Receives `{ message, contextData: { timeEntries, dealStages } }`, returns `{ bluf_summary, candidates[] }` where each candidate has `{ name, reallocatable_pct, from_tasks }`.

---

## Auth Flow (middleware.js)

Two separate credential pairs in Vercel env vars:

| Env Var | Purpose |
|---|---|
| `BASIC_AUTH_USER` / `BASIC_AUTH_PASSWORD` | Access to `index.html` (time tracker) |
| `REPORT_AUTH_USER` / `REPORT_AUTH_PASSWORD` | Access to `reporting.html` (management reporting) |

The middleware checks `url.pathname.startsWith('/reporting')` to select which credentials to validate. Realm names: `"PE Fund Time Tracker"` and `"Management Reporting"`.

---

## Deal Stage Taxonomy

Supabase `stage` values map to 3 normalized display stages:

| Raw stage value | Normalized | Display color |
|---|---|---|
| `'DD phase'` | `DD Phase` | `#1a3a2a` (dark green) |
| `'Under analysis (team assigned, moderate effort)'` | `Under Analysis` | `#c07830` (amber) |
| `'Working on a deal (significant effort)'` | `Working on Deal` | `#2e6da4` (blue) |
| `'Being explored (meetings only)'` | — | shown as Longtail group |
| `'Portfolio'` | — | shown in Portfolio section |

`normalizeStage()` uses substring matching (`dd`, `analysis`/`analys`).

---

## Category Types

Categories submitted to `ReportingNz_time_entries` carry a `category_type`:

| Type | Source |
|---|---|
| `deal` | Active deals from `ReportingNz_deals` (Working/Analysis/DD stages) |
| `longtail` | Deals at `'Being explored'` stage + `'Other'` catch-all |
| `orig` | Rows from `ReportingNz_orig_channels` |
| `portco` | Deals at `'Portfolio'` stage |
| `internal` | Hardcoded: Recruiting, Investor Relations / LP, Fund Operations, Expansion & Business Development, Training & development, Out of office (Bank Holiday, Annual Leave, Sick) |

---

## index.html — Key JS Functions

| Function | What it does |
|---|---|
| `loadDeals()` | Fetches all 4 data sources from Supabase; populates DEALFLOW, LONGTAIL_DEALS, PORTFOLIO, ORIG_CHANNELS, TEAM_MEMBERS |
| `buildRows()` | Renders the form: scrollable Dealflow section, collapsible Longtail + Origination groups, flat Internal/Portfolio/Time Off sections |
| `loadUserEntries(userName)` | Pre-fills form from existing entries for current week |
| `getMondayISO()` | Returns current week's Monday as `YYYY-MM-DD` using local timezone |
| `submitForm()` | Upserts all non-zero rows to `ReportingNz_time_entries` |
| `updatePctTotal()` | Live validation: turns red + shows overage if total > 100% |
| `updateHrsTotal()` | Shows total hrs + "X / day" hint; computes free capacity vs 40hr week |

Week logic: always anchors to current Monday (local time). Users log "expected % for upcoming week" and "actual hrs from last week" simultaneously.

---

## reporting.html — Key JS Functions

| Function | What it does |
|---|---|
| `drawCapacityChart()` | Stacked bar chart: each team member's % by category (dealflow/internal/portco/orig), shows free capacity as dashed green overlay |
| `drawCapacityTable()` | Dense matrix: categories × team members with avg %, inside accordion |
| `drawFteChart()` | Horizontal bar chart: FTE per active deal, colored by stage, filterable |
| `drawDealsChart()` | Vertical bar chart: lifetime actual hours per deal (all-time, not timeframe-filtered) |
| `drawDealsTable()` | Dense matrix: deals × team members with total hours |
| `fetchTimeframeEntries()` | Week mode: filters by exact `week_start`. Month mode: filters by date range; computes per-user divisor (weeks they logged) for averaging |
| `sendChatMessage()` | Fetches all time entries, calls `ai-chat` edge function, renders BLUF + candidate cards |

**Timeframe toggle** (`week`/`month`): month mode averages by per-user week count so partial reporters don't skew results. Lifetime Hours chart always queries all time regardless of toggle.

---

## Design System

CSS custom properties (defined in both HTML files):

```
--ink:          #0f0f0f   (primary text, borders)
--paper:        #f7f5f0   (background — warm off-white)
--muted:        #9a9589   (secondary text, labels)
--rule:         #e5e2db   (dividers)
--accent:       #1a3a2a   (success / 100% complete — dark green)
--accent-light: #e8f0eb   (accent tint)
--danger:       #c0392b   (over 100% / errors — red)
--col-pct-bg:   #f0f5f2   (Expected % column header bg)
--col-hrs-bg:   #f5f0e8   (Actual hrs column header bg)
--portco-bg/fg: #eef0f8 / #3a4080  (portfolio tag — indigo)
--longtail-bg/fg: #f5eef8 / #6b3a80 (longtail tag — purple)
--orig-bg/fg:   #fff4e8 / #8a5020  (origination tag — amber)
```

Row tag classes: `.deal` (tan), `.internal` (green), `.portco` (indigo), `.longtail` (purple), `.orig` (amber).

Texture: SVG fractalNoise filter applied as `body::before` pseudo-element at 0.4 opacity for paper feel.

---

## Deployment

Vercel. The `middleware.js` file is automatically picked up as Edge Middleware.

Required environment variables in Vercel:
- `BASIC_AUTH_USER`
- `BASIC_AUTH_PASSWORD`
- `REPORT_AUTH_USER`
- `REPORT_AUTH_PASSWORD`

The Supabase anon key is embedded directly in the HTML (public-safe for anon role).
