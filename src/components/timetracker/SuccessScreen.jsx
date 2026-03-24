export default function SuccessScreen({ userName, weekStart, onReset }) {
  const formatted = weekStart
    ? new Date(weekStart + 'T12:00:00').toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : weekStart

  return (
    <div style={{ maxWidth: 480, margin: '6rem auto', padding: '0 1.5rem', textAlign: 'center' }}>
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'var(--accent-light)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem',
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path
            d="M5 13l4 4L19 7"
            stroke="var(--accent)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <h2 style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: '1.5rem', marginBottom: '0.5rem' }}>
        Time logged
      </h2>
      <p style={{ color: 'var(--muted)', fontSize: '0.9375rem', marginBottom: '2rem' }}>
        {userName} · {formatted}
      </p>

      <button
        onClick={onReset}
        style={{
          padding: '0.5rem 1.25rem',
          fontSize: '0.875rem',
          fontFamily: 'var(--font-sans)',
          background: 'white',
          border: '1px solid var(--rule)',
          borderRadius: 6,
          cursor: 'pointer',
          color: 'var(--ink)',
        }}
      >
        Log for another person
      </button>
    </div>
  )
}
