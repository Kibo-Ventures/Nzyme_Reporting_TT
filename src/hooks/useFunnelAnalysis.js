import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

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

// Raw deals for pivot breakdowns on the funnel page.
export function useFunnelDeals() {
  return useQuery({
    queryKey: ['funnel-deals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ReportingNz_deals')
        .select('name, stage, deal_captain, origination_channel')
      if (error) throw error
      return data || []
    },
    staleTime: 5 * 60 * 1000,
  })
}
