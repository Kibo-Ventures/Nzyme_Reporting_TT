import { useFilters } from '../../hooks/useFilters'
import { useKamOptions, useStageOptions, useChannelOptions, useDataFreshness } from '../../hooks/useFilterOptions'
import MultiSelect from '../ui/MultiSelect'

const DATE_PILLS = [
  { key: 'ltm', label: 'LTM' },
  { key: 'ytd', label: 'YTD' },
  { key: 'all', label: 'All' },
  { key: 'custom', label: 'Custom' },
]

export default function FilterBar() {
  const { filters, setFilter } = useFilters()
  const kamQuery = useKamOptions()
  const stageQuery = useStageOptions()
  const channelQuery = useChannelOptions()
  const freshnessQuery = useDataFreshness()

  const kamOptions = kamQuery.data ?? []
  const stageOptions = stageQuery.data ?? []
  const channelOptions = channelQuery.data ?? []
  const isLoading = kamQuery.isLoading || stageQuery.isLoading || channelQuery.isLoading

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        flexWrap: 'wrap',
        padding: '0.625rem 1.25rem',
        borderBottom: '1px solid var(--rule)',
        background: 'var(--paper)',
        position: 'sticky',
        top: 0,
        zIndex: 20,
      }}
    >
      {/* Date range pills */}
      <div style={{ display: 'flex', gap: '2px', background: 'var(--rule)', borderRadius: '7px', padding: '2px' }}>
        {DATE_PILLS.map(pill => (
          <button
            key={pill.key}
            onClick={() => setFilter({ dateRange: pill.key })}
            style={{
              padding: '0.25rem 0.625rem',
              fontSize: '0.8125rem',
              fontFamily: 'var(--font-sans)',
              fontWeight: filters.dateRange === pill.key ? 600 : 400,
              color: filters.dateRange === pill.key ? 'white' : 'var(--ink)',
              background: filters.dateRange === pill.key ? 'var(--accent)' : 'transparent',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
          >
            {pill.label}
          </button>
        ))}
      </div>

      {/* Custom date inputs */}
      {filters.dateRange === 'custom' && (
        <>
          <input
            type="date"
            value={filters.dateFrom ?? ''}
            onChange={e => setFilter({ dateFrom: e.target.value || null })}
            style={{
              padding: '0.3rem 0.5rem',
              fontSize: '0.8125rem',
              fontFamily: 'var(--font-sans)',
              border: '1px solid var(--rule)',
              borderRadius: '6px',
              background: 'white',
              color: 'var(--ink)',
            }}
          />
          <span style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>to</span>
          <input
            type="date"
            value={filters.dateTo ?? ''}
            onChange={e => setFilter({ dateTo: e.target.value || null })}
            style={{
              padding: '0.3rem 0.5rem',
              fontSize: '0.8125rem',
              fontFamily: 'var(--font-sans)',
              border: '1px solid var(--rule)',
              borderRadius: '6px',
              background: 'white',
              color: 'var(--ink)',
            }}
          />
        </>
      )}

      {/* Divider */}
      <div style={{ width: '1px', height: '20px', background: 'var(--rule)', flexShrink: 0 }} />

      {/* Dropdowns */}
      {isLoading ? (
        <span style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>Loading filters…</span>
      ) : (
        <>
          <MultiSelect
            options={kamOptions}
            value={filters.kam}
            onChange={val => setFilter({ kam: val })}
            placeholder="KAM"
          />
          <MultiSelect
            options={stageOptions}
            value={filters.stage}
            onChange={val => setFilter({ stage: val })}
            placeholder="Stage"
          />
          <select
            value={filters.channel}
            onChange={e => setFilter({ channel: e.target.value })}
            style={{
              padding: '0.375rem 0.75rem',
              fontSize: '0.8125rem',
              fontFamily: 'var(--font-sans)',
              border: '1px solid var(--rule)',
              borderRadius: '6px',
              background: 'white',
              color: 'var(--ink)',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Channels</option>
            {channelOptions.map(ch => (
              <option key={ch} value={ch}>{ch}</option>
            ))}
          </select>
        </>
      )}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Data freshness */}
      {freshnessQuery.data && (
        <span style={{ fontSize: '0.75rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
          Data as of: {freshnessQuery.data}
        </span>
      )}
    </div>
  )
}
