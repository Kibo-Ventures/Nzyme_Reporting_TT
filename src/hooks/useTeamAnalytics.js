import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { getMondayISO } from './useTimeEntries'

export function normalizeStage(s) {
  if (!s) return 'Working on Deal'
  const l = s.toLowerCase()
  if (l.includes('dd')) return 'DD Phase'
  if (l.includes('analysis') || l.includes('analys')) return 'Under Analysis'
  return 'Working on Deal'
}

export function useDealStageMap() {
  return useQuery({
    queryKey: ['deal-stage-map'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ReportingNz_deals')
        .select('name, stage')
      if (error) throw error
      const map = {}
      for (const d of (data || [])) {
        map[d.name] = normalizeStage(d.stage)
      }
      return map
    },
    staleTime: 10 * 60 * 1000,
  })
}

export function useTimeframeEntries(timeframe) {
  return useQuery({
    queryKey: ['team-timeframe-entries', timeframe],
    queryFn: async () => {
      let query = supabase
        .from('ReportingNz_time_entries')
        .select('user_name, week_start, category_key, category_type, pct_expected, hrs_actual')

      if (timeframe === 'week') {
        query = query.eq('week_start', getMondayISO())
      } else {
        const now = new Date()
        const yr = now.getFullYear()
        const mo = String(now.getMonth() + 1).padStart(2, '0')
        const lastDay = new Date(yr, now.getMonth() + 1, 0).getDate()
        query = query
          .gte('week_start', `${yr}-${mo}-01`)
          .lte('week_start', `${yr}-${mo}-${String(lastDay).padStart(2, '0')}`)
      }

      const { data, error } = await query
      if (error) throw error
      return data || []
    },
  })
}

export function useLifetimeHoursEntries() {
  return useQuery({
    queryKey: ['lifetime-hours-entries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ReportingNz_time_entries')
        .select('user_name, category_key, category_type, hrs_actual')
        .in('category_type', ['deal', 'longtail'])
        .gt('hrs_actual', 0)
      if (error) throw error
      return data || []
    },
    staleTime: 5 * 60 * 1000,
  })
}
