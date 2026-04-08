import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useDealCaptainOptions() {
  return useQuery({
    queryKey: ['dealCaptainOptions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ReportingNz_deals')
        .select('deal_captain')
        .not('deal_captain', 'is', null)
      if (error) throw error
      // Split multi-name strings (e.g. "Alice, Bob") into individual names
      const names = data.flatMap(r =>
        (r.deal_captain || '').split(/[,;]/).map(s => s.trim()).filter(Boolean)
      )
      const unique = [...new Set(names)]
      return unique.sort((a, b) => a.localeCompare(b))
    },
  })
}

export function useStageOptions() {
  return useQuery({
    queryKey: ['stageOptions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ReportingNz_deals')
        .select('stage')
        .not('stage', 'is', null)
      if (error) throw error
      const unique = [...new Set(data.map(r => r.stage).filter(Boolean))]
      return unique.sort((a, b) => a.localeCompare(b))
    },
  })
}

export function useChannelOptions() {
  return useQuery({
    queryKey: ['channelOptions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ReportingNz_orig_channels')
        .select('name, sort_order')
        .order('sort_order', { ascending: true })
      if (error) throw error
      return (data ?? []).map(r => r.name)
    },
  })
}

export function useDataFreshness() {
  return useQuery({
    queryKey: ['dataFreshness'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ReportingNz_deals')
        .select('last_synced_at')
        .not('last_synced_at', 'is', null)
        .order('last_synced_at', { ascending: false })
        .limit(1)
      if (error) throw error
      if (!data || data.length === 0) return null
      const dt = new Date(data[0].last_synced_at)
      const datePart = dt.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
      const timePart = dt.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
      return `${datePart}, ${timePart}`
    },
  })
}
