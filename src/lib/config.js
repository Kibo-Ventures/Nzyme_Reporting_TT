export const PROPRIETARY_DEAL_GOAL_ANNUAL = 36   // 3 deals / month

/**
 * Returns the pro-rated proprietary deal goal for the active date filter.
 * - ltm / all → full annual goal
 * - ytd       → 3 × months elapsed (incl. current month)
 * - custom    → pro-rated by calendar days; falls back to annual if dates missing
 */
export function proprietaryGoalForRange({ dateRange, dateFrom, dateTo }) {
  const monthly = PROPRIETARY_DEAL_GOAL_ANNUAL / 12  // 3

  if (dateRange === 'ytd') {
    const monthsElapsed = new Date().getMonth() + 1   // 1–12
    return Math.round(monthly * monthsElapsed)
  }

  if (dateRange === 'custom' && dateFrom && dateTo) {
    const days = (new Date(dateTo) - new Date(dateFrom)) / (1000 * 60 * 60 * 24) + 1
    return Math.max(1, Math.round((days / 365) * PROPRIETARY_DEAL_GOAL_ANNUAL))
  }

  return PROPRIETARY_DEAL_GOAL_ANNUAL   // ltm, all, custom without dates
}
