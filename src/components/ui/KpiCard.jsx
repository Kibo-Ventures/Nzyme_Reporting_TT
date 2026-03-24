export default function KpiCard({ title, value, subtitle }) {
  return (
    <div
      className="rounded-xl border p-4"
      style={{
        borderColor: 'var(--rule)',
        background: 'var(--surface)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        transition: 'box-shadow 0.2s ease',
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)' }}
    >
      <div className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
        {title}
      </div>
      <div className="mt-1 text-2xl font-semibold" style={{ fontFamily: 'var(--font-mono)' }}>
        {value}
      </div>
      {subtitle && (
        <div className="mt-0.5 text-xs" style={{ color: 'var(--muted)' }}>
          {subtitle}
        </div>
      )}
    </div>
  )
}
