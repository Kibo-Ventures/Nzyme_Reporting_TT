# Database Schema — Plain English Reference

All tables, views, and key relationships in the Supabase database. The Supabase project is at: https://supabase.com/dashboard/project/yphbrpbwpakjduhmoimw

---

## Tables

### ReportingNz_deals
The central table. Every deal from Affinity lives here. Synced daily via the `affinity-sync` edge function.

| Column | Type | Description |
|---|---|---|
| `id` | uuid | Internal primary key |
| `affinity_id` | text | Affinity's numeric ID for the opportunity (used as upsert key) |
| `affinity_row_id` | text | Affinity's list entry ID |
| `name` | text | Deal / company name |
| `stage` | text | Current Affinity stage (raw value — see stage taxonomy below) |
| `is_active` | boolean | True if stage is one of: Working, Under Analysis, DD Phase, Being Explored, Portfolio |
| `is_quality_lead` | boolean | True if deal has reached "Under Analysis" or beyond |
| `date_added` | date | When the deal was added to Affinity |
| `last_synced_at` | timestamptz | Last time this row was updated by affinity-sync |
| `deal_captain` | text | Primary responsible team member |
| `team_involved` | text | Other team members (comma-separated) |
| `origination_channel` | text | How the deal came in (e.g. "Adviser Programme", "Network", null = proprietary) |
| `attractiveness` | text | Attractiveness rating from Affinity (e.g. "1 - High", "2 - Medium-high") |
| `attractiveness_score` | numeric | Numeric version (1–5) |
| `ic_stage` | text | IC process stage (e.g. "Pre-Checklist", "First IC") |
| `milestones` | text | Semi-colon separated milestone flags (e.g. "NDA Signed; IM Received") |
| `activity_description` | text | Latest activity/status note from Affinity |
| `description` | text | Organisation description |
| `theme` | text | Investment theme tag |
| `revenues` | numeric | Revenue in €M |
| `ebitda` | numeric | EBITDA in €M |
| `growth` | numeric | Revenue growth % |
| `total_equity_required` | numeric | Total equity required in €M |
| `day1_equity_deployment` | numeric | Day 1 equity deployment in €M |
| `sell_side_adviser_name` | text | Name of sell-side adviser |
| `origination_channel` | text | Channel the deal came through |
| `discarded_reason` | text | Reason for discarding (if applicable) |
| `lost_reason` | text | Reason deal was lost (if applicable) |

**Stage taxonomy** (raw values as stored):
- `'Portfolio'` — invested
- `'DD phase'` — formal due diligence
- `'Working on a deal (significant effort)'` — active diligence
- `'Under analysis (team assigned, moderate effort)'` — team assigned
- `'Being explored (meetings only)'` — early contact / longtail
- `'Add-ons (relevant now)'` — portfolio add-on
- `'To be processed'` — catch-all early stage
- `'Discarded'`, `'Lost'` — terminal stages

---

### ReportingNz_time_entries
Weekly time logs submitted by team members via the Time Tracker. One row per person per week per task.

| Column | Type | Description |
|---|---|---|
| `id` | uuid | Primary key |
| `user_name` | text | Team member's name (must match `ReportingNz_team_members.name`) |
| `week_start` | date | The Monday of the logged week (always a Monday) |
| `category_key` | text | The task being logged — deal name, channel name, or internal function name |
| `category_type` | text | Type: `'deal'`, `'longtail'`, `'orig'`, `'portco'`, `'internal'` |
| `pct_expected` | numeric | Expected % of work week dedicated to this task (upcoming week) |
| `hrs_actual` | numeric | Actual hours worked on this task (past week) |
| `created_at` | timestamptz | Row creation timestamp |

**Unique constraint**: `(user_name, week_start, category_key)` — re-submitting the same week overwrites the previous entry, never duplicates.

**Category types explained**:
- `deal` — active deals (Working on Deal, Under Analysis, DD)
- `longtail` — deals at "Being Explored" stage
- `portco` — Portfolio company work
- `orig` — origination channel activities
- `internal` — internal functions (Recruiting, IR/LP, Fund Ops, BD, Training, Out of office)

---

### ReportingNz_advisers
The Nzyme adviser coverage database. Synced from Affinity's Adviser Coverage list via `adviser-sync`.

| Column | Type | Description |
|---|---|---|
| `id` | uuid | Primary key |
| `affinity_org_id` | text | Affinity organisation ID (upsert key) |
| `name` | text | Adviser firm name |
| `website` | text | Firm domain |
| `tier` | integer | Tier 1 / 2 / 3 (null = untiered) |
| `firm_type` | text | Type of firm (e.g. "M&A Boutique", "Big 4") |
| `kam` | text | Key Account Manager — the Nzyme team member responsible |
| `last_email` | timestamptz | Last email contact date (from Affinity relationship intelligence) |
| `last_meeting` | timestamptz | Last meeting date |
| `signed_nda` | boolean | Whether a generic NDA has been signed |
| `location` | text | City, Country |
| `is_active` | boolean | Whether the adviser is active in the programme |
| `last_synced_at` | timestamptz | Last sync timestamp |

