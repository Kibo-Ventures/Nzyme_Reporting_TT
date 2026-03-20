import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useFilters } from './useFilters'
import { applyDateRange } from '../lib/dateRange'

// Main query: all proprietary deals (not via Adviser / Broker), with global filters applied.
export function useProprietaryDeals() {
  const { filters } = useFilters()
  const { dateRange, dateFrom, dateTo, kam, stage, channel } = filters

  return useQuery({
    queryKey: ['proprietary-deals', dateRange, dateFrom, dateTo, kam, stage, channel],
    queryFn: async () => {
      let query = supabase
        .from('ReportingNz_deals')
        .select(
          'name, stage, deal_captain, origination_channel, attractiveness, attractiveness_score, is_quality_lead, date_added'
        )
        .neq('origination_channel', 'Adviser / Broker')
        .not('origination_channel', 'is', null)
        .order('date_added', { ascending: false })

      query = applyDateRange(query, { dateRange, dateFrom, dateTo })
      if (kam.length > 0)     query = query.in('deal_captain', kam)
      if (stage.length > 0)   query = query.in('stage', stage)
      if (channel !== 'all')  query = query.eq('origination_channel', channel)

      const { data, error } = await query
      if (error) throw error
      return data || []
    },
  })
}

// Count of ALL deals in the same date range (for % proprietary KPI).
// Does not apply KAM/stage/channel filters so the denominator is always total dealflow.
export function useTotalDealsCount() {
  const { filters } = useFilters()
  const { dateRange, dateFrom, dateTo } = filters

  return useQuery({
    queryKey: ['total-deals-count', dateRange, dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase
        .from('ReportingNz_deals')
        .select('*', { count: 'exact', head: true })

      query = applyDateRange(query, { dateRange, dateFrom, dateTo })

      const { count, error } = await query
      if (error) throw error
      return count ?? 0
    },
  })
}
