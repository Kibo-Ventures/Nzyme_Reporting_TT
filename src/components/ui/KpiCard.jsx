export default function KpiCard({ title, value, subtitle }) {
  return (
    <div
      className="rounded-lg border p-4"
      style={{ borderColor: 'var(--rule)', background: 'white' }}
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
