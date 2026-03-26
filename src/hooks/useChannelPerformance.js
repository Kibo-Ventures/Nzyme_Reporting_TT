import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useFilters } from './useFilters'
import { applyDateRange } from '../lib/dateRange'

// Deals with channels — date range, Deal Captain, stage, and channel filters applied.
export function useChannelDeals() {
  const { filters } = useFilters()
  const { dateRange, dateFrom, dateTo, dealCaptain, stage, channel } = filters

  return useQuery({
    queryKey: ['channel-deals', dateRange, dateFrom, dateTo, dealCaptain, stage, channel],
    queryFn: async () => {
      let query = supabase
        .from('ReportingNz_deals')
        .select('name, origination_channel, attractiveness_score, is_quality_lead, is_active, date_added, activity_description, stage, milestones')
        .order('date_added', { ascending: false })

      query = applyDateRange(query, { dateRange, dateFrom, dateTo })
      if (dealCaptain.length > 0) {
        query = query.or(dealCaptain.map(n => `deal_captain.ilike.%${n}%`).join(','))
      }
      if (stage.length > 0)  query = query.in('stage', stage)
      if (channel !== 'all') query = query.eq('origination_channel', channel)

      const { data, error } = await query
      if (error) throw error
      return data || []
    },
  })
}

// Manual cost/meta inputs per channel.
export function useChannelCosts() {
  return useQuery({
    queryKey: ['channel-costs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ReportingNz_channel_costs')
        .select('channel_name, one_off_cost, difficulty, potential')
      if (error) throw error
      return data || []
    },
    staleTime: 10 * 60 * 1000,
  })
}

// Actual cost view computed from time entries × hourly rates.
export function useChannelCostActuals() {
  return useQuery({
    queryKey: ['channel-cost-actuals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ReportingNz_channel_cost_actuals')
        .select('channel, total_cost_eur, total_hours')
      if (error) throw error
      return data || []
    },
    staleTime: 5 * 60 * 1000,
  })
}

// Time entries logged directly to origination channels (category_type = 'orig').
export function useChannelOrigEntries() {
  return useQuery({
    queryKey: ['channel-orig-entries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ReportingNz_time_entries')
        .select('category_key, week_start, hrs_calculated')
        .eq('category_type', 'orig')
      if (error) throw error
      return data || []
    },
    staleTime: 5 * 60 * 1000,
  })
}
