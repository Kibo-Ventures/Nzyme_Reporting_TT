import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useFilters } from './useFilters'
import { applyDateRange } from '../lib/dateRange'

// All adviser-attributed deals from the pre-joined view.
// Global filters (date, KAM, stage) are applied server-side.
// programme_bucket filtering is done client-side (toggle).
export function useAdviserDeals() {
  const { filters } = useFilters()
  const { dateRange, dateFrom, dateTo, kam, stage } = filters

  return useQuery({
    queryKey: ['adviser-deals', dateRange, dateFrom, dateTo, kam, stage],
    queryFn: async () => {
      let query = supabase
        .from('ReportingNz_adviser_deals')
        .select(
          'deal_id, deal_name, date_added, attractiveness, attractiveness_score, is_quality_lead, ' +
          'introducer, origination_channel, stage, activity_description, ' +
          'adviser_org_id, adviser_name, tier, tier_label, firm_type, ' +
          'kam, attributed_adviser, attributed_kam, programme_bucket, is_ltm, lead_quality'
        )
        .order('date_added', { ascending: false })

      query = applyDateRange(query, { dateRange, dateFrom, dateTo })
      if (kam.length > 0)   query = query.in('kam', kam)
      if (stage.length > 0) query = query.in('stage', stage)

      const { data, error } = await query
      if (error) throw error
      return data || []
    },
  })
}
