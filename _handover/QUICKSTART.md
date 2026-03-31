# Nzyme Reporting — Quickstart & Handover Guide

This document is the single source of truth for anyone taking over or making changes to the Nzyme Reporting app.

---

## What is this app?

An internal BI dashboard for Nzyme's PE fund team. It has two parts:

1. **Time Tracker** — team members log their weekly hours here (which deals they worked on, what % of their time, and how many actual hours)
2. **Reporting Dashboards** — 7 pages that visualise deal pipeline, team analytics, channel performance, adviser coverage, funnel analysis, proprietary dealflow, and dynamic deal analysis

The app is read-only from the frontend (no editing happens in the dashboard). All data comes from Affinity CRM, synced automatically once per day.

---

## The three services you need to know about

### 1. Supabase (the database + backend)
URL: https://supabase.com/dashboard/project/yphbrpbwpakjduhmoimw

This is where all the data lives. Think of it like a managed database with extras:
- **Tables** store the raw data (deals, time entries, advisers, team members, channels)
- **Views** are pre-computed queries that the frontend reads (e.g. the funnel analysis aggregation)
- **Edge Functions** are small backend scripts that run on a schedule to pull data from Affinity and push it to Supabase
- **Secrets** are where API keys are stored securely (Affinity API key, OpenAI key, etc.)

### 2. GitHub (the code)
Repository: the codebase that runs the frontend dashboard

All code changes should be made here. Pushing to the `main` branch automatically triggers a new deployment on Vercel.

### 3. Vercel (the hosting)
URL: https://vercel.com

This hosts the frontend app and automatically re-deploys whenever code is pushed to `main` on GitHub. It also stores the environment variables (Supabase URL and keys) that the frontend needs to connect to the database.

---

## How data flows

```
Affinity CRM
    │
    │  (daily at 06:00, via Edge Functions)
    ▼
Supabase Database
    │
    │  (on page load, via React Query)
    ▼
Frontend Dashboard (Vercel)
```

The Edge Functions are the bridge between Affinity and Supabase. They run automatically on a schedule and do not need to be triggered manually.

---

## Making changes without VS Code

You do not need to install any code editor to make changes. The recommended workflow is:

1. Install **Claude Code** (run `npm install -g @anthropic-ai/claude-code` in a terminal)
2. Connect the **Supabase MCP** to Claude Code (for database changes)
3. Connect the **GitHub MCP** to Claude Code (for code changes)
4. Describe what you want to change in plain English — Claude handles the rest

For database-only changes (e.g. adding a team member, updating channel costs), you can also use the Supabase Table Editor directly at the URL above.

---

## Common changes and where they live

| What you want to change | Where to make the change |
|---|---|
| Add or remove a team member | Supabase → Table Editor → `ReportingNz_team_members` |
| Add or rename an origination channel | Supabase → Table Editor → `ReportingNz_orig_channels` |
| Update channel costs (one-off spend) | Supabase → Table Editor → `ReportingNz_channel_costs` |
| Change the annual proprietary deal goal (currently 36) | GitHub → `src/lib/config.js` → `PROPRIETARY_DEAL_GOAL_ANNUAL` |
| Add a new login user for the app | Vercel → Settings → Environment Variables → `BASIC_AUTH_USER` / `REPORT_AUTH_USER` |
| Change the login password | Vercel → Settings → Environment Variables |
| Change how a metric is calculated | GitHub → `src/hooks/` → find the relevant hook file |
| Change colours or fonts | GitHub → `src/index.css` |
| Trigger a manual data sync from Affinity | Supabase → Edge Functions → `affinity-sync` → Invoke |

---

## Environment variables

These are stored in Vercel and are never committed to the codebase.

| Variable | What it is |
|---|---|
| `VITE_SUPABASE_URL` | The URL of the Supabase project |
| `VITE_SUPABASE_ANON_KEY` | The public-safe Supabase key used by the frontend |
| `BASIC_AUTH_USER` / `BASIC_AUTH_PASSWORD` | Login credentials for the Time Tracker |
| `REPORT_AUTH_USER` / `REPORT_AUTH_PASSWORD` | Login credentials for the Reporting dashboards |

These are also needed in Supabase as Edge Function Secrets:

| Secret | What it is |
|---|---|
| `AFFINITY_API_KEY` | Used by `affinity-sync` and `adviser-sync` to pull data from Affinity CRM |
| `OPENAI_API_KEY` | Used by `ai-chat` to power the AI assistant panel |
| `NOTION_API_KEY` | Used by `notion-sync` to push deal data to a Notion database |
| `NOTION_DATABASE_ID` | The target Notion database ID for deal sync |
| `SUPABASE_SERVICE_ROLE_KEY` | Used by Edge Functions to write to the database (auto-available, no manual setup needed) |

---

## Local development (if needed)

```bash
# 1. Clone the repo
git clone <repo-url>
cd Nzyme_Reporting_TT

# 2. Install dependencies
npm install

# 3. Create your local env file
cp .env.example .env.local
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from the Supabase dashboard

# 4. Run the dev server
npm run dev
# Opens at http://localhost:5173
```

The full technical reference (schema, page specs, hook documentation) is in `CLAUDE.md` at the root of the repository.
