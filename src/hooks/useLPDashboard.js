import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

const PAGE_SIZE = 1000

export function useLPDashboard() {
  return useQuery({
    queryKey: ['lp-dashboard'],
    queryFn: async () => {
      const all = []
      let from = 0

      while (true) {
        const { data, error } = await supabase
          .from('ReportingNZ_LP_dashboard')
          .select(
            'interaction_date, interaction_type, partner_names, lp_name, investor_type, engagement_effort, overall_status, portugal_status, germany_status'
          )
          .order('interaction_date', { ascending: true })
          .range(from, from + PAGE_SIZE - 1)

        if (error) throw error
        if (!data || data.length === 0) break
        all.push(...data)
        if (data.length < PAGE_SIZE) break
        from += PAGE_SIZE
      }

      return all
    },
  })
}
