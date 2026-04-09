import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { applyDateRange } from '../lib/dateRange'

// Aggregated funnel view — 6 rows, one per stage.
// No date filter: this is an all-time lifecycle view.
export function useFunnelStages() {
  return useQuery({
    queryKey: ['funnel-stages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ReportingNz_funnel_analysis')
        .select('stage_value, stage_rank, reached_stage, median_days_in_stage, cumulative_conversion_pct, stage_to_stage_pct')
        .order('stage_rank', { ascending: true })
      if (error) throw error
      return data || []
    },
    staleTime: 10 * 60 * 1000,
  })
}

// Raw days_in_stage values for a given stage — used to build the histogram.
export function useStageHistogram(stageValue) {
  return useQuery({
    queryKey: ['stage-histogram', stageValue],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ReportingNz_deal_stage_history')
        .select('days_in_stage')
        .eq('stage_value', stageValue)
        .not('days_in_stage', 'is', null)
      if (error) throw error
      return (data || []).map((r) => r.days_in_stage)
    },
    enabled: !!stageValue,
    staleTime: 10 * 60 * 1000,
  })
}

// Adviser × stage breakdown — from adviser_deals view, grouped client-side.
export function useAdviserStageBreakdown() {
  return useQuery({
    queryKey: ['adviser-stage-breakdown'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ReportingNz_adviser_deals')
        .select('attributed_adviser, stage, programme_bucket')
        .neq('programme_bucket', 'No Adviser Data')
      if (error) throw error
      return data || []
    },
    staleTime: 10 * 60 * 1000,
  })
}

// Hours invested per deal × stage from the SQL view.
export function useStageTimeInvestment() {
  return useQuery({
    queryKey: ['stage-time-investment'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ReportingNz_stage_time_investment')
        .select('deal_name, stage_value, total_hours, did_advance')
      if (error) throw error
      return data || []
    },
    staleTime: 5 * 60 * 1000,
  })
}

// Deals that were Lost or Discarded — identified by their stage value in Affinity.
// The Workload field is set to 'Lost' or 'Discarded' directly in the CRM.
export function useLostDiscardedDeals() {
  return useQuery({
    queryKey: ['lost-discarded-deals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ReportingNz_deals')
        .select('name, stage')
        .in('stage', ['Lost', 'Discarded'])
      if (error) throw error
      return data || []
    },
    staleTime: 10 * 60 * 1000,
  })
}

// Stage history rows for a supplied set of deal names — used to compute avg days in stage.
export function useLostDiscardedHistory(dealNames) {
  return useQuery({
    queryKey: ['lost-discarded-history', dealNames?.length ?? 0],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ReportingNz_deal_stage_history')
        .select('deal_name, stage_value, days_in_stage')
        .in('deal_name', dealNames)
        .not('days_in_stage', 'is', null)
      if (error) throw error
      return data || []
    },
    enabled: Array.isArray(dealNames) && dealNames.length > 0,
    staleTime: 10 * 60 * 1000,
  })
}

// Raw deals for funnel computation — date-filterable.
export function useFunnelDeals(filters = {}) {
  const { dateRange, dateFrom, dateTo } = filters
  return useQuery({
    queryKey: ['funnel-deals', dateRange, dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase
        .from('ReportingNz_deals')
        .select('name, stage, deal_captain, origination_channel, date_added')
      query = applyDateRange(query, filters)
      const { data, error } = await query
      if (error) throw error
      return data || []
    },
    staleTime: 5 * 60 * 1000,
  })
}

// Deals that actively entered each stage during the selected period.
// Filters ReportingNz_deal_stage_history by changed_at (not date_added),
// so deals like Civislend that were sourced earlier but advanced in-period are included.
export function usePipelineThroughput(filters = {}) {
  const { dateRange, dateFrom, dateTo } = filters
  return useQuery({
    queryKey: ['pipeline-throughput', dateRange, dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase
        .from('ReportingNz_deal_stage_history')
        .select('stage_value, deal_name, changed_at')

      if (dateRange === 'ltm') {
        const d = new Date()
        d.setFullYear(d.getFullYear() - 1)
        query = query.gte('changed_at', d.toISOString())
      } else if (dateRange === 'ytd') {
        const d = new Date()
        query = query.gte('changed_at', `${d.getFullYear()}-01-01`)
      } else if (dateRange === 'custom') {
        if (dateFrom) query = query.gte('changed_at', dateFrom)
        if (dateTo)   query = query.lte('changed_at', dateTo + 'T23:59:59')
      }

      const { data, error } = await query
      if (error) throw error
      return data || []
    },
    staleTime: 5 * 60 * 1000,
  })
}

// Count of deals currently sitting in Portfolio stage (is_active = true).
// Used for the Portfolio KPI — excludes companies that passed through but exited.
export function useCurrentPortfolioCount() {
  return useQuery({
    queryKey: ['current-portfolio-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('ReportingNz_deals')
        .select('*', { count: 'exact', head: true })
        .eq('stage', 'Portfolio')
        .eq('is_active', true)
      if (error) throw error
      return count ?? 0
    },
    staleTime: 10 * 60 * 1000,
  })
}
