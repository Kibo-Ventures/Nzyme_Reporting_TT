# Edge Functions — Plain English Reference

Edge Functions are small backend scripts that run in Supabase's serverless environment (using Deno/TypeScript). They handle all the data-fetching from external APIs and scheduled jobs. The frontend never calls external APIs directly — everything goes through these functions.

---

## How to manage Edge Functions

Go to: **Supabase Dashboard → Edge Functions**

From there you can:
- See all deployed functions and their last invocation time
- Click "Invoke" to trigger a function manually
- Check logs to debug any errors
- Deploy new versions (requires Supabase CLI — see QUICKSTART.md)

---

## affinity-sync

**What it does**: Pulls all deals from the Affinity CRM "Opportunities" list and upserts them into the `ReportingNz_deals` table. This is the primary data sync — it is the reason the reporting always reflects current Affinity data.

**When it runs**: Daily at 06:00 (UTC), triggered automatically by a pg_cron job in Supabase.

**What it touches**: `ReportingNz_deals` table only. It upserts on `affinity_id`, meaning it will update existing deals and create new ones, but never delete. Inactive/discarded deals remain in the database with `is_active = false`.

**Secrets required**:
- `AFFINITY_API_KEY` — the Affinity V2 API Bearer token
- `SUPABASE_SERVICE_ROLE_KEY` — auto-available, no setup needed

**Affinity configuration**:
- List ID: `184474` (the Opportunities list)
- View ID: `2059987` (the saved view used for the sync — only deals in this view are synced)

**Fields synced from Affinity**: name, stage (from "Workload" field), date_added, deal_captain, team_involved, origination_channel, IC stage, milestones, attractiveness, financials (revenues, EBITDA, growth, equity required), descriptions, adviser info, discarded/lost reasons.

**If it breaks**: Check the Edge Function logs in Supabase. Common causes are Affinity API key expiry or rate limiting. The function can also be triggered manually from the Supabase dashboard.

---

## adviser-sync

**What it does**: Pulls all entries from the Affinity "Adviser Coverage" list and upserts them into the `ReportingNz_advisers` table.

**When it runs**: Should be run manually or on a separate schedule — it is not currently tied to a daily cron. Recommended to run weekly.

**What it touches**: `ReportingNz_advisers` table. Upserts on `affinity_org_id`.

**Secrets required**:
- `AFFINITY_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

**Affinity configuration**:
- List ID: `317314` (the Adviser Coverage list)

**Fields synced**: adviser name, website, tier (parsed from "Tier" dropdown), firm type, KAM assignment, last email date, last meeting date, NDA signed status, location.

**Note**: This function uses a two-step approach — it first fetches all field IDs from Affinity (because list-specific fields require explicit field IDs), then fetches all entries with those field IDs. This is required by the Affinity V2 API for non-standard fields.

---

## stage-history-sync

**What it does**: Pulls stage transition history for deals from Affinity's field-value-changes API and stores it in `ReportingNz_deal_stage_history`. This is what powers the Funnel Analysis page — specifically the "avg days in stage" and stage transition counts.

**When it runs**: Should be run on a schedule (recommended: daily after affinity-sync). Currently needs a cron job set up.

**What it touches**: `ReportingNz_deal_stage_history` table. Upserts on `(opportunity_id, changed_at, stage_value)`.

**Secrets required**:
- `AFFINITY_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

**Affinity configuration**:
- Field ID: `3481186` (the "Deal Stage" / "Workload" field in Affinity — this is the field whose changes are tracked)

**What it stores per row**: the deal's Affinity ID, deal name, the stage it transitioned to, and the timestamp of the transition. The `days_in_stage` and `exited_at` columns are computed from this data.

---

## notion-sync

**What it does**: Pushes all deals from `ReportingNz_deals` to a Notion database. Creates new Notion pages for new deals, updates existing pages if the Supabase data is newer.

**When it runs**: Daily at 07:00 (UTC) — after affinity-sync has completed.

**What it touches**: A Notion database (read-only from Supabase's perspective — it only writes to Notion). Does not modify any Supabase tables.

**Secrets required**:
- `NOTION_API_KEY` — a Notion internal integration token
- `NOTION_DATABASE_ID` — currently `32f83e67e2e780cbac24ec11ba90c35f`
- `SUPABASE_ANON_KEY` — auto-available

**Batching**: Processes 50 deals at a time to avoid Supabase Edge Function timeouts. If there are more than 50 deals, you can call the function repeatedly with an `offset` parameter in the request body: `{"offset": 50}`, `{"offset": 100}`, etc.

**If you need to resync everything**: Trigger the function multiple times with increasing offset values, or clear the Notion database first and let it recreate all pages.

---

## ai-chat

**What it does**: Powers the AI assistant panel visible on all reporting pages. Receives a message history from the frontend and returns an AI-generated response that can query the live Supabase database.

**When it runs**: On demand — triggered by the frontend whenever a user sends a message in the chat panel.

**What it touches**: Reads from `ReportingNz_deal_analysis`, `ReportingNz_deals`, `ReportingNz_deal_stage_history`, `ReportingNz_time_entries`, `ReportingNz_adviser_deals`, and `ReportingNz_chat_benchmarks` (read-only). Never writes.

**Secrets required**:
- `OPENAI_API_KEY` — uses `gpt-4o-mini`
- `SUPABASE_SERVICE_ROLE_KEY`

**How it works**: Uses OpenAI's function-calling (tool use) feature. The AI is given 8 database query tools it can call to look up deals, hours, stage history, adviser info, and team capacity. It calls the relevant tools, gets the data back, and synthesises a plain-English response. Runs a maximum of 2 OpenAI API calls per user message (one to decide which tools to call, one to synthesise the results).

**Customising the AI's behaviour**: The system prompt is defined in the `buildSystemPrompt()` function in `supabase/functions/ai-chat/index.ts`. This controls the AI's persona, tone, formatting rules, and what it is allowed/not allowed to do.

---

## Deploying changes to Edge Functions

If you modify any edge function code, you need to redeploy it. This requires the Supabase CLI:

```bash
# Install CLI (once)
npm install -g supabase

# Login
supabase login

# Deploy a specific function
supabase functions deploy affinity-sync --project-ref yphbrpbwpakjduhmoimw

# Deploy all functions
supabase functions deploy --project-ref yphbrpbwpakjduhmoimw
```

Alternatively, you can copy-paste the function code directly into the Supabase Dashboard → Edge Functions → Edit (available for simple edits).
