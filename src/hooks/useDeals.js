import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useFilters } from './useFilters'

// Board Pipeline: always queries is_active=true; does NOT apply date range
// (pipeline is a current-state view, not a historical one).
// KAM and Stage filters from the global bar do apply.
export function useBoardPipelineDeals() {
  const { filters } = useFilters()
  const { kam, stage } = filters

  return useQuery({
    queryKey: ['board-pipeline', kam, stage],
    queryFn: async () => {
      let query = supabase
        .from('ReportingNz_deals')
        .select(
          'name, stage, deal_captain, activity_description, revenues, ebitda, ic_stage, milestones, attractiveness, date_added, origination_channel, team_involved'
        )
        .eq('is_active', true)
        .order('date_added', { ascending: false })

      if (kam.length > 0)   query = query.in('deal_captain', kam)
      if (stage.length > 0) query = query.in('stage', stage)

      const { data, error } = await query
      if (error) throw error
      return data || []
    },
  })
}
