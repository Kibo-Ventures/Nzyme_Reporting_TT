import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import FilterBar from './FilterBar'

export default function AppShell() {
  const { pathname } = useLocation()
  const showFilters = pathname !== '/timetracker'

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--paper)' }}>
      <Sidebar />
      <main className="flex-1 overflow-y-auto flex flex-col">
        {showFilters && <FilterBar />}
        <Outlet />
      </main>
    </div>
  )
}
