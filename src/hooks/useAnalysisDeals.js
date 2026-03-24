import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useFilters } from './useFilters';

export function useAnalysisDeals() {
  const { dealCaptain, channel } = useFilters();

  return useQuery({
    queryKey: ['analysis-deals', dealCaptain, channel],
    queryFn: async () => {
      let query = supabase
        .from('ReportingNz_deal_analysis')
        .select('*');

      if (dealCaptain && dealCaptain.length > 0) {
        const captainFilters = dealCaptain.map(c => `captain.ilike.%${c}%`).join(',');
        query = query.or(captainFilters);
      }

      if (channel) {
        query = query.ilike('channel', `%${channel}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}
