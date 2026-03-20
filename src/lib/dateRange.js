// Shared helper — applies the global date range filter to a Supabase query.
// Used by Proprietary, Channel Performance, Adviser Coverage, and Funnel pages.
export function applyDateRange(query, { dateRange, dateFrom, dateTo }) {
  if (dateRange === 'ltm') {
    const d = new Date()
    d.setFullYear(d.getFullYear() - 1)
    return query.gte('date_added', d.toISOString())
  }
  if (dateRange === 'ytd') {
    const d = new Date()
    return query.gte('date_added', `${d.getFullYear()}-01-01`)
  }
  if (dateRange === 'custom') {
    if (dateFrom) query = query.gte('date_added', dateFrom)
    if (dateTo)   query = query.lte('date_added', dateTo + 'T23:59:59')
    return query
  }
  return query // 'all' — no date filter
}
