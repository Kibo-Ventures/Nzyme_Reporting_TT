// Stage and tier colour badges

const STAGE_STYLES = {
  'Portfolio':                                        { bg: '#6b21a8', color: 'white' },
  'DD phase':                                         { bg: '#1a3a2a', color: 'white' },
  'Working on a deal (significant effort)':           { bg: '#1d4ed8', color: 'white' },
  'Under analysis (team assigned, moderate effort)':  { bg: '#ea580c', color: 'white' },
  'Being explored (meetings only)':                   { bg: '#9ca3af', color: 'white' },
  'To be processed':                                  { bg: '#e5e7eb', color: '#374151' },
  'Add-ons (relevant now)':                           { bg: '#d1d5db', color: '#374151' },
}

const STAGE_SHORT = {
  'Portfolio':                                        'Portfolio',
  'DD phase':                                         'DD Phase',
  'Working on a deal (significant effort)':           'Working',
  'Under analysis (team assigned, moderate effort)':  'Under Analysis',
  'Being explored (meetings only)':                   'Being Explored',
  'To be processed':                                  'To Process',
}

const TIER_STYLES = {
  1: { bg: '#fef9c3', color: '#854d0e', label: 'Gold' },
  2: { bg: '#f3f4f6', color: '#4b5563', label: 'Silver' },
  3: { bg: '#ffedd5', color: '#9a3412', label: 'Bronze' },
}

export function StageBadge({ stage, short = false }) {
  const s = STAGE_STYLES[stage] ?? { bg: '#d1d5db', color: '#374151' }
  const label = short ? (STAGE_SHORT[stage] ?? stage) : (STAGE_SHORT[stage] ?? stage)
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 4,
        fontSize: '0.7rem',
        fontWeight: 600,
        background: s.bg,
        color: s.color,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  )
}

export function TierBadge({ tier }) {
  const t = TIER_STYLES[tier] ?? { bg: '#e5e7eb', color: '#374151', label: `Tier ${tier}` }
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 4,
        fontSize: '0.7rem',
        fontWeight: 600,
        background: t.bg,
        color: t.color,
        whiteSpace: 'nowrap',
      }}
    >
      {t.label}
    </span>
  )
}
