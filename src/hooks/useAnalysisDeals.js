import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useFilters } from './useFilters';
import { applyDateRange } from '../lib/dateRange';

export function useAnalysisDeals() {
  const { filters } = useFilters();
  const { dateRange, dateFrom, dateTo, dealCaptain, channel } = filters;

  return useQuery({
    queryKey: ['analysis-deals', dateRange, dateFrom, dateTo, dealCaptain, channel],
    queryFn: async () => {
      let query = supabase
        .from('ReportingNz_deal_analysis')
        .select('*');

      query = applyDateRange(query, { dateRange, dateFrom, dateTo });

      if (dealCaptain && dealCaptain.length > 0) {
        const captainFilters = dealCaptain.map(c => `captain.ilike.%${c}%`).join(',');
        query = query.or(captainFilters);
      }

      if (channel && channel !== 'all') {
        query = query.ilike('channel_label', `%${channel}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}
