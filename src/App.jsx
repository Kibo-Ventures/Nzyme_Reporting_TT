import { Routes, Route, Navigate } from 'react-router-dom'
import { FilterProvider } from './hooks/useFilters'
import AppShell from './components/layout/AppShell'
import TimeTracker from './pages/TimeTracker'
import BoardPipeline from './pages/BoardPipeline'
import ProprietaryDealflow from './pages/ProprietaryDealflow'
import ChannelPerformance from './pages/ChannelPerformance'
import AdviserCoverage from './pages/AdviserCoverage'
import FunnelAnalysis from './pages/FunnelAnalysis'

export default function App() {
  return (
    <FilterProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/timetracker" replace />} />
          <Route path="/timetracker"  element={<TimeTracker />} />
          <Route path="/pipeline"     element={<BoardPipeline />} />
          <Route path="/proprietary"  element={<ProprietaryDealflow />} />
          <Route path="/channels"     element={<ChannelPerformance />} />
          <Route path="/advisers"     element={<AdviserCoverage />} />
          <Route path="/funnel"       element={<FunnelAnalysis />} />
          <Route path="*"             element={<Navigate to="/timetracker" replace />} />
        </Route>
      </Routes>
    </FilterProvider>
  )
}