---

### ReportingNz_deal_stage_history
Every stage transition for every deal. Powers the Funnel Analysis page.

| Column | Type | Description |
|---|---|---|
| `id` | uuid | Primary key |
| `opportunity_id` | integer | Affinity opportunity ID |
| `deal_name` | text | Deal name (denormalised for query convenience) |
| `stage_value` | text | The stage the deal transitioned TO |
| `changed_at` | timestamptz | When the transition occurred |
| `exited_at` | timestamptz | When the deal left this stage (null if still in it) |
| `days_in_stage` | integer | How many days the deal spent in this stage |

**Unique constraint**: `(opportunity_id, changed_at, stage_value)` — prevents duplicate entries.

---

### ReportingNz_team_members
The active team roster. Used to populate the Time Tracker user selector and Team Analytics.

| Column | Type | Description |
|---|---|---|
| `id` | uuid | Primary key |
| `name` | text | Full name (must match the name used in time entries) |
| `seniority` | text | e.g. "Partner", "Associate", "Analyst" |
| `hourly_rate` | numeric | Hourly rate in €/hr (used for channel cost calculations) |
| `seniority_multiplier` | numeric | Multiplier applied to hourly rate for cost calculations |
| `is_active` | boolean | Whether to show this person in the Time Tracker |
| `sort_order` | integer | Display order |

**To add a new team member**: Insert a row here with their name, seniority, and rates. They will immediately appear in the Time Tracker.

---

### ReportingNz_orig_channels
The list of origination channels available in the Time Tracker and Channel Performance page.

| Column | Type | Description |
|---|---|---|
| `id` | uuid | Primary key |
| `name` | text | Channel name (must match the `origination_channel` values in deals) |
| `sort_order` | integer | Display order |

---

### ReportingNz_channel_costs
Manual cost inputs for each origination channel (one-off spend, difficulty, and potential ratings).

| Column | Type | Description |
|---|---|---|
| `id` | uuid | Primary key |
| `channel_name` | text | Must match a name in `ReportingNz_orig_channels` |
| `one_off_cost` | numeric | One-off cash spend on this channel (€) |
| `difficulty` | text | Qualitative difficulty rating |
| `potential` | text | Qualitative potential rating |

---

## Views

Views are pre-computed SQL queries that the frontend reads directly. They combine data from multiple tables.

### ReportingNz_adviser_deals
Joins `ReportingNz_advisers` with `ReportingNz_deals` to show which deals came from which adviser. Adds computed columns: `programme_bucket` (whether the adviser is in the formal programme or an untiered connection), `is_ltm` (whether the deal was added in the last 12 months), and `lead_quality`.

### ReportingNz_funnel_analysis
Aggregates stage history into a 6-row summary table — one row per funnel stage — showing how many deals reached that stage, how many didn't advance, conversion rates (stage-to-stage and cumulative), and average days spent in that stage. This is the core data for the Funnel Analysis page.

### ReportingNz_channel_cost_actuals
Joins time entries with team member rates to compute the total time-based cost per origination channel. Multiplies `hrs_actual × hourly_rate × seniority_multiplier` and groups by channel.

### ReportingNz_stage_time_investment
Shows how many hours were invested in each deal at each stage, with a `did_advance` flag indicating whether the deal moved to a higher stage after that investment. Used in the Funnel Analysis "time invested" section.

### ReportingNz_deal_analysis
The most complex view. Joins deals, time entries, and stage history to produce a per-deal analytics row. Used by the Dynamic Analysis page and the AI chat assistant.

Key computed columns:
- `funnel_depth` (1–6): numeric representation of the deepest stage the deal reached
- `total_hrs`: sum of all hours logged against this deal
- `deal_age_days`: days since date_added
- `avg_days_per_stage`: average time spent in each stage
- `stage_transition_count`: how many stage changes the deal has had
- `ever_advanced`: whether the deal moved beyond its initial stage
- `milestone_depth`: 0–6 score based on which milestones have been reached
- `equity_required`, `attractiveness_score`, `ic_stage_rank`: additional deal metrics

---

## Row Level Security

All tables use Supabase RLS (Row Level Security). The current policies are permissive for the MVP:
- `ReportingNz_time_entries`: anon users can read and write (all operations)
- All other tables: anon users can read only; writes require the service role key (only Edge Functions have this)

This means the frontend can read all data but cannot modify deal or adviser data — only time entries.
