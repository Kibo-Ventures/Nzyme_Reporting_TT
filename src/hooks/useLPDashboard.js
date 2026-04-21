import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useLPDashboard() {
  return useQuery({
    queryKey: ['lp-dashboard'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ReportingNZ_LP_dashboard')
        .select(
          'interaction_date, interaction_type, partner_names, lp_name, investor_type, engagement_effort, overall_status, portugal_status, germany_status'
        )
        .order('interaction_date', { ascending: true })
      if (error) throw error
      return data || []
    },
  })
}
