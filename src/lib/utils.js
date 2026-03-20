export function shortName(fullName) {
  if (!fullName) return ''
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 1) return parts[0]
  return `${parts[0]} ${parts[parts.length - 1][0]}.`
}

export function formatCurrency(value) {
  if (value == null || value === '') return '—'
  const num = Number(value)
  if (isNaN(num)) return '—'
  return `€${(num * 1000).toLocaleString('en-GB', { maximumFractionDigits: 0 })}k`
}
