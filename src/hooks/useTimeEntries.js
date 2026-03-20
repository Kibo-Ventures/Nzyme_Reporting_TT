import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

const ACTIVE_STAGES = [
  'Working on a deal (significant effort)',
  'Under analysis (team assigned, moderate effort)',
  'DD phase',
]

export function getMondayISO() {
  const d = new Date()
  const day = d.getDay() // 0=Sun, 1=Mon, ..., 6=Sat
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

export function useTrackerData() {
  const dealsQ = useQuery({
    queryKey: ['tracker-deals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ReportingNz_deals')
        .select('name, stage')
        .order('name', { ascending: true })
      if (error) throw error
      return data
    },
    staleTime: 10 * 60 * 1000,
  })

  const membersQ = useQuery({
    queryKey: ['tracker-members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ReportingNz_team_members')
        .select('name, sort_order')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
      if (error) throw error
      return data
    },
    staleTime: 10 * 60 * 1000,
  })

  const channelsQ = useQuery({
    queryKey: ['tracker-channels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ReportingNz_orig_channels')
        .select('name, sort_order')
        .order('sort_order', { ascending: true })
      if (error) throw error
      return data
    },
    staleTime: 10 * 60 * 1000,
  })

  const deals = dealsQ.data ?? []

  return {
    isLoading: dealsQ.isLoading || membersQ.isLoading || channelsQ.isLoading,
    error: dealsQ.error || membersQ.error || channelsQ.error,
    dealflow: deals.filter(d => ACTIVE_STAGES.includes(d.stage)),
    longtail: deals.filter(d => d.stage === 'Being explored (meetings only)'),
    portfolio: deals.filter(d => d.stage === 'Portfolio'),
    origChannels: channelsQ.data ?? [],
    teamMembers: membersQ.data ?? [],
  }
}

export function useUserEntries(userName, weekStart) {
  return useQuery({
    queryKey: ['user-entries', userName, weekStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ReportingNz_time_entries')
        .select('category_key, category_type, pct_expected, hrs_actual')
        .eq('user_name', userName)
        .eq('week_start', weekStart)
      if (error) throw error
      return data
    },
    enabled: !!userName && !!weekStart,
  })
}
