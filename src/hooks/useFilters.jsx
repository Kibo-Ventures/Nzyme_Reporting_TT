import { createContext, useContext, useState } from 'react'

const defaultFilters = {
  dateRange: 'ltm',
  dateFrom: null,
  dateTo: null,
  kam: 'all',
  stage: 'all',
  channel: 'all',
}

const FilterContext = createContext(null)

export function FilterProvider({ children }) {
  const [filters, setFilters] = useState(defaultFilters)

  function setFilter(patch) {
    setFilters(prev => ({ ...prev, ...patch }))
  }

  function resetFilters() {
    setFilters(defaultFilters)
  }

  return (
    <FilterContext.Provider value={{ filters, setFilter, resetFilters }}>
      {children}
    </FilterContext.Provider>
  )
}

export function useFilters() {
  const ctx = useContext(FilterContext)
  if (!ctx) throw new Error('useFilters must be used inside FilterProvider')
  return ctx
}
